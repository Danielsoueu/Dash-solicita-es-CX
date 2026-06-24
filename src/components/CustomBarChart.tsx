/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Ticket } from '../types';
import { Layers, Landmark, HeartPulse, ShieldAlert, Receipt, ShieldCheck, RefreshCw } from 'lucide-react';

interface CustomBarChartProps {
  filteredTickets: Ticket[];
  selectedTeam: string | null;
  onSelectTeam: (team: string | null) => void;
  allTickets: Ticket[];
}

const TEAM_ICONS: Record<string, React.ComponentType<any>> = {
  'Cobrança': Receipt,
  'Renovação': RefreshCw,
  'Retenção': ShieldCheck,
  'Inadimplência': Landmark,
  'Escritório Virtual': Layers,
  'Impostos & MEI': Landmark,
  'Plano de Saúde': HeartPulse,
  'Suporte Burocrático': ShieldAlert,
  'Faturamento': Receipt,
};

export default function CustomBarChart({ filteredTickets, selectedTeam, onSelectTeam, allTickets }: CustomBarChartProps) {
  const uniqueTeams = React.useMemo(() => {
    const teamsSet = new Set<string>();
    allTickets.forEach(t => {
      if (t.team) {
        teamsSet.add(t.team);
      }
    });
    return Array.from(teamsSet).sort();
  }, [allTickets]);

  const teamMetrics = React.useMemo(() => {
    return uniqueTeams.map(team => {
      const countInFiltered = filteredTickets.filter(t => t.team === team).length;
      return {
        team,
        count: countInFiltered,
      };
    });
  }, [uniqueTeams, filteredTickets]);

  const maxCount = Math.max(...teamMetrics.map(t => t.count), 1);
  const totalTicketsCount = filteredTickets.length;

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <p className="text-xs text-slate-500 mb-6">
          Distribuição volumétrica por equipe e quantidade de solicitações ativas. Clique para isolar dados do time.
        </p>

        <div className="space-y-4">
          {teamMetrics.map((item, index) => {
            const IconComponent = TEAM_ICONS[item.team] || Layers;
            const isSelected = selectedTeam === item.team;
            const percentageOfMax = (item.count / maxCount) * 100;
            const percentageOfTotal = totalTicketsCount > 0 
              ? Math.round((item.count / totalTicketsCount) * 100) 
              : 0;

            return (
              <div 
                key={item.team} 
                className={`p-3 rounded-xl transition-all border duration-200 ${
                  isSelected 
                    ? 'bg-slate-950 text-white border-slate-900 shadow-md' 
                    : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-electric-rose text-white' : 'bg-slate-100 text-obsidian-black'}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <button 
                      onClick={() => onSelectTeam(isSelected ? null : item.team)}
                      className="font-sans font-semibold text-sm hover:text-electric-rose transition-colors cursor-pointer text-left"
                    >
                      {item.team}
                    </button>
                  </div>
                  
                  <div className="text-right flex items-center space-x-3">
                    <span className="text-xs text-slate-400 font-mono">
                      {percentageOfTotal}% do total
                    </span>
                    <span className={`text-sm font-bold font-mono ${isSelected ? 'text-electric-rose' : 'text-obsidian-black'}`}>
                      {item.count} chamados
                    </span>
                  </div>
                </div>

                <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentageOfMax}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`h-full rounded-full ${isSelected ? 'bg-electric-rose' : 'bg-obsidian-black'}`}
                  />
                </div>

                <div className="flex items-center justify-end mt-2 pt-1.5 border-t border-slate-100/10 text-[11px] text-slate-400">
                  <button
                    onClick={() => onSelectTeam(isSelected ? null : item.team)}
                    className="text-electric-rose hover:underline font-semibold cursor-pointer text-xs"
                  >
                    {isSelected ? 'Ver Todos os Times' : 'Filtrar por este time'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedTeam && (
        <div className="mt-4 flex items-center justify-between text-xs bg-slate-900 text-white p-2.5 rounded-lg border border-slate-800">
          <span>
            Filtrando equipe: <strong className="text-electric-rose">{selectedTeam}</strong>
          </span>
          <button
            onClick={() => onSelectTeam(null)}
            className="text-xs text-electric-rose hover:underline font-semibold cursor-pointer"
          >
            Ver todos
          </button>
        </div>
      )}
    </div>
  );
}
