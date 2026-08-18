/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket } from '../types';
import { normalizeAnalystName } from '../utils';
import { X, Calendar, User, Phone, ExternalLink, Briefcase, Paperclip, AlertCircle, Shuffle, CheckCircle2 } from 'lucide-react';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  onToggleInputError?: (ticketId: string, value: boolean) => void;
  onToggleRoutingError?: (ticketId: string, value: boolean) => void;
}

export default function TicketDetailModal({ 
  ticket, 
  onClose,
  onToggleInputError,
  onToggleRoutingError
}: TicketDetailModalProps) {

  if (!ticket) return null;

  const formatDate = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const formatAgentName = (rawName: string | undefined): string => {
    return normalizeAnalystName(rawName);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 my-8"
        >
          {/* Header */}
          <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
            <div>
              <span className="text-xs font-mono text-electric-rose uppercase tracking-wider font-bold">
                Detalhes do Atendimento
              </span>
              <h3 className="text-lg font-bold font-sans tracking-tight mt-0.5 max-w-[500px] truncate" title={ticket.clientName}>
                {ticket.clientName}
              </h3>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-5 max-h-[calc(100vh-180px)] overflow-y-auto">
            
            {/* Main Client Request Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Solicitação Recebida
              </span>
              <p className="text-sm text-slate-800 dark:text-slate-200 italic leading-relaxed">
                "{ticket.description || "Nenhuma descrição detalhada fornecida."}"
              </p>
            </div>

            {/* Two-Column Info Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Left Column: Metadata */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Informações de Registro
                </h4>
                
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Criado em: <strong className="text-slate-800 dark:text-slate-100">{formatDate(ticket.createdAt)}</strong></span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                    <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Time Responsável: <strong className="text-slate-800 dark:text-slate-100">{ticket.team}</strong></span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Quem Enviou: <strong className="text-slate-800 dark:text-slate-100">{formatAgentName(ticket.agentName)}</strong></span>
                  </div>
                </div>
              </div>

              {/* Right Column: Contact Details */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Dados de Contato
                </h4>

                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Telefone: <strong className="text-slate-800 dark:text-slate-100">{ticket.phone || "Não informado"}</strong></span>
                  </div>

                  {ticket.arquivos && (
                    <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                      <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">Anexo: 
                        <a 
                          href={ticket.arquivos} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-electric-rose hover:underline font-semibold ml-1"
                        >
                          Visualizar Arquivo
                        </a>
                      </span>
                    </div>
                  )}

                  {ticket.iuguUrl && (() => {
                    const raw = ticket.iuguUrl.trim();
                    const match = raw.match(/https?:\/\/[^\s,]+/i);
                    const href = match ? match[0] : (raw.startsWith('http') ? raw : `https://${raw.replace(/^\/+/, '')}`);
                    const lower = raw.toLowerCase();
                    let label = 'Ver Perfil do Cliente';
                    if (lower.includes('hubspot')) label = 'Ver no HubSpot';
                    else if (lower.includes('hero')) label = 'Ver no Hero-OS';
                    else if (lower.includes('iugu')) label = 'Ver no IUGU';
                    else if (lower.includes('intranet')) label = 'Ver na Intranet';
                    else if (lower.includes('vercel')) label = 'Ver no Vercel';

                    return (
                      <div className="pt-1">
                        <a 
                          href={href} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1.5 text-xs text-electric-rose hover:underline font-bold bg-electric-rose/5 px-3 py-1.5 rounded-lg border border-electric-rose/10 transition-colors hover:bg-electric-rose/10"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{label}</span>
                        </a>
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>

            {/* Quality Control Status Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-[11.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Status de Qualidade de Dados (Heurística Automática)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Status Input Error */}
                <div
                  className={`flex flex-col justify-center p-3.5 rounded-xl border text-left ${
                    ticket.hasInputError 
                      ? 'bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200' 
                      : 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="shrink-0">
                      {ticket.hasInputError ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1">
                        Erro de Entrada de Dados
                        {ticket.hasInputError && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {ticket.hasInputError ? "Contatos incorretos/incompletos" : "Telefone e dados válidos"}
                      </div>
                    </div>
                  </div>
                  {ticket.hasInputError && ticket.inputErrorDetails && ticket.inputErrorDetails.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-red-100 dark:border-red-900/50 text-[10px] text-red-700 dark:text-red-300 font-mono break-words">
                      <strong className="text-red-900 dark:text-red-200 font-bold font-sans uppercase text-[8px] tracking-wider block mb-0.5">Campos Incorretos:</strong>
                      {ticket.inputErrorDetails.join(', ')}
                    </div>
                  )}
                </div>

                {/* Status Routing Error */}
                <div
                  className={`flex flex-col justify-center p-3.5 rounded-xl border text-left ${
                    ticket.hasRoutingError 
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200' 
                      : 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="shrink-0">
                      {ticket.hasRoutingError ? (
                        <Shuffle className="w-5 h-5 text-indigo-500" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1">
                        Erro de Direcionamento
                        {ticket.hasRoutingError && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {ticket.hasRoutingError ? "Encaminhado incorretamente" : "Direcionamento correto"}
                      </div>
                    </div>
                  </div>
                  {ticket.hasRoutingError && ticket.columnKValue && (
                    <div className="mt-2.5 pt-2 border-t border-indigo-100 dark:border-indigo-900/50 text-[10px] text-indigo-700 dark:text-indigo-300 font-mono break-words">
                      <strong className="text-indigo-900 dark:text-indigo-200 font-bold font-sans uppercase text-[8px] tracking-wider block mb-0.5">Tipo do Erro (Planilha):</strong>
                      {ticket.columnKValue}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Keyword Tags */}
            {ticket.keyWords && ticket.keyWords.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Tópicos Relacionados
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {ticket.keyWords.map((word, i) => (
                    <span 
                      key={i} 
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded-lg border border-slate-200/50 dark:border-slate-700"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold text-xs rounded-xl cursor-pointer transition-all active:scale-95"
            >
              Fechar Detalhes
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
