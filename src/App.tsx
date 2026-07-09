/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Users,
  TrendingUp,
  Sliders,
  CheckCircle2,
  FileSpreadsheet,
  BookOpen,
  Filter,
  BarChart4,
  User,
  AlertTriangle
} from 'lucide-react';
import { Ticket } from './types';
import { INITIAL_TICKETS } from './data';
import { parseGoogleSheetsCSV } from './utils';
import TicketDetailModal from './components/TicketDetailModal';
import BrasiliaClock from './components/BrasiliaClock';

type PeriodType = 'all' | 'today' | '7days' | '30days';

// Fast helpers outside of the component scope to enable easy pre-calculation and global caching
const monthYearCache: Record<string, string> = {};

export const getTicketMonthYearFast = (dateStr: string): string => {
  if (!dateStr) return '';
  if (monthYearCache[dateStr]) {
    return monthYearCache[dateStr];
  }
  try {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' });
    const year = date.toLocaleDateString('pt-BR', { year: 'numeric', timeZone: 'America/Sao_Paulo' });
    const result = `${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`;
    monthYearCache[dateStr] = result;
    return result;
  } catch (e) {
    return '';
  }
};

export const formatAgentNameFast = (rawName: string | undefined): string => {
  if (!rawName) return '';
  let name = rawName.trim();
  if (name.startsWith('@')) {
    name = name.substring(1);
  }
  const indexAt = name.indexOf('@');
  if (indexAt !== -1) {
    name = name.substring(0, indexAt);
  }
  return name.split(/[\._]/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
};

const localDayCache: Record<string, string> = {};

export const getTicketLocalDayFast = (dateStr: string): string => {
  if (!dateStr) return '';
  if (localDayCache[dateStr]) {
    return localDayCache[dateStr];
  }
  try {
    const date = new Date(dateStr);
    const result = date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    localDayCache[dateStr] = result;
    return result;
  } catch (e) {
    return '';
  }
};

export default function App() {
  // Active Ticket Database State
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Active View Tab State
  const [activeTab, setActiveTab] = useState<'executive' | 'analyst'>('executive');
  
  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [inputSearch, setInputSearch] = useState('');
  const [showAllMonths, setShowAllMonths] = useState(false);

  // Debounce search input to avoid heavy re-computations on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(inputSearch);
    }, 250);
    return () => clearTimeout(handler);
  }, [inputSearch]);

  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('all');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Boolean toggles
  const [showOnlyRecurring, setShowOnlyRecurring] = useState(false);
  const [showOnlyInputError, setShowOnlyInputError] = useState(false);
  const [showOnlyRoutingError, setShowOnlyRoutingError] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const hasInitializedMonth = useRef(false);

  // Dedicated Analyst Tab Selected Agent
  const [selectedAnalyst, setSelectedAnalyst] = useState<string>('');
  const [selectedAnalystMonth, setSelectedAnalystMonth] = useState<string>('all');

  // Load ticket modifications (manual overrides) from localStorage
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
  const itemsPerPage = 15;

  // Helper to get formatted month/year string
  const getTicketMonthYear = (dateStr: string) => {
    return getTicketMonthYearFast(dateStr);
  };

  // Helper to clean and format agent names (removes @ and domain or prefix)
  const formatAgentName = (rawName: string | undefined): string => {
    return formatAgentNameFast(rawName);
  };

  // Heuristic automatic error detection merged with manual modifications
  const applyModificationsAndHeuristics = (rawTickets: Ticket[], mods: Record<string, any>): Ticket[] => {
    return rawTickets.map(ticket => {
      // 1. Heuristics for "Erro de Entrada" (Data Input Error)
      let hasInputError = false;
      const inputErrorDetails: string[] = [];
      const cleanPhone = ticket.phone ? ticket.phone.replace(/\D/g, '') : '';
      const descLower = (ticket.description || '').toLowerCase();
      
      // -- Telefone verification
      let isPhoneError = false;
      if (!ticket.phone || ticket.phone.trim() === '' || ticket.phone.toLowerCase().includes('não informado') || ticket.phone.toLowerCase().includes('sem telefone')) {
        isPhoneError = true;
      } else if (cleanPhone.length < 8) {
        isPhoneError = true;
      } else if (/^(\d)\1+$/.test(cleanPhone)) { 
        isPhoneError = true;
      } else {
        const phoneErrorWords = ['telefone errado', 'número inválido', 'telefone incorreto', 'número incorreto', 'sem telefone', 'contato errado'];
        if (phoneErrorWords.some(word => descLower.includes(word))) {
          isPhoneError = true;
        }
      }
      if (isPhoneError) {
        inputErrorDetails.push('Telefone');
      }

      // -- Nome verification
      let isNameError = false;
      if (!ticket.clientName || ticket.clientName.trim() === '' || ticket.clientName.toLowerCase().includes('não informado') || ticket.clientName.toLowerCase().includes('cliente sem nome') || ticket.clientName.trim().length < 3) {
        isNameError = true;
      }
      if (isNameError) {
        inputErrorDetails.push('Nome');
      }

      // -- Link Iugu verification
      let isIuguError = false;
      if (!ticket.iuguUrl || ticket.iuguUrl.trim() === '' || ticket.iuguUrl.toLowerCase().includes('não informado') || ticket.iuguUrl.toLowerCase().includes('sem link') || !ticket.iuguUrl.toLowerCase().includes('iugu')) {
        isIuguError = true;
      }
      if (isIuguError) {
        inputErrorDetails.push('Link Iugu');
      }

      // -- Other data/desc based verification
      const generalErrorWords = ['dados incorretos', 'cadastro desatualizado', 'email inválido', 'dados incompletos', 'contato inválido'];
      if (generalErrorWords.some(word => descLower.includes(word))) {
        inputErrorDetails.push('Dados Incompletos');
      }

      if (inputErrorDetails.length > 0) {
        hasInputError = true;
      }

      // 2. Heuristics for "Erro de Direcionamento" (Routing Error)
      let hasRoutingError = false;
      
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

      const ticketMod = mods[ticket.id] || {};
      const finalHasInputError = ticketMod.hasInputError !== undefined ? ticketMod.hasInputError : hasInputError;
      
      let finalDetails: string[] = [];
      if (finalHasInputError) {
        if (inputErrorDetails.length > 0) {
          finalDetails = inputErrorDetails;
        } else {
          finalDetails = ['Marcação Manual'];
        }
      }
      
      // Precompute static values for superior performance
      const mY = getTicketMonthYearFast(ticket.createdAt);
      const fAN = formatAgentNameFast(ticket.agentName);
      const lD = getTicketLocalDayFast(ticket.createdAt);

      return {
        ...ticket,
        suggestedTeam: undefined,
        hasInputError: finalHasInputError,
        hasRoutingError: ticketMod.hasRoutingError !== undefined ? ticketMod.hasRoutingError : hasRoutingError,
        monthYear: mY,
        formattedAgentName: fAN,
        localDay: lD,
        inputErrorDetails: finalDetails
      };
    });
  };

  // Compute final enhanced tickets list
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

  // Dynamic lists for filters
  const uniqueTeams = useMemo(() => {
    const teamsSet = new Set<string>();
    enhancedTickets.forEach(t => {
      if (t.team) {
        teamsSet.add(t.team);
      }
    });
    return Array.from(teamsSet).sort();
  }, [enhancedTickets]);

  const uniqueAgents = useMemo(() => {
    const agentsSet = new Set<string>();
    enhancedTickets.forEach(t => {
      if (t.formattedAgentName) {
        agentsSet.add(t.formattedAgentName);
      }
    });
    return Array.from(agentsSet).filter(Boolean).sort();
  }, [enhancedTickets]);

  const uniqueCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    enhancedTickets.forEach(t => {
      if (t.category) {
        categoriesSet.add(t.category);
      }
    });
    return Array.from(categoriesSet).sort();
  }, [enhancedTickets]);

  const uniqueMonths = useMemo(() => {
    const orderedMonths: string[] = [];
    const sortedTickets = [...enhancedTickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    sortedTickets.forEach(t => {
      if (t.monthYear) {
        if (!orderedMonths.includes(t.monthYear)) {
          orderedMonths.push(t.monthYear);
        }
      }
    });
    return orderedMonths;
  }, [enhancedTickets]);

  // Set default month to the most recent month once tickets are loaded (Requirement: show current month by default)
  useEffect(() => {
    if (uniqueMonths.length > 0 && !hasInitializedMonth.current) {
      setSelectedMonth(uniqueMonths[0]);
      if (!isLoading) {
        hasInitializedMonth.current = true;
      }
    }
  }, [uniqueMonths, isLoading]);

  // Initial setup for default analyst selection in the second tab
  useEffect(() => {
    if (uniqueAgents.length > 0 && !selectedAnalyst) {
      setSelectedAnalyst(uniqueAgents[0]);
    }
  }, [uniqueAgents, selectedAnalyst]);

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

  // Compute filtered tickets for dashboard calculations
  const filteredTickets = useMemo(() => {
    return enhancedTickets.filter(ticket => {
      // 1. Team Filter
      if (selectedTeam && ticket.team !== selectedTeam) {
        return false;
      }

      // 2. Category Filter
      if (selectedCategory && ticket.category !== selectedCategory) {
        return false;
      }

      // 3. Agent Filter ("Quem enviou")
      if (selectedAgent && ticket.formattedAgentName !== selectedAgent) {
        return false;
      }

      // 4. Specific Month Filter (Active by default)
      if (selectedMonth && ticket.monthYear !== selectedMonth) {
        return false;
      }

      // 5. Specific Day Filter
      if (selectedDay && ticket.localDay !== selectedDay) {
        return false;
      }

      // 6. Fast Period Range Filter
      if (!selectedMonth && !selectedDay) {
        if (selectedPeriod === 'today') {
          const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
          if (ticket.localDay !== todayStr) return false;
        } else if (selectedPeriod === '7days') {
          const ticketDate = new Date(ticket.createdAt);
          const referenceDate = new Date();
          const diffTime = Math.abs(referenceDate.getTime() - ticketDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 7) return false;
        } else if (selectedPeriod === '30days') {
          const ticketDate = new Date(ticket.createdAt);
          const referenceDate = new Date();
          const diffTime = Math.abs(referenceDate.getTime() - ticketDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 30) return false;
        }
      }

      // 7. Urgency/Priority Filter
      if (selectedPriority && ticket.urgency !== selectedPriority) {
        return false;
      }

      // 8. Advanced Date Pickers
      if (startDate) {
        const ticketDate = new Date(ticket.createdAt);
        const filterStart = new Date(startDate + 'T00:00:00');
        if (ticketDate < filterStart) return false;
      }
      if (endDate) {
        const ticketDate = new Date(ticket.createdAt);
        const filterEnd = new Date(endDate + 'T23:59:59');
        if (ticketDate > filterEnd) return false;
      }

      // 9. Status Filter
      if (statusFilter !== 'all') {
        const isResolved = ticket.columnKValue && ticket.columnKValue.trim() !== '';
        if (statusFilter === 'resolved' && !isResolved) return false;
        if (statusFilter === 'open' && isResolved) return false;
      }

      // 10. Quality error toggles
      if (showOnlyRecurring && !recurringClients.has(ticket.clientName?.trim().toUpperCase())) {
        return false;
      }
      if (showOnlyInputError && !ticket.hasInputError) {
        return false;
      }
      if (showOnlyRoutingError && !ticket.hasRoutingError) {
        return false;
      }

      // 11. Text Search Filter (Client/Company/Keyword/Description)
      if (searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        const matchesClient = ticket.clientName?.toLowerCase().includes(searchLower);
        const matchesPhone = ticket.phone?.toLowerCase().includes(searchLower);
        const matchesDesc = ticket.description?.toLowerCase().includes(searchLower);
        const matchesCategory = ticket.category?.toLowerCase().includes(searchLower);
        
        if (!matchesClient && !matchesPhone && !matchesDesc && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [
    enhancedTickets, 
    searchTerm, 
    selectedTeam, 
    selectedPeriod, 
    selectedAgent, 
    selectedCategory, 
    selectedMonth, 
    selectedDay, 
    selectedPriority, 
    startDate, 
    endDate, 
    statusFilter, 
    showOnlyRecurring, 
    showOnlyInputError, 
    showOnlyRoutingError, 
    recurringClients
  ]);

  // Derived KPIs for Executive Summary
  const metrics = useMemo(() => {
    const totalCount = filteredTickets.length;
    const uniqueClientsList = Array.from(new Set(filteredTickets.map(t => t.clientName?.trim().toUpperCase()).filter(Boolean)));
    const uniqueClientsServed = uniqueClientsList.length;
    const recurringClientsCount = uniqueClientsList.filter(client => recurringClients.has(client)).length;
    const singleTicketClientsCount = uniqueClientsServed - recurringClientsCount;

    let recurringOnlyThisPeriod = 0;
    let recurringAcrossPeriods = 0;

    uniqueClientsList.forEach(client => {
      if (recurringClients.has(client)) {
        const historyCount = enhancedTickets.filter(t => t.clientName?.trim().toUpperCase() === client).length;
        const periodCount = filteredTickets.filter(t => t.clientName?.trim().toUpperCase() === client).length;
        if (periodCount === historyCount) {
          recurringOnlyThisPeriod++;
        } else {
          recurringAcrossPeriods++;
        }
      }
    });

    const agentsCount = new Set(filteredTickets.map(t => t.formattedAgentName).filter(Boolean)).size;
    const inputErrorCount = filteredTickets.filter(t => t.hasInputError).length;
    const routingErrorCount = filteredTickets.filter(t => t.hasRoutingError).length;

    const inputErrorRate = totalCount > 0 ? Math.round((inputErrorCount / totalCount) * 100) : 0;
    const routingErrorRate = totalCount > 0 ? Math.round((routingErrorCount / totalCount) * 100) : 0;

    const criticalCount = filteredTickets.filter(t => t.urgency === 'Crítica').length;
    const highCount = filteredTickets.filter(t => t.urgency === 'Alta').length;
    const mediumCount = filteredTickets.filter(t => t.urgency === 'Média').length;
    const lowCount = filteredTickets.filter(t => t.urgency === 'Baixa').length;
    const doubtCount = filteredTickets.filter(t => t.urgency === 'Dúvida').length;

    return {
      totalCount,
      uniqueClientsServed,
      recurringClientsCount,
      singleTicketClientsCount,
      recurringOnlyThisPeriod,
      recurringAcrossPeriods,
      agentsCount,
      inputErrorCount,
      routingErrorCount,
      inputErrorRate,
      routingErrorRate,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      doubtCount
    };
  }, [filteredTickets, recurringClients, enhancedTickets]);



  // CATEGORIES BREAKDOWN (O que os clientes estão dizendo)
  const categoriesBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });

    const total = filteredTickets.length;
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredTickets]);

  // TENDENCY HISTORY OF TOP CATEGORIES BY MONTH
  const trendsData = useMemo(() => {
    // Top 5 categories in active set
    const top5Cats = categoriesBreakdown.slice(0, 5).map(c => c.name);
    
    // Group monthly
    const monthlyGroups: Record<string, Record<string, number>> = {};
    enhancedTickets.forEach(t => {
      const month = t.monthYear || '';
      if (!monthlyGroups[month]) {
        monthlyGroups[month] = {};
        top5Cats.forEach(cat => {
          monthlyGroups[month][cat] = 0;
        });
      }
      if (top5Cats.includes(t.category)) {
        monthlyGroups[month][t.category] = (monthlyGroups[month][t.category] || 0) + 1;
      }
    });

    // Format for rendering and sort from most recent (current month) to previous/older months
    return Object.entries(monthlyGroups)
      .map(([month, cats]) => ({
        month,
        cats: Object.entries(cats).map(([name, count]) => ({ name, count }))
      }))
      .sort((a, b) => {
        const indexA = uniqueMonths.indexOf(a.month);
        const indexB = uniqueMonths.indexOf(b.month);
        const valA = indexA === -1 ? 999 : indexA;
        const valB = indexB === -1 ? 999 : indexB;
        return valA - valB;
      });
  }, [enhancedTickets, categoriesBreakdown, uniqueMonths]);

  // SPECIFIC ERROR DIAGNOSTICS (Qualidade de Dados)
  const dataQualityDiagnostics = useMemo(() => {
    let emptyPhone = 0;
    let repetitivePhone = 0;
    let invalidDescriptionKeyword = 0;

    filteredTickets.filter(t => t.hasInputError).forEach(t => {
      const cleanPhone = t.phone ? t.phone.replace(/\D/g, '') : '';
      if (!t.phone || t.phone.trim() === '' || t.phone.toLowerCase().includes('não informado')) {
        emptyPhone++;
      } else if (cleanPhone.length < 8 || /^(\d)\1+$/.test(cleanPhone)) {
        repetitivePhone++;
      } else {
        invalidDescriptionKeyword++;
      }
    });

    return [
      { name: "Telefone Ausente / Não Informado", count: emptyPhone, recovery: "Tornar o campo de telefone obrigatório no formulário de entrada." },
      { name: "Telefone com Dígitos Repetitivos ou Inválidos", count: repetitivePhone, recovery: "Adicionar máscara rígida e verificação de dígitos reais via regex." },
      { name: "Sinalização de Contato Incorreto na Descrição", count: invalidDescriptionKeyword, recovery: "Validar e-mail e telefone secundário do cliente no momento de abertura." }
    ].filter(d => d.count > 0).sort((a, b) => b.count - a.count);
  }, [filteredTickets]);

  const routingQualityDiagnostics = useMemo(() => {
    let financeiroMismatch = 0;
    let comercialMismatch = 0;
    let explicitKeywordsCount = 0;

    filteredTickets.filter(t => t.hasRoutingError).forEach(t => {
      const descLower = (t.description || '').toLowerCase();
      const teamLower = (t.team || '').toLowerCase();

      if (teamLower.includes('cobrança') || teamLower.includes('financeiro')) {
        const productKeywords = ['bug', 'erro no sistema', 'instabilidade', 'plataforma fora do ar', 'aplicativo não abre'];
        if (productKeywords.some(kw => descLower.includes(kw))) {
          financeiroMismatch++;
        }
      } else if (teamLower.includes('parcerias') || teamLower.includes('comercial')) {
        const billingKeywords = ['cobrança indevida', 'estorno', 'boleto em aberto', 'nota fiscal', 'pagamento pendente'];
        if (billingKeywords.some(kw => descLower.includes(kw))) {
          comercialMismatch++;
        }
      } else {
        explicitKeywordsCount++;
      }
    });

    return [
      { name: "Módulos de Sistema / Bugs direcionados ao Financeiro", count: financeiroMismatch, recovery: "Treinar agentes ou ajustar regras do bot para enviar falhas sistêmicas ao Suporte Técnico." },
      { name: "Erros de Pagamento / Boletos direcionados ao Comercial", count: comercialMismatch, recovery: "Redirecionar palavras-chave como 'estorno' e 'boleto' diretamente para Cobrança." },
      { name: "Direcionamento incorreto explícito no texto", count: explicitKeywordsCount, recovery: "Configurar análise semântica prévia no formulário do cliente." }
    ].filter(d => d.count > 0).sort((a, b) => b.count - a.count);
  }, [filteredTickets]);

  const columnKErrorsBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalWithRoutingError = 0;
    filteredTickets.forEach(t => {
      if (t.hasRoutingError) {
        totalWithRoutingError++;
        if (t.columnKValue && t.columnKValue.trim() !== '') {
          const val = t.columnKValue.trim();
          counts[val] = (counts[val] || 0) + 1;
        } else {
          counts['Outros Erros'] = (counts['Outros Erros'] || 0) + 1;
        }
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ 
        name, 
        count,
        percentage: totalWithRoutingError > 0 ? Math.round((count / totalWithRoutingError) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredTickets]);

  const inputErrorsBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalWithInputError = 0;
    filteredTickets.forEach(t => {
      if (t.hasInputError) {
        totalWithInputError++;
        if (t.inputErrorDetails && t.inputErrorDetails.length > 0) {
          t.inputErrorDetails.forEach(detail => {
            counts[detail] = (counts[detail] || 0) + 1;
          });
        } else {
          counts['Outros'] = (counts['Outros'] || 0) + 1;
        }
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ 
        name, 
        count,
        percentage: totalWithInputError > 0 ? Math.round((count / totalWithInputError) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredTickets]);

  // COMPUTE INDIVIDUAL COLLABORATOR/ANALYST METRICS (Secondary Dashboard)
  const analystMetrics = useMemo(() => {
    if (!selectedAnalyst) return null;

    let analystTickets = enhancedTickets.filter(t => formatAgentName(t.agentName) === selectedAnalyst);
    if (selectedAnalystMonth && selectedAnalystMonth !== 'all') {
      analystTickets = analystTickets.filter(t => t.monthYear === selectedAnalystMonth);
    }

    const total = analystTickets.length;
    const uniqueClientsList = Array.from(new Set(analystTickets.map(t => t.clientName?.trim().toUpperCase()).filter(Boolean)));
    const uniqueClients = uniqueClientsList.length;
    const recurringClientsCount = uniqueClientsList.filter(client => recurringClients.has(client)).length;
    const singleTicketClientsCount = uniqueClients - recurringClientsCount;

    let recurringOnlyThisPeriod = 0;
    let recurringAcrossPeriods = 0;

    uniqueClientsList.forEach(client => {
      if (recurringClients.has(client)) {
        const historyCount = enhancedTickets.filter(t => t.clientName?.trim().toUpperCase() === client).length;
        const periodCount = analystTickets.filter(t => t.clientName?.trim().toUpperCase() === client).length;
        if (periodCount === historyCount) {
          recurringOnlyThisPeriod++;
        } else {
          recurringAcrossPeriods++;
        }
      }
    });

    const inputErrors = analystTickets.filter(t => t.hasInputError).length;
    const routingErrors = analystTickets.filter(t => t.hasRoutingError).length;
    const totalErrors = analystTickets.filter(t => t.hasInputError || t.hasRoutingError).length;
    const errorRate = total > 0 ? Math.round((totalErrors / total) * 100) : 0;

    // Categories breakdown for this analyst
    const catCounts: Record<string, number> = {};
    analystTickets.forEach(t => {
      catCounts[t.category] = (catCounts[t.category] || 0) + 1;
    });
    const topCategories = Object.entries(catCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Daily volume chart timeline (grouped by date)
    const dailyVolume: Record<string, number> = {};
    analystTickets.forEach(t => {
      const dateStr = new Date(t.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
      dailyVolume[dateStr] = (dailyVolume[dateStr] || 0) + 1;
    });

    const timelineData = Object.entries(dailyVolume)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => {
        const [dayA, monthA] = a.date.split('/').map(Number);
        const [dayB, monthB] = b.date.split('/').map(Number);
        return (monthA * 30 + dayA) - (monthB * 30 + dayB);
      });

    return {
      total,
      uniqueClients,
      recurringClientsCount,
      singleTicketClientsCount,
      recurringOnlyThisPeriod,
      recurringAcrossPeriods,
      inputErrors,
      routingErrors,
      totalErrors,
      errorRate,
      topCategories,
      timelineData
    };
  }, [enhancedTickets, selectedAnalyst, selectedAnalystMonth, recurringClients]);

  // General tickets list chronologically ordered
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
    setInputSearch('');
    setSelectedTeam(null);
    setSelectedPeriod('all');
    setSelectedAgent(null);
    setSelectedCategory(null);
    setSelectedMonth(null);
    setSelectedDay(null);
    setSelectedPriority(null);
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setShowOnlyRecurring(false);
    setShowOnlyInputError(false);
    setShowOnlyRoutingError(false);
    setCurrentPage(1);
  };

  const hasActiveFilters = 
    searchTerm !== '' || 
    inputSearch !== '' ||
    selectedTeam !== null || 
    selectedPeriod !== 'all' || 
    selectedAgent !== null || 
    selectedCategory !== null || 
    selectedMonth !== null || 
    selectedDay !== null || 
    selectedPriority !== null || 
    statusFilter !== 'all' || 
    startDate !== '' || 
    endDate !== '' || 
    showOnlyRecurring || 
    showOnlyInputError || 
    showOnlyRoutingError;

  return (
    <div className="min-h-screen bg-slate-50 text-obsidian-black font-sans antialiased flex flex-col selection:bg-electric-rose/10 selection:text-electric-rose">
      {/* 1. Global Navigation Bar */}
      <nav id="navbar" className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center space-x-3 select-none">
            <div className="w-2.5 h-8 bg-electric-rose rounded-xs"></div>
            <span className="font-sans font-black tracking-tight text-xl text-obsidian-black flex items-center">
              COMPANY<span className="text-electric-rose font-normal ml-0.5">HERO</span>
            </span>
            <span className="hidden md:inline-block h-4 w-[1px] bg-slate-200 mx-3"></span>
            <span className="hidden md:inline-block text-xs font-mono text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded border border-slate-100">
              Painel de Inteligência CX
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <BrasiliaClock />

            <button 
              onClick={handleReload}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border cursor-pointer hover:opacity-90 transition-all ${
                isLive 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
              title="Clique para sincronizar com Google Sheets"
            >
              {isLive ? <Wifi className="w-3.5 h-3.5 animate-pulse" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-bold font-mono">
                {isLive ? "LIVE SPREADSHEET" : "MODO LOCAL OFFLINE"}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Error notification banner */}
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
              Sincronizar Novamente
            </button>
          </div>
        )}

        {/* Header Branding & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-obsidian-black flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-electric-rose shrink-0" />
              Inteligência e Gestão de CX
            </h1>
            <p className="text-slate-500 text-sm mt-1 max-w-3xl">
              Transformando chamados operacionais em insights estratégicos. Entenda os motivos, identifique tendências e aumente a qualidade.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleReload}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2.5 bg-obsidian-black hover:bg-electric-rose disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? "Sincronizando..." : "Sincronizar Planilha"}</span>
            </button>
          </div>
        </div>

        {/* SLIDING TAB NAVIGATION SYSTEM */}
        <div className="flex space-x-1 bg-slate-200/60 p-1.5 rounded-2xl max-w-lg">
          <button
            onClick={() => setActiveTab('executive')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center space-x-2 ${
              activeTab === 'executive' 
                ? 'bg-white text-obsidian-black shadow-md font-extrabold' 
                : 'text-slate-500 hover:text-obsidian-black'
            }`}
          >
            <BarChart4 className="w-3.5 h-3.5 text-electric-rose" />
            <span>Dashboard Executivo</span>
          </button>
          <button
            onClick={() => setActiveTab('analyst')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center space-x-2 ${
              activeTab === 'analyst' 
                ? 'bg-white text-obsidian-black shadow-md font-extrabold' 
                : 'text-slate-500 hover:text-obsidian-black'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-electric-rose" />
            <span>Performance de Analistas</span>
          </button>
        </div>

        {/* LOADING INDICATOR */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center space-y-4 shadow-sm min-h-[400px]">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-electric-rose rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-600 font-sans">
              Carregando chamados e normalizando dados operacionais...
            </p>
            <p className="text-xs text-slate-400 max-w-md text-center leading-relaxed">
              Mapeando motivos, aplicando heurísticas inteligentes e gerando resumos de qualidade em tempo real.
            </p>
          </div>
        ) : (
          <>
            {/* 2. REORGANIZED & SIMPLIFIED FILTER BAR */}
            {activeTab === 'executive' && (
              <section id="filters-panel" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-electric-rose" />
                  <h2 className="text-xs font-bold text-obsidian-black uppercase tracking-wider">
                    Filtros de Segmentação
                  </h2>
                </div>
                
                <div className="flex items-center space-x-2">
                  {hasActiveFilters && (
                    <button
                      onClick={handleResetFilters}
                      className="flex items-center space-x-1 text-xs text-electric-rose hover:text-white hover:bg-electric-rose px-2.5 py-1.5 rounded-lg border border-electric-rose/20 cursor-pointer transition-all font-bold"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Limpar Filtros</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer transition-all"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    <span>{showFilters ? 'Ocultar Filtros' : 'Exibir Filtros'}</span>
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="space-y-4">
                  {/* Principal Always Visible Filters Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
                    {/* Period selection */}
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Período de Análise</label>
                      <div className="grid grid-cols-4 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                        {(['all', 'today', '7days', '30days'] as const).map((period) => (
                          <button
                            key={period}
                            onClick={() => {
                              setSelectedPeriod(period);
                              setSelectedMonth(null);
                              setSelectedDay(null);
                            }}
                            className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer text-center capitalize ${
                              selectedPeriod === period && !selectedMonth && !selectedDay
                                ? 'bg-white text-obsidian-black shadow-xs font-extrabold' 
                                : 'text-slate-500 hover:text-obsidian-black'
                            }`}
                          >
                            {period === 'all' ? 'Todos' : period === 'today' ? 'Hoje' : period === '7days' ? '7d' : '30d'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Team Filter */}
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Equipe</label>
                      <select
                        value={selectedTeam || ''}
                        onChange={(e) => setSelectedTeam(e.target.value || null)}
                        className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-electric-rose text-slate-700 font-medium cursor-pointer"
                      >
                        <option value="">Todas as Equipes</option>
                        {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    {/* Analyst Filter */}
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Analista (Criador)</label>
                      <select
                        value={selectedAgent || ''}
                        onChange={(e) => setSelectedAgent(e.target.value || null)}
                        className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-electric-rose text-slate-700 font-medium cursor-pointer"
                      >
                        <option value="">Todos os Analistas</option>
                        {uniqueAgents.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>

                    {/* Category Filter */}
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Motivo / Categoria</label>
                      <select
                        value={selectedCategory || ''}
                        onChange={(e) => setSelectedCategory(e.target.value || null)}
                        className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-electric-rose text-slate-700 font-medium cursor-pointer"
                      >
                        <option value="">Todos os Motivos</option>
                        {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Criticidade Filter */}
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Criticidade</label>
                      <select
                        value={selectedPriority || ''}
                        onChange={(e) => setSelectedPriority(e.target.value || null)}
                        className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-electric-rose text-slate-700 font-medium cursor-pointer"
                      >
                        <option value="">Todas as Gravidades</option>
                        <option value="Crítica">🚨 Crítica</option>
                        <option value="Alta">⚠️ Alta</option>
                        <option value="Média">🟡 Média</option>
                        <option value="Baixa">🟢 Baixa</option>
                        <option value="Dúvida">🔵 Dúvida</option>
                      </select>
                    </div>
                  </div>

                  {/* Toggle Advanced Filters Accordion */}
                  <div className="pt-2">
                    <button 
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className="text-xs font-bold text-electric-rose flex items-center space-x-1 hover:underline cursor-pointer focus:outline-none"
                    >
                      <span>{showAdvancedFilters ? 'Ocultar Filtros Avançados' : 'Mais Opções de Filtros'}</span>
                      <span className="text-[10px]">{showAdvancedFilters ? '▲' : '▼'}</span>
                    </button>
                  </div>

                  {/* Advanced Filters Block */}
                  {showAdvancedFilters && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100"
                    >
                      {/* Search text */}
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Buscar por Cliente / Conteúdo</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={inputSearch}
                            onChange={(e) => setInputSearch(e.target.value)}
                            placeholder="Nome, telefone, motivo..."
                            className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-electric-rose font-sans text-slate-700"
                          />
                        </div>
                      </div>

                      {/* Status Filter */}
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status do Chamado</label>
                        <select
                          value={statusFilter}
                          onChange={(e: any) => setStatusFilter(e.target.value)}
                          className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-electric-rose text-slate-700 font-medium cursor-pointer"
                        >
                          <option value="all">Todos os Status</option>
                          <option value="open">Em Aberto</option>
                          <option value="resolved">Resolvido (Com Coluna K)</option>
                        </select>
                      </div>

                      {/* Filter Month */}
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mês Específico (Histórico)</label>
                        <select
                          value={selectedMonth || ''}
                          onChange={(e) => {
                            const val = e.target.value || null;
                            setSelectedMonth(val);
                            if (val) {
                              setSelectedPeriod('all');
                              setSelectedDay(null);
                            }
                          }}
                          className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-electric-rose text-slate-700 font-medium cursor-pointer"
                        >
                          <option value="">Todos os Meses</option>
                          {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>

                      {/* Specific Day Picker */}
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-400" /> Dia Específico</label>
                        <input
                          type="date"
                          value={selectedDay || ''}
                          onChange={(e) => {
                            const val = e.target.value || null;
                            setSelectedDay(val);
                            if (val) {
                              setSelectedMonth(null);
                              setSelectedPeriod('all');
                            }
                          }}
                          className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-electric-rose text-slate-700 font-medium cursor-pointer"
                        />
                      </div>

                      {/* Start Date */}
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Data Inicial de Intervalo</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>

                      {/* End Date */}
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Data Final de Intervalo</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>

                      {/* Quick toggles */}
                      <div className="col-span-1 sm:col-span-2 flex items-center gap-4 mt-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={showOnlyRecurring}
                            onChange={(e) => setShowOnlyRecurring(e.target.checked)}
                            className="w-4 h-4 rounded text-electric-rose focus:ring-0 accent-electric-rose"
                          />
                          <span className="text-xs font-bold text-slate-700">Apenas Reincidentes</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={showOnlyInputError}
                            onChange={(e) => setShowOnlyInputError(e.target.checked)}
                            className="w-4 h-4 rounded text-electric-rose focus:ring-0 accent-electric-rose"
                          />
                          <span className="text-xs font-bold text-slate-700">Erro de Cadastro</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={showOnlyRoutingError}
                            onChange={(e) => setShowOnlyRoutingError(e.target.checked)}
                            className="w-4 h-4 rounded text-electric-rose focus:ring-0 accent-electric-rose"
                          />
                          <span className="text-xs font-bold text-slate-700">Erro de Roteamento</span>
                        </label>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Active Filters Display Chips */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 mt-2 pt-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Filtros ativos:</span>
                  {selectedTeam && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-900 text-white rounded-md text-xs font-semibold">
                      <span>Equipe: {selectedTeam}</span>
                      <button onClick={() => setSelectedTeam(null)} className="ml-1.5 hover:text-electric-rose font-bold">×</button>
                    </span>
                  )}
                  {selectedCategory && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-electric-rose text-white rounded-md text-xs font-semibold">
                      <span>Assunto: {selectedCategory}</span>
                      <button onClick={() => setSelectedCategory(null)} className="ml-1.5 hover:text-white/80 font-bold">×</button>
                    </span>
                  )}
                  {selectedAgent && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-900 text-white rounded-md text-xs font-semibold">
                      <span>Analista: {selectedAgent}</span>
                      <button onClick={() => setSelectedAgent(null)} className="ml-1.5 hover:text-electric-rose font-bold">×</button>
                    </span>
                  )}
                  {selectedMonth && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-900 text-white rounded-md text-xs font-semibold">
                      <span>Mês: {selectedMonth}</span>
                      <button onClick={() => setSelectedMonth(null)} className="ml-1.5 hover:text-electric-rose font-bold">×</button>
                    </span>
                  )}
                  {selectedDay && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-900 text-white rounded-md text-xs font-semibold">
                      <span>Dia: {selectedDay}</span>
                      <button onClick={() => setSelectedDay(null)} className="ml-1.5 hover:text-electric-rose font-bold">×</button>
                    </span>
                  )}
                  {selectedPriority && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-900 text-white rounded-md text-xs font-semibold">
                      <span>Gravidade: {selectedPriority}</span>
                      <button onClick={() => setSelectedPriority(null)} className="ml-1.5 hover:text-electric-rose font-bold">×</button>
                    </span>
                  )}
                  {statusFilter !== 'all' && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-900 text-white rounded-md text-xs font-semibold">
                      <span>Status: {statusFilter === 'resolved' ? 'Resolvido' : 'Em Aberto'}</span>
                      <button onClick={() => setStatusFilter('all')} className="ml-1.5 hover:text-electric-rose font-bold">×</button>
                    </span>
                  )}
                  {showOnlyRecurring && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-amber-500 text-white rounded-md text-xs font-semibold">
                      <span>Apenas Reincidentes</span>
                      <button onClick={() => setShowOnlyRecurring(false)} className="ml-1.5 hover:text-white/80 font-bold">×</button>
                    </span>
                  )}
                  {showOnlyInputError && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-red-500 text-white rounded-md text-xs font-semibold">
                      <span>Apenas Erro de Cadastro</span>
                      <button onClick={() => setShowOnlyInputError(false)} className="ml-1.5 hover:text-white/80 font-bold">×</button>
                    </span>
                  )}
                  {showOnlyRoutingError && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-indigo-500 text-white rounded-md text-xs font-semibold">
                      <span>Apenas Erro de Roteamento</span>
                      <button onClick={() => setShowOnlyRoutingError(false)} className="ml-1.5 hover:text-white/80 font-bold">×</button>
                    </span>
                  )}
                  {searchTerm && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-900 text-white rounded-md text-xs font-semibold">
                      <span>Busca: "{searchTerm}"</span>
                      <button onClick={() => { setSearchTerm(''); setInputSearch(''); }} className="ml-1.5 hover:text-electric-rose font-bold">×</button>
                    </span>
                  )}
                </div>
              )}
            </section>
            )}

            {/* TAB CONTENT SWITCHER */}
            <AnimatePresence mode="wait">
              {activeTab === 'executive' ? (
                <motion.div
                  key="executive"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  {/* AREA 1: EXECUTIVE RESUMO */}
                  <div className="grid grid-cols-1 gap-6">
                    {/* Metrics KPIs list */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
                      {/* KPI 1: Total de Solicitações */}
                      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Solicitações</span>
                            <span className="p-1.5 bg-slate-50 rounded-lg text-slate-500 border border-slate-100">
                              <Inbox className="w-4 h-4" />
                            </span>
                          </div>
                          <div className="mt-3 flex items-baseline justify-between">
                            <h3 className="text-4xl font-black font-mono tracking-tight text-obsidian-black">{metrics.totalCount}</h3>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">Chamados no escopo</span>
                          </div>
                        </div>

                        {/* Elegant Breakdown for Criticality */}
                        <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3">
                          {/* Segmented bar graph */}
                          {metrics.totalCount > 0 && (
                            <div className="space-y-1.5">
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                                {metrics.criticalCount > 0 && (
                                  <div 
                                    className="bg-red-500 h-full transition-all duration-500" 
                                    style={{ width: `${(metrics.criticalCount / metrics.totalCount) * 100}%` }}
                                    title={`Crítica: ${metrics.criticalCount}`}
                                  />
                                )}
                                {metrics.highCount > 0 && (
                                  <div 
                                    className="bg-orange-500 h-full transition-all duration-500" 
                                    style={{ width: `${(metrics.highCount / metrics.totalCount) * 100}%` }}
                                    title={`Alta: ${metrics.highCount}`}
                                  />
                                )}
                                {metrics.mediumCount > 0 && (
                                  <div 
                                    className="bg-amber-400 h-full transition-all duration-500" 
                                    style={{ width: `${(metrics.mediumCount / metrics.totalCount) * 100}%` }}
                                    title={`Média: ${metrics.mediumCount}`}
                                  />
                                )}
                                {metrics.lowCount > 0 && (
                                  <div 
                                    className="bg-emerald-500 h-full transition-all duration-500" 
                                    style={{ width: `${(metrics.lowCount / metrics.totalCount) * 100}%` }}
                                    title={`Baixa: ${metrics.lowCount}`}
                                  />
                                )}
                                {metrics.doubtCount > 0 && (
                                  <div 
                                    className="bg-sky-500 h-full transition-all duration-500" 
                                    style={{ width: `${(metrics.doubtCount / metrics.totalCount) * 100}%` }}
                                    title={`Dúvida: ${metrics.doubtCount}`}
                                  />
                                )}
                              </div>
                              <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase">
                                <span className="text-red-500">Crítica/Alta ({metrics.totalCount > 0 ? Math.round(((metrics.criticalCount + metrics.highCount) / metrics.totalCount) * 100) : 0}%)</span>
                                <span className="text-emerald-600">Baixa/Dúvida ({metrics.totalCount > 0 ? Math.round(((metrics.lowCount + metrics.doubtCount) / metrics.totalCount) * 100) : 0}%)</span>
                              </div>
                            </div>
                          )}

                          {/* 5-Column Grid with interactive buttons */}
                          <div className="grid grid-cols-5 gap-1 pt-1">
                            {/* Crítica */}
                            <button 
                              onClick={() => setSelectedPriority(selectedPriority === 'Crítica' ? null : 'Crítica')}
                              className={`p-1 py-1.5 rounded-lg border flex flex-col items-center justify-between text-center cursor-pointer transition-all ${
                                selectedPriority === 'Crítica' 
                                  ? 'bg-red-500 border-red-600 text-white shadow-xs font-extrabold' 
                                  : 'bg-red-50/40 border-red-100/50 text-red-600 hover:bg-red-50'
                              }`}
                            >
                              <span className={`text-[8px] font-bold uppercase tracking-tight ${selectedPriority === 'Crítica' ? 'text-white' : 'text-red-600'}`}>Crítica</span>
                              <span className={`text-xs font-black font-mono mt-0.5 ${selectedPriority === 'Crítica' ? 'text-white' : 'text-red-700'}`}>{metrics.criticalCount}</span>
                              <span className={`text-[7px] font-medium ${selectedPriority === 'Crítica' ? 'text-red-100' : 'text-slate-400'}`}>
                                {metrics.totalCount > 0 ? Math.round((metrics.criticalCount / metrics.totalCount) * 100) : 0}%
                              </span>
                            </button>

                            {/* Alta */}
                            <button 
                              onClick={() => setSelectedPriority(selectedPriority === 'Alta' ? null : 'Alta')}
                              className={`p-1 py-1.5 rounded-lg border flex flex-col items-center justify-between text-center cursor-pointer transition-all ${
                                selectedPriority === 'Alta' 
                                  ? 'bg-orange-500 border-orange-600 text-white shadow-xs font-extrabold' 
                                  : 'bg-orange-50/40 border-orange-100/50 text-orange-600 hover:bg-orange-50'
                              }`}
                            >
                              <span className={`text-[8px] font-bold uppercase tracking-tight ${selectedPriority === 'Alta' ? 'text-white' : 'text-orange-600'}`}>Alta</span>
                              <span className={`text-xs font-black font-mono mt-0.5 ${selectedPriority === 'Alta' ? 'text-white' : 'text-orange-700'}`}>{metrics.highCount}</span>
                              <span className={`text-[7px] font-medium ${selectedPriority === 'Alta' ? 'text-orange-100' : 'text-slate-400'}`}>
                                {metrics.totalCount > 0 ? Math.round((metrics.highCount / metrics.totalCount) * 100) : 0}%
                              </span>
                            </button>

                            {/* Média */}
                            <button 
                              onClick={() => setSelectedPriority(selectedPriority === 'Média' ? null : 'Média')}
                              className={`p-1 py-1.5 rounded-lg border flex flex-col items-center justify-between text-center cursor-pointer transition-all ${
                                selectedPriority === 'Média' 
                                  ? 'bg-amber-400 border-amber-500 text-white shadow-xs font-extrabold' 
                                  : 'bg-amber-50/40 border-amber-100/50 text-amber-600 hover:bg-amber-50'
                              }`}
                            >
                              <span className={`text-[8px] font-bold uppercase tracking-tight ${selectedPriority === 'Média' ? 'text-white' : 'text-amber-700'}`}>Média</span>
                              <span className={`text-xs font-black font-mono mt-0.5 ${selectedPriority === 'Média' ? 'text-white' : 'text-amber-700'}`}>{metrics.mediumCount}</span>
                              <span className={`text-[7px] font-medium ${selectedPriority === 'Média' ? 'text-amber-100' : 'text-slate-400'}`}>
                                {metrics.totalCount > 0 ? Math.round((metrics.mediumCount / metrics.totalCount) * 100) : 0}%
                              </span>
                            </button>

                            {/* Baixa */}
                            <button 
                              onClick={() => setSelectedPriority(selectedPriority === 'Baixa' ? null : 'Baixa')}
                              className={`p-1 py-1.5 rounded-lg border flex flex-col items-center justify-between text-center cursor-pointer transition-all ${
                                selectedPriority === 'Baixa' 
                                  ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs font-extrabold' 
                                  : 'bg-emerald-50/40 border-emerald-100/50 text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              <span className={`text-[8px] font-bold uppercase tracking-tight ${selectedPriority === 'Baixa' ? 'text-white' : 'text-emerald-600'}`}>Baixa</span>
                              <span className={`text-xs font-black font-mono mt-0.5 ${selectedPriority === 'Baixa' ? 'text-white' : 'text-emerald-700'}`}>{metrics.lowCount}</span>
                              <span className={`text-[7px] font-medium ${selectedPriority === 'Baixa' ? 'text-emerald-100' : 'text-slate-400'}`}>
                                {metrics.totalCount > 0 ? Math.round((metrics.lowCount / metrics.totalCount) * 100) : 0}%
                              </span>
                            </button>

                            {/* Dúvida */}
                            <button 
                              onClick={() => setSelectedPriority(selectedPriority === 'Dúvida' ? null : 'Dúvida')}
                              className={`p-1 py-1.5 rounded-lg border flex flex-col items-center justify-between text-center cursor-pointer transition-all ${
                                selectedPriority === 'Dúvida' 
                                  ? 'bg-sky-500 border-sky-600 text-white shadow-xs font-extrabold' 
                                  : 'bg-sky-50/40 border-sky-100/50 text-sky-600 hover:bg-sky-50'
                              }`}
                            >
                              <span className={`text-[8px] font-bold uppercase tracking-tight ${selectedPriority === 'Dúvida' ? 'text-white' : 'text-sky-600'}`}>Dúvida</span>
                              <span className={`text-xs font-black font-mono mt-0.5 ${selectedPriority === 'Dúvida' ? 'text-white' : 'text-sky-700'}`}>{metrics.doubtCount}</span>
                              <span className={`text-[7px] font-medium ${selectedPriority === 'Dúvida' ? 'text-sky-100' : 'text-slate-400'}`}>
                                {metrics.totalCount > 0 ? Math.round((metrics.doubtCount / metrics.totalCount) * 100) : 0}%
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* KPI 2: Clientes únicos com detalhamento rico */}
                      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clientes Únicos</span>
                            <span className="p-1.5 bg-slate-50 rounded-lg text-slate-500 border border-slate-100">
                              <Users className="w-4 h-4" />
                            </span>
                          </div>
                          <div className="mt-3 flex items-baseline justify-between">
                            <h3 className="text-4xl font-black font-mono tracking-tight text-slate-800">{metrics.uniqueClientsServed}</h3>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">Impactados no período</span>
                          </div>
                        </div>
                        
                        {/* Elegant Breakdown for Repeat vs Single-time clients */}
                        <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3">
                          {/* Segmented bar graph */}
                          {metrics.uniqueClientsServed > 0 && (
                            <div className="space-y-1.5">
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                                <div 
                                  className="bg-slate-400 h-full transition-all duration-500" 
                                  style={{ width: `${(metrics.singleTicketClientsCount / metrics.uniqueClientsServed) * 100}%` }}
                                  title={`Estreantes: ${metrics.singleTicketClientsCount}`}
                                />
                                <div 
                                  className="bg-amber-500 h-full transition-all duration-500" 
                                  style={{ width: `${(metrics.recurringClientsCount / metrics.uniqueClientsServed) * 100}%` }}
                                  title={`Reincidentes: ${metrics.recurringClientsCount}`}
                                />
                              </div>
                              <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase">
                                <span>Estreantes ({metrics.uniqueClientsServed > 0 ? Math.round((metrics.singleTicketClientsCount / metrics.uniqueClientsServed) * 100) : 0}%)</span>
                                <span className="text-amber-600">Recorrentes ({metrics.uniqueClientsServed > 0 ? Math.round((metrics.recurringClientsCount / metrics.uniqueClientsServed) * 100) : 0}%)</span>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/60">
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estreantes</div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black font-mono text-slate-700">{metrics.singleTicketClientsCount}</span>
                                <span className="text-[9px] text-slate-500 font-semibold">({metrics.uniqueClientsServed > 0 ? Math.round((metrics.singleTicketClientsCount / metrics.uniqueClientsServed) * 100) : 0}%)</span>
                              </div>
                              <span className="text-[9px] text-slate-400">Único contato</span>
                            </div>

                            <div className="bg-amber-50/30 p-2.5 rounded-xl border border-amber-100/60">
                              <div className="text-[9px] font-bold text-amber-700/80 uppercase tracking-wider mb-1">Reincidentes</div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black font-mono text-amber-700">{metrics.recurringClientsCount}</span>
                                <span className="text-[9px] text-amber-600 font-semibold">({metrics.uniqueClientsServed > 0 ? Math.round((metrics.recurringClientsCount / metrics.uniqueClientsServed) * 100) : 0}%)</span>
                              </div>
                              <span className="text-[9px] text-amber-600/80">Recorrentes</span>
                            </div>
                          </div>

                          {metrics.recurringClientsCount > 0 && (
                            <div className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-100/60 space-y-2">
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Origem da Recorrência</div>
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div className="flex flex-col p-1.5 bg-white rounded-lg border border-slate-100">
                                  <div className="flex items-center gap-1 text-slate-500 text-[8px] font-bold uppercase mb-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                                    Deste Período
                                  </div>
                                  <span className="font-mono text-slate-700 font-black text-xs pl-2.5">
                                    {metrics.recurringOnlyThisPeriod} <span className="text-[8px] text-slate-400 font-bold">({Math.round((metrics.recurringOnlyThisPeriod / metrics.recurringClientsCount) * 100)}%)</span>
                                  </span>
                                </div>
                                <div className="flex flex-col p-1.5 bg-white rounded-lg border border-slate-100">
                                  <div className="flex items-center gap-1 text-slate-500 text-[8px] font-bold uppercase mb-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                                    De Outros Meses
                                  </div>
                                  <span className="font-mono text-slate-700 font-black text-xs pl-2.5">
                                    {metrics.recurringAcrossPeriods} <span className="text-[8px] text-slate-400 font-bold">({Math.round((metrics.recurringAcrossPeriods / metrics.recurringClientsCount) * 100)}%)</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* KPI 3: Erro de Cadastro */}
                      <div 
                        onClick={() => {
                          setShowOnlyInputError(!showOnlyInputError);
                          setShowOnlyRoutingError(false);
                        }}
                        className={`group rounded-2xl border p-5 flex flex-col justify-between shadow-xs text-left cursor-pointer transition-all duration-200 active:scale-98 relative overflow-hidden ${
                          showOnlyInputError 
                            ? 'border-red-500 bg-red-50/10 ring-2 ring-red-500/15 shadow-sm animate-pulse-subtle' 
                            : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md'
                        }`}
                        role="button"
                        tabIndex={0}
                      >
                        <div>
                          <div className="flex items-start justify-between w-full">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <AlertCircle className={`w-3.5 h-3.5 ${showOnlyInputError ? 'text-red-500' : 'text-slate-400'}`} /> Erro de Cadastro
                            </span>
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md transition-all ${
                              showOnlyInputError ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                            }`}>
                              {showOnlyInputError ? 'Filtro Ativo' : 'Filtrar'}
                            </span>
                          </div>
                          
                          <div className="mt-3 flex items-baseline justify-between">
                            <h3 className="text-3xl font-black font-mono tracking-tight text-red-600">{metrics.inputErrorRate}%</h3>
                            <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold">
                              {metrics.inputErrorCount} chamados
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">Incoerências preenchidas no formulário</p>
                        </div>

                        {/* Segmented bar graph for input errors */}
                        {metrics.inputErrorCount > 0 && inputErrorsBreakdown.length > 0 && (
                          <div className="space-y-1.5 mt-3 pt-2.5 border-t border-slate-100 w-full">
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                              {inputErrorsBreakdown.map((item) => {
                                let bg = 'bg-rose-500';
                                if (item.name === 'Telefone') bg = 'bg-rose-500';
                                else if (item.name === 'Nome') bg = 'bg-amber-400';
                                else if (item.name === 'Link Iugu') bg = 'bg-sky-400';
                                else bg = 'bg-indigo-400';
                                
                                return (
                                  <div 
                                    key={item.name}
                                    className={`${bg} h-full transition-all duration-500`}
                                    style={{ width: `${item.percentage}%` }}
                                    title={`${item.name}: ${item.count}`}
                                  />
                                );
                              })}
                            </div>
                            <div className="flex flex-wrap justify-between gap-x-2 text-[8px] text-slate-400 font-bold uppercase">
                              {inputErrorsBreakdown.slice(0, 3).map(item => {
                                let textColor = 'text-rose-500';
                                if (item.name === 'Telefone') textColor = 'text-rose-500';
                                else if (item.name === 'Nome') textColor = 'text-amber-500';
                                else if (item.name === 'Link Iugu') textColor = 'text-sky-500';
                                else textColor = 'text-indigo-500';
                                return (
                                  <span key={item.name} className={textColor}>{item.name} ({item.percentage}%)</span>
                                );
                              })}
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                              {inputErrorsBreakdown.slice(0, 4).map((err) => {
                                let borderClass = 'border-rose-100 bg-rose-50/20 text-rose-700';
                                if (err.name === 'Telefone') borderClass = 'border-rose-100 bg-rose-50/20 text-rose-700';
                                else if (err.name === 'Nome') borderClass = 'border-amber-100 bg-amber-50/20 text-amber-700';
                                else if (err.name === 'Link Iugu') borderClass = 'border-sky-100 bg-sky-50/20 text-sky-700';
                                else borderClass = 'border-indigo-100 bg-indigo-50/20 text-indigo-700';

                                return (
                                  <div key={err.name} className={`p-1 px-1.5 rounded-lg border text-[8px] font-semibold ${borderClass} flex flex-col justify-between`}>
                                    <span className="text-[7px] uppercase tracking-wider opacity-80 truncate" title={err.name}>{err.name}</span>
                                    <div className="flex items-baseline gap-1">
                                      <span className="font-bold text-[10px]">{err.count}</span>
                                      <span className="opacity-60 text-[7px]">({err.percentage}%)</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* KPI 4: Erro de Roteamento */}
                      <div 
                        onClick={() => {
                          setShowOnlyRoutingError(!showOnlyRoutingError);
                          setShowOnlyInputError(false);
                        }}
                        className={`group rounded-2xl border p-5 flex flex-col justify-between shadow-xs text-left cursor-pointer transition-all duration-200 active:scale-98 relative overflow-hidden ${
                          showOnlyRoutingError 
                            ? 'border-indigo-500 bg-indigo-50/10 ring-2 ring-indigo-500/15 shadow-sm animate-pulse-subtle' 
                            : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md'
                        }`}
                        role="button"
                        tabIndex={0}
                      >
                        <div>
                          <div className="flex items-start justify-between w-full">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Shuffle className={`w-3.5 h-3.5 ${showOnlyRoutingError ? 'text-indigo-500' : 'text-slate-400'}`} /> Erro de Roteamento
                            </span>
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md transition-all ${
                              showOnlyRoutingError ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                            }`}>
                              {showOnlyRoutingError ? 'Filtro Ativo' : 'Filtrar'}
                            </span>
                          </div>
                          
                          <div className="mt-3 flex items-baseline justify-between">
                            <h3 className="text-3xl font-black font-mono tracking-tight text-indigo-600">{metrics.routingErrorRate}%</h3>
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                              {metrics.routingErrorCount} chamados
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">Chamados direcionados incorretamente</p>
                        </div>

                        {/* Segmented bar graph for routing errors */}
                        {metrics.routingErrorCount > 0 && columnKErrorsBreakdown.length > 0 ? (
                          <div className="space-y-1.5 mt-3 pt-2.5 border-t border-slate-100 w-full">
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                              {columnKErrorsBreakdown.map((item, idx) => {
                                let bg = 'bg-indigo-500';
                                if (idx === 0) bg = 'bg-indigo-500';
                                else if (idx === 1) bg = 'bg-violet-400';
                                else if (idx === 2) bg = 'bg-fuchsia-400';
                                else bg = 'bg-pink-400';
                                
                                return (
                                  <div 
                                    key={item.name}
                                    className={`${bg} h-full transition-all duration-500`}
                                    style={{ width: `${item.percentage}%` }}
                                    title={`${item.name}: ${item.count}`}
                                  />
                                );
                              })}
                            </div>
                            <div className="flex flex-wrap justify-between gap-x-2 text-[8px] text-slate-400 font-bold uppercase">
                              {columnKErrorsBreakdown.slice(0, 3).map((item, idx) => {
                                let textColor = 'text-indigo-500';
                                if (idx === 0) textColor = 'text-indigo-500';
                                else if (idx === 1) textColor = 'text-violet-500';
                                else if (idx === 2) textColor = 'text-fuchsia-500';
                                return (
                                  <span key={item.name} className={textColor}>{item.name.split(' ')[0]} ({item.percentage}%)</span>
                                );
                              })}
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                              {columnKErrorsBreakdown.slice(0, 4).map((err, idx) => {
                                let borderClass = 'border-indigo-100 bg-indigo-50/20 text-indigo-700';
                                if (idx === 0) borderClass = 'border-indigo-100 bg-indigo-50/20 text-indigo-700';
                                else if (idx === 1) borderClass = 'border-violet-100 bg-violet-50/20 text-violet-700';
                                else if (idx === 2) borderClass = 'border-fuchsia-100 bg-fuchsia-50/20 text-fuchsia-700';
                                else borderClass = 'border-pink-100 bg-pink-50/20 text-pink-700';

                                return (
                                  <div key={err.name} className={`p-1 px-1.5 rounded-lg border text-[8px] font-semibold ${borderClass} flex flex-col justify-between`}>
                                    <span className="text-[7px] uppercase tracking-wider opacity-80 truncate" title={err.name}>{err.name}</span>
                                    <div className="flex items-baseline gap-1">
                                      <span className="font-bold text-[10px]">{err.count}</span>
                                      <span className="opacity-60 text-[7px]">({err.percentage}%)</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic text-center py-4">Sem erros registrados</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AREA 2: O QUE OS CLIENTES ESTÃO DIZENDO (MOTIVOS DE CONTATO) */}
                  <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-electric-rose shrink-0" />
                        <h2 className="text-xs font-bold text-obsidian-black uppercase tracking-wider">
                          Quais são os principais motivos pelos quais os clientes entram em contato?
                        </h2>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Classificação Automática (Heurística/IA)
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mb-4">
                      Clique em qualquer uma das categorias abaixo para filtrar a listagem principal e analisar as solicitações correspondentes.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categoriesBreakdown.length === 0 ? (
                        <div className="col-span-12 py-6 text-center text-slate-400 text-xs font-medium">
                          Nenhuma categoria encontrada com os filtros ativos.
                        </div>
                      ) : (
                        categoriesBreakdown.map((item) => {
                          const isSelected = selectedCategory === item.name;
                          return (
                            <div 
                              key={item.name}
                              onClick={() => setSelectedCategory(isSelected ? null : item.name)}
                              className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none active:scale-98 ${
                                isSelected 
                                  ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                                  : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold truncate max-w-[190px]">{item.name}</span>
                                <div className="text-right flex items-baseline space-x-1.5 font-mono">
                                  <span className={`text-xs font-bold ${isSelected ? 'text-electric-rose' : 'text-slate-800'}`}>{item.count}</span>
                                  <span className="text-[10px] text-slate-400">({item.percentage}%)</span>
                                </div>
                              </div>
                              <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${isSelected ? 'bg-electric-rose' : 'bg-slate-700'}`}
                                  style={{ width: `${item.percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>

                  {/* AREA 3: TENDÊNCIAS DE ASSUNTOS (EVOLUÇÃO MENSAL) */}
                  <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-electric-rose shrink-0" />
                        <h2 className="text-xs font-bold text-obsidian-black uppercase tracking-wider">
                          Evolução Temporal e Tendências de Assuntos
                        </h2>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                        Visão Histórica por Mês
                      </span>
                    </div>

                    <div className="space-y-6">
                      {trendsData.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 text-xs font-medium">Nenhum dado histórico de tendências.</div>
                      ) : (
                        <>
                          {(showAllMonths ? trendsData : trendsData.slice(0, 1)).map((group) => (
                            <div key={group.month} className="space-y-2">
                              <h3 className="text-xs font-bold text-slate-600 border-l-2 border-electric-rose pl-2 uppercase tracking-wide">{group.month}</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                                {group.cats.map((cat) => {
                                  // Find global total of tickets in this month
                                  const monthTotal = enhancedTickets.filter(t => getTicketMonthYear(t.createdAt) === group.month).length;
                                  const pct = monthTotal > 0 ? Math.round((cat.count / monthTotal) * 100) : 0;
                                  return (
                                    <div key={cat.name} className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs flex flex-col justify-between">
                                      <span className="font-semibold text-slate-500 truncate" title={cat.name}>{cat.name}</span>
                                      <div className="flex items-baseline justify-between mt-1 font-mono">
                                        <span className="font-extrabold text-slate-900">{cat.count}</span>
                                        <span className="text-[10px] text-electric-rose font-bold">{pct}% do mês</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}

                          {trendsData.length > 1 && (
                            <div className="flex justify-center pt-2">
                              <button
                                onClick={() => setShowAllMonths(!showAllMonths)}
                                className="text-xs font-bold text-electric-rose border border-electric-rose/30 hover:bg-electric-rose/5 px-4 py-1.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer focus:outline-none"
                              >
                                <span>{showAllMonths ? 'Ver Menos (Recentes)' : `Ver Mais (${trendsData.length - 1} Meses Anteriores)`}</span>
                                <span className="text-[10px]">{showAllMonths ? '▲' : '▼'}</span>
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </section>


                </motion.div>
              ) : (
                <motion.div
                  key="analyst"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs"
                >
                  {/* COLLABORATOR PERFORMANCE VIEW */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
                    <div className="space-y-0.5">
                      <h2 className="text-xs font-bold text-obsidian-black uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-electric-rose" /> Performance e Diagnóstico por Analista
                      </h2>
                      <p className="text-xs text-slate-500">Visualize o volume de chamados de suporte criados por cada colaborador e suas respectivas taxas de erro cadastral/roteamento.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-500 shrink-0">Selecionar Analista:</span>
                        <select
                          value={selectedAnalyst}
                          onChange={(e) => setSelectedAnalyst(e.target.value)}
                          className="text-xs py-2 px-3 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none text-slate-800 font-bold cursor-pointer"
                        >
                          {uniqueAgents.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-500 shrink-0">Filtrar por Mês:</span>
                        <select
                          value={selectedAnalystMonth}
                          onChange={(e) => setSelectedAnalystMonth(e.target.value)}
                          className="text-xs py-2 px-3 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none text-slate-800 font-bold cursor-pointer"
                        >
                          <option value="all">Todos os meses</option>
                          {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {analystMetrics ? (
                    <div className="space-y-6">
                      {/* Metrics row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* total */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chamados Criados</span>
                          <span className="text-2xl font-black font-mono text-slate-900 mt-2">{analystMetrics.total}</span>
                        </div>
                        {/* clients */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clientes Atendidos</span>
                            <div className="mt-2 flex items-baseline justify-between">
                              <span className="text-2xl font-black font-mono text-slate-900">{analystMetrics.uniqueClients}</span>
                              <span className="text-[10px] text-slate-400 font-medium">Impactados</span>
                            </div>
                          </div>

                          {/* Elegant Breakdown for Repeat vs Single-time clients of this analyst */}
                          <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1.5">
                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                              <span>Apenas 1 chamado</span>
                              <span className="font-mono text-slate-700">
                                {analystMetrics.singleTicketClientsCount}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                                <span>Reincidentes</span>
                                <span className="font-mono text-amber-600">
                                  {analystMetrics.recurringClientsCount}
                                </span>
                              </div>

                              {analystMetrics.recurringClientsCount > 0 && (
                                <div className="pl-2 border-l border-amber-200 space-y-0.5 text-[8px] text-slate-500">
                                  <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1 font-medium">
                                      <span className="w-1 h-1 rounded-full bg-amber-400"></span>
                                      Apenas neste período:
                                    </span>
                                    <span className="font-mono text-slate-600 font-bold">
                                      {analystMetrics.recurringOnlyThisPeriod}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1 font-medium">
                                      <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                                      Com histórico em outros meses:
                                    </span>
                                    <span className="font-mono text-slate-600 font-bold">
                                      {analystMetrics.recurringAcrossPeriods}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {analystMetrics.uniqueClients > 0 && (
                              <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden flex">
                                <div 
                                  className="bg-slate-400 h-full" 
                                  style={{ width: `${(analystMetrics.singleTicketClientsCount / analystMetrics.uniqueClients) * 100}%` }}
                                  title={`Estreantes: ${analystMetrics.singleTicketClientsCount}`}
                                />
                                <div 
                                  className="bg-amber-500 h-full" 
                                  style={{ width: `${(analystMetrics.recurringClientsCount / analystMetrics.uniqueClients) * 100}%` }}
                                  title={`Reincidentes: ${analystMetrics.recurringClientsCount}`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        {/* errors total */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Casos com Inconsistências</span>
                          <span className="text-2xl font-black font-mono text-red-600 mt-2">{analystMetrics.totalErrors}</span>
                        </div>
                        {/* error rate */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taxa de Erro Individual</span>
                          <div className="flex items-baseline space-x-1.5 mt-2">
                            <span className="text-2xl font-black font-mono text-red-600">{analystMetrics.errorRate}%</span>
                            <span className="text-[10px] text-slate-400 font-medium">(Média geral: {metrics.inputErrorRate + metrics.routingErrorRate}%)</span>
                          </div>
                        </div>
                      </div>

                      {/* Content split block: Category Breakdown */}
                      <div className="grid grid-cols-1 gap-6">
                        {/* Column: Category list */}
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 space-y-3">
                          <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider border-l-2 border-electric-rose pl-2">Distribuição de Motivos do Analista</span>
                          <div className="space-y-2.5">
                            {analystMetrics.topCategories.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-6">Nenhum motivo registrado.</p>
                            ) : (
                              analystMetrics.topCategories.map((c) => (
                                <div key={c.name} className="bg-white p-2 rounded-xl border border-slate-200/60 space-y-1">
                                  <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-slate-700 truncate">{c.name}</span>
                                    <span className="text-slate-900 font-mono">{c.percentage}%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-1">
                                    <div className="bg-electric-rose h-full rounded-full" style={{ width: `${c.percentage}%` }} />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Error details list of this specific analyst */}
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 space-y-3">
                        <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider border-l-2 border-red-500 pl-2">Análise de Qualidade Individual</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-1.5">
                            <span className="text-xs font-bold text-red-600 block">Erros de Inserção de Dados ({analystMetrics.inputErrors} casos)</span>
                            <p className="text-[10px] text-slate-500 leading-normal">
                              {analystMetrics.inputErrors > 0 
                                ? "O analista possui aberturas registradas sem telefones válidos ou e-mails incompletos. Recomenda-se treinar sobre o uso do formulário oficial." 
                                : "Nenhum erro de cadastro detectado na base do analista!"}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-1.5">
                            <span className="text-xs font-bold text-indigo-600 block">Erros de Roteamento Equipe ({analystMetrics.routingErrors} casos)</span>
                            <p className="text-[10px] text-slate-500 leading-normal">
                              {analystMetrics.routingErrors > 0 
                                ? "Foram identificadas solicitações atribuídas a times incompatíveis com a descrição semântica. Orientar sobre o catálogo de times." 
                                : "Nenhum erro de roteamento detectado na base do analista!"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs">Carregando dados do analista...</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* AREA 5: REDESIGNED COMPREHENSIVE TICKET TABLE (EXPLORADOR GERAL) */}
            <section id="general-explorer" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 pb-2 border-b border-slate-100 gap-2">
                <div className="flex items-center space-x-2">
                  <Inbox className="w-4 h-4 text-electric-rose shrink-0" />
                  <h2 className="text-xs font-bold text-obsidian-black uppercase tracking-wider">
                    Explorador Geral de Solicitações CX
                  </h2>
                </div>
                <span className="text-xs text-slate-400 font-semibold">
                  Exibindo <strong className="text-slate-700">{Math.min(generalTickets.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(generalTickets.length, currentPage * itemsPerPage)}</strong> de <strong className="text-slate-700">{generalTickets.length}</strong> chamados filtrados
                </span>
              </div>

              {generalTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Inbox className="w-10 h-10 opacity-30 mb-2" />
                  <p className="text-sm font-medium">Nenhum chamado corresponde aos filtros de segmentação selecionados.</p>
                  <button 
                    onClick={handleResetFilters}
                    className="mt-3 text-xs text-electric-rose hover:underline font-bold focus:outline-none"
                  >
                    Limpar todos os filtros ativos para recomeçar
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-sans font-bold text-[10px] uppercase tracking-wider">
                          <th className="py-3 px-4">Cliente Herói</th>
                          <th className="py-3 px-4">Solicitação</th>
                          <th className="py-3 px-4">Categoria (Motivo)</th>
                          <th className="py-3 px-4">Equipe</th>
                          <th className="py-3 px-4">Analista</th>
                          <th className="py-3 px-4">Criticidade</th>
                          <th className="py-3 px-4 text-center">Erros</th>
                          <th className="py-3 px-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {paginatedTickets.map((ticket) => {
                          const ticketDateStr = new Date(ticket.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            timeZone: 'America/Sao_Paulo'
                          });

                          const getUrgencyBadge = (urgency: string) => {
                            switch (urgency) {
                              case 'Crítica': return 'bg-red-50 text-red-700 border-red-200';
                              case 'Alta': return 'bg-orange-50 text-orange-700 border-orange-200';
                              case 'Média': return 'bg-amber-50 text-amber-700 border-amber-200';
                              case 'Dúvida': return 'bg-blue-50 text-blue-700 border-blue-200';
                              default: return 'bg-slate-50 text-slate-600 border-slate-200';
                            }
                          };

                          return (
                            <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors duration-150 group">
                              {/* Cliente details */}
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-800">{ticket.clientName}</span>
                                    {recurringClients.has(ticket.clientName?.trim().toUpperCase()) && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0 uppercase tracking-wider">
                                        Reincidente
                                      </span>
                                    )}
                                  </div>
                                  {ticket.phone && (
                                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">{ticket.phone}</span>
                                  )}
                                </div>
                              </td>

                              {/* Description truncated */}
                              <td className="py-3 px-4 max-w-xs">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-slate-800 font-medium group-hover:text-electric-rose transition-colors line-clamp-1" title={ticket.description}>
                                    {ticket.description}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">Aberto em {ticketDateStr}</span>
                                  {ticket.hasRoutingError && ticket.columnKValue && (
                                    <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-1.5 py-0.5 w-fit" title={`Erro de Roteamento: ${ticket.columnKValue}`}>
                                      <Shuffle className="w-2.5 h-2.5 shrink-0" />
                                      {ticket.columnKValue}
                                    </span>
                                  )}
                                  {ticket.hasInputError && ticket.inputErrorDetails && ticket.inputErrorDetails.length > 0 && (
                                    <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-md px-1.5 py-0.5 w-fit" title={`Erro de Cadastro: ${ticket.inputErrorDetails.join(', ')}`}>
                                      <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                                      Erro Cadastro: {ticket.inputErrorDetails.join(', ')}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Category Badge */}
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200/50 uppercase tracking-wide">
                                  {ticket.category}
                                </span>
                              </td>

                              {/* Team */}
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-700 border border-slate-200">
                                  {ticket.team}
                                </span>
                              </td>

                              {/* Analista */}
                              <td className="py-3 px-4">
                                <span className="font-semibold text-slate-600">{ticket.formattedAgentName}</span>
                              </td>

                              {/* Gravity */}
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getUrgencyBadge(ticket.urgency)}`}>
                                  {ticket.urgency}
                                </span>
                              </td>

                              {/* Status errors icons */}
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center space-x-1.5">
                                  {ticket.hasInputError ? (
                                    <span className="text-red-500" title="Contém erro cadastral">
                                      <AlertCircle className="w-4 h-4" />
                                    </span>
                                  ) : (
                                    <span className="text-slate-200">—</span>
                                  )}
                                  {ticket.hasRoutingError ? (
                                    <span className="text-indigo-500" title="Contém erro de direcionamento">
                                      <Shuffle className="w-4 h-4" />
                                    </span>
                                  ) : null}
                                </div>
                              </td>

                              {/* Details button */}
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => setSelectedTicketId(ticket.id)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900 hover:bg-electric-rose text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-xs active:scale-95"
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

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-5 pt-4 border-t border-slate-100">
                      <div className="text-xs text-slate-500 font-medium">
                        Página <strong className="text-obsidian-black">{currentPage}</strong> de <strong className="text-obsidian-black">{totalPages}</strong>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setCurrentPage(1);
                            document.getElementById('general-explorer')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          disabled={currentPage === 1}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold cursor-pointer"
                          title="Primeira Página"
                        >
                          &laquo;
                        </button>
                        
                        <button
                          onClick={() => {
                            setCurrentPage(prev => Math.max(prev - 1, 1));
                            document.getElementById('general-explorer')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Anterior</span>
                        </button>

                        <button
                          onClick={() => {
                            setCurrentPage(prev => Math.min(prev + 1, totalPages));
                            document.getElementById('general-explorer')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <span>Próxima</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setCurrentPage(totalPages);
                            document.getElementById('general-explorer')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          disabled={currentPage === totalPages}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold cursor-pointer"
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
