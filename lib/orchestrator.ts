import Anthropic from '@anthropic-ai/sdk';
import { Specialist, SPECIALIST_CONFIG } from './types';
import type { IntakeData, SpecialistAnalysis, CrossConsultMessage } from './types';
import { INTAKE_PARSER_PROMPT } from './prompts/intake-parser';
import { ATTENDING_PROMPT } from './prompts/attending';
import { CARDIOLOGIST_PROMPT } from './prompts/cardiologist';
import { PULMONOLOGIST_PROMPT } from './prompts/pulmonologist';
import { NEPHROLOGIST_PROMPT } from './prompts/nephrologist';
import { HEPATOLOGIST_PROMPT } from './prompts/hepatologist';
import { HEMATOLOGIST_PROMPT } from './prompts/hematologist';
import { ID_SPECIALIST_PROMPT } from './prompts/id-specialist';
import { RADIOLOGIST_PROMPT } from './prompts/radiologist';
import { PHARMACIST_PROMPT } from './prompts/pharmacist';
import { ENDOCRINOLOGIST_PROMPT } from './prompts/endocrinologist';
import { NEUROLOGIST_PROMPT } from './prompts/neurologist';

const anthropic = new Anthropic();

const SPECIALIST_PROMPTS: Record<Specialist, string> = {
  [Specialist.ATTENDING]: ATTENDING_PROMPT,
  [Specialist.CARDIOLOGIST]: CARDIOLOGIST_PROMPT,
  [Specialist.PULMONOLOGIST]: PULMONOLOGIST_PROMPT,
  [Specialist.NEPHROLOGIST]: NEPHROLOGIST_PROMPT,
  [Specialist.HEPATOLOGIST]: HEPATOLOGIST_PROMPT,
  [Specialist.HEMATOLOGIST]: HEMATOLOGIST_PROMPT,
  [Specialist.ID_SPECIALIST]: ID_SPECIALIST_PROMPT,
  [Specialist.RADIOLOGIST]: RADIOLOGIST_PROMPT,
  [Specialist.PHARMACIST]: PHARMACIST_PROMPT,
  [Specialist.ENDOCRINOLOGIST]: ENDOCRINOLOGIST_PROMPT,
  [Specialist.NEUROLOGIST]: NEUROLOGIST_PROMPT,
};

const SONNET_MODEL = 'claude-sonnet-4-5-20250929';
const OPUS_MODEL = 'claude-opus-4-6';

function extractJSON(text: string): string | null {
  const jsonStart = text.indexOf('{');
  if (jsonStart === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = jsonStart; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(jsonStart, i + 1);
    }
  }
  return null;
}

