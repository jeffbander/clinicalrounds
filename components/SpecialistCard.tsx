'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, AlertTriangle, CheckCircle2, Loader2, Circle, Search, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpecialistAnalysis, AnalysisStatus, Severity, SpecialistSearchActivity } from '@/lib/types';
import { Specialist } from '@/lib/types';
import { specialistThinkingMessages } from '@/lib/specialistThinkingMessages';

interface SpecialistCardProps {
  name: string;
  icon: string;
  status: AnalysisStatus;
  analysis?: SpecialistAnalysis;
  searchActivity?: SpecialistSearchActivity;
  specialistKey?: Specialist;
}

const statusConfig: Record<AnalysisStatus, { color: string; dotClass: string; bgClass: string; Icon: React.ComponentType<{ className?: string }> }> = {
  waiting: { color: 'text-muted-foreground', dotClass: 'bg-muted-foreground/40', bgClass: '', Icon: Circle },
  analyzing: { color: 'text-primary', dotClass: 'bg-primary animate-pulse', bgClass: 'border-primary/30', Icon: Loader2 },
  complete: { color: 'text-emerald-600', dotClass: 'bg-emerald-500', bgClass: '', Icon: CheckCircle2 },
  critical: { color: 'text-destructive', dotClass: 'bg-destructive', bgClass: 'border-destructive/30 shadow-destructive/5', Icon: AlertTriangle },
};

const severityStyles: Record<Severity, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
};

export function SpecialistCard({ name, icon, status, analysis, searchActivity, specialistKey }: SpecialistCardProps) {
  const [open, setOpen] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);

  useEffect(() => {
    if (status !== 'analyzing' || !specialistKey) return;
    const messages = specialistThinkingMessages[specialistKey];
    if (!messages?.length) return;
    const interval = setInterval(() => {
      setThinkingIndex(prev => (prev + 1) % messages.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [status, specialistKey]);

  const thinkingMessage = specialistKey && status === 'analyzing'
    ? specialistThinkingMessages[specialistKey]?.[thinkingIndex] ?? 'Analyzing...'
    : 'Analyzing...';
  const config = statusConfig[status];
  const concerns = Array.isArray(analysis?.concerns) ? analysis.concerns : [];
  const findings = Array.isArray(analysis?.findings) ? analysis.findings : [];
  const recommendations = Array.isArray(analysis?.recommendations) ? analysis.recommendations : [];
  const hasCritical = concerns.some((c) => c.severity === 'critical');

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card
        className={cn(
          'transition-all duration-200 hover-lift',
          hasCritical && 'border-destructive/40 shadow-sm shadow-destructive/10',
          status === 'analyzing' && 'border-primary/40',
          status === 'complete' && 'hover:border-primary/30',
          open && 'ring-1 ring-ring/20 shadow-md'
        )}
      >
        <CollapsibleTrigger asChild>
          <CardHeader
            className="flex flex-row items-center gap-3 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
            role="button"
            aria-expanded={open}
            aria-label={`${name} - ${status}. Click to ${open ? 'collapse' : 'expand'} details.`}
          >
            {/* Specialist icon in a circle */}
            <div className={cn(
              'flex items-center justify-center size-9 rounded-lg text-lg shrink-0 transition-colors',
              status === 'analyzing' && 'bg-primary/10',
              status === 'complete' && 'bg-emerald-50',
              status === 'critical' && 'bg-red-50',
              status === 'waiting' && 'bg-muted'
            )}>
              <span aria-hidden="true">{icon}</span>
            </div>

            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm truncate block">{name}</span>
              {status === 'analyzing' && (
                <span className="text-[11px] text-primary flex items-center gap-1 mt-0.5">
                  <Loader2 className="size-2.5 animate-spin" />
                  {thinkingMessage}
                </span>
              )}
              {status === 'complete' && findings.length > 0 && !open && (
                <span className="text-[11px] text-muted-foreground truncate block mt-0.5">
                  {findings.length} findings, {recommendations.length} recommendations
                </span>
              )}
              {status === 'critical' && (
                <span className="text-[11px] text-destructive flex items-center gap-1 mt-0.5">
                  <AlertTriangle className="size-2.5" />
                  {concerns.filter(c => c.severity === 'critical').length} critical
                </span>
              )}
            </div>

            {/* Status dot */}
            <div className="flex items-center gap-2 shrink-0">
              {concerns.length > 0 && (status === 'complete' || status === 'critical') && !open && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                  {concerns.length}
                </Badge>
              )}
              <div className={cn('size-2 rounded-full shrink-0', config.dotClass)} aria-hidden="true" />
              <ChevronDown
                className={cn(
                  'size-4 text-muted-foreground transition-transform duration-200',
                  open && 'rotate-180'
                )}
                aria-hidden="true"
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            {status === 'waiting' && (
              <p className="text-xs text-muted-foreground italic">Awaiting analysis...</p>
            )}

            {status === 'analyzing' && (
              <div className="space-y-2">
                <p className="text-xs text-primary/80">
                  {thinkingMessage}<span className="animate-blink-cursor">|</span>
                </p>
                {searchActivity && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-primary/5 rounded-md px-2.5 py-1.5 mt-2">
                    <Search className="size-3 shrink-0 text-primary" aria-hidden="true" />
                    <span className="truncate">Searching: <span className="font-medium text-foreground/70">{searchActivity.query}</span></span>
                  </div>
                )}
              </div>
            )}

            {analysis && (status === 'complete' || status === 'critical') && (
              <>
                {/* Findings */}
                {findings.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Findings
                    </h4>
                    <ul className="space-y-1.5" role="list">
                      {findings.map((f, i) => (
                        <li key={i} className="text-xs leading-relaxed flex gap-2">
                          <span className="text-primary/60 shrink-0 mt-0.5 font-bold">&bull;</span>
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
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Concerns
                    </h4>
                    <div className="space-y-1.5">
                      {concerns.map((c, i) => (
                        <div
                          key={i}
                          className={cn(
                            'text-xs px-2.5 py-2 rounded-md border',
                            severityStyles[c.severity]
                          )}
                          role="alert"
                          aria-label={`${c.severity} concern`}
                        >
                          <span className="font-bold uppercase text-[10px] tracking-wide">{c.severity}</span>
                          <span className="mx-1.5 opacity-40">|</span>
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
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Recommendations
                    </h4>
                    <ul className="space-y-2" role="list">
                      {recommendations.map((r, i) => (
                        <li key={i} className="text-xs leading-relaxed">
                          <span className="font-medium text-foreground">{r.recommendation}</span>
                          {r.rationale && (
                            <span className="text-muted-foreground ml-1 italic">— {r.rationale}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Web Search Citations */}
                {analysis.web_search_citations && analysis.web_search_citations.length > 0 && (
                  <div>
                    <Separator className="mb-2" />
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Sources
                    </h4>
                    <ul className="space-y-1.5" role="list">
                      {analysis.web_search_citations.map((citation, i) => (
                        <li key={i} className="text-xs leading-relaxed">
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 group"
                          >
                            <ExternalLink className="size-3 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                            {citation.title}
                          </a>
                          {citation.page_age && (
                            <span className="text-muted-foreground ml-1">({citation.page_age})</span>
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
