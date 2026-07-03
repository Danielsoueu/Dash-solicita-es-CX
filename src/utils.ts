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
  
  const months: Record<string, number> = {
    'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
  };

  // Format A: '6 de mar., 2026 15h23min37s' or '1º de abr., 2026 14h14min13s'
  const dateMatchA = cleaned.match(/^(\d+)(?:º|ª)?\s+de\s+([^\s\.,]+)\.?,\s+(\d{4})/i);
  if (dateMatchA) {
    const day = parseInt(dateMatchA[1], 10);
    const monthAbbr = dateMatchA[2].toLowerCase();
    const year = parseInt(dateMatchA[3], 10);
    
    let monthIndex = 5; // default June
    for (const [key, val] of Object.entries(months)) {
      if (monthAbbr.startsWith(key)) {
        monthIndex = val;
        break;
      }
    }

    // Parse time after the date part
    const timePart = cleaned.substring(dateMatchA[0].length).trim();
    let hour = 0;
    let minute = 0;
    let second = 0;

    const hMatch = timePart.match(/(\d+)\s*h/i);
    if (hMatch) {
      hour = parseInt(hMatch[1], 10);
    }

    const minMatch = timePart.match(/(\d+)\s*min/i);
    if (minMatch) {
      minute = parseInt(minMatch[1], 10);
    } else {
      // Check for formats like '19h57' or '12h36' where minutes follow 'h' and don't end with 's'
      const altMinMatch = timePart.match(/h\s*(\d+)(?!\s*s)/i);
      if (altMinMatch) {
        minute = parseInt(altMinMatch[1], 10);
      }
    }

    const sMatch = timePart.match(/(\d+)\s*s/i);
    if (sMatch) {
      second = parseInt(sMatch[1], 10);
    }

    return new Date(year, monthIndex, day, hour, minute, second).toISOString();
  }

  // Format B: 'jun. 18, 2026, 13:04:31'
  const regexB = /([^\s\.,]+)\.?\s+(\d+),\s+(\d{4}),\s+(\d+):(\d+):(\d+)/;
  const matchB = cleaned.match(regexB);
  if (matchB) {
    const monthAbbr = matchB[1].toLowerCase();
    const day = parseInt(matchB[2], 10);
    const year = parseInt(matchB[3], 10);
    const hour = parseInt(matchB[4], 10);
    const minute = parseInt(matchB[5], 10);
    const second = parseInt(matchB[6], 10);
    
    let monthIndex = 5; // default June
    for (const [key, val] of Object.entries(months)) {
      if (monthAbbr.startsWith(key)) {
        monthIndex = val;
        break;
      }
    }
    return new Date(year, monthIndex, day, hour, minute, second).toISOString();
  }

  // Format C: 'DD/MM/YYYY HH:mm:ss'
  const regexC = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d+):(\d+):(\d+))?/;
  const matchC = cleaned.match(regexC);
  if (matchC) {
    const day = parseInt(matchC[1], 10);
    const month = parseInt(matchC[2], 10) - 1;
    const year = parseInt(matchC[3], 10);
    const hour = matchC[4] ? parseInt(matchC[4], 10) : 0;
    const minute = matchC[5] ? parseInt(matchC[5], 10) : 0;
    const second = matchC[6] ? parseInt(matchC[6], 10) : 0;
    return new Date(year, month, day, hour, minute, second).toISOString();
  }

  const standardDate = Date.parse(cleaned);
  if (!isNaN(standardDate)) {
    return new Date(standardDate).toISOString();
  }
  
  return new Date().toISOString();
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
      
      // Unify Cobrança and Inadimplência
      if (team === 'Inadimplência' || team === 'Inadimplencia' || team === 'Inad') {
        team = 'Cobrança';
      }
    }

    const description = cells[5] || '';
    const arquivos = cells[6] || '';
    const agentName = cells[7] || 'Suporte';
    const rawDate = cells[8] || '';
    const columnKValue = cells[10] || '';
    
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
      keyWords,
      columnKValue
    });
  }

  // Sort descending by date
  return tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
