'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Presentation, ExternalLink, Copy, Check, X, AlertTriangle } from 'lucide-react';
import { PRESENTATION_TYPES, type PresentationType } from '@/lib/presentationTemplates';
import type {
  IntakeData,
  SpecialistAnalysis,
  CrossConsultMessage,
  ScoringSystem,
  PresentationResponse,
} from '@/lib/types';

interface CreatePresentationModalProps {
  intakeData: IntakeData;
  specialistAnalyses: Record<string, SpecialistAnalysis>;
  crossConsultMessages: CrossConsultMessage[];
  synthesizedPlan: string;
  criticalAlerts: Array<{ specialist: string; detail: string }>;
  scoringSystems: ScoringSystem[];
  onClose: () => void;
}

const AUDIENCES = ['Medical Students', 'Residents', 'Attendings', 'Mixed'];

export function CreatePresentationModal({
  intakeData,
  specialistAnalyses,
  crossConsultMessages,
  synthesizedPlan,
  criticalAlerts,
  scoringSystems,
  onClose,
}: CreatePresentationModalProps) {
  const [selectedType, setSelectedType] = useState<PresentationType>(PRESENTATION_TYPES[0]);
  const [audience, setAudience] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [status, setStatus] = useState<'options' | 'generating' | 'done' | 'error'>('options');
  const [result, setResult] = useState<PresentationResponse | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setStatus('generating');
    setError('');

    try {
      const res = await fetch('/api/presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeData,
          specialistAnalyses,
          crossConsultMessages,
          synthesizedPlan,
          criticalAlerts,
          scoringSystems,
          options: {
            type: selectedType.id,
            audience: audience || undefined,
            focusAreas: focusAreas ? focusAreas.split(',').map(s => s.trim()).filter(Boolean) : undefined,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `Failed (${res.status})`);
      }

      const data: PresentationResponse = await res.json();
      setResult(data);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate presentation');
      setStatus('error');
    }
  };

  const handleCopyOutline = async () => {
    if (!result?.outline) return;
    await navigator.clipboard.writeText(result.outline);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative mx-4 w-full max-w-2xl rounded-xl border border-border bg-background shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 py-4 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Presentation className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Create Presentation</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Options View */}
          {status === 'options' && (
            <>
              {/* Presentation Type Cards */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-3 block">Presentation Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {PRESENTATION_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type)}
                      className={`rounded-lg border p-4 text-left transition-all hover:border-primary/50 ${
                        selectedType.id === type.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{type.icon}</span>
                        <span className="font-medium text-sm">{type.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">~{type.numSlides} slides</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audience */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Audience <span className="text-xs font-normal">(optional)</span>
                </label>
                <select
                  value={audience}
                  onChange={e => setAudience(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Default</option>
                  {AUDIENCES.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* Focus Areas */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Focus Areas <span className="text-xs font-normal">(optional, comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={focusAreas}
                  onChange={e => setFocusAreas(e.target.value)}
                  placeholder="e.g., renal function, anticoagulation"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* PHI Warning */}
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  The presentation outline is generated by AI. Verify no protected health information (names, MRNs, DOBs) is included before sharing.
                </p>
              </div>

              <Button onClick={handleGenerate} className="w-full gap-2" size="lg">
                <Presentation className="size-4" />
                Generate Presentation
              </Button>
            </>
          )}

          {/* Generating */}
          {status === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Structuring your {selectedType.name.toLowerCase()} presentation...</p>
              <p className="text-xs text-muted-foreground">This may take 15-30 seconds</p>
            </div>
          )}

          {/* Done */}
          {status === 'done' && result && (
            <>
              {/* Gamma Link */}
              {result.gammaUrl && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-medium mb-2">Your presentation is ready!</p>
                  <a
                    href={result.gammaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <ExternalLink className="size-4" />
                    Open in Gamma
                  </a>
                </div>
              )}

              {/* Outline Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Presentation Outline</label>
                  <Button variant="outline" size="sm" onClick={handleCopyOutline} className="gap-1.5">
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? 'Copied!' : 'Copy Outline'}
                  </Button>
                </div>
                <div className="max-h-80 overflow-y-auto rounded-md border border-border bg-muted/30 p-4">
                  <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed">{result.outline}</pre>
                </div>
                {!result.gammaUrl && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Copy the outline above and paste it into Gamma, Google Slides, or PowerPoint to create your presentation.
                  </p>
                )}
              </div>

              {/* PHI Warning */}
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Review the outline for any protected health information before sharing externally. AI clinical reasoning aid — does not replace physician clinical judgment.
                </p>
              </div>
            </>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="space-y-4">
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStatus('options')} variant="outline" className="flex-1">
                  Back to Options
                </Button>
                <Button onClick={handleGenerate} className="flex-1">
                  Retry
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
