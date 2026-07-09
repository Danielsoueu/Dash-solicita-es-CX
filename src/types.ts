/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ChatMessage {
  sender: 'cliente' | 'hero_agent';
  text: string;
  timestamp: string;
}

export interface Ticket {
  id: string; // unique code or row index
  clientName: string;
  phone: string;
  iuguUrl: string;
  urgency: string; // Dynamic: 'Baixa' | 'Média' | 'Alta' | 'Dúvida' | 'Urgente'
  team: string; // Dynamic parsed team (e.g. 'Cobrança', 'Renovação', 'Retenção', etc.)
  description: string; // "Solicitação"
  arquivos: string;
  agentName: string; // "Quem enviou"
  createdAt: string; // ISO string
  chatLog: ChatMessage[];
  keyWords: string[];
  category: string; // Dynamic AI/Heuristic categorized reason
  
  // Custom manual or auto-detected flags
  hasInputError?: boolean;
  hasRoutingError?: boolean;
  suggestedTeam?: string;
  columnKValue?: string;
  monthYear?: string;
  formattedAgentName?: string;
  localDay?: string;
  inputErrorDetails?: string[];
}

export interface WordCloudItem {
  text: string;
  value: number;
}
