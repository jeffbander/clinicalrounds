import Anthropic from '@anthropic-ai/sdk';
import type { PresentationRequest, PresentationResponse } from '@/lib/types';
import { PRESENTATION_TYPES } from '@/lib/presentationTemplates';
import { SPECIALIST_CONFIG, Specialist } from '@/lib/types';

export const maxDuration = 120;

const anthropic = new Anthropic();

function buildOutlinePrompt(presentationType: string): string {
  const typeConfig = PRESENTATION_TYPES.find(t => t.id === presentationType);
  const sections = typeConfig?.sections ?? ['title', 'presentation', 'labs', 'differential', 'plan'];
  const numSlides = typeConfig?.numSlides ?? 10;

  const sectionDescriptions: Record<string, string> = {
    title: '## Title Slide\n[Age][Sex] with [Chief Complaint] — [Presentation Type]',
    presentation: '## Patient Presentation\n- Demographics, chief complaint, HPI\n- Key history elements',
    pmh: '## Past Medical History & Medications\n- PMH list\n- Current medications with doses\n- Allergies',
    vitals: '## Vital Signs & Physical Exam\n- Vital signs with abnormals highlighted\n- Key physical exam findings',
    labs: '## Laboratory Data\n- Highlight abnormal values with reference ranges\n- Group by system (CBC, BMP, LFTs, etc.)',
    imaging: '## Imaging & Studies\n- Modality, key findings\n- ECG if available',
    differential: '## Differential Diagnosis\n- Ranked list with supporting and refuting evidence\n- Most likely diagnosis highlighted',
    specialists: '## Key Specialist Insights\n- Top 4-6 specialist findings\n- Include specialist name and key recommendation',
    alerts: '## Critical Concerns\n- Critical and high-severity alerts\n- Urgent actions needed',
    scores: '## Clinical Scoring Systems\n- Score name, value, and interpretation\n- Clinical significance',
    plan: '## Assessment & Plan\n- Problem-based plan\n- Key interventions and monitoring',
    teaching: '## Teaching Points & Clinical Pearls\n- Case-specific teaching points\n- Evidence-based pearls',
    references: '## References\n- Key guidelines and evidence cited\n- Web search citations if available',
  };

  const slideStructure = sections
    .map(s => sectionDescriptions[s] || `## ${s}`)
    .join('\n\n');

  return `You are a clinical educator creating a case presentation for ${presentationType.replace('-', ' ')}. Given structured patient data and specialist analyses, create a slide-by-slide presentation outline in markdown.

Format each slide as a ## heading followed by bullet content. Target approximately ${numSlides} slides.

Slide structure:
${slideStructure}

Rules:
- NO patient names, MRNs, DOBs, or identifiable information
- Use "the patient" or demographic descriptors only
- Highlight critical/abnormal values in context
- For differential, explain supporting AND refuting evidence
- Teaching points should be case-specific clinical pearls
- Include "AI Clinical Reasoning Aid — Does not replace physician clinical judgment" on the final slide
- Keep content concise and presentation-ready`;
}

