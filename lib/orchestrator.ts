import Anthropic from '@anthropic-ai/sdk';
import { Specialist, SPECIALIST_CONFIG } from './types';
import type { IntakeData, SpecialistAnalysis, CrossConsultMessage, CrossConsultRound, TemporalIntakeData, SpecialistChatMessage, WebSearchCitation, SpecialistCalculationActivity } from './types';
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
import { INTENSIVIST_PROMPT } from './prompts/intensivist';
import { ONCOLOGIST_PROMPT } from './prompts/oncologist';
import { PSYCHIATRIST_PROMPT } from './prompts/psychiatrist';
import { TOXICOLOGIST_PROMPT } from './prompts/toxicologist';
import { PALLIATIVE_PROMPT } from './prompts/palliative';

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
  [Specialist.INTENSIVIST]: INTENSIVIST_PROMPT,
  [Specialist.ONCOLOGIST]: ONCOLOGIST_PROMPT,
  [Specialist.PSYCHIATRIST]: PSYCHIATRIST_PROMPT,
  [Specialist.TOXICOLOGIST]: TOXICOLOGIST_PROMPT,
  [Specialist.PALLIATIVE]: PALLIATIVE_PROMPT,
};

const SONNET_MODEL = 'claude-sonnet-4-5-20250929';
const OPUS_MODEL = 'claude-opus-4-6';

const WEB_SEARCH_TOOL = {
  type: 'web_search_20250305' as const,
  name: 'web_search' as const,
  max_uses: 3,
  allowed_domains: [
    'pubmed.ncbi.nlm.nih.gov', 'ncbi.nlm.nih.gov', 'nih.gov', 'who.int', 'cdc.gov',
    'acc.org', 'heart.org', 'idsociety.org', 'ashp.org', 'kidney.org', 'aasld.org',
    'thoracic.org', 'aan.com', 'endocrine.org', 'hematology.org', 'acr.org',
    'nejm.org', 'thelancet.com', 'jamanetwork.com', 'bmj.com', 'cochranelibrary.com',
    'nice.org.uk', 'uptodate.com',
    'aahpm.org', 'asco.org', 'nccn.org', 'aact.org',
  ],
};

const CODE_EXECUTION_TOOL = {
  type: 'code_execution_20250522' as const,
  name: 'code_execution' as const,
};

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

