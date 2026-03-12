'use client';

import { SpecialistCard } from './SpecialistCard';
import { Progress } from '@/components/ui/progress';
import { Specialist, SPECIALIST_CONFIG } from '@/lib/types';
import type { SpecialistAnalysis, AnalysisStatus, SpecialistSearchActivity, SpecialistCalculationActivity } from '@/lib/types';

interface SpecialistGridProps {
  analyses: Record<string, SpecialistAnalysis>;
  statuses: Record<string, AnalysisStatus>;
  searchActivities?: SpecialistSearchActivity[];
  calculationActivities?: SpecialistCalculationActivity[];
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
  Specialist.ENDOCRINOLOGIST,
  Specialist.NEUROLOGIST,
  Specialist.INTENSIVIST,
  Specialist.ONCOLOGIST,
  Specialist.PSYCHIATRIST,
  Specialist.TOXICOLOGIST,
  Specialist.PALLIATIVE,
];

export function SpecialistGrid({ analyses, statuses, searchActivities, calculationActivities }: SpecialistGridProps) {
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
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              <span className="font-medium text-foreground">Specialists analyzing</span>
            </div>
            <span className="text-muted-foreground font-mono">{completed}/{total}</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      )}

      {/* Grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children"
        role="region"
        aria-label="Specialist analyses"
      >
        {SPECIALIST_ORDER.map((specialist) => {
          const config = SPECIALIST_CONFIG[specialist];
          const status = statuses[specialist] || 'waiting';
          const analysis = analyses[specialist];
          const latestSearch = searchActivities
            ?.filter((a) => a.specialist === specialist)
            .sort((a, b) => b.timestamp - a.timestamp)[0];

          return (
            <SpecialistCard
              key={specialist}
              name={config.name}
              icon={config.icon}
              status={status}
              analysis={analysis}
              searchActivity={latestSearch}
              calculationActivities={calculationActivities?.filter((a) => a.specialist === specialist)}
              specialistKey={specialist}
            />
          );
        })}
      </div>
    </div>
  );
}
