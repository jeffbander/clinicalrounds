'use client';

import { Button } from '@/components/ui/button';
import TimelineView from '@/components/TimelineView';
import { ArrowRight } from 'lucide-react';
import type { TemporalIntakeData } from '@/lib/types';

interface TimelineReviewViewProps {
  intakeData: TemporalIntakeData;
  onProceed: () => void;
}

export function TimelineReviewView({ intakeData, onProceed }: TimelineReviewViewProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold tracking-tight">Clinical Timeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the parsed encounters before proceeding to specialist analysis.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <TimelineView intakeData={intakeData} />
      </div>

      <div className="flex justify-center">
        <Button onClick={onProceed} size="lg" className="gap-2">
          Proceed to Analysis
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
