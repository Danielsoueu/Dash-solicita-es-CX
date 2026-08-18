/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Award, 
  ExternalLink, 
  Layers, 
  BarChart3, 
  ChevronRight, 
  ArrowUpDown, 
  Sparkles,
  PhoneCall,
  UserCheck,
  Link2,
  Shuffle,
  LayoutGrid,
  Table as TableIcon,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { Ticket } from '../types';
import { normalizeAnalystName } from '../utils';

interface TeamAnalystOverviewProps {
  tickets: Ticket[];
  onSelectAnalyst: (analystName: string) => void;
  onSelectTicket: (ticket: Ticket) => void;
}

export interface AnalystSummary {
  rank: number;
  name: string;
  total: number;
  shareOfTotal: number;
  uniqueClients: number;
  singleTicketClientsCount: number;
  recurringClientsCount: number;
  inputErrors: number;
  routingErrors: number;
  totalErrors: number;
  errorRate: number;
  inputErrorRate: number;
  routingErrorRate: number;
  accuracyRate: number;
  topCategories: { name: string; count: number; percentage: number }[];
  phoneErrors: number;
  nameErrors: number;
  profileLinkErrors: number;
  topTeam: { name: string; count: number; percentage: number };
  tickets: Ticket[];
}

export default function TeamAnalystOverview({ 
  tickets, 
  onSelectAnalyst, 
  onSelectTicket 
}: TeamAnalystOverviewProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'volume_desc' | 'volume_asc' | 'error_asc' | 'error_desc' | 'name_asc'>('volume_desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [filterSegment, setFilterSegment] = useState<'all' | 'high_volume' | 'zero_errors' | 'with_errors'>('all');
  const [expandedAnalyst, setExpandedAnalyst] = useState<string | null>(null);

  // Extract unique months for the filter dropdown
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    tickets.forEach(t => {
      if (t.monthYear) {
        months.add(t.monthYear);
      }
    });
    return Array.from(months);
  }, [tickets]);

  // Filter tickets by selected month
  const periodFilteredTickets = useMemo(() => {
    if (selectedMonth === 'all') return tickets;
    return tickets.filter(t => t.monthYear === selectedMonth);
  }, [tickets, selectedMonth]);

  // Compute consolidated metrics for each analyst
  const analystSummaries: AnalystSummary[] = useMemo(() => {
    const totalPeriodTickets = periodFilteredTickets.length;
    if (totalPeriodTickets === 0) return [];

    // Group tickets by normalized analyst name
    const grouped = new Map<string, Ticket[]>();
    periodFilteredTickets.forEach(t => {
      const normName = normalizeAnalystName(t.agentName) || 'Não identificado';
      if (!grouped.has(normName)) {
        grouped.set(normName, []);
      }
      grouped.get(normName)!.push(t);
    });

    const summaries: AnalystSummary[] = [];

    grouped.forEach((agentTickets, name) => {
      const total = agentTickets.length;
      const shareOfTotal = totalPeriodTickets > 0 ? (total / totalPeriodTickets) * 100 : 0;

      // Clients analysis
      const clientOccurrences: Record<string, number> = {};
      agentTickets.forEach(t => {
        const cName = (t.clientName || 'Desconhecido').trim().toLowerCase();
        clientOccurrences[cName] = (clientOccurrences[cName] || 0) + 1;
      });
      const uniqueClients = Object.keys(clientOccurrences).length;
      const singleTicketClientsCount = Object.values(clientOccurrences).filter(c => c === 1).length;
      const recurringClientsCount = Object.values(clientOccurrences).filter(c => c > 1).length;

      // Errors calculation
      let inputErrors = 0;
      let routingErrors = 0;
      let phoneErrors = 0;
      let nameErrors = 0;
      let profileLinkErrors = 0;

      agentTickets.forEach(t => {
        if (t.hasInputError) {
          inputErrors++;
          if (t.inputErrorDetails) {
            if (t.inputErrorDetails.includes('Telefone')) phoneErrors++;
            if (t.inputErrorDetails.includes('Nome')) nameErrors++;
            if (t.inputErrorDetails.includes('Perfil do Cliente')) profileLinkErrors++;
          }
        }
        if (t.hasRoutingError) {
          routingErrors++;
        }
      });

      const totalErrors = inputErrors + routingErrors;
      const errorRate = total > 0 ? Number(((totalErrors / total) * 100).toFixed(1)) : 0;
      const inputErrorRate = total > 0 ? Number(((inputErrors / total) * 100).toFixed(1)) : 0;
      const routingErrorRate = total > 0 ? Number(((routingErrors / total) * 100).toFixed(1)) : 0;
      const accuracyRate = Number((Math.max(0, 100 - errorRate)).toFixed(1));

      // Top 5 Categories calculation
      const categoryCounts: Record<string, number> = {};
      agentTickets.forEach(t => {
        const cat = t.category || 'Outros';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      const sortedCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([catName, count]) => ({
          name: catName,
          count,
          percentage: Number(((count / total) * 100).toFixed(1))
        }));

      const topCategories = sortedCategories.slice(0, 5);

      // Top Team Assignment
      const teamCounts: Record<string, number> = {};
      agentTickets.forEach(t => {
        const team = t.team || 'Geral';
        teamCounts[team] = (teamCounts[team] || 0) + 1;
      });
      const sortedTeams = Object.entries(teamCounts).sort((a, b) => b[1] - a[1]);
      const topTeam = sortedTeams.length > 0 
        ? { name: sortedTeams[0][0], count: sortedTeams[0][1], percentage: Number(((sortedTeams[0][1] / total) * 100).toFixed(1)) }
        : { name: 'Geral', count: 0, percentage: 0 };

      summaries.push({
        rank: 0,
        name,
        total,
        shareOfTotal: Number(shareOfTotal.toFixed(1)),
        uniqueClients,
        singleTicketClientsCount,
        recurringClientsCount,
        inputErrors,
        routingErrors,
        totalErrors,
        errorRate,
        inputErrorRate,
        routingErrorRate,
        accuracyRate,
        topCategories,
        phoneErrors,
        nameErrors,
        profileLinkErrors,
        topTeam,
        tickets: agentTickets
      });
    });

    // Assign ranking based on volume descending initially
    summaries.sort((a, b) => b.total - a.total);
    summaries.forEach((s, idx) => {
      s.rank = idx + 1;
    });

    return summaries;
  }, [periodFilteredTickets]);

  // Filtered & Sorted analysts according to user UI controls
  const displayedAnalysts = useMemo(() => {
    let list = [...analystSummaries];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a => a.name.toLowerCase().includes(q));
    }

    // Segment pills filter
    if (filterSegment === 'high_volume') {
      list = list.filter(a => a.total >= 30);
    } else if (filterSegment === 'zero_errors') {
      list = list.filter(a => a.totalErrors === 0);
    } else if (filterSegment === 'with_errors') {
      list = list.filter(a => a.totalErrors > 0);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'volume_desc') return b.total - a.total;
      if (sortBy === 'volume_asc') return a.total - b.total;
      if (sortBy === 'error_asc') return a.errorRate - b.errorRate || b.total - a.total;
      if (sortBy === 'error_desc') return b.errorRate - a.errorRate || b.total - a.total;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [analystSummaries, searchQuery, filterSegment, sortBy]);

  // Overall summary metrics for top KPI cards
  const teamOverallKPIs = useMemo(() => {
    const totalAnalysts = analystSummaries.length;
    const totalTickets = periodFilteredTickets.length;
    const avgPerAnalyst = totalAnalysts > 0 ? (totalTickets / totalAnalysts).toFixed(1) : '0';
    
    const topVolumeAnalyst = analystSummaries.length > 0 ? analystSummaries[0] : null;
    
    const totalInconsistencies = analystSummaries.reduce((sum, a) => sum + a.totalErrors, 0);
    const overallTeamErrorRate = totalTickets > 0 ? ((totalInconsistencies / totalTickets) * 100).toFixed(1) : '0.0';

    return {
      totalAnalysts,
      totalTickets,
      avgPerAnalyst,
      topVolumeAnalyst,
      totalInconsistencies,
      overallTeamErrorRate
    };
  }, [analystSummaries, periodFilteredTickets]);

  // Export to CSV handler
  const handleExportCSV = () => {
    if (analystSummaries.length === 0) return;

    const headers = [
      'Ranking',
      'Analista',
      'Total Solicitações',
      '% Volume Geral',
      'Top 1 Motivo (Qtd | %)',
      'Top 2 Motivo (Qtd | %)',
      'Top 3 Motivo (Qtd | %)',
      'Top 4 Motivo (Qtd | %)',
      'Top 5 Motivo (Qtd | %)',
      'Erros Cadastro',
      'Erros Fila',
      'Total Inconsistências',
      'Taxa de Erro (%)',
      'Time Principal de Destino'
    ];

    const rows = analystSummaries.map(a => {
      const topCatStrings = [0, 1, 2, 3, 4].map(idx => {
        const cat = a.topCategories[idx];
        if (!cat) return '-';
        return `"${cat.name} (${cat.count} | ${cat.percentage}%)"`;
      });

      return [
        a.rank,
        `"${a.name}"`,
        a.total,
        `"${a.shareOfTotal}%"`,
        ...topCatStrings,
        a.inputErrors,
        a.routingErrors,
        a.totalErrors,
        `"${a.errorRate}%"`,
        `"${a.topTeam.name} (${a.topTeam.percentage}%)"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `painel_geral_analistas_company_hero_${selectedMonth.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for rank badge styling
  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-full font-black text-xs">
          <Award className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>#1 Líder</span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="flex items-center space-x-1 px-2 py-0.5 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-full font-extrabold text-xs">
          <span>#2</span>
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="flex items-center space-x-1 px-2 py-0.5 bg-amber-700/10 text-amber-800 dark:text-amber-300 rounded-full font-extrabold text-xs">
          <span>#3</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-full font-bold text-xs font-mono">
        #{rank}
      </span>
    );
  };

  // Helper for initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & KPI HIGHLIGHTS */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-[#FF0066]/10 text-[#FF0066] rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Painel Geral por Analista
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Visão consolidada da operação de atendimento: volume individual, top 5 motivos e qualidade
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons & Month selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Filter */}
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 pl-2">Mês:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-bold py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="all">Todo o Histórico</option>
                {uniqueMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              title="Exportar dados consolidados em planilha CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#FF0066]" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Operational KPIs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {/* KPI 1: Analistas Ativos */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Analistas Ativos
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                {teamOverallKPIs.totalAnalysts}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {teamOverallKPIs.totalTickets} chamados
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Média de <strong className="text-slate-800 dark:text-slate-200">{teamOverallKPIs.avgPerAnalyst}</strong> chamados/analista
            </p>
          </div>

          {/* KPI 2: Líder de Volume */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Maior Volume
              </span>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-black text-slate-900 dark:text-white truncate max-w-[170px]" title={teamOverallKPIs.topVolumeAnalyst?.name}>
                {teamOverallKPIs.topVolumeAnalyst?.name || '-'}
              </span>
              <span className="text-xs font-black font-mono text-[#FF0066]">
                {teamOverallKPIs.topVolumeAnalyst?.total || 0}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Concentra <strong className="text-slate-800 dark:text-slate-200">{teamOverallKPIs.topVolumeAnalyst?.shareOfTotal || 0}%</strong> do volume total
            </p>
          </div>

          {/* KPI 3: Taxa Geral da Equipe */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Inconsistências da Equipe
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                {teamOverallKPIs.totalInconsistencies}
              </span>
              <span className="text-xs font-bold text-red-500">
                {teamOverallKPIs.overallTeamErrorRate}% do total
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Erros de cadastro e direcionamento
            </p>
          </div>
        </div>
      </section>

      {/* 2. SEARCH, QUICK FILTER PILLS & VIEW CONTROLS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por nome do analista (ex: Thamires, Monalisa, Bruna)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF0066]/30 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Segment Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterSegment('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterSegment === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Todos ({analystSummaries.length})
          </button>
          <button
            onClick={() => setFilterSegment('high_volume')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterSegment === 'high_volume'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Alto Volume (≥30)
          </button>
          <button
            onClick={() => setFilterSegment('zero_errors')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterSegment === 'zero_errors'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            100% Corretos
          </button>
          <button
            onClick={() => setFilterSegment('with_errors')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterSegment === 'with_errors'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300'
            }`}
          >
            Com Inconsistências
          </button>
        </div>

        {/* Sort and View Mode */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="volume_desc">Mais Chamados (Volume ↓)</option>
              <option value="volume_asc">Menos Chamados (Volume ↑)</option>
              <option value="error_asc">Menor Taxa de Erro (Melhor)</option>
              <option value="error_desc">Maior Taxa de Erro</option>
              <option value="name_asc">Nome do Analista (A-Z)</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-[#FF0066] shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Visualização em Cards Detalhados"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-[#FF0066] shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Visualização em Tabela Consolidada"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT: CARDS OR TABLE VIEW */}
      {displayedAnalysts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Nenhum analista encontrado com os filtros atuais
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Tente alterar o período selecionado, limpar o termo de busca ou remover o filtro de segmento.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterSegment('all');
              setSelectedMonth('all');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            Limpar todos os filtros
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {displayedAnalysts.map((analyst) => {
            const isExpanded = expandedAnalyst === analyst.name;
            const errorBadgeColor = 
              analyst.errorRate === 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : analyst.errorRate <= 5
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                : analyst.errorRate <= 15
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';

            return (
              <div 
                key={analyst.name}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Rank, Avatar, Name, Stats & Action */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-3">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-800 dark:to-slate-900 text-white font-black text-sm flex items-center justify-center shadow-xs border border-white/10">
                          {getInitials(analyst.name)}
                        </div>
                      </div>

                      {/* Name and share */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                            {analyst.name}
                          </h3>
                          {getRankBadge(analyst.rank)}
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <span>{analyst.uniqueClients} clientes atendidos</span>
                          <span>•</span>
                          <span className="text-[#FF0066] font-bold">{analyst.shareOfTotal}% do volume total</span>
                        </div>
                      </div>
                    </div>

                    {/* Drill-down button */}
                    <button
                      onClick={() => onSelectAnalyst(analyst.name)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-[#FF0066] hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-[#FF0066] dark:hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                      title="Abrir ficha e chamados deste analista"
                    >
                      <span>Ver Ficha</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* High-level KPIs block */}
                  <div className="grid grid-cols-2 gap-3 my-4">
                    {/* Volume */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                        Solicitações
                      </span>
                      <span className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                        {analyst.total}
                      </span>
                    </div>

                    {/* Inconsistencies */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                        Inconsistências
                      </span>
                      <div className="mt-1 flex items-baseline space-x-1">
                        <span className="text-xl font-black font-mono text-red-600 dark:text-red-400">
                          {analyst.totalErrors}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold border ${errorBadgeColor}`}>
                          {analyst.errorRate}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section: TOP 5 TIPOS DE SOLICITAÇÃO POR ANALISTA */}
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-[#FF0066]" />
                        <span>Top 5 Tipos de Solicitação</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">Qtd / %</span>
                    </div>

                    <div className="space-y-1.5">
                      {analyst.topCategories.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2 text-center">Nenhum motivo registrado</p>
                      ) : (
                        analyst.topCategories.map((cat, idx) => (
                          <div 
                            key={cat.name} 
                            className="bg-slate-50/80 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between font-medium">
                              <div className="flex items-center space-x-2 truncate max-w-[70%]">
                                <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="text-slate-800 dark:text-slate-200 font-bold truncate" title={cat.name}>
                                  {cat.name}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0 font-mono text-[11px]">
                                <span className="font-extrabold text-slate-900 dark:text-white">{cat.count}</span>
                                <span className="text-slate-400">({cat.percentage}%)</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#FF0066] h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Section: DIAGNÓSTICO DE ERROS POR ANALISTA */}
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Detalhamento de Erros</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {analyst.totalErrors === 0 ? 'Zero Inconsistências' : `${analyst.totalErrors} ocorrências`}
                      </span>
                    </div>

                    {analyst.totalErrors === 0 ? (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 p-2.5 rounded-xl flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Excelente! Nenhum erro de cadastro ou direcionamento encontrado neste período.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {/* Erros de Cadastro / Dados */}
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300">Cadastro</span>
                            <span className="font-mono font-black text-red-600 dark:text-red-400">{analyst.inputErrors}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                            {analyst.phoneErrors > 0 && <div>• Telefone: {analyst.phoneErrors}</div>}
                            {analyst.nameErrors > 0 && <div>• Nome cliente: {analyst.nameErrors}</div>}
                            {analyst.profileLinkErrors > 0 && <div>• Link perfil: {analyst.profileLinkErrors}</div>}
                            {analyst.inputErrors === 0 && <div className="text-emerald-600">✓ Dados 100% corretos</div>}
                          </div>
                        </div>

                        {/* Erros de Fila / Direcionamento */}
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300">Direcionamento</span>
                            <span className="font-mono font-black text-amber-600 dark:text-amber-400">{analyst.routingErrors}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                            {analyst.routingErrors > 0 ? (
                              <div>• {analyst.routingErrors} chamados em filas divergentes</div>
                            ) : (
                              <div className="text-emerald-600">✓ Roteamento correto</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Quick Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Fila mais frequente:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{analyst.topTeam.name}</strong>
                  </div>

                  <button
                    onClick={() => onSelectAnalyst(analyst.name)}
                    className="text-xs font-bold text-[#FF0066] hover:underline cursor-pointer flex items-center space-x-1"
                  >
                    <span>Ver todos os {analyst.total} chamados</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CONSOLIDATED TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 text-[10px]">
                <tr>
                  <th className="py-3 px-4 text-center">Rank</th>
                  <th className="py-3 px-4">Analista</th>
                  <th className="py-3 px-4 text-center">Solicitações</th>
                  <th className="py-3 px-4 text-center">% Volume</th>
                  <th className="py-3 px-4">Top 1 Motivo</th>
                  <th className="py-3 px-4">Top 2 Motivo</th>
                  <th className="py-3 px-4">Top 3 Motivo</th>
                  <th className="py-3 px-4 text-center">Erros Cadastro</th>
                  <th className="py-3 px-4 text-center">Erros Fila</th>
                  <th className="py-3 px-4 text-center">Taxa Erro</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {displayedAnalysts.map((analyst) => {
                  return (
                    <tr 
                      key={analyst.name}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center">
                        {getRankBadge(analyst.rank)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                            {getInitials(analyst.name)}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 dark:text-white block">
                              {analyst.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {analyst.uniqueClients} clientes
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-sm text-slate-900 dark:text-white">
                        {analyst.total}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[#FF0066] font-bold">
                        {analyst.shareOfTotal}%
                      </td>
                      <td className="py-3 px-4 max-w-[160px]">
                        {analyst.topCategories[0] ? (
                          <div className="truncate" title={analyst.topCategories[0].name}>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {analyst.topCategories[0].name}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">
                              ({analyst.topCategories[0].count})
                            </span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 max-w-[160px]">
                        {analyst.topCategories[1] ? (
                          <div className="truncate" title={analyst.topCategories[1].name}>
                            <span className="text-slate-700 dark:text-slate-300">
                              {analyst.topCategories[1].name}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">
                              ({analyst.topCategories[1].count})
                            </span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 max-w-[160px]">
                        {analyst.topCategories[2] ? (
                          <div className="truncate" title={analyst.topCategories[2].name}>
                            <span className="text-slate-700 dark:text-slate-300">
                              {analyst.topCategories[2].name}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">
                              ({analyst.topCategories[2].count})
                            </span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-red-600 dark:text-red-400 font-bold">
                        {analyst.inputErrors}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-amber-600 dark:text-amber-400 font-bold">
                        {analyst.routingErrors}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold font-mono text-xs ${
                          analyst.errorRate === 0
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : analyst.errorRate <= 10
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {analyst.errorRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onSelectAnalyst(analyst.name)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-[#FF0066] hover:text-white dark:bg-slate-800 dark:hover:bg-[#FF0066] text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Ver Ficha
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