export async function runIntake(rawText: string): Promise<IntakeData> {
  const response = await anthropic.messages.create({
    model: SONNET_MODEL,
    max_tokens: 8192,
    system: INTAKE_PARSER_PROMPT,
    messages: [{ role: 'user', content: rawText }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonStr = extractJSON(text);
  if (!jsonStr) throw new Error('Failed to parse intake data');

  let parsed: IntakeData;
  try {
    parsed = JSON.parse(jsonStr) as IntakeData;
  } catch {
    throw new Error('Failed to parse intake data: invalid JSON');
  }
  parsed.raw_text = rawText;
  return parsed;
}

async function runSingleSpecialist(
  specialist: Specialist,
  intakeData: IntakeData
): Promise<SpecialistAnalysis> {
  const config = SPECIALIST_CONFIG[specialist];
  const model = config.model === 'opus' ? OPUS_MODEL : SONNET_MODEL;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 8192,
    system: SPECIALIST_PROMPTS[specialist],
    messages: [{
      role: 'user',
      content: `Analyze the following patient data:\n\n${JSON.stringify(intakeData, null, 2)}`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  const jsonStr = extractJSON(text);
  if (!jsonStr) {
    console.error(`[orchestrator] ${specialist} no JSON found. Response starts with:`, text.slice(0, 200));
    throw new Error(`Failed to parse ${specialist} analysis`);
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error(`[orchestrator] ${specialist} JSON parse error:`, (e as Error).message, 'First 200 chars:', jsonStr.slice(0, 200));
    throw new Error(`Failed to parse ${specialist} analysis: invalid JSON`);
  }
  return { specialist, ...parsed } as SpecialistAnalysis;
}

export async function runSpecialists(
  intakeData: IntakeData
): Promise<Record<string, SpecialistAnalysis>> {
  const specialists = Object.values(Specialist);

  const results = await Promise.allSettled(
    specialists.map((s) => runSingleSpecialist(s, intakeData))
  );

  const analyses: Record<string, SpecialistAnalysis> = {};
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      analyses[result.value.specialist] = result.value;
    } else {
      console.error(`[orchestrator] ${specialists[i]} failed:`, result.reason?.message ?? result.reason);
      // Provide a minimal fallback so the case can still proceed
      analyses[specialists[i]] = {
        specialist: specialists[i],
        findings: ['Analysis unavailable — specialist returned an error.'],
        concerns: [],
        recommendations: [],
        questions_for_user: [],
        questions_for_team: [],
        cross_consults: [],
        scoring_systems_applied: [],
      };
    }
  }
  return analyses;
}

export async function runSpecialistsStreaming(
  intakeData: IntakeData,
  onResult: (specialist: Specialist, analysis: SpecialistAnalysis) => void,
  onError: (specialist: Specialist, error: string) => void
): Promise<Record<string, SpecialistAnalysis>> {
  const specialists = Object.values(Specialist);
  const analyses: Record<string, SpecialistAnalysis> = {};

  await Promise.allSettled(
    specialists.map(async (s) => {
      try {
        const analysis = await runSingleSpecialist(s, intakeData);
        analyses[s] = analysis;
        onResult(s, analysis);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[orchestrator] ${s} failed:`, errorMsg);
        const fallback: SpecialistAnalysis = {
          specialist: s,
          findings: ['Analysis unavailable — specialist returned an error.'],
          concerns: [],
          recommendations: [],
          questions_for_user: [],
          questions_for_team: [],
          cross_consults: [],
          scoring_systems_applied: [],
        };
        analyses[s] = fallback;
        onError(s, errorMsg);
      }
    })
  );

  return analyses;
}

export async function runCrossConsultStreaming(
  analyses: Record<string, SpecialistAnalysis>,
  intakeData: IntakeData,
  onMessage: (msg: CrossConsultMessage) => void
): Promise<CrossConsultMessage[]> {
  // 1. Collect explicit cross-consult requests
  const requests: Array<{ from: Specialist; to: string; question: string }> = [];
  for (const [specialist, analysis] of Object.entries(analyses)) {
    if (Array.isArray(analysis.cross_consults)) {
      for (const cc of analysis.cross_consults) {
        requests.push({ from: specialist as Specialist, to: cc.to, question: cc.question });
      }
    }
  }

  // 2. Convert questions_for_team into cross-consult requests via keyword routing
  for (const [specialist, analysis] of Object.entries(analyses)) {
    const teamQs = Array.isArray(analysis.questions_for_team) ? analysis.questions_for_team : [];
    for (const q of teamQs) {
      if (typeof q !== 'string' || !q.trim()) continue;
      const target = routeTeamQuestion(q, specialist);
      if (target) {
        const alreadyRouted = requests.some(
          (r) => r.from === specialist && r.to === target && r.question === q
        );
        if (!alreadyRouted) {
          requests.push({ from: specialist as Specialist, to: target, question: q });
        }
      }
    }
  }

  if (requests.length === 0) return [];

  const allMessages: CrossConsultMessage[] = [];

  await Promise.allSettled(
    requests.map(async (req) => {
      const targetAnalysis = analyses[req.to];
      if (!targetAnalysis) return;

      const response = await anthropic.messages.create({
        model: SONNET_MODEL,
        max_tokens: 2048,
        system: SPECIALIST_PROMPTS[req.to as Specialist],
        messages: [{
          role: 'user',
          content: `A colleague in ${req.from} asks: "${req.question}"\n\nYour previous analysis: ${JSON.stringify(targetAnalysis)}\n\nPatient data: ${JSON.stringify(intakeData)}\n\nRespond to their question concisely.`,
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const msg: CrossConsultMessage = {
        from: req.from,
        to: req.to as Specialist,
        message: req.question,
        response: text,
      };
      allMessages.push(msg);
      onMessage(msg);
    })
  );

  return allMessages;
}

const SPECIALTY_KEYWORDS: Record<string, Specialist> = {
  // Cardiology
  cardiac: Specialist.CARDIOLOGIST, heart: Specialist.CARDIOLOGIST, echo: Specialist.CARDIOLOGIST,
  troponin: Specialist.CARDIOLOGIST, stemi: Specialist.CARDIOLOGIST, nstemi: Specialist.CARDIOLOGIST,
  arrhythmia: Specialist.CARDIOLOGIST, afib: Specialist.CARDIOLOGIST, gdmt: Specialist.CARDIOLOGIST,
  ejection: Specialist.CARDIOLOGIST, bnp: Specialist.CARDIOLOGIST, valvular: Specialist.CARDIOLOGIST,
  // Pulmonology
  pulmonary: Specialist.PULMONOLOGIST, respiratory: Specialist.PULMONOLOGIST, ventilat: Specialist.PULMONOLOGIST,
  abg: Specialist.PULMONOLOGIST, oxygen: Specialist.PULMONOLOGIST, ards: Specialist.PULMONOLOGIST,
  pneumonia: Specialist.PULMONOLOGIST, sepsis: Specialist.PULMONOLOGIST, intubat: Specialist.PULMONOLOGIST,
  // Nephrology
  renal: Specialist.NEPHROLOGIST, kidney: Specialist.NEPHROLOGIST, creatinine: Specialist.NEPHROLOGIST,
  dialysis: Specialist.NEPHROLOGIST, electrolyte: Specialist.NEPHROLOGIST, potassium: Specialist.NEPHROLOGIST,
  sodium: Specialist.NEPHROLOGIST, 'acid-base': Specialist.NEPHROLOGIST, gfr: Specialist.NEPHROLOGIST,
  // Hepatology
  liver: Specialist.HEPATOLOGIST, hepat: Specialist.HEPATOLOGIST, cirrhosis: Specialist.HEPATOLOGIST,
  meld: Specialist.HEPATOLOGIST, ascites: Specialist.HEPATOLOGIST, bilirubin: Specialist.HEPATOLOGIST,
  encephalopathy: Specialist.HEPATOLOGIST,
  // Hematology
  coagul: Specialist.HEMATOLOGIST, platelet: Specialist.HEMATOLOGIST, anemia: Specialist.HEMATOLOGIST,
  transfus: Specialist.HEMATOLOGIST, hit: Specialist.HEMATOLOGIST, ttp: Specialist.HEMATOLOGIST,
  dic: Specialist.HEMATOLOGIST, anticoagul: Specialist.HEMATOLOGIST, inr: Specialist.HEMATOLOGIST,
  // Infectious Disease
  antibiotic: Specialist.ID_SPECIALIST, infection: Specialist.ID_SPECIALIST, culture: Specialist.ID_SPECIALIST,
  'c. diff': Specialist.ID_SPECIALIST, septic: Specialist.ID_SPECIALIST, fever: Specialist.ID_SPECIALIST,
  antimicrobial: Specialist.ID_SPECIALIST, mrsa: Specialist.ID_SPECIALIST,
  // Radiology
  imaging: Specialist.RADIOLOGIST, 'ct ': Specialist.RADIOLOGIST, mri: Specialist.RADIOLOGIST,
  xray: Specialist.RADIOLOGIST, 'x-ray': Specialist.RADIOLOGIST, ultrasound: Specialist.RADIOLOGIST,
  // Pharmacy
  drug: Specialist.PHARMACIST, medication: Specialist.PHARMACIST, dose: Specialist.PHARMACIST,
  dosing: Specialist.PHARMACIST, interaction: Specialist.PHARMACIST, pharmacok: Specialist.PHARMACIST,
  // Endocrinology
  insulin: Specialist.ENDOCRINOLOGIST, glucose: Specialist.ENDOCRINOLOGIST, diabet: Specialist.ENDOCRINOLOGIST,
  dka: Specialist.ENDOCRINOLOGIST, thyroid: Specialist.ENDOCRINOLOGIST, adrenal: Specialist.ENDOCRINOLOGIST,
  a1c: Specialist.ENDOCRINOLOGIST, glycemic: Specialist.ENDOCRINOLOGIST,
  // Neurology
  neuro: Specialist.NEUROLOGIST, stroke: Specialist.NEUROLOGIST, seizure: Specialist.NEUROLOGIST,
  'mental status': Specialist.NEUROLOGIST, nihss: Specialist.NEUROLOGIST, gcs: Specialist.NEUROLOGIST,
};

function routeTeamQuestion(question: string, fromSpecialist: string): Specialist | null {
  const q = question.toLowerCase();
  for (const [keyword, target] of Object.entries(SPECIALTY_KEYWORDS)) {
    if (q.includes(keyword) && target !== fromSpecialist) {
      return target;
    }
  }
  return null;
}

export async function runCrossConsult(
  analyses: Record<string, SpecialistAnalysis>,
  intakeData: IntakeData
): Promise<CrossConsultMessage[]> {
  // 1. Collect explicit cross-consult requests from specialist outputs
  const requests: Array<{ from: Specialist; to: string; question: string }> = [];
  for (const [specialist, analysis] of Object.entries(analyses)) {
    if (Array.isArray(analysis.cross_consults)) {
      for (const cc of analysis.cross_consults) {
        requests.push({ from: specialist as Specialist, to: cc.to, question: cc.question });
      }
    }
  }

  // 2. Convert questions_for_team into cross-consult requests via keyword routing
  for (const [specialist, analysis] of Object.entries(analyses)) {
    const teamQs = Array.isArray(analysis.questions_for_team) ? analysis.questions_for_team : [];
    for (const q of teamQs) {
      if (typeof q !== 'string' || !q.trim()) continue;
      const target = routeTeamQuestion(q, specialist);
      if (target) {
        // Avoid duplicate routes to the same specialist with the same question
        const alreadyRouted = requests.some(
          (r) => r.from === specialist && r.to === target && r.question === q
        );
        if (!alreadyRouted) {
          requests.push({ from: specialist as Specialist, to: target, question: q });
        }
      }
    }
  }

  if (requests.length === 0) return [];

  // Run cross-consult responses in parallel
  const messages = await Promise.all(
    requests.map(async (req) => {
      const targetAnalysis = analyses[req.to];
      if (!targetAnalysis) return null;

      const response = await anthropic.messages.create({
        model: SONNET_MODEL,
        max_tokens: 2048,
        system: SPECIALIST_PROMPTS[req.to as Specialist],
        messages: [{
          role: 'user',
          content: `A colleague in ${req.from} asks: "${req.question}"\n\nYour previous analysis: ${JSON.stringify(targetAnalysis)}\n\nPatient data: ${JSON.stringify(intakeData)}\n\nRespond to their question concisely.`,
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return {
        from: req.from,
        to: req.to as Specialist,
        message: req.question,
        response: text,
      } as CrossConsultMessage;
    })
  );

  return messages.filter(Boolean) as CrossConsultMessage[];
}

export async function runAdditionalData(
  answers: Record<string, string | null>,
  previousAnalyses: Record<string, SpecialistAnalysis>,
  intakeData: IntakeData
): Promise<Record<string, SpecialistAnalysis>> {
  const additionalContext = Object.entries(answers)
    .filter(([, v]) => v !== null)
    .map(([q, a]) => `Q: ${q}\nA: ${a}`)
    .join('\n\n');

  if (!additionalContext) return previousAnalyses;

  // Re-run all specialists with additional data
  const specialists = Object.values(Specialist);
  const results = await Promise.all(
    specialists.map(async (s) => {
      const config = SPECIALIST_CONFIG[s];
      const model = config.model === 'opus' ? OPUS_MODEL : SONNET_MODEL;

      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: SPECIALIST_PROMPTS[s],
        messages: [{
          role: 'user',
          content: `Analyze the following patient data:\n\n${JSON.stringify(intakeData, null, 2)}\n\nADDITIONAL DATA PROVIDED:\n${additionalContext}\n\nYour previous analysis:\n${JSON.stringify(previousAnalyses[s], null, 2)}\n\nUpdate your analysis with the new information.`,
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonStr = extractJSON(text);
      if (!jsonStr) return previousAnalyses[s];

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        return previousAnalyses[s];
      }
      return { specialist: s, ...parsed } as SpecialistAnalysis;
    })
  );

  const analyses: Record<string, SpecialistAnalysis> = {};
  for (const result of results) {
    analyses[result.specialist] = result;
  }
  return analyses;
}

export async function* runSynthesis(
  analyses: Record<string, SpecialistAnalysis>,
  crossConsults: CrossConsultMessage[],
  intakeData: IntakeData
): AsyncGenerator<string> {
  const stream = anthropic.messages.stream({
    model: OPUS_MODEL,
    max_tokens: 8192,
    system: ATTENDING_PROMPT,
    messages: [{
      role: 'user',
      content: `SYNTHESIZE the following specialist analyses into a unified Assessment & Plan organized by problem.

PATIENT DATA:
${JSON.stringify(intakeData, null, 2)}

SPECIALIST ANALYSES:
${JSON.stringify(analyses, null, 2)}

CROSS-CONSULTATION NOTES:
${JSON.stringify(crossConsults, null, 2)}

Generate a problem-oriented A/P. For each problem:
- List the assessment
- List specific recommendations with the specialist who suggested them in parentheses
- Include guideline citations inline
- Flag areas of specialist disagreement
- Note confidence levels

Format as plain text suitable for pasting into Epic. Do NOT use markdown formatting.`,
    }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
