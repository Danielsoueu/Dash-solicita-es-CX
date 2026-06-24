/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ticket, ChatMessage } from './types';

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function cleanCell(cell: string): string {
  let val = cell.trim();
  if (val.startsWith('"') && val.endsWith('"')) {
    val = val.substring(1, val.length - 1);
  }
  return val.replace(/""/g, '"');
}

export function parsePortugueseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  
  const cleaned = dateStr.replace(/"/g, '').trim();
  
  // Format: "6 de mar., 2026 15h23min37s" or similar
  const regex = /(\d+)\s+de\s+(\w+)\.?,\s+(\d{4})\s+(\d+)h(\d+)min(\d+)s/;
  const match = cleaned.match(regex);
  if (!match) {
    const standardDate = Date.parse(cleaned);
    if (!isNaN(standardDate)) {
      return new Date(standardDate).toISOString();
    }
    return new Date().toISOString();
  }

  const day = parseInt(match[1], 10);
  const monthAbbr = match[2].toLowerCase();
  const year = parseInt(match[3], 10);
  const hour = parseInt(match[4], 10);
  const minute = parseInt(match[5], 10);
  const second = parseInt(match[6], 10);

  const months: Record<string, number> = {
    'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
  };

  let monthIndex = 5; // default June
  for (const [key, val] of Object.entries(months)) {
    if (monthAbbr.startsWith(key)) {
      monthIndex = val;
      break;
    }
  }

  return new Date(year, monthIndex, day, hour, minute, second).toISOString();
}

export function extractKeywords(text: string): string[] {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
    .split(/\s+/);
  
  const stopWords = new Set([
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
    'em', 'no', 'na', 'nos', 'nas', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'para',
    'com', 'como', 'que', 'se', 'esta', 'este', 'isso', 'isto', 'aquilo', 'e', 'ou',
    'mas', 'porem', 'todavia', 'contudo', 'entretanto', 'desde', 'ate', 'meu', 'minha',
    'seu', 'sua', 'nossos', 'nossas', 'esta', 'sao', 'ser', 'ter', 'fazer', 'poder',
    'cliente', 'deseja', 'solicita', 'urgente', 'esta', 'favor', 'enviar', 'preciso',
    'ola', 'bom', 'dia', 'tarde', 'noite', 'por', 'favor', 'obrigado', 'aguardo', 'sem',
    'com', 'sobre', 'entrar', 'contato', 'pessoal', 'alega', 'aguardando', 'desde', 'segunda'
  ]);

  const freq: Record<string, number> = {};
  words.forEach(w => {
    if (w.length > 3 && !stopWords.has(w)) {
      const capitalized = w.charAt(0).toUpperCase() + w.slice(1);
      freq[capitalized] = (freq[capitalized] || 0) + 1;
    }
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

export function parseGoogleSheetsCSV(csvText: string): Ticket[] {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];

  const tickets: Ticket[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cells = parseCSVLine(line).map(cleanCell);
    
    // Check if we have at least client name and description
    const clientName = cells[0];
    if (!clientName) continue;

    const phone = cells[1] || '';
    const iuguUrl = cells[2] || '';
    
    // Urgency parsing
    let rawUrgency = cells[3] || 'Média';
    let urgency = 'Média';
    if (rawUrgency.includes('Urgente') || rawUrgency.includes('Crítica') || rawUrgency.includes('red_circle')) {
      urgency = 'Crítica';
    } else if (rawUrgency.includes('Alta') || rawUrgency.includes('orange')) {
      urgency = 'Alta';
    } else if (rawUrgency.includes('Baixa') || rawUrgency.includes('green')) {
      urgency = 'Baixa';
    } else if (rawUrgency.includes('Dúvida') || rawUrgency.includes('blue')) {
      urgency = 'Dúvida';
    }

    // Team parsing
    let rawTeam = cells[4] || 'Geral';
    let team = 'Geral';
    if (rawTeam) {
      // Take anything before '(@' or '(' or '@'
      const index = rawTeam.indexOf('(');
      if (index !== -1) {
        team = rawTeam.substring(0, index).trim();
      } else {
        team = rawTeam.trim();
      }
    }

    const description = cells[5] || '';
    const arquivos = cells[6] || '';
    const agentName = cells[7] || 'Suporte';
    const rawDate = cells[8] || '';
    
    const createdAt = parsePortugueseDate(rawDate);
    const keyWords = extractKeywords(description);

    // Initial mock chat logs based on description
    const chatLog: ChatMessage[] = [];
    if (description) {
      chatLog.push({
        sender: 'cliente',
        text: description,
        timestamp: createdAt
      });
      chatLog.push({
        sender: 'hero_agent',
        text: `Olá, herói! Recebemos a sua solicitação sobre "${description.substring(0, 40)}...". Nossa equipe do time de ${team} já está analisando o seu caso sob prioridade ${urgency}. Faremos contato em breve!`,
        timestamp: new Date(new Date(createdAt).getTime() + 10 * 60 * 1000).toISOString() // + 10 min
      });
    }

    // Subject/Title based on team or description
    const subject = description.length > 50 
      ? description.substring(0, 50) + '...' 
      : description || `Solicitação #${i}`;

    tickets.push({
      id: `HERO-${1000 + i}`,
      clientName,
      phone,
      iuguUrl,
      urgency,
      team,
      description,
      arquivos,
      agentName,
      createdAt,
      chatLog,
      keyWords
    });
  }

  // Sort descending by date
  return tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
