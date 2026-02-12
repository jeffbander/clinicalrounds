'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calculator } from 'lucide-react';
import type { ScoringSystem } from '@/lib/types';

interface ScoringSystemsSidebarProps {
  scores: ScoringSystem[];
}

export function ScoringSystemsSidebar({ scores }: ScoringSystemsSidebarProps) {
  if (scores.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Calculator className="size-4 text-primary" aria-hidden="true" />
          Scoring Systems
        </h3>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-3" role="list" aria-label="Applied clinical scoring systems">
          {scores.map((score, i) => (
            <div key={`${score.name}-${i}`} role="listitem">
              {i > 0 && <Separator className="mb-3" />}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{score.name}</span>
                  <span className="text-sm font-bold font-mono text-primary">
                    {score.score}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {score.interpretation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
