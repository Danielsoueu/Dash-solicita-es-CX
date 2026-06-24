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
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Sao_Paulo'
    });
  }, [currentTime]);

  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  }, [currentTime]);

  return (
    <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500 font-medium">
      <Calendar className="w-3.5 h-3.5 text-slate-400" />
      <span className="capitalize">{formattedDate}</span>
      <span className="text-slate-300">•</span>
      <Clock className="w-3.5 h-3.5 text-slate-400" />
      <span className="font-mono">{formattedTime} (Brasília)</span>
    </div>
  );
}
