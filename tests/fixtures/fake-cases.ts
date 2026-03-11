/**
 * Fake clinical cases for end-to-end testing.
 *
 * Case 1: Single-encounter CHF exacerbation (simple pipeline)
 * Case 2: Multi-encounter sepsis timeline (temporal features)
 * Case 3: Complex multi-problem case (cross-consult heavy)
 */

import { Specialist } from '@/lib/types';
import type {
  TemporalIntakeData,
  SpecialistAnalysis,
  CrossConsultMessage,
  ClinicalEncounter,
} from '@/lib/types';

// ─── Case 1: Single-Encounter CHF ─────────────────────────────────────────────

export const CHF_RAW_NOTES = `
PROGRESS NOTE - 3/5/2026
68M with CHF (EF 30%), CKD 3b, T2DM, Afib on warfarin
Presents with 3 days worsening dyspnea, orthopnea, LE edema

Vitals: HR 102, BP 148/88, RR 24, T 37.1, SpO2 91%
Labs: BNP 1850, Cr 2.4 (baseline 1.5), K 5.3, Trop 0.08, INR 2.8, Hgb 10.2
CXR: Bilateral pleural effusions, vascular cephalization
ECG: Afib with RVR, LVH, ST depressions V4-V6

Exam: JVP 12cm, bilateral crackles, 2+ LE edema, S3 gallop
Meds: Lisinopril 20mg, Metoprolol succinate 50mg, Furosemide 40mg BID, Warfarin 5mg, Metformin 500mg BID
Allergies: PCN - rash
`;

export const CHF_INTAKE_RESPONSE = JSON.stringify({
  demographics: { age: 68, sex: 'M', weight: 82, height: 175 },
  chief_complaint: 'Acute dyspnea and chest tightness',
  hpi: '68M with CHF EF 30%, CKD 3b, presenting with 3 days worsening dyspnea, orthopnea, LE edema.',
  past_medical_history: ['CHF EF 30%', 'CKD stage 3b', 'T2DM', 'HTN', 'Afib on warfarin'],
  medications: [
    { name: 'Lisinopril', dose: '20mg', route: 'PO', frequency: 'daily', type: 'home' },
    { name: 'Metoprolol succinate', dose: '50mg', route: 'PO', frequency: 'daily', type: 'home' },
    { name: 'Furosemide', dose: '40mg', route: 'PO', frequency: 'BID', type: 'home' },
    { name: 'Warfarin', dose: '5mg', route: 'PO', frequency: 'daily', type: 'home' },
    { name: 'Metformin', dose: '500mg', route: 'PO', frequency: 'BID', type: 'home' },
  ],
  allergies: ['Penicillin - rash'],
  vitals: { hr: 102, bp_systolic: 148, bp_diastolic: 88, rr: 24, temp: 37.1, spo2: 91 },
  labs: [
    { name: 'BNP', value: '1850', unit: 'pg/mL', reference_range: '<100', abnormal: true },
    { name: 'Creatinine', value: '2.4', unit: 'mg/dL', reference_range: '0.7-1.3', abnormal: true },
    { name: 'Potassium', value: '5.3', unit: 'mEq/L', reference_range: '3.5-5.0', abnormal: true },
  ],
  imaging: [{ modality: 'CXR', findings: 'Bilateral pleural effusions', timestamp: '2026-03-05' }],
  ecg: 'Afib with RVR at 102, LVH, ST depressions V4-V6',
  physical_exam: 'JVP 12cm, bilateral crackles, 2+ LE edema, S3 gallop',
  procedures_consults: ['Cardiology consulted'],
  missing_data: ['Echo pending'],
  raw_text: '',
  encounters: [],
  timeline_summary: '',
  date_range: { start: '', end: '' },
});

// ─── Case 2: Multi-Encounter Sepsis Timeline ─────────────────────────────────

export const SEPSIS_MULTI_DATE_NOTES = `
--- ED NOTE 3/1/2026 ---
72F presenting with fever 39.2C, HR 118, BP 88/54, confusion
WBC 18.5, Lactate 4.2, Cr 1.8 (baseline 0.9), Procalcitonin 12.4
UA: positive leukocyte esterase, nitrites
Blood cultures x2 drawn
Started vanc/zosyn, 2L NS bolus

--- ICU DAY 1 3/2/2026 ---
Improved with fluids. HR 95, BP 108/65, T 38.4
Lactate trending down 2.8. Cr 1.6. WBC 15.2
Blood cx: GNR growing, pending ID. Urine cx: E. coli >100k
Narrowed to ceftriaxone per pharmacy

--- ICU DAY 3 3/4/2026 ---
Clinically improved, afebrile x24h. HR 78, BP 122/70
Cr 1.1 (near baseline). WBC 9.8. Lactate 1.0
Blood cx: E. coli pansensitive. Plan to step down to floor.
`;

