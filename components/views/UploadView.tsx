'use client';

import { PasteBox } from '@/components/PasteBox';
import { Disclaimer } from '@/components/Disclaimer';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { Stethoscope, Users, Zap, Shield } from 'lucide-react';

interface UploadViewProps {
  onSubmit: (rawNotes: string) => void;
  isParsing?: boolean;
  webSearchEnabled?: boolean;
  onToggleWebSearch?: (enabled: boolean) => void;
}

export function UploadView({ onSubmit, isParsing, webSearchEnabled, onToggleWebSearch }: UploadViewProps) {
  return (
    <div className="mx-auto max-w-2xl animate-fade-in-up">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Zap className="size-3" aria-hidden="true" />
          AI-Powered Multidisciplinary Review
        </div>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
          Clinical Case Review
        </h2>
        <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Paste clinical notes and receive instant analysis from a team of AI specialists
          with structured findings, cross-consultation, and a unified assessment.
        </p>

        {/* Feature pills */}
        <div className="flex items-center justify-center gap-3 mt-5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" aria-hidden="true" />
            <span>9 Specialists</span>
          </div>
          <div className="size-1 rounded-full bg-border" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Stethoscope className="size-3.5" aria-hidden="true" />
            <span>Cross-Consultation</span>
          </div>
          <div className="size-1 rounded-full bg-border" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="size-3.5" aria-hidden="true" />
            <span>No PHI Stored</span>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm p-6">
        {isParsing ? (
          <LoadingAnimation />
        ) : (
          <PasteBox
            onSubmit={onSubmit}
            isAnalyzing={false}
            webSearchEnabled={webSearchEnabled}
            onToggleWebSearch={onToggleWebSearch}
          />
        )}
      </div>

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  );
}
