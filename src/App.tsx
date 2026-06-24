/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  Clock, 
  Calendar, 
  RotateCcw, 
  SlidersHorizontal, 
  ShieldAlert, 
  Layers, 
  MessageSquare, 
  Sparkles,
  Inbox,
  CheckCircle,
  RefreshCw,
  Database,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Ticket } from './types';
import { INITIAL_TICKETS } from './data';
import { parseGoogleSheetsCSV } from './utils';
import WordCloud from './components/WordCloud';
import CustomBarChart from './components/CustomBarChart';
import TicketDetailModal from './components/TicketDetailModal';
import BrasiliaClock from './components/BrasiliaClock';

type PeriodType = 'all' | 'today' | '7days' | '30days';

export default function App() {
  // Active Ticket Database State
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  
  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('all');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  
  // Selected Ticket for Modal Details
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Reset pagination to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTeam, selectedPeriod, selectedWord]);

  // Fetch spreadsheet data at startup
  useEffect(() => {
    async function loadSpreadsheetData() {
      try {
        setIsLoading(true);
        const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_X5Oc6ttxxwsMc4n0ywO1JrE7Eryi0-ubqaATPADMc5ZbxK8kYJfhS4kzPKWNsV6GjO82zzhVeQed/pub?gid=308255528&single=true&output=csv';
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Status HTTP: ${res.status}`);
        }
        const text = await res.text();
        const parsed = parseGoogleSheetsCSV(text);
        if (parsed && parsed.length > 0) {
          setTickets(parsed);
          setIsLive(true);
          setError(null);
        } else {
          throw new Error("Planilha vazia ou em formato incorreto.");
        }
      } catch (err: any) {
        console.error("Erro ao carregar dados do banco Google Sheets:", err);
        setError("Não foi possível carregar os dados em tempo real. Exibindo banco de dados local integrado.");
        setIsLive(false);
      } finally {
        setIsLoading(false);
      }
    }
    loadSpreadsheetData();
  }, []);

  // Manual data reload function
  const handleReload = async () => {
    try {
      setIsLoading(true);
      const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_X5Oc6ttxxwsMc4n0ywO1JrE7Eryi0-ubqaATPADMc5ZbxK8kYJfhS4kzPKWNsV6GjO82zzhVeQed/pub?gid=308255528&single=true&output=csv';
      const res = await fetch(url);
      const text = await res.text();
      const parsed = parseGoogleSheetsCSV(text);
      if (parsed && parsed.length > 0) {
        setTickets(parsed);
        setIsLive(true);
        setError(null);
      }
    } catch (err) {
      setError("Erro ao atualizar dados em tempo real da planilha.");
    } finally {
      setIsLoading(false);
    }
  };

  // Find the currently open ticket object
  const activeTicket = useMemo(() => {
    return tickets.find(t => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  // Dynamic set of all unique teams
  const uniqueTeams = useMemo(() => {
    const teamsSet = new Set<string>();
    tickets.forEach(t => {
      if (t.team) {
        teamsSet.add(t.team);
      }
    });
    return Array.from(teamsSet).sort();
  }, [tickets]);

  // Compute filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // 1. Team Filter
      if (selectedTeam && ticket.team !== selectedTeam) {
        return false;
      }

      // 2. Word Filter from WordCloud
      if (selectedWord && !ticket.keyWords.includes(selectedWord)) {
        return false;
      }

      // 3. Period Filter
      const ticketDate = new Date(ticket.createdAt);
      const referenceDate = new Date();
      
      if (selectedPeriod === 'today') {
        const ticketLocalStr = ticketDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const refLocalStr = referenceDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        if (ticketLocalStr !== refLocalStr) return false;
      } else if (selectedPeriod === '7days') {
        const diffTime = Math.abs(referenceDate.getTime() - ticketDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) return false;
      } else if (selectedPeriod === '30days') {
        const diffTime = Math.abs(referenceDate.getTime() - ticketDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 30) return false;
      }

      // 4. Text Search Filter
      if (searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        const matchesClient = ticket.clientName?.toLowerCase().includes(searchLower);
        const matchesPhone = ticket.phone?.toLowerCase().includes(searchLower);
        const matchesDesc = ticket.description?.toLowerCase().includes(searchLower);
        const matchesKeyword = ticket.keyWords?.some(kw => kw.toLowerCase().includes(searchLower));
        
        if (!matchesClient && !matchesPhone && !matchesDesc && !matchesKeyword) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, searchTerm, selectedTeam, selectedPeriod, selectedWord]);

  // Derived Performance Metrics (no SLA/CSAT as requested)
  const metrics = useMemo(() => {
    const totalCount = filteredTickets.length;
    const urgentCount = filteredTickets.filter(t => t.urgency === 'Crítica' || t.urgency === 'Alta').length;
    
    return {
      totalCount,
      urgentCount
    };
  }, [filteredTickets]);

  // Separating filtered tickets to fetch Urgent Feed
  const urgentTickets = useMemo(() => {
    return filteredTickets
      .filter(t => t.urgency === 'Crítica' || t.urgency === 'Alta')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredTickets]);

  // General tickets list for detailed exploration
  const generalTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredTickets]);

  // Total pages
  const totalPages = useMemo(() => {
    return Math.ceil(generalTickets.length / itemsPerPage) || 1;
  }, [generalTickets, itemsPerPage]);

  // Paginated tickets list
  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return generalTickets.slice(startIndex, startIndex + itemsPerPage);
  }, [generalTickets, currentPage, itemsPerPage]);

  // Reset all dashboard filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedTeam(null);
    setSelectedPeriod('all');
    setSelectedWord(null);
  };

  const hasActiveFilters = searchTerm !== '' || selectedTeam !== null || selectedPeriod !== 'all' || selectedWord !== null;

  return (
    <div className="min-h-screen bg-slate-50 text-obsidian-black font-sans antialiased flex flex-col selection:bg-electric-rose/10 selection:text-electric-rose">
      {/* 1. Global Navigation Bar */}
      <nav id="navbar" className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo with left branding bar */}
          <div className="flex items-center space-x-3 select-none">
            <div className="w-2.5 h-8 bg-electric-rose rounded-xs"></div>
            <span className="font-sans font-black tracking-tight text-xl text-obsidian-black flex items-center">
              COMPANY<span className="text-electric-rose font-normal ml-0.5">HERO</span>
            </span>
            <span className="hidden md:inline-block h-4 w-[1px] bg-slate-200 mx-3"></span>
            <span className="hidden md:inline-block text-xs font-mono text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded border border-slate-100">
              Painel de Atendimentos
            </span>
          </div>

          {/* Time & Database status information */}
          <div className="flex items-center space-x-4">
            <BrasiliaClock />

            {/* Connection Status Badge */}
            <button 
              onClick={handleReload}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border cursor-pointer hover:opacity-90 transition-all ${
                isLive 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
              title="Clique para forçar atualização"
            >
              {isLive ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-bold font-mono">
                {isLive ? "PLANILHA CONECTADA" : "BANCO LOCAL INTEGRADO"}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Layout Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Error Notification Bar */}
        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{error}</span>
            </div>
            <button 
              onClick={handleReload}
              className="font-bold underline cursor-pointer hover:text-amber-950"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Dashboard Title & Introduction */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-obsidian-black flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-electric-rose shrink-0" />
              Volume de Chamados CX
            </h1>
            <p className="text-slate-500 text-sm mt-1 max-w-3xl">
              Monitore a atividade das equipes de suporte integradas diretamente com a planilha <strong className="text-obsidian-black">Google Sheets de Solicitações CX</strong>. Use filtros refinados e o mapa de tópicos para analisar os atendimentos.
            </p>
          </div>
          
          <button
            onClick={handleReload}
            disabled={isLoading}
            className="self-start md:self-auto flex items-center space-x-2 px-4 py-2.5 bg-obsidian-black hover:bg-electric-rose disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? "Sincronizando..." : "Sincronizar Planilha"}</span>
          </button>
        </div>

        {/* Loading Spinner / Skeleton Overlay */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center space-y-4 shadow-sm min-h-[400px]">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-electric-rose rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-600 font-sans">
              Carregando chamados e normalizando banco de dados...
            </p>
            <p className="text-xs text-slate-400 max-w-md text-center leading-relaxed">
              Conectando com segurança ao banco de dados em docs.google.com para obter o status atualizado de todas as equipes de suporte.
            </p>
          </div>
        ) : (
          <>
            {/* 2. Interactive Search & Filters Section */}
            <section id="filters-panel" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4 text-electric-rose" />
                  <h2 className="text-sm font-extrabold text-obsidian-black uppercase tracking-wider">
                    Filtros e Parâmetros
                  </h2>
                </div>
                
                {hasActiveFilters && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleResetFilters}
                    className="flex items-center space-x-1.5 text-xs text-electric-rose hover:text-electric-rose/80 font-bold bg-electric-rose/5 px-2.5 py-1.5 rounded-lg border border-electric-rose/10 cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Limpar Filtros</span>
                  </motion.button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Search input (matches client, company, keywords) */}
                <div className="col-span-12 md:col-span-4 relative">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Buscar por Conteúdo
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Nome do cliente, telefone, termo ou solicitação..."
                      className="w-full text-sm pl-10 pr-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-electric-rose/20 focus:border-electric-rose font-sans text-slate-800 transition-all"
                    />
                  </div>
                </div>

                {/* Team Dropdown Filter */}
                <div className="col-span-12 sm:col-span-6 md:col-span-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Filtrar por Equipe Responsável
                  </label>
                  <select
                    value={selectedTeam || ''}
                    onChange={(e) => setSelectedTeam(e.target.value || null)}
                    className="w-full text-sm py-2.5 px-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-electric-rose/20 focus:border-electric-rose font-sans text-slate-800 transition-all cursor-pointer"
                  >
                    <option value="">Todas as Equipes (Geral)</option>
                    {uniqueTeams.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Period Range Tabs Filter */}
                <div className="col-span-12 sm:col-span-6 md:col-span-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Intervalo Temporal
                  </label>
                  <div className="grid grid-cols-4 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                    {(['all', 'today', '7days', '30days'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setSelectedPeriod(period)}
                        className={`
                          py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center capitalize
                          ${selectedPeriod === period 
                            ? 'bg-white text-obsidian-black shadow-xs font-extrabold' 
                            : 'text-slate-500 hover:text-obsidian-black'
                          }
                        `}
                      >
                        {period === 'all' && 'Todos'}
                        {period === 'today' && 'Hoje'}
                        {period === '7days' && '7 Dias'}
                        {period === '30days' && '30 Dias'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Render Active Filters Summary Bar */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mr-1">
                    Filtros ativos:
                  </span>
                  
                  {selectedTeam && (
                    <span className="inline-flex items-center px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-medium space-x-1.5 border border-slate-950">
                      <span>Equipe: {selectedTeam}</span>
                      <button onClick={() => setSelectedTeam(null)} className="hover:text-electric-rose cursor-pointer font-bold">×</button>
                    </span>
                  )}

                  {selectedPeriod !== 'all' && (
                    <span className="inline-flex items-center px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-medium space-x-1.5 border border-slate-950">
                      <span>
                        Período: {selectedPeriod === 'today' && 'Hoje'}
                        {selectedPeriod === '7days' && 'Últimos 7 Dias'}
                        {selectedPeriod === '30days' && 'Últimos 30 Dias'}
                      </span>
                      <button onClick={() => setSelectedPeriod('all')} className="hover:text-electric-rose cursor-pointer font-bold">×</button>
                    </span>
                  )}

                  {selectedWord && (
                    <span className="inline-flex items-center px-3 py-1 bg-electric-rose text-white rounded-full text-xs font-medium space-x-1.5 shadow-xs shadow-electric-rose/10">
                      <span>Palavra: "{selectedWord}"</span>
                      <button onClick={() => setSelectedWord(null)} className="hover:text-white/80 cursor-pointer font-bold text-sm">×</button>
                    </span>
                  )}

                  {searchTerm && (
                    <span className="inline-flex items-center px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-medium space-x-1.5 border border-slate-950">
                      <span className="truncate max-w-[150px]">Busca: "{searchTerm}"</span>
                      <button onClick={() => setSearchTerm('')} className="hover:text-electric-rose cursor-pointer font-bold">×</button>
                    </span>
                  )}
                </div>
              )}
            </section>

            {/* 3. Metrics/KPI Row (2 columns, simple, elegant, no CSAT/SLA) */}
            <section id="metrics-row" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Metric 1: Total realizado */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-xs relative overflow-hidden group">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Filtrado
                  </span>
                  <h3 className="text-3xl font-black font-sans tracking-tight text-obsidian-black font-mono">
                    {metrics.totalCount}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Atendimentos no escopo atual
                  </p>
                </div>
                <div className="p-3.5 bg-slate-100 rounded-xl group-hover:bg-electric-rose/10 group-hover:text-electric-rose transition-colors duration-300 text-obsidian-black">
                  <Inbox className="w-5 h-5" />
                </div>
              </div>

              {/* Metric 2: Urgent count */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-xs relative overflow-hidden group">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Alertas Críticos / Altos
                  </span>
                  <h3 className="text-3xl font-black font-sans tracking-tight text-red-600 font-mono">
                    {metrics.urgentCount}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Atenção prioritária requerida
                  </p>
                </div>
                <div className="p-3.5 bg-red-50 text-red-500 rounded-xl group-hover:bg-red-100 transition-colors duration-300">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>

            </section>

            {/* 4. Bento Grid: Teams performance + Word Cloud */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Column Left: Team Volume Comparisons (7/12 cols) */}
              <section className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-electric-rose" />
                    <h2 className="text-sm font-extrabold text-obsidian-black uppercase tracking-wider">
                      Volume de Chamados por Equipe
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200/50">
                    METRICS
                  </span>
                </div>

                <CustomBarChart 
                  filteredTickets={filteredTickets} 
                  selectedTeam={selectedTeam} 
                  onSelectTeam={setSelectedTeam} 
                  allTickets={tickets}
                />
              </section>

              {/* Column Right: Word Map ("Mapa de Palavras") (5/12 cols) */}
              <section className="col-span-12 lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-electric-rose" />
                    <h2 className="text-sm font-extrabold text-obsidian-black uppercase tracking-wider">
                      Mapa de Palavras-Chave NLP
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200/50">
                    NLP TAGS
                  </span>
                </div>

                <WordCloud 
                  filteredTickets={filteredTickets} 
                  selectedWord={selectedWord} 
                  onSelectWord={setSelectedWord} 
                />
              </section>

            </div>

            {/* 5. Highlight Section: Latest Urgent Tickets (No IDs printed) */}
            <section id="urgent-tickets-feed" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></div>
                  <h2 className="text-sm font-extrabold text-obsidian-black uppercase tracking-wider">
                    Últimos Chamados Urgentes & Críticos
                  </h2>
                </div>
                
                <div className="text-right">
                  <span className="text-xs text-slate-400">
                    Filtrados: <strong className="text-slate-700">{urgentTickets.length} urgente(s)</strong>
                  </span>
                </div>
              </div>

              {urgentTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mb-2 opacity-80" />
                  <p className="text-sm font-medium">Nenhum chamado urgente ou crítico encontrado para os filtros atuais.</p>
                  <p className="text-xs text-slate-400 mt-1">Tudo operando conforme o SLA padrão!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {urgentTickets.slice(0, 4).map((ticket) => {
                    const timeStr = new Date(ticket.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                    const dateStr = new Date(ticket.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
                    
                    return (
                      <motion.div
                        key={ticket.id}
                        id={`urgent-ticket-${ticket.id}`}
                        whileHover={{ y: -3, scale: 1.01 }}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className="group relative bg-slate-50 hover:bg-white border border-slate-200/80 hover:border-red-500/40 p-4 rounded-xl transition-all duration-300 cursor-pointer shadow-xs flex flex-col justify-between"
                      >
                        {/* Urgency indicator strip on left */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${ticket.urgency === 'Crítica' ? 'bg-red-500' : 'bg-orange-500'}`}></div>

                        <div>
                          {/* Top bar with Urgency */}
                          <div className="flex items-center justify-between mb-2 pl-1.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase ${
                              ticket.urgency === 'Crítica' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {ticket.urgency}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-slate-300 inline shrink-0" />
                              <span>{dateStr} às {timeStr}</span>
                            </span>
                          </div>

                          {/* Main client & description */}
                          <div className="pl-1.5">
                            <h3 className="text-sm font-extrabold text-obsidian-black group-hover:text-electric-rose transition-colors line-clamp-1">
                              {ticket.clientName}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              "{ticket.description}"
                            </p>
                          </div>
                        </div>

                        {/* Bottom Client Card info */}
                        <div className="mt-4 pt-3 border-t border-slate-200/40 pl-1.5 flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-[11px] text-slate-600">
                            <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-600">
                              {ticket.clientName.charAt(0)}
                            </div>
                            <span className="font-semibold truncate max-w-[150px]">{ticket.clientName}</span>
                            {ticket.phone && (
                              <>
                                <span className="text-slate-300">|</span>
                                <span className="truncate max-w-[120px] text-slate-400 font-mono">{ticket.phone}</span>
                              </>
                            )}
                          </div>

                          <span className="text-[10px] font-extrabold text-electric-rose group-hover:underline flex items-center space-x-1 shrink-0">
                            <span>Ver Detalhes</span>
                            <span>→</span>
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 6. Comprehensive Explorer Tickets Section (All Filtered Tickets Table - No IDs column) */}
            <section id="general-explorer" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 pb-2 border-b border-slate-100 gap-2">
                <div className="flex items-center space-x-2">
                  <Inbox className="w-4 h-4 text-electric-rose" />
                  <h2 className="text-sm font-extrabold text-obsidian-black uppercase tracking-wider">
                    Explorador Geral de Chamados
                  </h2>
                </div>
                <span className="text-xs text-slate-400 font-semibold">
                  Exibindo <strong className="text-slate-700">{Math.min(generalTickets.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(generalTickets.length, currentPage * itemsPerPage)}</strong> de <strong className="text-slate-700">{generalTickets.length}</strong> chamados filtrados
                </span>
              </div>

              {generalTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Inbox className="w-10 h-10 opacity-30 mb-2" />
                  <p className="text-sm font-medium">Nenhum chamado corresponde aos filtros selecionados.</p>
                  <button 
                    onClick={handleResetFilters}
                    className="mt-3 text-xs text-electric-rose hover:underline font-bold"
                  >
                    Limpar todos os filtros para recomeçar
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-sans font-bold text-[10px] uppercase tracking-wider">
                          <th className="py-3 px-4">Cliente Herói</th>
                          <th className="py-3 px-4">Solicitação</th>
                          <th className="py-3 px-4">Equipe</th>
                          <th className="py-3 px-4">Gravidade</th>
                          <th className="py-3 px-4 text-center">Interação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {paginatedTickets.map((ticket) => {
                          const ticketDateStr = new Date(ticket.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/Sao_Paulo'
                          });

                          // Determine urgency dot color
                          const getUrgencyDot = (urgency: string) => {
                            switch (urgency) {
                              case 'Crítica': return 'bg-red-500';
                              case 'Alta': return 'bg-orange-500';
                              case 'Média': return 'bg-amber-400';
                              case 'Dúvida': return 'bg-blue-500';
                              default: return 'bg-slate-400';
                            }
                          };

                          return (
                            <tr 
                              key={ticket.id} 
                              className="hover:bg-slate-50/70 transition-colors duration-150 group"
                            >
                              {/* Client details */}
                              <td className="py-3.5 px-4">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800">{ticket.clientName}</span>
                                  {ticket.phone && (
                                    <span className="text-[11px] text-slate-400 font-mono" title={ticket.phone}>
                                      {ticket.phone}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Solicitação description excerpt */}
                              <td className="py-3.5 px-4 max-w-sm">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800 group-hover:text-electric-rose transition-colors line-clamp-1" title={ticket.description}>
                                    {ticket.description}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    Aberto: {ticketDateStr}
                                  </span>
                                </div>
                              </td>

                              {/* Team Category */}
                              <td className="py-3.5 px-4">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                  {ticket.team}
                                </span>
                              </td>

                              {/* Urgency Badge */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center space-x-1.5">
                                  <span className={`w-2 h-2 rounded-full ${getUrgencyDot(ticket.urgency)}`}></span>
                                  <span className="text-xs text-slate-700 font-medium">{ticket.urgency}</span>
                                </div>
                              </td>

                              {/* Modal Action trigger */}
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  onClick={() => setSelectedTicketId(ticket.id)}
                                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-obsidian-black hover:bg-electric-rose text-white hover:text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                                >
                                  <span>Ver Detalhes</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-5 pt-4 border-t border-slate-100">
                      <div className="text-xs text-slate-500 font-medium">
                        Página <strong className="text-obsidian-black">{currentPage}</strong> de <strong className="text-obsidian-black">{totalPages}</strong>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-obsidian-black disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all text-xs font-bold cursor-pointer"
                          title="Primeira Página"
                        >
                          &laquo;
                        </button>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-obsidian-black disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Anterior</span>
                        </button>

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-obsidian-black disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <span>Próxima</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-obsidian-black disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all text-xs font-bold cursor-pointer"
                          title="Última Página"
                        >
                          &raquo;
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}

      </main>

      {/* 7. Interactive Modal Drawer for Selected Ticket Detail */}
      <TicketDetailModal 
        ticket={activeTicket} 
        onClose={() => setSelectedTicketId(null)} 
      />

      {/* Modern High-Contrast Footer following Brand Book styling */}
      <footer id="footer" className="bg-obsidian-black text-white mt-12 border-t border-slate-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          
          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start space-x-2 select-none">
              <div className="w-2 h-5 bg-electric-rose rounded-sm"></div>
              <span className="font-sans font-black text-base text-white tracking-tight">
                COMPANY<span className="text-electric-rose font-normal ml-0.5">HERO</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              "A plataforma que integra soluções para profissionais autônomos e PJs em um só lugar."
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            &copy; {new Date().getFullYear()} Company Hero S.A. Todos os direitos reservados.
            <br />
            Conformidade com a LGPD e privacidade assegurada pelo Hub de Segurança.
          </div>
          
        </div>
      </footer>
    </div>
  );
}
