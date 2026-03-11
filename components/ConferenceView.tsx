'use client';

import { useEffect, useRef, useMemo } from 'react';
import { ArrowRight, User, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Specialist, SPECIALIST_CONFIG } from '@/lib/types';
import type { CrossConsultMessage, CrossConsultRound } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ConferenceViewProps {
  exchanges: CrossConsultMessage[];
  isActive: boolean;
  totalExpected?: number;
  rounds?: CrossConsultRound[];
  currentRound?: number;
  maxRounds?: number;
}

function getSpecialistConfig(s: Specialist) {
  return SPECIALIST_CONFIG[s] ?? { name: String(s), icon: '\u{1F4AC}' };
}

const SPECIALIST_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  [Specialist.ATTENDING]:      { border: 'border-l-blue-600',    bg: 'bg-blue-50',    text: 'text-blue-700' },
  [Specialist.CARDIOLOGIST]:   { border: 'border-l-red-500',     bg: 'bg-red-50',     text: 'text-red-700' },
  [Specialist.PULMONOLOGIST]:  { border: 'border-l-sky-500',     bg: 'bg-sky-50',     text: 'text-sky-700' },
  [Specialist.NEPHROLOGIST]:   { border: 'border-l-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-700' },
  [Specialist.HEPATOLOGIST]:   { border: 'border-l-yellow-500',  bg: 'bg-yellow-50',  text: 'text-yellow-700' },
  [Specialist.HEMATOLOGIST]:   { border: 'border-l-rose-500',    bg: 'bg-rose-50',    text: 'text-rose-700' },
  [Specialist.ID_SPECIALIST]:  { border: 'border-l-green-500',   bg: 'bg-green-50',   text: 'text-green-700' },
  [Specialist.RADIOLOGIST]:    { border: 'border-l-cyan-500',    bg: 'bg-cyan-50',    text: 'text-cyan-700' },
  [Specialist.PHARMACIST]:     { border: 'border-l-pink-500',    bg: 'bg-pink-50',    text: 'text-pink-700' },
  [Specialist.ENDOCRINOLOGIST]:{ border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  [Specialist.NEUROLOGIST]:    { border: 'border-l-purple-500',  bg: 'bg-purple-50',  text: 'text-purple-700' },
};

function isClinicianMessage(msg: CrossConsultMessage): boolean {
  return !Object.values(Specialist).includes(msg.from as Specialist);
}

function ExchangeCard({ ex, index }: { ex: CrossConsultMessage; index: number }) {
  const isClinician = isClinicianMessage(ex);
  const fromConfig = isClinician
    ? { name: 'Clinician', icon: '' }
    : getSpecialistConfig(ex.from);
  const toConfig = getSpecialistConfig(ex.to);
  const colors = isClinician
    ? { border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' }
    : (SPECIALIST_COLORS[ex.from] ?? { border: 'border-l-primary', bg: 'bg-primary/5', text: 'text-primary' });

  return (
    <div
      className={cn(
        'rounded-lg border bg-card overflow-hidden animate-fade-in-up',
        isClinician && 'ring-1 ring-amber-200'
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header bar */}
      <div className={cn('flex items-center gap-2 px-3 py-2 text-xs border-b', colors.bg)}>
        {isClinician ? (
          <User className="size-3.5 text-amber-600" />
        ) : (
          <span className="text-sm" aria-hidden="true">{fromConfig.icon}</span>
        )}
        <span className={cn('font-semibold', colors.text)}>
          {fromConfig.name}
        </span>
        <ArrowRight className="size-3 text-muted-foreground/50" aria-hidden="true" />
        <span className="text-sm" aria-hidden="true">{toConfig.icon}</span>
        <span className="font-semibold text-foreground/70">{toConfig.name}</span>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Question bubble */}
        <div className={cn('border-l-[3px] pl-3 py-1', colors.border)}>
          <p className="text-sm text-foreground/80 leading-relaxed">{ex.message}</p>
        </div>

        {/* Response */}
        {ex.response && (
          <div className="pl-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm" aria-hidden="true">{toConfig.icon}</span>
              <span className="text-[11px] font-semibold text-muted-foreground">{toConfig.name} responds:</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{ex.response}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ConferenceView({
  exchanges,
  isActive,
  totalExpected = 1,
  rounds,
  currentRound,
  maxRounds,
}: ConferenceViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const allExchanges = useMemo(() => {
    if (rounds && rounds.length > 0) {
      return rounds.flatMap((r) => r.messages);
    }
    return exchanges;
  }, [rounds, exchanges]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allExchanges.length]);

  const activeSpecialists = useMemo(() => {
    const set = new Set<Specialist>();
    for (const ex of allExchanges) {
      set.add(ex.from);
      set.add(ex.to);
    }
    return set;
  }, [allExchanges]);

  const latestPair = useMemo(() => {
    if (allExchanges.length === 0) return new Set<Specialist>();
    const last = allExchanges[allExchanges.length - 1];
    return new Set([last.from, last.to]);
  }, [allExchanges]);

  const completedCount = allExchanges.length;
  const progressPercent = Math.min((completedCount / totalExpected) * 100, 100);
  const isMultiRound = rounds && rounds.length > 0;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary/10 rounded-md">
              <MessageSquare className="size-4 text-primary" />
            </div>
            <h3 className="text-sm font-bold">Cross-Consultation</h3>
            {isActive && (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isMultiRound && currentRound !== undefined && maxRounds !== undefined && (
              <Badge variant="secondary" className="text-xs font-medium">
                Round {currentRound}/{maxRounds}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground font-mono">
              {completedCount}/{totalExpected}
            </span>
          </div>
        </div>
        <Progress value={progressPercent} className="mt-2.5 h-1" />
      </div>

      {/* Specialist Roster */}
      <div className="px-4 py-2 border-b bg-card flex gap-1.5 flex-wrap">
        {Object.values(Specialist).map((s) => {
          const config = getSpecialistConfig(s);
          const isLatest = latestPair.has(s);
          const hasParticipated = activeSpecialists.has(s);

          return (
            <Badge
              key={s}
              variant="outline"
              className={cn(
                'text-[11px] gap-1 transition-all duration-300',
                isLatest && 'ring-2 ring-primary ring-offset-1 bg-primary/5',
                hasParticipated && !isLatest && 'bg-secondary',
                !hasParticipated && 'opacity-30'
              )}
            >
              <span aria-hidden="true">{config.icon}</span>
              <span className="hidden sm:inline">{config.name}</span>
            </Badge>
          );
        })}
      </div>

      {/* Exchange Feed */}
      <div className="max-h-[600px] overflow-y-auto">
        <div className="p-4 space-y-3" role="log" aria-label="Cross-consultation exchanges" aria-live="polite">
          {allExchanges.length === 0 && isActive && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 animate-pulse">
              <MessageSquare className="size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Specialists are conferring...</p>
            </div>
          )}

          {isMultiRound ? (
            <>
              {rounds!.map((round) => (
                <div key={`round-${round.round}`}>
                  <div className="flex items-center gap-3 my-4">
                    <Separator className="flex-1" />
                    <Badge variant="outline" className="text-xs font-semibold shrink-0 bg-card">
                      Round {round.round}
                    </Badge>
                    <Separator className="flex-1" />
                  </div>
                  <div className="space-y-3">
                    {round.messages.map((ex, i) => (
                      <ExchangeCard
                        key={`r${round.round}-${ex.from}-${ex.to}-${i}`}
                        ex={ex}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            exchanges.map((ex, i) => (
              <ExchangeCard key={`${ex.from}-${ex.to}-${i}`} ex={ex} index={i} />
            ))
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
