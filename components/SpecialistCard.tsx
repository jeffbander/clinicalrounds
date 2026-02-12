'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, AlertTriangle, CheckCircle2, Loader2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpecialistAnalysis, AnalysisStatus, Severity } from '@/lib/types';

interface SpecialistCardProps {
  name: string;
  icon: string;
  status: AnalysisStatus;
  analysis?: SpecialistAnalysis;
}

const statusConfig: Record<AnalysisStatus, { color: string; dotClass: string; Icon: React.ComponentType<{ className?: string }> }> = {
  waiting: { color: 'text-muted-foreground', dotClass: 'bg-muted-foreground/40', Icon: Circle },
  analyzing: { color: 'text-primary', dotClass: 'bg-primary animate-pulse', Icon: Loader2 },
  complete: { color: 'text-emerald-600', dotClass: 'bg-emerald-500', Icon: CheckCircle2 },
  critical: { color: 'text-destructive', dotClass: 'bg-destructive', Icon: AlertTriangle },
};

const severityStyles: Record<Severity, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
};

export function SpecialistCard({ name, icon, status, analysis }: SpecialistCardProps) {
  const [open, setOpen] = useState(false);
  const config = statusConfig[status];
  const concerns = Array.isArray(analysis?.concerns) ? analysis.concerns : [];
  const findings = Array.isArray(analysis?.findings) ? analysis.findings : [];
  const recommendations = Array.isArray(analysis?.recommendations) ? analysis.recommendations : [];
  const hasCritical = concerns.some((c) => c.severity === 'critical');

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card
        className={cn(
          'transition-shadow',
          hasCritical && 'border-destructive/40 shadow-sm shadow-destructive/10',
          status === 'analyzing' && 'border-primary/40',
          open && 'ring-1 ring-ring/20'
        )}
      >
        <CollapsibleTrigger asChild>
          <CardHeader
            className="flex flex-row items-center gap-2 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
            role="button"
            aria-expanded={open}
            aria-label={`${name} - ${status}. Click to ${open ? 'collapse' : 'expand'} details.`}
          >
            <span className="text-base" aria-hidden="true">{icon}</span>
            <span className="font-medium text-sm flex-1 truncate">{name}</span>
            <div className={cn('size-2 rounded-full shrink-0', config.dotClass)} aria-hidden="true" />
            <ChevronDown
              className={cn(
                'size-4 text-muted-foreground transition-transform',
                open && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            {status === 'waiting' && (
              <p className="text-xs text-muted-foreground italic">Awaiting analysis...</p>
            )}

            {status === 'analyzing' && (
              <div className="flex items-center gap-2 text-xs text-primary">
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                Analyzing...
              </div>
            )}

            {analysis && (status === 'complete' || status === 'critical') && (
              <>
                {/* Findings */}
                {findings.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Findings
                    </h4>
                    <ul className="space-y-1" role="list">
                      {findings.map((f, i) => (
                        <li key={i} className="text-xs leading-relaxed flex gap-1.5">
                          <span className="text-muted-foreground shrink-0 mt-0.5">&bull;</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Concerns */}
                {concerns.length > 0 && (
                  <div>
                    <Separator className="mb-2" />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Concerns
                    </h4>
                    <div className="space-y-1.5">
                      {concerns.map((c, i) => (
                        <div
                          key={i}
                          className={cn(
                            'text-xs px-2 py-1.5 rounded border',
                            severityStyles[c.severity]
                          )}
                          role="alert"
                          aria-label={`${c.severity} concern`}
                        >
                          <span className="font-semibold uppercase text-[10px]">{c.severity}</span>
                          <span className="mx-1">&mdash;</span>
                          {c.detail}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <div>
                    <Separator className="mb-2" />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Recommendations
                    </h4>
                    <ul className="space-y-1.5" role="list">
                      {recommendations.map((r, i) => (
                        <li key={i} className="text-xs leading-relaxed">
                          <span className="font-medium">{r.recommendation}</span>
                          {r.rationale && (
                            <span className="text-muted-foreground ml-1">({r.rationale})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
