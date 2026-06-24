/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket } from '../types';
import { X, Calendar, User, Phone, ExternalLink, Briefcase, Paperclip } from 'lucide-react';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  onClose: () => void;
}

export default function TicketDetailModal({ ticket, onClose }: TicketDetailModalProps) {
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
          className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="bg-obsidian-black text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
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
          <div className="p-6 space-y-6">
            
            {/* Main Client Request Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Solicitação Recebida
              </span>
              <p className="text-sm text-slate-800 italic leading-relaxed">
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
                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Criado em: <strong className="text-slate-800">{formatDate(ticket.createdAt)}</strong></span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Time Responsável: <strong className="text-slate-800">{ticket.team}</strong></span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Quem Enviou: <strong className="text-slate-800">{ticket.agentName}</strong></span>
                  </div>
                </div>
              </div>

              {/* Right Column: Contact Details */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Dados de Contato
                </h4>

                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Telefone: <strong className="text-slate-800">{ticket.phone || "Não informado"}</strong></span>
                  </div>

                  {ticket.arquivos && (
                    <div className="flex items-center space-x-2 text-xs text-slate-600">
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

                  {ticket.iuguUrl && (
                    <div className="pt-1">
                      <a 
                        href={ticket.iuguUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 text-xs text-electric-rose hover:underline font-bold bg-electric-rose/5 px-3 py-1.5 rounded-lg border border-electric-rose/10"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ver Perfil IUGU</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Keyword Tags */}
            {ticket.keyWords && ticket.keyWords.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Tópicos Relacionados
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {ticket.keyWords.map((word, i) => (
                    <span 
                      key={i} 
                      className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-lg border border-slate-200/50"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
            >
              Fechar Detalhes
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