export async function runIntake(rawText: string): Promise<TemporalIntakeData> {
  const response = await anthropic.messages.create({
    model: SONNET_MODEL,
    max_tokens: 8192,
    system: INTAKE_PARSER_PROMPT,
    messages: [{ role: 'user', content: rawText }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonStr = extractJSON(text);
  if (!jsonStr) throw new Error('Failed to parse intake data');

  let parsed: TemporalIntakeData;
  try {
    parsed = JSON.parse(jsonStr) as TemporalIntakeData;
  } catch {
    throw new Error('Failed to parse intake data: invalid JSON');
  }
  parsed.raw_text = rawText;

  // Ensure temporal fields have defaults for backward compatibility
  if (!parsed.encounters) parsed.encounters = [];
  if (!parsed.timeline_summary) parsed.timeline_summary = '';
  if (!parsed.date_range) parsed.date_range = { start: '', end: '' };

  return parsed;
}

export async function runIncrementalIntake(
  newRawText: string,
  existingIntake: IntakeData
): Promise<TemporalIntakeData> {
  const incrementalPrompt = `You are parsing ADDITIONAL clinical notes to merge with an existing patient record.

EXISTING PATIENT DATA (do NOT re-parse this, it is already structured):
${JSON.stringify(existingIntake, null, 2)}

YOUR TASK:
1. Parse ONLY the NEW notes below into structured encounter data.
2. Merge the new encounters with any existing encounters.
3. Update the aggregate/flat fields (demographics, vitals, labs, etc.) to reflect the MOST RECENT values from all encounters combined.
4. Update the timeline_summary to incorporate the new data.
5. Update the date_range to span all encounters.

Return the COMPLETE updated TemporalIntakeData JSON object (existing + new data merged).
The output format is the same as the intake parser: all the flat fields plus encounters, timeline_summary, and date_range.

Return ONLY the JSON object, with no additional text or markdown formatting.

NEW NOTES TO PARSE AND MERGE:`;

  const response = await anthropic.messages.create({
    model: SONNET_MODEL,
    max_tokens: 8192,
    system: incrementalPrompt,
    messages: [{ role: 'user', content: newRawText }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonStr = extractJSON(text);
  if (!jsonStr) throw new Error('Failed to parse incremental intake data');

  let parsed: TemporalIntakeData;
  try {
    parsed = JSON.parse(jsonStr) as TemporalIntakeData;
  } catch {
    throw new Error('Failed to parse incremental intake data: invalid JSON');
  }

  // Preserve the combined raw text
  parsed.raw_text = (existingIntake.raw_text || '') + '\n\n---\n\n' + newRawText;

  // Ensure temporal fields have defaults
  if (!parsed.encounters) parsed.encounters = [];
  if (!parsed.timeline_summary) parsed.timeline_summary = '';
  if (!parsed.date_range) parsed.date_range = { start: '', end: '' };

  return parsed;
}

interface SpecialistToolOptions {
  webSearchEnabled?: boolean;
  onSearch?: (specialist: string, query: string) => void;
  onCalculation?: (specialist: string, code: string) => void;
}

function buildToolsArray(options?: SpecialistToolOptions): any[] {
  const tools: any[] = [CODE_EXECUTION_TOOL];
  if (options?.webSearchEnabled) {
    tools.push(WEB_SEARCH_TOOL);
  }
  return tools;
}

async function runSingleSpecialist(
  specialist: Specialist,
  intakeData: IntakeData,
  options?: SpecialistToolOptions
): Promise<SpecialistAnalysis> {
  const config = SPECIALIST_CONFIG[specialist];
  const model = config.model === 'opus' ? OPUS_MODEL : SONNET_MODEL;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createParams: any = {
    model,
    max_tokens: 8192,
    system: SPECIALIST_PROMPTS[specialist],
    messages: [{
      role: 'user',
      content: `Analyze the following patient data:\n\n${JSON.stringify(intakeData, null, 2)}`,
    }],
  };

  createParams.tools = buildToolsArray(options);
  const response = await (anthropic.beta.messages.create as any)({
    ...createParams,
    betas: ['code-execution-2025-05-22'],
  });

  // Extract text and citations from response content blocks
  let text = '';
  const citations: WebSearchCitation[] = [];
  const calculations: SpecialistCalculationActivity[] = [];
  const pendingCodeExecution = new Map<string, string>();

  for (const block of response.content) {
    if (block.type === 'text') {
      text += block.text;
    } else if (block.type === 'server_tool_use' && block.name === 'web_search') {
      // Fire search callback with the query
      const input = block.input as { query?: string };
      if (options?.onSearch && input?.query) {
        options.onSearch(specialist, input.query);
      }
    } else if (block.type === 'web_search_tool_result') {
      // Extract citations from search results
      const content = (block as unknown as { content: Array<{ type: string; url?: string; title?: string; page_age?: string }> }).content;
      if (Array.isArray(content)) {
        for (const result of content) {
          if (result.type === 'web_search_result' && result.url && result.title) {
            citations.push({
              title: result.title,
              url: result.url,
              page_age: result.page_age,
            });
          }
        }
      }
    } else if (block.type === 'server_tool_use' && block.name === 'code_execution') {
      const input = block.input as { code?: string };
      pendingCodeExecution.set(block.id, input?.code || '');
      if (options?.onCalculation && input?.code) {
        options.onCalculation(specialist, input.code);
      }
    } else if (block.type === 'code_execution_tool_result') {
      const content = (block as any).content;
      const code = pendingCodeExecution.get((block as any).tool_use_id) || '';
      if (content?.type === 'code_execution_result') {
        calculations.push({
          specialist,
          code,
          result: content.stdout || '',
          success: content.return_code === 0,
          timestamp: Date.now(),
        });
      }
    }
  }

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

  const analysis = { specialist, ...parsed } as SpecialistAnalysis;

  // Attach citations if any were found
  if (citations.length > 0) {
    analysis.web_search_citations = citations;
  }

  if (calculations.length > 0) {
    analysis.calculations_performed = calculations;
  }

  return analysis;
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
  onError: (specialist: Specialist, error: string) => void,
  options?: SpecialistToolOptions
): Promise<Record<string, SpecialistAnalysis>> {
  const specialists = Object.values(Specialist);
  const analyses: Record<string, SpecialistAnalysis> = {};

  await Promise.allSettled(
    specialists.map(async (s) => {
      try {
        const analysis = await runSingleSpecialist(s, intakeData, options);
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
  // Critical Care
  shock: Specialist.INTENSIVIST, vasopressor: Specialist.INTENSIVIST, norepinephrine: Specialist.INTENSIVIST,
  sofa: Specialist.INTENSIVIST, resuscitat: Specialist.INTENSIVIST, pressors: Specialist.INTENSIVIST,
  sedation: Specialist.INTENSIVIST, 'icu bundle': Specialist.INTENSIVIST, inotrope: Specialist.INTENSIVIST,
  'post-arrest': Specialist.INTENSIVIST, ttm: Specialist.INTENSIVIST, prone: Specialist.INTENSIVIST,
  // Oncology
  cancer: Specialist.ONCOLOGIST, tumor: Specialist.ONCOLOGIST, malignancy: Specialist.ONCOLOGIST, chemo: Specialist.ONCOLOGIST,
  neutropenic: Specialist.ONCOLOGIST, 'tumor lysis': Specialist.ONCOLOGIST, immunotherapy: Specialist.ONCOLOGIST,
  metasta: Specialist.ONCOLOGIST, oncolog: Specialist.ONCOLOGIST, iraes: Specialist.ONCOLOGIST,
  // Psychiatry
  delirium: Specialist.PSYCHIATRIST, agitat: Specialist.PSYCHIATRIST, capacity: Specialist.PSYCHIATRIST,
  psych: Specialist.PSYCHIATRIST, hallucin: Specialist.PSYCHIATRIST, suicid: Specialist.PSYCHIATRIST,
  catatoni: Specialist.PSYCHIATRIST, ciwa: Specialist.PSYCHIATRIST, cows: Specialist.PSYCHIATRIST,
  antipsychotic: Specialist.PSYCHIATRIST, 'substance withdrawal': Specialist.PSYCHIATRIST,
  // Toxicology
  overdose: Specialist.TOXICOLOGIST, poison: Specialist.TOXICOLOGIST, ingestion: Specialist.TOXICOLOGIST,
  toxidrome: Specialist.TOXICOLOGIST, antidote: Specialist.TOXICOLOGIST, 'osmolal gap': Specialist.TOXICOLOGIST,
  acetaminophen: Specialist.TOXICOLOGIST, 'toxic alcohol': Specialist.TOXICOLOGIST, methanol: Specialist.TOXICOLOGIST,
  'ethylene glycol': Specialist.TOXICOLOGIST, envenomation: Specialist.TOXICOLOGIST, naloxone: Specialist.TOXICOLOGIST,
  fomepizole: Specialist.TOXICOLOGIST,
  // Palliative Care
  'goals of care': Specialist.PALLIATIVE, comfort: Specialist.PALLIATIVE, hospice: Specialist.PALLIATIVE,
  'code status': Specialist.PALLIATIVE, prognos: Specialist.PALLIATIVE, 'advance directive': Specialist.PALLIATIVE,
  'end of life': Specialist.PALLIATIVE, dnr: Specialist.PALLIATIVE, 'withdrawal of care': Specialist.PALLIATIVE,
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

export async function runMultiRoundCrossConsult(
  analyses: Record<string, SpecialistAnalysis>,
  intakeData: IntakeData,
  callbacks: {
    onRoundStart: (round: number) => void;
    onMessage: (round: number, msg: CrossConsultMessage) => void;
    onRoundDone: (round: number, newQuestionsCount: number) => void;
  },
  maxRounds: number = 3
): Promise<CrossConsultRound[]> {
  const rounds: CrossConsultRound[] = [];

  // Collect initial requests (same logic as runCrossConsultStreaming)
  let pendingRequests: Array<{ from: Specialist; to: Specialist; question: string }> = [];

  for (const [specialist, analysis] of Object.entries(analyses)) {
    if (Array.isArray(analysis.cross_consults)) {
      for (const cc of analysis.cross_consults) {
        pendingRequests.push({ from: specialist as Specialist, to: cc.to as Specialist, question: cc.question });
      }
    }
  }
  for (const [specialist, analysis] of Object.entries(analyses)) {
    const teamQs = Array.isArray(analysis.questions_for_team) ? analysis.questions_for_team : [];
    for (const q of teamQs) {
      if (typeof q !== 'string' || !q.trim()) continue;
      const target = routeTeamQuestion(q, specialist);
      if (target) {
        const alreadyRouted = pendingRequests.some(
          (r) => r.from === specialist && r.to === target && r.question === q
        );
        if (!alreadyRouted) {
          pendingRequests.push({ from: specialist as Specialist, to: target, question: q });
        }
      }
    }
  }

  for (let round = 1; round <= maxRounds; round++) {
    if (pendingRequests.length === 0) break;

    callbacks.onRoundStart(round);
    const roundMessages: CrossConsultMessage[] = [];
    const nextRequests: Array<{ from: Specialist; to: Specialist; question: string }> = [];

    await Promise.allSettled(
      pendingRequests.map(async (req) => {
        const targetAnalysis = analyses[req.to];
        if (!targetAnalysis) return;

        const response = await anthropic.messages.create({
          model: SONNET_MODEL,
          max_tokens: 2048,
          system: SPECIALIST_PROMPTS[req.to],
          messages: [{
            role: 'user',
            content: `A colleague in ${req.from} asks: "${req.question}"

Your previous analysis: ${JSON.stringify(targetAnalysis)}

Patient data: ${JSON.stringify(intakeData)}

Respond to their question concisely. Return your answer as JSON:
{
  "response": "your concise response text here",
  "new_questions": [{"to": "specialist_id", "question": "follow-up question"}]
}

If you have no follow-up questions, use an empty array for new_questions.`,
          }],
        });

        const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

        // Try to parse JSON response for new_questions
        let responseText = rawText;
        let newQuestions: Array<{ to: string; question: string }> = [];

        const jsonStr = extractJSON(rawText);
        if (jsonStr) {
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.response) responseText = parsed.response;
            if (Array.isArray(parsed.new_questions)) {
              newQuestions = parsed.new_questions.filter(
                (nq: { to?: string; question?: string }) => nq.to && nq.question
              );
            }
          } catch {
            // If JSON parse fails, use raw text as response
            responseText = rawText;
          }
        }

        const msg: CrossConsultMessage = {
          from: req.from,
          to: req.to,
          message: req.question,
          response: responseText,
        };
        roundMessages.push(msg);
        callbacks.onMessage(round, msg);

        // Queue new questions for next round
        for (const nq of newQuestions) {
          const targetSpecialist = nq.to as Specialist;
          if (Object.values(Specialist).includes(targetSpecialist) && targetSpecialist !== req.to) {
            nextRequests.push({
              from: req.to,
              to: targetSpecialist,
              question: nq.question,
            });
          }
        }
      })
    );

    rounds.push({ round, messages: roundMessages });
    callbacks.onRoundDone(round, nextRequests.length);

    pendingRequests = nextRequests;
  }

  return rounds;
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

// Condense specialist analysis to essential fields for synthesis prompt
function condenseSynthesisInput(
  analyses: Record<string, SpecialistAnalysis>,
  crossConsults: CrossConsultMessage[],
  intakeData: IntakeData
): { patientSummary: string; analystSummaries: string; consultNotes: string } {
  // Compact patient data — drop raw notes, keep structured fields
  const patientSummary = JSON.stringify({
    demographics: intakeData.demographics,
    chief_complaint: intakeData.chief_complaint,
    hpi: intakeData.hpi,
    active_problems: (intakeData as any).active_problems,
    medications: intakeData.medications,
    vitals: intakeData.vitals,
    labs: intakeData.labs,
  });

  // Compact each specialist to findings/concerns/recommendations only
  const analystSummaries = Object.entries(analyses)
    .map(([specialist, analysis]) => {
      const parts = [`## ${SPECIALIST_CONFIG[specialist as Specialist]?.name ?? specialist}`];
      if (analysis.findings?.length) parts.push(`Findings: ${analysis.findings.join('; ')}`);
      if (analysis.concerns?.length) {
        parts.push(`Concerns: ${analysis.concerns.map(c => `[${c.severity}] ${c.detail}`).join('; ')}`);
      }
      if (analysis.recommendations?.length) {
        parts.push(`Recommendations: ${analysis.recommendations.map(r => {
          let s = r.recommendation;
          if (r.rationale) s += ` (${r.rationale})`;
          return s;
        }).join('; ')}`);
      }
      if ((analysis as any).evidence_basis) parts.push(`Evidence: ${(analysis as any).evidence_basis}`);
      return parts.join('\n');
    })
    .join('\n\n');

  // Compact cross-consults — just from/to/message, no metadata
  const consultNotes = crossConsults
    .map(cc => `${SPECIALIST_CONFIG[cc.from as Specialist]?.name ?? cc.from} → ${SPECIALIST_CONFIG[cc.to as Specialist]?.name ?? cc.to}: ${cc.message}`)
    .join('\n');

  return { patientSummary, analystSummaries, consultNotes };
}

export async function* runSynthesis(
  analyses: Record<string, SpecialistAnalysis>,
  crossConsults: CrossConsultMessage[],
  intakeData: IntakeData
): AsyncGenerator<string> {
  const { patientSummary, analystSummaries, consultNotes } = condenseSynthesisInput(analyses, crossConsults, intakeData);

  const stream = anthropic.messages.stream({
    model: OPUS_MODEL,
    max_tokens: 8192,
    system: ATTENDING_PROMPT,
    messages: [{
      role: 'user',
      content: `SYNTHESIZE the following specialist analyses into a unified Assessment & Plan organized by problem.

PATIENT DATA:
${patientSummary}

SPECIALIST ANALYSES:
${analystSummaries}

${consultNotes ? `CROSS-CONSULTATION NOTES:\n${consultNotes}` : ''}

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

export async function runSpecialistChat(
  specialist: Specialist,
  question: string,
  fullContext: {
    intakeData: IntakeData;
    analyses: Record<string, SpecialistAnalysis>;
    crossConsults: CrossConsultMessage[];
    chatHistory: SpecialistChatMessage[];
    synthesizedPlan: string;
  }
): Promise<{ response: string; triggeredQuestions: Array<{ to: string; question: string }> }> {
  const config = SPECIALIST_CONFIG[specialist];
  const model = config.model === 'opus' ? OPUS_MODEL : SONNET_MODEL;

  // Build chat history context
  const chatHistoryContext = fullContext.chatHistory
    .map((msg) => {
      const role = msg.role === 'user' ? 'Clinician' : `${SPECIALIST_CONFIG[msg.specialist!]?.name ?? msg.specialist}`;
      return `${role}: ${msg.content}`;
    })
    .join('\n');

  // Build relevant cross-consult context for this specialist
  const relevantConsults = fullContext.crossConsults.filter(
    (cc) => cc.from === specialist || cc.to === specialist
  );

  const userMessage = `You are being asked a follow-up question by the clinician reviewing this case.

PATIENT SUMMARY:
Demographics: ${JSON.stringify(fullContext.intakeData.demographics)}
Chief Complaint: ${fullContext.intakeData.chief_complaint}
HPI: ${fullContext.intakeData.hpi}

YOUR PREVIOUS ANALYSIS:
${JSON.stringify(fullContext.analyses[specialist], null, 2)}

${relevantConsults.length > 0 ? `RELEVANT CROSS-CONSULTATION HISTORY:\n${JSON.stringify(relevantConsults, null, 2)}` : ''}

${fullContext.synthesizedPlan ? `SYNTHESIZED PLAN SUMMARY:\n${fullContext.synthesizedPlan.slice(0, 2000)}` : ''}

${chatHistoryContext ? `PREVIOUS CHAT MESSAGES:\n${chatHistoryContext}` : ''}

CLINICIAN'S QUESTION:
${question}

Respond with a JSON object:
{
  "response": "Your detailed answer to the clinician's question",
  "new_questions": [{"to": "specialist_enum_value", "question": "question for that specialist"}]
}

The "new_questions" array should contain questions for other specialists ONLY if the clinician's question raises cross-specialty concerns that need input from another team member. Usually this array will be empty.

Respond ONLY with the JSON object.`;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: SPECIALIST_PROMPTS[specialist],
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  const jsonStr = extractJSON(text);
  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      return {
        response: parsed.response ?? text,
        triggeredQuestions: Array.isArray(parsed.new_questions) ? parsed.new_questions : [],
      };
    } catch {
      // Fall through to plain text response
    }
  }

  return { response: text, triggeredQuestions: [] };
}
