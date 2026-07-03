/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ChevronRight,
  AlertCircle,
  Shuffle,
  CheckCircle2
} from 'lucide-react';
import { Ticket } from './types';
import { INITIAL_TICKETS } from './data';
import { parseGoogleSheetsCSV } from './utils';
import WordCloud from './components/WordCloud';
import CustomBarChart from './components/CustomBarChart';
import TicketDetailModal from './components/TicketDetailModal';
import BrasiliaClock from './components/BrasiliaClock';
import PriorityPieChart from './components/PriorityPieChart';

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
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [showOnlyRecurring, setShowOnlyRecurring] = useState(false);
  const [showOnlyInputError, setShowOnlyInputError] = useState(false);
  const [showOnlyRoutingError, setShowOnlyRoutingError] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const hasInitializedMonth = useRef(false);

  // Load ticket modifications (manual error overrides) from localStorage
  const [ticketModifications, setTicketModifications] = useState<Record<string, {
    hasInputError?: boolean;
    hasRoutingError?: boolean;
  }>>(() => {
    try {
      const saved = localStorage.getItem('hero_ticket_modifications');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Save changes to localStorage when ticketModifications is updated
  useEffect(() => {
    localStorage.setItem('hero_ticket_modifications', JSON.stringify(ticketModifications));
  }, [ticketModifications]);
  
  // Selected Ticket for Modal Details
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Helper to get formatted month/year string
  const getTicketMonthYear = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' });
    const year = date.toLocaleDateString('pt-BR', { year: 'numeric', timeZone: 'America/Sao_Paulo' });
    return `${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`;
  };

  // Helper to clean and format agent names (removes @ and domain or prefix)
  const formatAgentName = (rawName: string | undefined): string => {
    if (!rawName) return '';
    let name = rawName.trim();
    if (name.startsWith('@')) {
      name = name.slice(1);
    }
    if (name.includes('@')) {
      name = name.split('@')[0];
    }
    return name.trim();
  };

  // Helper to highlight terms matching search query in ticket descriptions
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return <span>{text}</span>;
    try {
      const escapedSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const regex = new RegExp(`(${escapedSearch})`, 'gi');
      const parts = text.split(regex);
      return (
        <span>
          {parts.map((part, index) => 
            regex.test(part) ? (
              <mark key={index} className="bg-yellow-100 text-yellow-900 font-semibold px-0.5 rounded-xs">
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </span>
      );
    } catch (e) {
      return <span>{text}</span>;
    }
  };



  // Reset pagination to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTeam, selectedPeriod, selectedWord, selectedAgent, selectedMonth, selectedDay, selectedPriority, showOnlyRecurring, showOnlyInputError, showOnlyRoutingError]);

  // Pure function to apply heuristic automatic error detection merged with manual modifications
  const applyModificationsAndHeuristics = (rawTickets: Ticket[], mods: Record<string, any>): Ticket[] => {
    return rawTickets.map(ticket => {
      // 1. Heuristics for "Erro de Entrada" (Data Input Error)
      let hasInputError = false;
      const cleanPhone = ticket.phone ? ticket.phone.replace(/\D/g, '') : '';
      
      if (!ticket.phone || ticket.phone.trim() === '' || ticket.phone.toLowerCase().includes('não informado') || ticket.phone.toLowerCase().includes('sem telefone')) {
        hasInputError = true;
      } else if (cleanPhone.length < 8) {
        hasInputError = true;
      } else if (/^(\d)\1+$/.test(cleanPhone)) { // repetitive digits like 99999999 or 00000000
        hasInputError = true;
      }
      
      const descLower = (ticket.description || '').toLowerCase();
      const inputErrorWords = [
        'telefone errado', 'número inválido', 'não atende', 'sem contato', 
        'dados incorretos', 'cadastro desatualizado', 'email inválido', 
        'dados incompletos', 'contato inválido', 'número incorreto',
        'sem telefone', 'contato errado', 'telefone incorreto'
      ];
      if (inputErrorWords.some(word => descLower.includes(word))) {
        hasInputError = true;
      }

      // 2. Heuristics for "Erro de Direcionamento" (Routing Error)
      let hasRoutingError = false;
      
      // Automatic detection via Column K value
      if (ticket.columnKValue && ticket.columnKValue.trim() !== '') {
        hasRoutingError = true;
      }

      const routingErrorWords = [
        'direcionamento incorreto', 'time errado', 'equipe errada', 
        'enviado para o time errado', 'setor incorreto', 'mudar de equipe',
        'direcionado incorreto', 'direcionado errado', 'setor errado', 'redirecionar'
      ];
      if (routingErrorWords.some(word => descLower.includes(word))) {
        hasRoutingError = true;
      }

      // Dynamic conflict checking between assigned team and description keywords
      const teamLower = (ticket.team || '').toLowerCase();
      if (teamLower.includes('cobrança') || teamLower.includes('financeiro')) {
        const productKeywords = ['bug', 'erro no sistema', 'instabilidade', 'plataforma fora do ar', 'aplicativo não abre'];
        if (productKeywords.some(kw => descLower.includes(kw))) {
          hasRoutingError = true;
        }
      } else if (teamLower.includes('parcerias') || teamLower.includes('comercial')) {
        const billingKeywords = ['cobrança indevida', 'estorno', 'boleto em aberto', 'nota fiscal', 'pagamento pendente'];
        if (billingKeywords.some(kw => descLower.includes(kw))) {
          hasRoutingError = true;
        }
      }

      // Merge with manual modifications
      const ticketMod = mods[ticket.id] || {};
      
      return {
        ...ticket,
        hasInputError: ticketMod.hasInputError !== undefined ? ticketMod.hasInputError : hasInputError,
        hasRoutingError: ticketMod.hasRoutingError !== undefined ? ticketMod.hasRoutingError : hasRoutingError
      };
    });
  };

  // Compute final enhanced tickets list with automatic and manual properties
  const enhancedTickets = useMemo(() => {
    return applyModificationsAndHeuristics(tickets, ticketModifications);
  }, [tickets, ticketModifications]);

  // Action Handlers for Quality Control Updates
  const handleToggleInputError = (ticketId: string, value: boolean) => {
    setTicketModifications(prev => ({
      ...prev,
      [ticketId]: {
        ...prev[ticketId],
        hasInputError: value
      }
    }));
  };

  const handleToggleRoutingError = (ticketId: string, value: boolean) => {
    setTicketModifications(prev => ({
      ...prev,
      [ticketId]: {
        ...prev[ticketId],
        hasRoutingError: value
      }
    }));
  };

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
    return enhancedTickets.find(t => t.id === selectedTicketId) || null;
  }, [enhancedTickets, selectedTicketId]);

  // Dynamic set of all unique teams
  const uniqueTeams = useMemo(() => {
    const teamsSet = new Set<string>();
    enhancedTickets.forEach(t => {
      if (t.team) {
        teamsSet.add(t.team);
      }
    });
    return Array.from(teamsSet).sort();
  }, [enhancedTickets]);

  // Unique list of frontline assessors ("Quem enviou")
  const uniqueAgents = useMemo(() => {
    const agentsSet = new Set<string>();
    enhancedTickets.forEach(t => {
      if (t.agentName) {
        const cleanName = formatAgentName(t.agentName);
        if (cleanName) {
          agentsSet.add(cleanName);
        }
      }
    });
    return Array.from(agentsSet).filter(Boolean).sort();
  }, [enhancedTickets]);

  // Chronologically ordered months from the sheet history
  const uniqueMonths = useMemo(() => {
    const orderedMonths: string[] = [];
    const sortedTickets = [...enhancedTickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    sortedTickets.forEach(t => {
      if (t.createdAt) {
        const m = getTicketMonthYear(t.createdAt);
        if (!orderedMonths.includes(m)) {
          orderedMonths.push(m);
        }
      }
    });
    return orderedMonths;
  }, [enhancedTickets]);

  // Set default month to the most recent month once tickets are loaded
  useEffect(() => {
    if (uniqueMonths.length > 0 && !hasInitializedMonth.current) {
      setSelectedMonth(uniqueMonths[0]);
      if (!isLoading) {
        hasInitializedMonth.current = true;
      }
    }
  }, [uniqueMonths, isLoading]);

  // Identify recurring clients based on frequency > 1 in the raw base
  const recurringClients = useMemo(() => {
    const counts: Record<string, number> = {};
    enhancedTickets.forEach(t => {
      if (t.clientName) {
        const norm = t.clientName.trim().toUpperCase();
        counts[norm] = (counts[norm] || 0) + 1;
      }
    });
    const recurring = new Set<string>();
    Object.entries(counts).forEach(([name, count]) => {
      if (count > 1) {
        recurring.add(name);
      }
    });
    return recurring;
  }, [enhancedTickets]);

  // Compute filtered tickets
  const filteredTickets = useMemo(() => {
    return enhancedTickets.filter(ticket => {
      // 1. Team Filter
      if (selectedTeam && ticket.team !== selectedTeam) {
        return false;
      }

      // 2. Word Filter from WordCloud
      if (selectedWord && !ticket.keyWords.includes(selectedWord)) {
        return false;
      }

      // 3. Agent Filter ("Quem enviou")
      if (selectedAgent && formatAgentName(ticket.agentName) !== selectedAgent) {
        return false;
      }

      // 4. Specific Month Filter
      if (selectedMonth && getTicketMonthYear(ticket.createdAt) !== selectedMonth) {
        return false;
      }

      // 4.5. Specific Day Filter
      if (selectedDay) {
        const ticketDayStr = new Date(ticket.createdAt).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        if (ticketDayStr !== selectedDay) {
          return false;
        }
      }

      // 5. Period Range Filter
      if (!selectedMonth && !selectedDay) {
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
      }

      // 5.5. Priority Filter
      if (selectedPriority && ticket.urgency !== selectedPriority) {
        return false;
      }

      // 5.6. Show Only Recurring Clients Filter
      if (showOnlyRecurring && !recurringClients.has(ticket.clientName?.trim().toUpperCase())) {
        return false;
      }

      // 5.7. Show Only Input Error Filter
      if (showOnlyInputError && !ticket.hasInputError) {
        return false;
      }

      // 5.8. Show Only Routing Error Filter
      if (showOnlyRoutingError && !ticket.hasRoutingError) {
        return false;
      }

      // 6. Text Search Filter
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
  }, [enhancedTickets, searchTerm, selectedTeam, selectedPeriod, selectedWord, selectedAgent, selectedMonth, selectedDay, selectedPriority, showOnlyRecurring, showOnlyInputError, showOnlyRoutingError, recurringClients]);

  // Derived Performance Metrics (including Recurrence Rate)
  const metrics = useMemo(() => {
    const totalCount = filteredTickets.length;
    const urgentCount = filteredTickets.filter(t => t.urgency === 'Crítica' || t.urgency === 'Alta').length;
    
    const uniqueFilteredClients = Array.from(new Set(filteredTickets.map(t => t.clientName?.trim().toUpperCase()).filter(Boolean)));
    const recurringFilteredCount = uniqueFilteredClients.filter(name => recurringClients.has(name)).length;
    const recurrenceRate = uniqueFilteredClients.length > 0 ? Math.round((recurringFilteredCount / uniqueFilteredClients.length) * 100) : 0;

    const inputErrorCount = filteredTickets.filter(t => t.hasInputError).length;
    const routingErrorCount = filteredTickets.filter(t => t.hasRoutingError).length;

    return {
      totalCount,
      urgentCount,
      recurrenceRate,
      inputErrorCount,
      routingErrorCount
    };
  }, [filteredTickets, recurringClients]);

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
    setSelectedAgent(null);
    setSelectedMonth(null);
    setSelectedDay(null);
    setSelectedPriority(null);
    setShowOnlyRecurring(false);
    setShowOnlyInputError(false);
    setShowOnlyRoutingError(false);
  };

  const hasActiveFilters = searchTerm !== '' || selectedTeam !== null || selectedPeriod !== 'all' || selectedWord !== null || selectedAgent !== null || selectedMonth !== null || selectedDay !== null || selectedPriority !== null || showOnlyRecurring || showOnlyInputError || showOnlyRoutingError;

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
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleReload}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2.5 bg-obsidian-black hover:bg-electric-rose disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? "Sincronizando..." : "Sincronizar Planilha"}</span>
            </button>
          </div>
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
                
                <div className="flex items-center space-x-2">
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

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer transition-all"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                    <span>{showFilters ? 'Esconder Filtros' : 'Mostrar Filtros'}</span>
                  </motion.button>
                </div>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Search input */}
                <div className="col-span-12 md:col-span-3 relative">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Buscar por Conteúdo
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cliente, telefone..."
                      className="w-full text-sm pl-10 pr-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-electric-rose/20 focus:border-electric-rose font-sans text-slate-800 transition-all"
                    />
                  </div>
                </div>

                {/* Team Dropdown Filter */}
                <div className="col-span-12 sm:col-span-6 md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Filtrar por Equipe
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

                {/* Agent/Assessor Dropdown Filter */}
                <div className="col-span-12 sm:col-span-6 md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Solicitação enviada por:
                  </label>
                  <select
                    value={selectedAgent || ''}
                    onChange={(e) => setSelectedAgent(e.target.value || null)}
                    className="w-full text-sm py-2.5 px-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-electric-rose/20 focus:border-electric-rose font-sans text-slate-800 transition-all cursor-pointer"
                  >
                    <option value="">Todos os Assessores</option>
                    {uniqueAgents.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {/* Priority Dropdown Filter */}
                <div className="col-span-12 sm:col-span-6 md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Filtrar por Prioridade
                  </label>
                  <select
                    value={selectedPriority || ''}
                    onChange={(e) => setSelectedPriority(e.target.value || null)}
                    className="w-full text-sm py-2.5 px-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-electric-rose/20 focus:border-electric-rose font-sans text-slate-800 transition-all cursor-pointer"
                  >
                    <option value="">Todas as Prioridades</option>
                    <option value="Crítica">🚨 Crítica</option>
                    <option value="Alta">⚠️ Alta</option>
                    <option value="Média">🟡 Média</option>
                    <option value="Baixa">🟢 Baixa</option>
                    <option value="Dúvida">🔵 Dúvida</option>
                  </select>
                </div>

                {/* Period Range Tabs Filter */}
                <div className="col-span-12 md:col-span-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Intervalo Temporal Rápido
                  </label>
                  <div className="grid grid-cols-4 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                    {(['all', 'today', '7days', '30days'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => {
                          setSelectedPeriod(period);
                          setSelectedMonth(null); // Clear specific month if temporal tabs are clicked
                          setSelectedDay(null); // Clear specific day
                        }}
                        className={`
                          py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center capitalize
                          ${selectedPeriod === period && !selectedMonth && !selectedDay
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

                {/* Specific Month Dropdown Filter */}
                <div className="col-span-12 md:col-span-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Análise Mensal (Histórico)
                  </label>
                  <select
                    value={selectedMonth || ''}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      setSelectedMonth(val);
                      if (val) {
                        setSelectedPeriod('all'); // Clear fast period tabs if monthly filter is engaged
                        setSelectedDay(null); // Clear specific day
                      }
                    }}
                    className="w-full text-sm py-2.5 px-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-electric-rose/20 focus:border-electric-rose font-sans text-slate-800 transition-all cursor-pointer"
                  >
                    <option value="">Filtrar por Mês Específico (Todos)</option>
                    {uniqueMonths.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Specific Day Picker Filter */}
                <div className="col-span-12 md:col-span-4 relative">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Filtrar por Dia Específico
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={selectedDay || ''}
                      onChange={(e) => {
                        const val = e.target.value || null;
                        setSelectedDay(val);
                        if (val) {
                          setSelectedMonth(null); // Clear specific month if day is picked
                          setSelectedPeriod('all'); // Clear fast period tab
                        }
                      }}
                      className="w-full text-sm py-2.5 px-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-electric-rose/20 focus:border-electric-rose font-sans text-slate-800 transition-all cursor-pointer"
                    />
                    {selectedDay && (
                      <button
                        onClick={() => setSelectedDay(null)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-electric-rose font-bold text-sm bg-slate-100 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                        title="Limpar dia"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Checkboxes de Qualidade e Recorrência */}
                <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4 mt-1 bg-slate-50/50 border border-slate-200 p-4 rounded-xl">
                  
                  {/* Checkbox Recorrentes */}
                  <label className="flex items-start space-x-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showOnlyRecurring}
                      onChange={(e) => setShowOnlyRecurring(e.target.checked)}
                      className="w-4.5 h-4.5 rounded mt-0.5 border-slate-300 text-electric-rose focus:ring-electric-rose/20 accent-electric-rose cursor-pointer shrink-0"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" /> Clientes Reincidentes
                      </span>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Focar exclusivamente em clientes com múltiplos atendimentos históricos.
                      </p>
                    </div>
                  </label>

                  {/* Checkbox Erro de Entrada */}
                  <label className="flex items-start space-x-3 cursor-pointer select-none border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4">
                    <input
                      type="checkbox"
                      checked={showOnlyInputError}
                      onChange={(e) => setShowOnlyInputError(e.target.checked)}
                      className="w-4.5 h-4.5 rounded mt-0.5 border-slate-300 text-electric-rose focus:ring-electric-rose/20 accent-electric-rose cursor-pointer shrink-0"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" /> Erro de Entrada de Dados
                      </span>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Exibir chamados com telefones inválidos, vazios ou descrição com erro de contato.
                      </p>
                    </div>
                  </label>

                  {/* Checkbox Erro de Direcionamento */}
                  <label className="flex items-start space-x-3 cursor-pointer select-none border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4">
                    <input
                      type="checkbox"
                      checked={showOnlyRoutingError}
                      onChange={(e) => setShowOnlyRoutingError(e.target.checked)}
                      className="w-4.5 h-4.5 rounded mt-0.5 border-slate-300 text-electric-rose focus:ring-electric-rose/20 accent-electric-rose cursor-pointer shrink-0"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Shuffle className="w-4 h-4 text-indigo-500 shrink-0" /> Erro de Direcionamento
                      </span>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Exibir chamados enviados para equipes inadequadas ou incompatíveis.
                      </p>
                    </div>
                  </label>

                </div>
              </div>
            )}

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

                  {selectedAgent && (
                    <span className="inline-flex items-center px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-medium space-x-1.5 border border-slate-950">
                      <span>Enviado por: {selectedAgent}</span>
                      <button onClick={() => setSelectedAgent(null)} className="hover:text-electric-rose cursor-pointer font-bold">×</button>
                    </span>
                  )}

                  {selectedMonth && (
                    <span className="inline-flex items-center px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-medium space-x-1.5 border border-slate-950">
                      <span>Mês: {selectedMonth}</span>
                      <button onClick={() => setSelectedMonth(null)} className="hover:text-electric-rose cursor-pointer font-bold">×</button>
                    </span>
                  )}

                  {selectedDay && (
                    <span className="inline-flex items-center px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-medium space-x-1.5 border border-slate-950">
                      <span>Dia: {new Date(selectedDay + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                      <button onClick={() => setSelectedDay(null)} className="hover:text-electric-rose cursor-pointer font-bold">×</button>
                    </span>
                  )}

                  {selectedPeriod !== 'all' && !selectedMonth && !selectedDay && (
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

                  {selectedPriority && (
                    <span className="inline-flex items-center px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-medium space-x-1.5 border border-slate-950">
                      <span>Prioridade: {selectedPriority}</span>
                      <button onClick={() => setSelectedPriority(null)} className="hover:text-electric-rose cursor-pointer font-bold">×</button>
                    </span>
                  )}

                  {showOnlyRecurring && (
                    <span className="inline-flex items-center px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-medium space-x-1.5 shadow-xs shadow-amber-500/10">
                      <span>Apenas Reincidentes</span>
                      <button onClick={() => setShowOnlyRecurring(false)} className="hover:text-white/80 cursor-pointer font-bold">×</button>
                    </span>
                  )}

                  {showOnlyInputError && (
                    <span className="inline-flex items-center px-3 py-1 bg-red-500 text-white rounded-full text-xs font-medium space-x-1.5 shadow-xs shadow-red-500/10">
                      <span>Apenas Erro de Entrada</span>
                      <button onClick={() => setShowOnlyInputError(false)} className="hover:text-white/80 cursor-pointer font-bold">×</button>
                    </span>
                  )}

                  {showOnlyRoutingError && (
                    <span className="inline-flex items-center px-3 py-1 bg-indigo-500 text-white rounded-full text-xs font-medium space-x-1.5 shadow-xs shadow-indigo-500/10">
                      <span>Apenas Erro de Direcionamento</span>
                      <button onClick={() => setShowOnlyRoutingError(false)} className="hover:text-white/80 cursor-pointer font-bold">×</button>
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

            {/* 3. Metrics/KPI Row (3 columns, simple, elegant, no CSAT/SLA) */}
            <section id="metrics-row" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
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

              {/* Metric 3: Recurrence Rate */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-xs relative overflow-hidden group">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Fator de Recorrência
                  </span>
                  <h3 className="text-3xl font-black font-sans tracking-tight text-amber-600 font-mono">
                    {metrics.recurrenceRate}%
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Reincidência de clientes
                  </p>
                </div>
                <div className="p-3.5 bg-amber-50 text-amber-500 rounded-xl group-hover:bg-amber-100 transition-colors duration-300">
                  <RotateCcw className="w-5 h-5" />
                </div>
              </div>

            </section>

            {/* 3.5. Auditoria de Qualidade de Dados (Erros identificados) */}
            <section id="quality-audit-section" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0" />
                  <h2 className="text-sm font-extrabold text-obsidian-black uppercase tracking-wider">
                    Auditoria de Qualidade e Erros de Atendimento
                  </h2>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                  Diagnóstico Automático + Manual
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Erros de Entrada */}
                <div 
                  onClick={() => setShowOnlyInputError(!showOnlyInputError)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer select-none active:scale-98 relative overflow-hidden group ${
                    showOnlyInputError 
                      ? 'bg-red-50/85 border-red-200 text-red-900 shadow-xs' 
                      : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Erros de Entrada de Dados
                      </span>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-4xl font-black font-mono tracking-tight text-red-600">
                          {metrics.inputErrorCount}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          ({metrics.totalCount > 0 ? Math.round((metrics.inputErrorCount / metrics.totalCount) * 100) : 0}% dos chamados)
                        </span>
                      </div>
                    </div>
                    <AlertCircle className="w-7 h-7 text-red-500/80 group-hover:scale-110 transition-transform shrink-0" />
                  </div>
                  
                  {/* Progress Indicator */}
                  <div className="mt-3 w-full bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-red-500 h-full transition-all duration-500"
                      style={{ width: `${metrics.totalCount > 0 ? Math.min(100, (metrics.inputErrorCount / metrics.totalCount) * 100) : 0}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2 font-medium leading-relaxed">
                    Clientes sem telefone válido ou sinalização de contato inválido na solicitação. <span className="font-semibold text-slate-600 underline decoration-slate-300 decoration-dotted">{showOnlyInputError ? 'Clique para desativar filtro.' : 'Clique para filtrar chamados com este erro.'}</span>
                  </p>
                </div>

                {/* Erros de Direcionamento */}
                <div 
                  onClick={() => setShowOnlyRoutingError(!showOnlyRoutingError)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer select-none active:scale-98 relative overflow-hidden group ${
                    showOnlyRoutingError 
                      ? 'bg-indigo-50/85 border-indigo-200 text-indigo-900 shadow-xs' 
                      : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Erros de Direcionamento
                      </span>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-4xl font-black font-mono tracking-tight text-indigo-600">
                          {metrics.routingErrorCount}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          ({metrics.totalCount > 0 ? Math.round((metrics.routingErrorCount / metrics.totalCount) * 100) : 0}% dos chamados)
                        </span>
                      </div>
                    </div>
                    <Shuffle className="w-7 h-7 text-indigo-500/80 group-hover:scale-110 transition-transform shrink-0" />
                  </div>
                  
                  {/* Progress Indicator */}
                  <div className="mt-3 w-full bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-500"
                      style={{ width: `${metrics.totalCount > 0 ? Math.min(100, (metrics.routingErrorCount / metrics.totalCount) * 100) : 0}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2 font-medium leading-relaxed">
                    Chamados direcionados para equipes inadequadas baseando-se no texto descritivo. <span className="font-semibold text-slate-600 underline decoration-slate-300 decoration-dotted">{showOnlyRoutingError ? 'Clique para desativar filtro.' : 'Clique para filtrar chamados com este erro.'}</span>
                  </p>
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

            {/* 4.5. Composition Analysis Row */}
            <div className="grid grid-cols-1 gap-6">
              
              {/* Priority Composition Chart (Full width, centered) */}
              <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-electric-rose" />
                    <h2 className="text-sm font-extrabold text-obsidian-black uppercase tracking-wider">
                      Perfil de Criticidade (Prioridade)
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200/50">
                    COMPOSITION
                  </span>
                </div>
                
                <div className="max-w-2xl mx-auto w-full">
                  <PriorityPieChart filteredTickets={filteredTickets} />
                </div>
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
                              <span>{dateStr}</span>
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
                            {recurringClients.has(ticket.clientName?.trim().toUpperCase()) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0 ml-1 whitespace-nowrap" title="Cliente recorrente com múltiplos atendimentos">
                                <AlertCircle className="w-2.5 h-2.5 text-amber-500 mr-1 shrink-0" /> Reincidente
                              </span>
                            )}
                            {ticket.hasInputError && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-700 border border-red-200 shrink-0 ml-1 whitespace-nowrap" title="Esta solicitação possui erros na inserção de dados">
                                <AlertCircle className="w-2.5 h-2.5 text-red-500 mr-1 shrink-0" /> Entrada
                              </span>
                            )}
                            {ticket.hasRoutingError && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0 ml-1 whitespace-nowrap" title="Esta solicitação possui erros de direcionamento">
                                <Shuffle className="w-2.5 h-2.5 text-indigo-500 mr-1 shrink-0" /> Direcionamento
                              </span>
                            )}
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
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-slate-800">{ticket.clientName}</span>
                                    {recurringClients.has(ticket.clientName?.trim().toUpperCase()) && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0 whitespace-nowrap" title="Este cliente possui múltiplos chamados na base">
                                        <AlertCircle className="w-2.5 h-2.5 text-amber-500 mr-1 shrink-0" /> Reincidente
                                      </span>
                                    )}
                                    {ticket.hasInputError && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-700 border border-red-200 shrink-0 whitespace-nowrap" title="Esta solicitação possui erros na inserção de dados">
                                        <AlertCircle className="w-2.5 h-2.5 text-red-500 mr-1 shrink-0" /> Entrada
                                      </span>
                                    )}
                                    {ticket.hasRoutingError && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0 whitespace-nowrap" title="Esta solicitação possui erros de direcionamento">
                                        <Shuffle className="w-2.5 h-2.5 text-indigo-500 mr-1 shrink-0" /> Direcionamento
                                      </span>
                                    )}
                                  </div>
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
                                    {highlightText(ticket.description, searchTerm)}
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
        onToggleInputError={handleToggleInputError}
        onToggleRoutingError={handleToggleRoutingError}
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
