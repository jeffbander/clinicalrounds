import { Specialist } from '@/lib/types';
import type {
  IntakeData,
  TemporalIntakeData,
  SpecialistAnalysis,
  CrossConsultMessage,
  DiscussionMessage,
  UserQuestion,
  ScoringSystem,
  CaseState,
  AnalyzeResponse,
  CrossConsultResponse,
  AdditionalDataResponse,
} from '@/lib/types';

export const MOCK_INTAKE_DATA: TemporalIntakeData = {
  demographics: { age: 68, sex: 'M', weight: 82, height: 175 },
  chief_complaint: 'Acute dyspnea and chest tightness',
  hpi: '68M with history of CHF (EF 30%), CKD stage 3b, presents with 3 days of worsening dyspnea on exertion, orthopnea (3-pillow), and lower extremity edema.',
  past_medical_history: ['CHF EF 30%', 'CKD stage 3b', 'T2DM', 'HTN', 'Afib on warfarin'],
  medications: [
    { name: 'Lisinopril', dose: '20mg', route: 'PO', frequency: 'daily', type: 'home' },
    { name: 'Metoprolol succinate', dose: '50mg', route: 'PO', frequency: 'daily', type: 'home' },
    { name: 'Furosemide', dose: '40mg', route: 'PO', frequency: 'BID', type: 'home' },
    { name: 'Warfarin', dose: '5mg', route: 'PO', frequency: 'daily', type: 'home' },
    { name: 'Metformin', dose: '500mg', route: 'PO', frequency: 'BID', type: 'home' },
  ],
  allergies: ['Penicillin - rash'],
  vitals: {
    hr: 102,
    bp_systolic: 148,
    bp_diastolic: 88,
    rr: 24,
    temp: 37.1,
    spo2: 91,
    trends: 'BP trending up, SpO2 declining over 12h',
  },
  labs: [
    { name: 'BNP', value: '1850', unit: 'pg/mL', reference_range: '<100', abnormal: true },
    { name: 'Creatinine', value: '2.4', unit: 'mg/dL', reference_range: '0.7-1.3', abnormal: true },
    { name: 'Potassium', value: '5.3', unit: 'mEq/L', reference_range: '3.5-5.0', abnormal: true },
    { name: 'Troponin', value: '0.08', unit: 'ng/mL', reference_range: '<0.04', abnormal: true },
    { name: 'INR', value: '2.8', unit: '', reference_range: '2.0-3.0', abnormal: false },
    { name: 'Hemoglobin', value: '10.2', unit: 'g/dL', reference_range: '13.5-17.5', abnormal: true },
    { name: 'WBC', value: '11.2', unit: 'K/uL', reference_range: '4.5-11.0', abnormal: true },
  ],
  imaging: [
    { modality: 'CXR', findings: 'Bilateral pleural effusions, vascular cephalization, Kerley B lines', timestamp: '2024-01-15T08:30:00Z' },
    { modality: 'CT chest', findings: 'No PE. Bilateral effusions. Cardiomegaly.', timestamp: '2024-01-15T10:00:00Z' },
  ],
  ecg: 'Atrial fibrillation with RVR at 102, LVH by voltage criteria, ST depressions V4-V6',
  physical_exam: 'JVP elevated to 12cm. Bilateral crackles to mid-lung fields. 2+ pitting edema BLE. S3 gallop. No murmur.',
  procedures_consults: ['Cardiology consulted'],
  missing_data: ['Echocardiogram pending', 'Iron studies pending'],
  raw_text: 'Admitted for acute decompensated heart failure...',
  encounters: [],
  timeline_summary: '',
  date_range: { start: '', end: '' },
};

export function createMockSpecialistAnalysis(specialist: Specialist, options?: {
  hasCritical?: boolean;
  hasQuestions?: boolean;
  hasCrossConsults?: boolean;
}): SpecialistAnalysis {
  const { hasCritical = false, hasQuestions = false, hasCrossConsults = false } = options ?? {};

  return {
    specialist,
    findings: [
      `Finding 1 from ${specialist}`,
      `Finding 2 from ${specialist}`,
    ],
    concerns: [
      ...(hasCritical ? [{ severity: 'critical' as const, detail: `Critical concern from ${specialist}` }] : []),
      { severity: 'high' as const, detail: `High concern from ${specialist}` },
      { severity: 'medium' as const, detail: `Medium concern from ${specialist}` },
    ],
    recommendations: [
      { priority: 'high', recommendation: `Recommendation 1 from ${specialist}`, rationale: 'ACC/AHA 2022', evidence_basis: null },
      { priority: 'moderate', recommendation: `Recommendation 2 from ${specialist}`, rationale: 'KDIGO 2024', evidence_basis: null },
    ],
    questions_for_user: hasQuestions
      ? [`Question from ${specialist}: Any recent medication changes?`]
      : [],
    questions_for_team: [],
    cross_consults: hasCrossConsults
      ? [{ to: Specialist.CARDIOLOGIST, question: `Cross-consult question from ${specialist}` }]
      : [],
    scoring_systems_applied: [
      { name: 'NYHA Class', score: 'III', interpretation: 'Marked limitation of physical activity' },
    ],
  };
}

