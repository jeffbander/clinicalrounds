'use client';

import { SpecialistChat } from '@/components/SpecialistChat';
import AddNotesPanel from '@/components/AddNotesPanel';
import type {
  SpecialistChatMessage,
  SpecialistAnalysis,
  IntakeData,
  TemporalIntakeData,
} from '@/lib/types';
import { Specialist } from '@/lib/types';

interface ChatViewProps {
  chatHistory: SpecialistChatMessage[];
  specialistAnalyses: Record<string, SpecialistAnalysis>;
  intakeData: IntakeData | null;
  onSendMessage: (specialist: Specialist, message: string) => void;
  onAppendNotes: (text: string) => void;
  isProcessing: boolean;
}

export function ChatView({
  chatHistory,
  specialistAnalyses,
  intakeData,
  onSendMessage,
  onAppendNotes,
  isProcessing,
}: ChatViewProps) {
  // Build a brief timeline summary for sidebar
  const temporal = intakeData as TemporalIntakeData | null;
  const hasTimeline = temporal?.encounters && temporal.encounters.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Main: Chat panel */}
      <div className="min-w-0">
        <SpecialistChat
          chatHistory={chatHistory}
          analyses={specialistAnalyses}
          onSendMessage={onSendMessage}
          isProcessing={isProcessing}
        />
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Timeline summary */}
        {hasTimeline && (
          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Timeline Summary
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {temporal!.timeline_summary && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {temporal!.timeline_summary}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground/70">
                {temporal!.encounters.length} encounter{temporal!.encounters.length !== 1 ? 's' : ''}
                {temporal!.date_range?.start && (
                  <> from {temporal!.date_range.start} to {temporal!.date_range.end}</>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Case context summary */}
        {intakeData && (
          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Case Summary
              </h3>
            </div>
            <div className="p-4 space-y-1.5 text-xs text-muted-foreground">
              {intakeData.chief_complaint && (
                <p><span className="font-medium">CC:</span> {intakeData.chief_complaint}</p>
              )}
              {intakeData.demographics?.age && (
                <p>
                  <span className="font-medium">Pt:</span>{' '}
                  {intakeData.demographics.age}yo {intakeData.demographics.sex || ''}
                </p>
              )}
              <p>
                <span className="font-medium">Specialists:</span>{' '}
                {Object.keys(specialistAnalyses).length} analyzed
              </p>
            </div>
          </div>
        )}

        {/* Add notes */}
        <AddNotesPanel onAppend={onAppendNotes} isProcessing={isProcessing} />
      </div>
    </div>
  );
}
