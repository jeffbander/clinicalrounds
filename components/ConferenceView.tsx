'use client';

import { useEffect, useRef, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Specialist, SPECIALIST_CONFIG } from '@/lib/types';
import type { CrossConsultMessage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ConferenceViewProps {
  exchanges: CrossConsultMessage[];
  isActive: boolean;
  totalExpected?: number;
}

function getSpecialistConfig(s: Specialist) {
  return SPECIALIST_CONFIG[s] ?? { name: String(s), icon: '\u{1F4AC}' };
}

// Stable color per specialist for left border accent
const SPECIALIST_COLORS: Record<string, string> = {
  [Specialist.ATTENDING]: 'border-l-blue-600',
  [Specialist.CARDIOLOGIST]: 'border-l-red-500',
  [Specialist.PULMONOLOGIST]: 'border-l-sky-500',
  [Specialist.NEPHROLOGIST]: 'border-l-violet-500',
  [Specialist.HEPATOLOGIST]: 'border-l-yellow-500',
  [Specialist.HEMATOLOGIST]: 'border-l-rose-500',
  [Specialist.ID_SPECIALIST]: 'border-l-green-500',
  [Specialist.RADIOLOGIST]: 'border-l-cyan-500',
  [Specialist.PHARMACIST]: 'border-l-pink-500',
  [Specialist.ENDOCRINOLOGIST]: 'border-l-emerald-500',
  [Specialist.NEUROLOGIST]: 'border-l-purple-500',
};

export function ConferenceView({ exchanges, isActive, totalExpected = 1 }: ConferenceViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exchanges.length]);

  // Track which specialists have participated
  const activeSpecialists = useMemo(() => {
    const set = new Set<Specialist>();
    for (const ex of exchanges) {
      set.add(ex.from);
      set.add(ex.to);
    }
    return set;
  }, [exchanges]);

  // Most recently involved specialists (from the latest exchange)
  const latestPair = useMemo(() => {
    if (exchanges.length === 0) return new Set<Specialist>();
    const last = exchanges[exchanges.length - 1];
    return new Set([last.from, last.to]);
  }, [exchanges]);

  const completedCount = exchanges.length;
  const progressPercent = Math.min((completedCount / totalExpected) * 100, 100);

  return (
    <div className="rounded-lg border bg-card animate-in fade-in duration-300">
      {/* A. Conference Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Cross-Consultation</h3>
            {isActive && (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {completedCount} of {totalExpected} exchanges
          </span>
        </div>
        <Progress value={progressPercent} className="mt-2 h-1" />
      </div>

      {/* B. Specialist Roster Strip */}
      <div className="px-4 py-2 border-b flex gap-1.5 flex-wrap">
        {Object.values(Specialist).map((s) => {
          const config = getSpecialistConfig(s);
          const isLatest = latestPair.has(s);
          const hasParticipated = activeSpecialists.has(s);

          return (
            <Badge
              key={s}
              variant="outline"
              className={cn(
                'text-[11px] gap-1 transition-all duration-200',
                isLatest && 'ring-2 ring-primary ring-offset-1',
                hasParticipated && !isLatest && 'bg-secondary',
                !hasParticipated && 'opacity-40'
              )}
            >
              <span aria-hidden="true">{config.icon}</span>
              {config.name}
            </Badge>
          );
        })}
      </div>

      {/* C. Exchange Feed */}
      <div className="max-h-[500px] overflow-y-auto">
        <div className="p-4 space-y-3" role="log" aria-label="Cross-consultation exchanges" aria-live="polite">
          {exchanges.length === 0 && isActive && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Waiting for specialist exchanges...
            </p>
          )}

          {exchanges.map((ex, i) => {
            const fromConfig = getSpecialistConfig(ex.from);
            const toConfig = getSpecialistConfig(ex.to);
            const borderColor = SPECIALIST_COLORS[ex.from] ?? 'border-l-primary';

            return (
              <div
                key={`${ex.from}-${ex.to}-${i}`}
                className={cn(
                  'rounded-md border border-l-[3px] bg-card p-3',
                  borderColor,
                  'animate-in fade-in slide-in-from-bottom-2 duration-300'
                )}
              >
                {/* From → To header */}
                <div className="flex items-center gap-1.5 text-xs mb-2">
                  <span aria-hidden="true">{fromConfig.icon}</span>
                  <span className="font-semibold">{fromConfig.name}</span>
                  <ArrowRight className="size-3 text-muted-foreground" aria-hidden="true" />
                  <span aria-hidden="true">{toConfig.icon}</span>
                  <span className="font-semibold">{toConfig.name}</span>
                </div>

                {/* Question */}
                <div className="border-l-2 border-muted pl-3 mb-2">
                  <p className="text-sm text-foreground/80 leading-relaxed">{ex.message}</p>
                </div>

                {/* Response */}
                {ex.response && (
                  <div className="pl-3 mt-1">
                    <p className="text-sm leading-relaxed">{ex.response}</p>
                  </div>
                )}
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