export const SEPSIS_INTAKE_RESPONSE = JSON.stringify({
  demographics: { age: 72, sex: 'F', weight: 65, height: 160 },
  chief_complaint: 'Fever, hypotension, altered mental status',
  hpi: '72F presenting with urosepsis, initially hemodynamically unstable, now improving on antibiotics.',
  past_medical_history: ['HTN', 'T2DM', 'Recurrent UTIs'],
  medications: [
    { name: 'Ceftriaxone', dose: '2g', route: 'IV', frequency: 'daily', type: 'inpatient' },
  ],
  allergies: [],
  vitals: { hr: 78, bp_systolic: 122, bp_diastolic: 70, rr: 16, temp: 36.8, spo2: 97 },
  labs: [
    { name: 'WBC', value: '9.8', unit: 'K/uL', abnormal: false, timestamp: '2026-03-04' },
    { name: 'Creatinine', value: '1.1', unit: 'mg/dL', abnormal: false, timestamp: '2026-03-04' },
    { name: 'Lactate', value: '1.0', unit: 'mmol/L', abnormal: false, timestamp: '2026-03-04' },
  ],
  imaging: [],
  physical_exam: 'Afebrile, alert, no CVA tenderness',
  procedures_consults: [],
  missing_data: [],
  raw_text: '',
  encounters: [
    {
      id: 'enc-1',
      date: '2026-03-01',
      encounter_type: 'ED Admission',
      labs: [
        { name: 'WBC', value: '18.5', unit: 'K/uL', abnormal: true },
        { name: 'Lactate', value: '4.2', unit: 'mmol/L', abnormal: true },
        { name: 'Creatinine', value: '1.8', unit: 'mg/dL', abnormal: true },
      ],
      vitals: { hr: 118, bp_systolic: 88, bp_diastolic: 54, temp: 39.2 },
      imaging: [],
      notes: 'Septic shock from urosepsis. Started broad spectrum antibiotics.',
      procedures_consults: ['Blood cultures x2'],
    },
    {
      id: 'enc-2',
      date: '2026-03-02',
      encounter_type: 'ICU Day 1',
      labs: [
        { name: 'WBC', value: '15.2', unit: 'K/uL', abnormal: true },
        { name: 'Lactate', value: '2.8', unit: 'mmol/L', abnormal: true },
        { name: 'Creatinine', value: '1.6', unit: 'mg/dL', abnormal: true },
      ],
      vitals: { hr: 95, bp_systolic: 108, bp_diastolic: 65, temp: 38.4 },
      imaging: [],
      notes: 'Improving. Narrowed antibiotics to ceftriaxone.',
      procedures_consults: [],
    },
    {
      id: 'enc-3',
      date: '2026-03-04',
      encounter_type: 'ICU Day 3',
      labs: [
        { name: 'WBC', value: '9.8', unit: 'K/uL', abnormal: false },
        { name: 'Lactate', value: '1.0', unit: 'mmol/L', abnormal: false },
        { name: 'Creatinine', value: '1.1', unit: 'mg/dL', abnormal: false },
      ],
      vitals: { hr: 78, bp_systolic: 122, bp_diastolic: 70, temp: 36.8 },
      imaging: [],
      notes: 'Clinically improved, afebrile x24h. Plan step down.',
      procedures_consults: [],
    },
  ],
  timeline_summary: 'Rapidly improving urosepsis with E. coli bacteremia. Lactate normalizing, AKI resolving, WBC normalizing over 3 days.',
  date_range: { start: '2026-03-01', end: '2026-03-04' },
});

// ─── Case 3: Appended Progress Note ──────────────────────────────────────────

export const APPENDED_PROGRESS_NOTE = `
--- FLOOR DAY 1 3/5/2026 ---
Transferred from ICU. Vitals stable: HR 72, BP 118/68, T 36.9
Labs: WBC 7.2, Cr 1.0, Lactate 0.8
Tolerating PO. Plan discharge tomorrow with PO cipro x5 days.
`;