function condenseCaseData(body: PresentationRequest): string {
  const { intakeData, specialistAnalyses, crossConsultMessages, synthesizedPlan, criticalAlerts, scoringSystems } = body;

  const parts: string[] = [];

  // Demographics & Presentation
  const demo = intakeData.demographics;
  parts.push(`PATIENT: ${demo.age ?? '?'}yo ${demo.sex ?? 'unknown sex'}`);
  parts.push(`CHIEF COMPLAINT: ${intakeData.chief_complaint}`);
  parts.push(`HPI: ${intakeData.hpi}`);

  // PMH
  if (intakeData.past_medical_history.length > 0) {
    parts.push(`PMH: ${intakeData.past_medical_history.join(', ')}`);
  }

  // Medications
  if (intakeData.medications.length > 0) {
    parts.push(`MEDICATIONS:\n${intakeData.medications.map(m => `- ${m.name} ${m.dose ?? ''} ${m.route ?? ''} ${m.frequency ?? ''} (${m.type})`).join('\n')}`);
  }

  // Allergies
  if (intakeData.allergies.length > 0) {
    parts.push(`ALLERGIES: ${intakeData.allergies.join(', ')}`);
  }

  // Vitals
  const v = intakeData.vitals;
  const vitals = [
    v.hr && `HR ${v.hr}`,
    v.bp_systolic && v.bp_diastolic && `BP ${v.bp_systolic}/${v.bp_diastolic}`,
    v.rr && `RR ${v.rr}`,
    v.temp && `Temp ${v.temp}`,
    v.spo2 && `SpO2 ${v.spo2}%`,
  ].filter(Boolean);
  if (vitals.length > 0) {
    parts.push(`VITALS: ${vitals.join(', ')}`);
  }

  // Physical Exam
  if (intakeData.physical_exam) {
    parts.push(`PHYSICAL EXAM: ${intakeData.physical_exam}`);
  }

  // Labs
  if (intakeData.labs.length > 0) {
    const abnormalLabs = intakeData.labs.filter(l => l.abnormal);
    const normalLabs = intakeData.labs.filter(l => !l.abnormal);
    if (abnormalLabs.length > 0) {
      parts.push(`ABNORMAL LABS:\n${abnormalLabs.map(l => `- ${l.name}: ${l.value} ${l.unit ?? ''} (ref: ${l.reference_range ?? 'N/A'}) **ABNORMAL**`).join('\n')}`);
    }
    if (normalLabs.length > 0) {
      parts.push(`NORMAL LABS:\n${normalLabs.map(l => `- ${l.name}: ${l.value} ${l.unit ?? ''}`).join('\n')}`);
    }
  }

  // Imaging
  if (intakeData.imaging.length > 0) {
    parts.push(`IMAGING:\n${intakeData.imaging.map(i => `- ${i.modality}: ${i.findings}`).join('\n')}`);
  }

  // ECG
  if (intakeData.ecg) {
    parts.push(`ECG: ${intakeData.ecg}`);
  }

  // Critical Alerts
  if (criticalAlerts.length > 0) {
    parts.push(`CRITICAL ALERTS:\n${criticalAlerts.map(a => `- [${a.specialist}] ${a.detail}`).join('\n')}`);
  }

  // Scoring Systems
  if (scoringSystems.length > 0) {
    parts.push(`SCORING SYSTEMS:\n${scoringSystems.map(s => `- ${s.name}: ${s.score} — ${s.interpretation}`).join('\n')}`);
  }

  // Specialist Analyses (condensed)
  const specialistEntries = Object.entries(specialistAnalyses);
  if (specialistEntries.length > 0) {
    const specialistSummaries = specialistEntries.map(([key, analysis]) => {
      const config = SPECIALIST_CONFIG[key as Specialist];
      const name = config?.name ?? key;
      const topFindings = analysis.findings.slice(0, 3).join('; ');
      const topConcerns = analysis.concerns
        .filter(c => c.severity === 'critical' || c.severity === 'high')
        .slice(0, 2)
        .map(c => `[${c.severity}] ${c.detail}`)
        .join('; ');
      const topRecs = analysis.recommendations.slice(0, 2).map(r => r.recommendation).join('; ');
      return `${name}:\n  Findings: ${topFindings}\n  Concerns: ${topConcerns || 'None critical'}\n  Recs: ${topRecs}`;
    });
    parts.push(`SPECIALIST ANALYSES:\n${specialistSummaries.join('\n')}`);
  }

  // Cross-Consult highlights
  if (crossConsultMessages.length > 0) {
    const highlights = crossConsultMessages.slice(0, 6).map(cc => {
      const fromName = SPECIALIST_CONFIG[cc.from as Specialist]?.name ?? cc.from;
      const toName = SPECIALIST_CONFIG[cc.to as Specialist]?.name ?? cc.to;
      return `${fromName} → ${toName}: ${cc.message}${cc.response ? ` | Response: ${cc.response.slice(0, 150)}` : ''}`;
    });
    parts.push(`CROSS-CONSULT HIGHLIGHTS:\n${highlights.join('\n')}`);
  }

  // Synthesized Plan
  if (synthesizedPlan) {
    parts.push(`SYNTHESIZED ASSESSMENT & PLAN:\n${synthesizedPlan}`);
  }

  return parts.join('\n\n');
}

export async function POST(request: Request) {
  try {
    const body: PresentationRequest = await request.json();

    if (!body.intakeData || !body.specialistAnalyses) {
      return new Response(
        JSON.stringify({ error: 'Intake data and specialist analyses are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const presentationType = body.options?.type ?? 'grand-rounds';
    const systemPrompt = buildOutlinePrompt(presentationType);
    const caseData = condenseCaseData(body);

    const audienceNote = body.options?.audience ? `\nTarget audience: ${body.options.audience}` : '';
    const focusNote = body.options?.focusAreas?.length
      ? `\nFocus areas: ${body.options.focusAreas.join(', ')}`
      : '';

    // Use Claude to structure the outline
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Create a ${presentationType.replace('-', ' ')} presentation from this case data.${audienceNote}${focusNote}\n\n${caseData}`,
        },
      ],
    });

    const outline = message.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('\n');

    const response: PresentationResponse = { outline };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Presentation generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate presentation outline' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
