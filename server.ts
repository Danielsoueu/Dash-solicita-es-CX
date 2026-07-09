import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Server-side AI Executive Summary endpoint
app.post("/api/gemini/summary", async (req, res) => {
  try {
    const { 
      total, 
      topCategory, 
      topCategoryPct, 
      cancelTrendMsg, 
      topTeam, 
      topTeamPct, 
      topAnalyst, 
      topAnalystErrorPct,
      errorRate,
      periodLabel
    } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({ 
        summary: `Neste período (${periodLabel || 'geral'}), foram abertas ${total || 0} solicitações. O principal motivo de contato foi "${topCategory || 'Pedido de desconto'}", representando ${topCategoryPct || 0}% dos atendimentos. A equipe de ${topTeam || 'Suporte'} concentrou ${topTeamPct || 0}% dos chamados. O analista com maior volume de solicitações foi ${topAnalyst || 'João Silva'}, com uma taxa de erro de ${topAnalystErrorPct || 0}%. A taxa geral de erros de preenchimento e direcionamento ficou em ${errorRate || 0}%.` 
      });
    }

    const prompt = `Você é um diretor analítico de CX inteligente na Company Hero.
Com base nas seguintes métricas do período filtrado atual:
- Período selecionado: ${periodLabel || 'Geral'}
- Total de chamados/solicitações: ${total}
- Principal motivo de contato: "${topCategory}" (${topCategoryPct}%)
- Tendência de cancelamentos / Outras informações de tendência: ${cancelTrendMsg || 'Estável'}
- Equipe com mais chamados: "${topTeam}" (${topTeamPct}%)
- Analista com mais chamados: "${topAnalyst}" (Taxa de erro individual: ${topAnalystErrorPct}%)
- Taxa de erro geral do período (erros de dados + direcionamento): ${errorRate}%

Escreva um resumo executivo de gestão conciso e direto em português brasileiro, com exatamente 1 parágrafo bem estruturado.
Use um tom profissional, analítico e orientador de decisões (visando melhoria de processos, otimização de equipes e redução de volume).
O texto deve responder diretamente "O que os clientes estão nos dizendo" e destacar onde agir.
Evite formatação markdown excessiva como títulos ou subtítulos, mas use tags HTML comuns como <strong> para dar destaque a dados-chave se apropriado. 
Siga este estilo de exemplo de forma livre e orgânica, adaptando aos números reais fornecidos:
"Neste período foram abertas 1.017 solicitações. O principal motivo de contato foi pedido de desconto, representando 31% das solicitações. Os cancelamentos cresceram 18% em relação ao período anterior. A equipe de Renovação concentrou 54% dos chamados. João Silva foi o analista com maior volume de solicitações, mantendo uma taxa de erro de apenas 2%."`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Você é o Diretor Executivo de Inteligência de CX da Company Hero. Seu objetivo é analisar dados de suporte e sintetizá-los em resumos analíticos executivos extremamente claros, profissionais e orientados a ações concretas.",
        temperature: 0.7,
      }
    });

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error("Error generating executive summary via Gemini:", error);
    res.status(500).json({ error: "Erro ao gerar resumo da IA.", details: error.message });
  }
});

// Configure Vite or Static Assets serving
async function setupApp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupApp();