export function createMockAnalyses(options?: {
  withCritical?: boolean;
  withQuestions?: boolean;
  withCrossConsults?: boolean;
}): Record<string, SpecialistAnalysis> {
  const analyses: Record<string, SpecialistAnalysis> = {};
  for (const s of Object.values(Specialist)) {
    analyses[s] = createMockSpecialistAnalysis(s, {
      hasCritical: options?.withCritical && s === Specialist.CARDIOLOGIST,
      hasQuestions: options?.withQuestions && (s === Specialist.ATTENDING || s === Specialist.NEPHROLOGIST),
      hasCrossConsults: options?.withCrossConsults && s === Specialist.NEPHROLOGIST,
    });
  }
  return analyses;
}

export const MOCK_CROSS_CONSULT_MESSAGES: CrossConsultMessage[] = [
  {
    from: Specialist.NEPHROLOGIST,
    to: Specialist.CARDIOLOGIST,
    message: 'Should we hold ACE inhibitor given rising creatinine?',
    response: 'Consider reducing dose rather than holding. Cardiorenal benefit outweighs risk.',
  },
];

export const MOCK_DISCUSSION_MESSAGES: DiscussionMessage[] = [
  { specialist: Specialist.ATTENDING, content: 'Key findings: Acute decompensated CHF', timestamp: Date.now() - 5000 },
  { specialist: Specialist.CARDIOLOGIST, content: 'Key findings: Elevated BNP, EF 30%', timestamp: Date.now() - 4000 },
  { specialist: Specialist.NEPHROLOGIST, content: 'Key findings: AKI on CKD, K+ 5.3', timestamp: Date.now() - 3000 },
];

export const MOCK_USER_QUESTIONS: UserQuestion[] = [
  { id: 'q1', specialist: Specialist.ATTENDING, question: 'Has the patient had any recent medication changes?' },
  { id: 'q2', specialist: Specialist.NEPHROLOGIST, question: 'What was the baseline creatinine?' },
];

export const MOCK_SCORING_SYSTEMS: ScoringSystem[] = [
  { name: 'NYHA Class', score: 'III', interpretation: 'Marked limitation of physical activity' },
  { name: 'CHA2DS2-VASc', score: 4, interpretation: 'High stroke risk - anticoagulation indicated' },
  { name: 'MELD-Na', score: 12, interpretation: 'Low short-term mortality' },
];

export const MOCK_ANALYZE_RESPONSE: AnalyzeResponse = {
  intakeData: MOCK_INTAKE_DATA,
  specialistAnalyses: createMockAnalyses({ withQuestions: true }),
  discussionMessages: MOCK_DISCUSSION_MESSAGES,
};

export const MOCK_CROSS_CONSULT_RESPONSE: CrossConsultResponse = {
  messages: MOCK_CROSS_CONSULT_MESSAGES,
  updatedAnalyses: createMockAnalyses(),
  discussionMessages: [
    { specialist: Specialist.CARDIOLOGIST, content: 'Responding to Nephrology: Consider dose reduction.', timestamp: Date.now() },
  ],
};

export const MOCK_ADDITIONAL_DATA_RESPONSE: AdditionalDataResponse = {
  updatedAnalyses: createMockAnalyses(),
  discussionMessages: [
    { specialist: Specialist.ATTENDING, content: 'Updated analysis with additional data.', timestamp: Date.now() },
  ],
};

// Raw Claude API response for mocking anthropic SDK
// Note: the `specialist` field is intentionally omitted here.
// The orchestrator's runSingleSpecialist does `{ specialist: s, ...parsed }`,
// and if `parsed` contains a `specialist` field, it overwrites the first one.
// By omitting it, each call gets the correct specialist value.
export const MOCK_CLAUDE_TEXT_RESPONSE = {
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify({
        findings: ['Acute decompensated heart failure', 'AKI on CKD'],
        concerns: [
          { severity: 'critical', detail: 'Hyperkalemia with renal failure' },
          { severity: 'high', detail: 'Volume overload' },
        ],
        recommendations: [
          { priority: 'critical', recommendation: 'IV furosemide 40mg BID', rationale: 'ACC/AHA 2022', evidence_basis: null },
        ],
        questions_for_user: ['Has the patient been compliant with fluid restriction?'],
        questions_for_team: ['What is the renal dosing for this patient?'],
        cross_consults: [{ to: 'nephrologist', question: 'Renal dosing guidance for diuretics?' }],
        scoring_systems_applied: [
          { name: 'NYHA Class', score: 'IV', interpretation: 'Symptoms at rest' },
        ],
      }),
    },
  ],
};

export const MOCK_CLAUDE_MALFORMED_RESPONSE = {
  content: [{ type: 'text' as const, text: 'This is not valid JSON at all' }],
};

export const MOCK_CLAUDE_EMPTY_RESPONSE = {
  content: [{ type: 'image' as const }],
};

// Streaming mock events
export function createMockStreamEvents(text: string) {
  return text.split(' ').map((word, i) => ({
    type: 'content_block_delta' as const,
    delta: { type: 'text_delta' as const, text: (i > 0 ? ' ' : '') + word },
  }));
}
