/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Ticket } from '../types';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface WordCloudProps {
  filteredTickets: Ticket[];
  selectedWord: string | null;
  onSelectWord: (word: string | null) => void;
}

export default function WordCloud({ filteredTickets, selectedWord, onSelectWord }: WordCloudProps) {
  const [showAll, setShowAll] = useState(false);

  // Dynamically calculate word frequency from the active filtered tickets
  const frequencies = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    
    filteredTickets.forEach(ticket => {
      if (ticket.keyWords) {
        ticket.keyWords.forEach(word => {
          counts[word] = (counts[word] || 0) + 1;
        });
      }
    });

    // Convert to array of objects
    return Object.entries(counts)
      .map(([text, count]) => ({ text, value: count }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTickets]);

  // Display only top 10 or 20 words
  const displayedFrequencies = React.useMemo(() => {
    const limit = showAll ? 20 : 10;
    return frequencies.slice(0, limit);
  }, [frequencies, showAll]);

  if (frequencies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 font-sans text-xs">
        Nenhuma palavra-chave encontrada para os filtros aplicados.
      </div>
    );
  }

  // Find max and min counts for scaling font sizes safely
  const maxCount = Math.max(...displayedFrequencies.map(f => f.value), 1);
  const minCount = Math.min(...displayedFrequencies.map(f => f.value), 1);

  const getFontSizeClass = (value: number) => {
    if (maxCount === minCount) return 'text-xs font-medium';
    const ratio = (value - minCount) / (maxCount - minCount || 1);
    if (ratio > 0.7) return 'text-sm font-extrabold';
    if (ratio > 0.4) return 'text-xs font-bold';
    return 'text-[11px] font-medium';
  };

  return (
    <div id="word-cloud-container" className="flex flex-col h-full justify-between space-y-3">
      <div>
        <p className="text-[11px] text-slate-500 mb-3">
          Tópicos extraídos das solicitações ativas. Clique para filtrar a dashboard de imediato.
        </p>
        <div className="flex flex-wrap gap-1.5 justify-center items-center py-3 px-2 bg-slate-50/50 rounded-xl border border-slate-100 min-h-[120px]">
          {displayedFrequencies.map((item, index) => {
            const isSelected = selectedWord === item.text;
            return (
              <motion.button
                key={item.text}
                id={`word-cloud-item-${index}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectWord(isSelected ? null : item.text)}
                className={`
                  px-2 py-1 rounded-lg transition-all duration-150 cursor-pointer text-center font-sans select-none
                  ${getFontSizeClass(item.value)}
                  ${
                    isSelected
                      ? 'bg-electric-rose text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-obsidian-black border border-slate-200/60 hover:text-electric-rose hover:border-electric-rose/30'
                  }
                `}
                title={`${item.value} solicitações`}
              >
                <span>{item.text}</span>
                <span className={`ml-1 text-[9px] px-1 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {item.value}
                </span>
              </motion.button>
            );
          })}
        </div>

        {frequencies.length > 10 && (
          <div className="flex justify-center mt-2.5">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center space-x-1 text-[11px] font-bold text-electric-rose hover:underline bg-electric-rose/5 px-2.5 py-1 rounded-lg border border-electric-rose/10 cursor-pointer transition-all"
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>Exibir Menos</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>Exibir Mais</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
      
      {selectedWord && (
        <div className="flex items-center justify-between text-[11px] bg-electric-rose/5 p-2 rounded-lg border border-electric-rose/10 animate-fade-in">
          <span className="text-obsidian-black font-medium">
            Filtrando por: <strong className="text-electric-rose">"{selectedWord}"</strong>
          </span>
          <button
            onClick={() => onSelectWord(null)}
            className="text-[11px] text-electric-rose hover:underline font-semibold cursor-pointer"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}
