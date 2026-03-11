'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import type { TemporalIntakeData, ClinicalEncounter } from '@/lib/types';

interface TimelineViewProps {
  intakeData: TemporalIntakeData;
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === 'unknown') return 'Unknown Date';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function isAbnormalLab(lab: { abnormal?: boolean }): boolean {
  return lab.abnormal === true;
}

function getTrendArrow(
  current: { name: string; value: string },
  previous: { name: string; value: string } | undefined
): string | null {
  if (!previous) return null;
  const curVal = parseFloat(current.value);
  const prevVal = parseFloat(previous.value);
  if (isNaN(curVal) || isNaN(prevVal)) return null;
  if (curVal > prevVal) return '\u2191';
  if (curVal < prevVal) return '\u2193';
  return '\u2192';
}

function findPreviousLab(
  labName: string,
  currentEncounterIndex: number,
  encounters: ClinicalEncounter[]
): { name: string; value: string } | undefined {
  for (let i = currentEncounterIndex - 1; i >= 0; i--) {
    const match = encounters[i].labs?.find(
      (l) => l.name.toLowerCase() === labName.toLowerCase()
    );
    if (match) return match;
  }
  return undefined;
}

export default function TimelineView({ intakeData }: TimelineViewProps) {
  const { encounters, timeline_summary, date_range } = intakeData;
  const [openEncounters, setOpenEncounters] = useState<Record<string, boolean>>(() => {
    // Open the most recent encounter by default
    if (encounters.length > 0) {
      return { [encounters[encounters.length - 1].id]: true };
    }
    return {};
  });

  if (!encounters || encounters.length === 0) {
    return (
      <div className="text-sm text-zinc-500 italic p-4">
        No temporal encounter data available.
      </div>
    );
  }

  const toggleEncounter = (id: string) => {
    setOpenEncounters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Clinical Timeline</h3>
        {date_range && date_range.start && (
          <span className="text-xs text-zinc-500">
            {formatDate(date_range.start)}
            {date_range.end && date_range.end !== date_range.start && (
              <> &mdash; {formatDate(date_range.end)}</>
            )}
          </span>
        )}
      </div>

      {/* Timeline Summary */}
      {timeline_summary && (
        <div className="text-xs text-zinc-400 bg-zinc-900/50 rounded-md p-3 border border-zinc-800">
          {timeline_summary}
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[18px] top-0 bottom-0 w-px bg-zinc-700" />

        <div className="space-y-3">
          {encounters.map((encounter, idx) => {
            const isOpen = openEncounters[encounter.id] ?? false;

            return (
              <Collapsible
                key={encounter.id}
                open={isOpen}
                onOpenChange={() => toggleEncounter(encounter.id)}
              >
                <div className="relative pl-10">
                  {/* Date node */}
                  <div
                    className={cn(
                      'absolute left-2 top-2.5 w-3 h-3 rounded-full border-2',
                      idx === encounters.length - 1
                        ? 'bg-blue-500 border-blue-400'
                        : 'bg-zinc-700 border-zinc-600'
                    )}
                  />

                  <CollapsibleTrigger asChild>
                    <button className="w-full text-left group">
                      <div className="flex items-center gap-2 py-1.5">
                        <span className="text-xs font-mono text-zinc-400">
                          {formatDate(encounter.date)}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {encounter.encounter_type || 'Note'}
                        </Badge>

                        {/* Quick badges for labs/imaging */}
                        {encounter.labs && encounter.labs.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {encounter.labs.length} lab{encounter.labs.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {encounter.imaging && encounter.imaging.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {encounter.imaging.length} img
                          </Badge>
                        )}

                        <span className="ml-auto text-zinc-600 text-xs group-hover:text-zinc-400 transition-colors">
                          {isOpen ? '\u25B2' : '\u25BC'}
                        </span>
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="space-y-3 pb-3 pt-1">
                      {/* Vitals */}
                      {encounter.vitals && (
                        <VitalsSection vitals={encounter.vitals} />
                      )}

                      {/* Labs */}
                      {encounter.labs && encounter.labs.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase text-zinc-500 tracking-wider">
                            Labs
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {encounter.labs.map((lab, labIdx) => {
                              const prevLab = findPreviousLab(lab.name, idx, encounters);
                              const trend = getTrendArrow(lab, prevLab);

                              return (
                                <div
                                  key={labIdx}
                                  className={cn(
                                    'text-[11px] px-2 py-0.5 rounded border',
                                    isAbnormalLab(lab)
                                      ? 'bg-red-950/40 border-red-800/50 text-red-300'
                                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
                                  )}
                                >
                                  <span className="font-medium">{lab.name}</span>
                                  <span className="ml-1">{lab.value}</span>
                                  {lab.unit && (
                                    <span className="text-zinc-600 ml-0.5">{lab.unit}</span>
                                  )}
                                  {trend && (
                                    <span
                                      className={cn(
                                        'ml-1 font-bold',
                                        trend === '\u2191' ? 'text-red-400' : '',
                                        trend === '\u2193' ? 'text-green-400' : '',
                                        trend === '\u2192' ? 'text-zinc-500' : ''
                                      )}
                                    >
                                      {trend}
                                    </span>
                                  )}
                                  {prevLab && (
                                    <span className="text-zinc-600 ml-1 text-[10px]">
                                      (was {prevLab.value})
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Imaging */}
                      {encounter.imaging && encounter.imaging.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase text-zinc-500 tracking-wider">
                            Imaging
                          </span>
                          <div className="space-y-1">
                            {encounter.imaging.map((img, imgIdx) => (
                              <div
                                key={imgIdx}
                                className="text-[11px] bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1"
                              >
                                <span className="font-medium text-zinc-300">{img.modality}</span>
                                <span className="text-zinc-500 ml-1">{img.findings}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Procedures / Consults */}
                      {encounter.procedures_consults && encounter.procedures_consults.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase text-zinc-500 tracking-wider">
                            Procedures / Consults
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {encounter.procedures_consults.map((pc, pcIdx) => (
                              <Badge key={pcIdx} variant="outline" className="text-[10px]">
                                {pc}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes excerpt */}
                      {encounter.notes && (
                        <div className="text-[11px] text-zinc-500 bg-zinc-900/30 rounded p-2 border border-zinc-800/50 line-clamp-4">
                          {encounter.notes}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function VitalsSection({ vitals }: { vitals: ClinicalEncounter['vitals'] }) {
  const items: Array<{ label: string; value: string }> = [];

  if (vitals.hr != null) items.push({ label: 'HR', value: `${vitals.hr}` });
  if (vitals.bp_systolic != null && vitals.bp_diastolic != null) {
    items.push({ label: 'BP', value: `${vitals.bp_systolic}/${vitals.bp_diastolic}` });
  }
  if (vitals.rr != null) items.push({ label: 'RR', value: `${vitals.rr}` });
  if (vitals.temp != null) items.push({ label: 'T', value: `${vitals.temp}` });
  if (vitals.spo2 != null) items.push({ label: 'SpO2', value: `${vitals.spo2}%` });

  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <span className="text-[10px] font-semibold uppercase text-zinc-500 tracking-wider">
        Vitals
      </span>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="text-[11px] text-zinc-400">
            <span className="font-medium text-zinc-300">{item.label}</span>{' '}
            {item.value}
          </span>
        ))}
      </div>
    </div>
  );
}