export const APPENDED_INTAKE_RESPONSE = JSON.stringify({
  demographics: { age: 72, sex: 'F', weight: 65, height: 160 },
  chief_complaint: 'Fever, hypotension, altered mental status',
  hpi: '72F with urosepsis now resolved, transferring to floor.',
  past_medical_history: ['HTN', 'T2DM', 'Recurrent UTIs'],
  medications: [
    { name: 'Ciprofloxacin', dose: '500mg', route: 'PO', frequency: 'BID', type: 'inpatient' },
  ],
  allergies: [],
  vitals: { hr: 72, bp_systolic: 118, bp_diastolic: 68, rr: 14, temp: 36.9, spo2: 98 },
  labs: [
    { name: 'WBC', value: '7.2', unit: 'K/uL', abnormal: false, timestamp: '2026-03-05' },
    { name: 'Creatinine', value: '1.0', unit: 'mg/dL', abnormal: false, timestamp: '2026-03-05' },
    { name: 'Lactate', value: '0.8', unit: 'mmol/L', abnormal: false, timestamp: '2026-03-05' },
  ],
  imaging: [],
  physical_exam: 'Well-appearing, ambulating independently',
  procedures_consults: [],
  missing_data: [],
  raw_text: '',
  encounters: [
    {
      id: 'enc-1',
      date: '2026-03-01',
      encounter_type: 'ED Admission',
      labs: [{ name: 'WBC', value: '18.5', unit: 'K/uL', abnormal: true }],
      vitals: { hr: 118, bp_systolic: 88, bp_diastolic: 54, temp: 39.2 },
      imaging: [],
      notes: 'Septic shock from urosepsis.',
      procedures_consults: [],
    },
    {
      id: 'enc-2',
      date: '2026-03-02',
      encounter_type: 'ICU Day 1',
      labs: [{ name: 'WBC', value: '15.2', unit: 'K/uL', abnormal: true }],
      vitals: { hr: 95, bp_systolic: 108, bp_diastolic: 65, temp: 38.4 },
      imaging: [],
      notes: 'Improving.',
      procedures_consults: [],
    },
    {
      id: 'enc-3',
      date: '2026-03-04',
      encounter_type: 'ICU Day 3',
      labs: [{ name: 'WBC', value: '9.8', unit: 'K/uL', abnormal: false }],
      vitals: { hr: 78, bp_systolic: 122, bp_diastolic: 70, temp: 36.8 },
      imaging: [],
      notes: 'Step down to floor.',
      procedures_consults: [],
    },
    {
      id: 'enc-4',
      date: '2026-03-05',
      encounter_type: 'Floor Day 1',
      labs: [{ name: 'WBC', value: '7.2', unit: 'K/uL', abnormal: false }],
      vitals: { hr: 72, bp_systolic: 118, bp_diastolic: 68, temp: 36.9 },
      imaging: [],
      notes: 'Tolerating PO. Discharge tomorrow.',
      procedures_consults: [],
    },
  ],
  timeline_summary: 'Urosepsis resolved. Labs normalized. Ready for discharge with PO antibiotics.',
  date_range: { start: '2026-03-01', end: '2026-03-05' },
});

// ─── Mock specialist response builders ──────────────────────────────────────

export function buildSpecialistResponse(options?: {
  withNewQuestions?: boolean;
  newQuestionsTo?: string;
}): string {
  const base = {
    findings: ['Key finding identified', 'Secondary observation noted'],
    concerns: [
      { severity: 'high', detail: 'Significant clinical concern' },
      { severity: 'medium', detail: 'Moderate concern worth monitoring' },
    ],
    recommendations: [
      { priority: 'high', recommendation: 'Primary recommendation', rationale: 'Evidence-based', evidence_basis: null },
    ],
    questions_for_user: [],
    questions_for_team: options?.withNewQuestions
      ? [`What is the renal dosing consideration?`]
      : [],
    cross_consults: options?.withNewQuestions && options?.newQuestionsTo
      ? [{ to: options.newQuestionsTo, question: 'Cross-specialty concern question' }]
      : [],
    scoring_systems_applied: [
      { name: 'SOFA', score: 2, interpretation: 'Low organ dysfunction' },
    ],
  };
  return JSON.stringify(base);
}

export function buildCrossConsultJsonResponse(options?: {
  withFollowup?: boolean;
  followupTo?: string;
}): string {
  const response = {
    response: 'I agree with the assessment. Consider adjusting the dosing based on renal function.',
    new_questions: options?.withFollowup && options?.followupTo
      ? [{ to: options.followupTo, question: 'Follow-up question from cross-consult' }]
      : [],
  };
  return JSON.stringify(response);
}

export function buildChatResponse(options?: {
  withTriggered?: boolean;
  triggeredTo?: string;
}): string {
  const response = {
    response: 'Based on the clinical data, I recommend considering dose adjustment given the improving renal function and current hemodynamic stability.',
    new_questions: options?.withTriggered && options?.triggeredTo
      ? [{ to: options.triggeredTo, question: 'Should we also consider this from your perspective?' }]
      : [],
  };
  return JSON.stringify(response);
}
