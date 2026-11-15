'use client';

import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(targetIso: string): TimeLeft {
  const diff = Math.max(0, new Date(targetIso).getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export function CountdownCard({
  title,
  dateLabel,
  targetIso,
  accentColor = 'brand',
}: {
  title: string;
  dateLabel: string;
  targetIso: string;
  accentColor?: 'brand' | 'gold';
}) {
  const [tl, setTl] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setTl(calcTimeLeft(targetIso));
    const id = setInterval(() => setTl(calcTimeLeft(targetIso)), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  const boxes = [
    { val: tl ? String(tl.days).padStart(2, '0') : '--', unit: 'วัน', highlight: accentColor === 'gold' },
    { val: tl ? String(tl.hours).padStart(2, '0') : '--', unit: 'ชั่วโมง', highlight: false },
    { val: tl ? String(tl.minutes).padStart(2, '0') : '--', unit: 'นาที', highlight: false },
    { val: tl ? String(tl.seconds).padStart(2, '0') : '--', unit: 'วินาที', highlight: false },
  ];

  return (
    <div className="rounded-card border border-line bg-panel p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-2 text-xs font-bold text-ink sm:text-sm">
        <Trophy className="h-4 w-4 text-gold-ink" />
        <span>{title}</span>
      </div>
      <div className="mt-0.5 text-xs text-muted">วันสอบ · {dateLabel}</div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {boxes.map((b) => (
          <div
            key={b.unit}
            className={`rounded-2xl border px-2 py-2.5 text-center ${
              b.highlight
                ? 'border-[rgb(var(--gold)/0.55)] bg-[rgb(var(--gold)/0.1)]'
                : 'border-line bg-bg2/60'
            }`}
          >
            <div
              className={`font-mono text-xl font-bold tabular-nums sm:text-2xl ${
                b.highlight ? 'text-gold-ink' : 'text-ink'
              }`}
            >
              {b.val}
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-muted">{b.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

