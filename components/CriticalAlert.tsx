'use client';

import { useState } from 'react';
import { SPECIALIST_CONFIG, Specialist } from '@/lib/types';
import { AlertTriangle, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CriticalAlertProps {
  alerts: Array<{ specialist: string; detail: string }>;
}

function getSpecialistLabel(name: string): string {
  const specialist = Object.values(Specialist).find((s) => s === name);
  if (specialist && SPECIALIST_CONFIG[specialist]) {
    return SPECIALIST_CONFIG[specialist].name;
  }
  return name;
}

export function CriticalAlert({ alerts }: CriticalAlertProps) {
  const [open, setOpen] = useState(false);

  if (alerts.length === 0) return null;

  return (
    <div role="alert" aria-label="Critical clinical findings">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/15 transition-colors"
      >
        <AlertTriangle className="size-4 shrink-0" />
        <span className="text-sm font-semibold">
          {alerts.length} Critical {alerts.length === 1 ? 'Alert' : 'Alerts'}
        </span>
        <ChevronDown
          className={cn(
            'size-4 ml-auto shrink-0 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="mt-1.5 space-y-1.5">
          {alerts.map((alert, i) => (
            <div
              key={`${alert.specialist}-${i}`}
              className="flex gap-2 px-3 py-1.5 rounded border border-destructive/20 bg-destructive/5 text-sm"
            >
              <span className="font-semibold text-destructive shrink-0">
                {getSpecialistLabel(alert.specialist)}:
              </span>
              <span>{alert.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
