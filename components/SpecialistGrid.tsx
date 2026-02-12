'use client';

import { SpecialistCard } from './SpecialistCard';
import { Progress } from '@/components/ui/progress';
import { Specialist, SPECIALIST_CONFIG } from '@/lib/types';
import type { SpecialistAnalysis, AnalysisStatus } from '@/lib/types';

interface SpecialistGridProps {
  analyses: Record<string, SpecialistAnalysis>;
  statuses: Record<string, AnalysisStatus>;
}

const SPECIALIST_ORDER: Specialist[] = [
  Specialist.ATTENDING,
  Specialist.CARDIOLOGIST,
  Specialist.PULMONOLOGIST,
  Specialist.NEPHROLOGIST,
  Specialist.HEPATOLOGIST,
  Specialist.HEMATOLOGIST,
  Specialist.ID_SPECIALIST,
  Specialist.RADIOLOGIST,
  Specialist.PHARMACIST,
];

export function SpecialistGrid({ analyses, statuses }: SpecialistGridProps) {
  const total = SPECIALIST_ORDER.length;
  const completed = SPECIALIST_ORDER.filter(
    (s) => statuses[s] === 'complete' || statuses[s] === 'critical'
  ).length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isActive = Object.values(statuses).some((s) => s === 'analyzing');

  return (
    <div className="space-y-4">
      {/* Progress header */}
      {isActive && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Specialist analysis</span>
            <span>{completed}/{total} complete</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      )}

      {/* 3x3 Grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        role="region"
        aria-label="Specialist analyses"
      >
        {SPECIALIST_ORDER.map((specialist) => {
          const config = SPECIALIST_CONFIG[specialist];
          const status = statuses[specialist] || 'waiting';
          const analysis = analyses[specialist];

          return (
            <SpecialistCard
              key={specialist}
              name={config.name}
              icon={config.icon}
              status={status}
              analysis={analysis}
            />
          );
        })}
      </div>
    </div>
  );
}
