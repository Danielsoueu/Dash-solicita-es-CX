/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ticket } from './types';

// Robust, compliant fallback tickets matching the exact schema of the Google Sheet parser
export const INITIAL_TICKETS: Ticket[] = [
  {
    id: "HERO-1001",
    clientName: "GREEN MOUNTAIN ADMINISTRACAO DE IMOVEIS EIRELI",
    phone: "(11) 99690-9109",
    iuguUrl: "https://alia.iugu.com/contact/customers/00B4673F4BBA4B6EA053BC9226D9FCB4",
    urgency: "Média",
    team: "Cobrança",
    description: "Cliente deseja regularizar assinatura em aberto desde nov/2025.",
    arquivos: "",
    agentName: "Karina Moreno",
    createdAt: "2026-06-24T08:30:00Z",
    chatLog: [
      { sender: "cliente", text: "Cliente deseja regularizar assinatura em aberto desde nov/2025.", timestamp: "2026-06-24T08:30:00Z" }
    ],
    keyWords: ["Regularizar", "Assinatura", "Cobrança"]
  },
  {
    id: "HERO-1002",
    clientName: "ROCKY MOUNTAIN EDITORIAL LTDA",
    phone: "11-99690-9109",
    iuguUrl: "https://alia.iugu.com/contact/customers/21AAB6A4820046AB87A83C76E86A9FC5",
    urgency: "Média",
    team: "Cobrança",
    description: "Cliente deseja regularizar assinatura em aberto desde nov/2025.",
    arquivos: "",
    agentName: "Karina Moreno",
    createdAt: "2026-06-24T07:15:00Z",
    chatLog: [
      { sender: "cliente", text: "Cliente deseja regularizar assinatura em aberto desde nov/2025.", timestamp: "2026-06-24T07:15:00Z" }
    ],
    keyWords: ["Regularizar", "Assinatura", "Cobrança"]
  },
  {
    id: "HERO-1003",
    clientName: "Malu comercio de produtos em geral Ltda",
    phone: "11 968056410",
    iuguUrl: "https://alia.iugu.com/contact/customers/3AA2591246944EBA8BF45303DF0F4AED",
    urgency: "Alta",
    team: "Renovação",
    description: "Cliente alega que está desde segunda-feira aguardando contato, deseja desconto na renovação.",
    arquivos: "",
    agentName: "Karina Moreno",
    createdAt: "2026-06-24T06:00:00Z",
    chatLog: [
      { sender: "cliente", text: "Cliente alega que está desde segunda-feira aguardando contato, deseja desconto na renovação.", timestamp: "2026-06-24T06:00:00Z" }
    ],
    keyWords: ["Desconto", "Renovação", "Aguardando"]
  }
];
