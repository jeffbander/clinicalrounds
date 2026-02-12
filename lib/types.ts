export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type AnalysisStatus = 'waiting' | 'analyzing' | 'complete' | 'critical';

export enum Specialist {
  ATTENDING = 'attending',
  CARDIOLOGIST = 'cardiologist',
  PULMONOLOGIST = 'pulmonologist',
  NEPHROLOGIST = 'nephrologist',
  HEPATOLOGIST = 'hepatologist',
  HEMATOLOGIST = 'hematologist',
  ID_SPECIALIST = 'id_specialist',
  RADIOLOGIST = 'radiologist',
  PHARMACIST = 'pharmacist',
  ENDOCRINOLOGIST = 'endocrinologist',
  NEUROLOGIST = 'neurologist',
}

export const SPECIALIST_CONFIG: Record<Specialist, { name: string; icon: string; model: 'sonnet' | 'opus' }> = {
  [Specialist.ATTENDING]: { name: 'Attending', icon: '\u{1F468}\u200D\u2695\uFE0F', model: 'opus' },
  [Specialist.CARDIOLOGIST]: { name: 'Cardiology', icon: '\u2764\uFE0F', model: 'sonnet' },
  [Specialist.PULMONOLOGIST]: { name: 'Pulm/CC', icon: '\u{1FAC1}', model: 'sonnet' },
  [Specialist.NEPHROLOGIST]: { name: 'Nephrology', icon: '\u{1F9EA}', model: 'sonnet' },
  [Specialist.HEPATOLOGIST]: { name: 'Hepatology', icon: '\u{1F7E1}', model: 'sonnet' },
  [Specialist.HEMATOLOGIST]: { name: 'Hematology', icon: '\u{1FA78}', model: 'sonnet' },
  [Specialist.ID_SPECIALIST]: { name: 'ID', icon: '\u{1F9A0}', model: 'sonnet' },
  [Specialist.RADIOLOGIST]: { name: 'Radiology', icon: '\u{1F4E1}', model: 'sonnet' },
  [Specialist.PHARMACIST]: { name: 'Pharmacy', icon: '\u{1F48A}', model: 'sonnet' },
  [Specialist.ENDOCRINOLOGIST]: { name: 'Endocrinology', icon: '\u{1F9EC}', model: 'sonnet' },
  [Specialist.NEUROLOGIST]: { name: 'Neurology', icon: '\u{1F9E0}', model: 'sonnet' },
};

export interface Concern {
  severity: Severity;
  detail: string;
}

export interface Recommendation {
  priority: string;
  recommendation: string;
  rationale: string;
  evidence_basis: string | null;
}

export interface CrossConsultRequest {
  to: string;
  question: string;
}

export interface ScoringSystem {
  name: string;
  score: number | string;
  interpretation: string;
}

export interface SpecialistAnalysis {
  specialist: Specialist;
  findings: string[];
  concerns: Concern[];
  recommendations: Recommendation[];
  questions_for_user: string[];
  questions_for_team: string[];
  cross_consults: CrossConsultRequest[];
  scoring_systems_applied: ScoringSystem[];
}

export interface IntakeData {
  demographics: {
    age?: number;
    sex?: string;
    weight?: number;
    height?: number;
  };
  chief_complaint: string;
  hpi: string;
  past_medical_history: string[];
  medications: Array<{
    name: string;
    dose?: string;
    route?: string;
    frequency?: string;
    type: 'home' | 'inpatient';
  }>;
  allergies: string[];
  vitals: {
    hr?: number;
    bp_systolic?: number;
    bp_diastolic?: number;
    rr?: number;
    temp?: number;
    spo2?: number;
    trends?: string;
  };
  labs: Array<{
    name: string;
    value: string;
    unit?: string;
    reference_range?: string;
    timestamp?: string;
    abnormal?: boolean;
  }>;
  imaging: Array<{
    modality: string;
    findings: string;
    timestamp?: string;
  }>;
  ecg?: string;
  physical_exam: string;
  procedures_consults: string[];
  missing_data: string[];
  raw_text: string;
}

export interface CrossConsultMessage {
  from: Specialist;
  to: Specialist;
  message: string;
  response?: string;
}

export interface DiscussionMessage {
  specialist: string;
  content: string;
  timestamp: number;
}

export interface UserQuestion {
  id: string;
  specialist: string;
  question: string;
  answer?: string | null;
}

export interface CaseState {
  step: 'idle' | 'parsing' | 'analyzing' | 'cross_consulting' | 'synthesizing' | 'complete';
  rawNotes: string;
  intakeData: IntakeData | null;
  specialistAnalyses: Record<string, SpecialistAnalysis>;
  specialistStatuses: Record<string, AnalysisStatus>;
  crossConsultMessages: CrossConsultMessage[];
  discussionThread: DiscussionMessage[];
  userAnswers: Record<string, string | null>;
  pendingQuestions: UserQuestion[];
  synthesizedPlan: string;
  isStreaming: boolean;
  criticalAlerts: Array<{ specialist: string; detail: string }>;
  scoringSystems: ScoringSystem[];
  tokenUsage: { input: number; output: number; estimatedCost: number };
  error: string | null;
}

// API request/response types
export interface AnalyzeRequest {
  rawNotes: string;
}

export interface AnalyzeResponse {
  intakeData: IntakeData;
  specialistAnalyses: Record<string, SpecialistAnalysis>;
  discussionMessages: DiscussionMessage[];
}

export interface CrossConsultApiRequest {
  analyses: Record<string, SpecialistAnalysis>;
  intakeData: IntakeData;
}

export interface CrossConsultResponse {
  messages: CrossConsultMessage[];
  updatedAnalyses: Record<string, SpecialistAnalysis>;
  discussionMessages: DiscussionMessage[];
}

export interface AdditionalDataRequest {
  answers: Record<string, string | null>;
  previousAnalyses: Record<string, SpecialistAnalysis>;
  intakeData: IntakeData;
}

export interface AdditionalDataResponse {
  updatedAnalyses: Record<string, SpecialistAnalysis>;
  discussionMessages: DiscussionMessage[];
}

export interface SynthesizeRequest {
  analyses: Record<string, SpecialistAnalysis>;
  crossConsults: CrossConsultMessage[];
  intakeData: IntakeData;
}

// SSE event types for streaming pipeline progress

export type AnalyzeSSEEvent =
  | { type: 'intake_complete'; intakeData: IntakeData }
  | { type: 'specialist_complete'; specialist: Specialist; analysis: SpecialistAnalysis; discussionMessage: DiscussionMessage }
  | { type: 'specialist_error'; specialist: Specialist; error: string }
  | { type: 'analyze_done'; totalSpecialists: number; completedCount: number };

export type CrossConsultSSEEvent =
  | { type: 'cross_consult_message'; message: CrossConsultMessage; discussionMessage: DiscussionMessage }
  | { type: 'cross_consult_done'; totalExchanges: number; completedCount: number };
