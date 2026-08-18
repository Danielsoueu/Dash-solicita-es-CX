/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock } from 'lucide-react';

export default function BrasiliaClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // update every 10 seconds since seconds are not displayed
    return () => clearInterval(interval);
  }, []);

  const formattedDate = useMemo(() => {
    const str = currentTime.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Sao_Paulo'
    });
    // Standard capitalization: only the very first letter is capitalized (e.g. "Terça-feira, 18 de agosto de 2026")
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [currentTime]);

  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  }, [currentTime]);

  return (
    <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span>{formattedDate}</span>
      <span className="text-slate-300 dark:text-slate-700">•</span>
      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span className="font-mono font-medium">{formattedTime}</span>
    </div>
  );
}
