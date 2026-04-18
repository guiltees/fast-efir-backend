/**
 * Gemini AI service.
 * Uses the REST endpoint so we don't add an SDK dependency.
 * Docs: https://ai.google.dev/api/rest
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function callGemini(prompt, { responseMimeType } = {}) {
  if (!GEMINI_API_KEY) {
    // Graceful degradation — returns deterministic mock so the app still works without a key.
    return { text: '', mocked: true };
  }
  const url = `${BASE}/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      topP: 0.95,
      maxOutputTokens: 2048,
      ...(responseMimeType ? { responseMimeType } : {})
    }
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${errText}`);
  }
  const json = await resp.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || '';
  return { text, raw: json };
}

// -------- Prompt templates --------

const INCIDENT_PARSER_PROMPT = (narrative, meta) => `
You are a legal assistant for Indian citizens filing police complaints.
Parse the following incident narrative into STRICT JSON. Do not add commentary.

Narrative:
"""${narrative}"""

User context: ${JSON.stringify(meta || {})}

Return JSON with keys:
{
  "incident_type": string,             // theft, assault, cyber, harassment, missing_person, other
  "summary_en": string,                // 2-3 sentences English
  "summary_hi": string,                // Hindi translation
  "date_of_incident": string | null,   // ISO date if mentioned
  "time_of_incident": string | null,
  "location": { "state": string|null, "district": string|null, "address": string|null },
  "parties": { "complainant": string|null, "accused": string|null },
  "items": [ { "name": string, "value_inr": number|null, "identifier": string|null } ],
  "sections_suggested": [ string ],    // e.g. ["BNS 303", "IT Act 66C"]
  "urgency": "low"|"medium"|"high",
  "recommended_portal": "ncrp"|"state_police"|"local_ps",
  "missing_info": [ string ]           // what to ask the user next
}
Respond with JSON only.
`;

const COMPLAINT_DRAFT_PROMPT = (parsed, userInfo) => `
You are drafting a formal complaint letter in Hindi (Devanagari) to be submitted
to the Station House Officer (SHO) / local police portal in India.

Parsed incident data:
${JSON.stringify(parsed, null, 2)}

Complainant:
${JSON.stringify(userInfo, null, 2)}

Rules:
- Tone: respectful, formal, Hindi (हिंदी).
- Structure: सेवा में / विषय / महोदय / विवरण / अनुरोध / निवेदक.
- Mention date, time, location, description, loss / damage, parties.
- Reference applicable legal sections briefly.
- Keep under 450 words.
- End with: "यह विवरण सत्य और मेरी जानकारी के अनुसार सही है।"
Return only the letter text.
`;

const ESCALATION_PROMPT = (caseSummary, stage) => `
You are drafting an escalation letter to the Superintendent of Police (SP)
or Magistrate (under Section 173(4) BNSS / 156(3) CrPC) for a pending case
where the local police station has not acted.

Case summary:
${JSON.stringify(caseSummary, null, 2)}

Escalation stage: ${stage}  // "SP" or "MAGISTRATE"

Rules:
- Formal English + Hindi parallel paragraphs.
- Include: date of first complaint, PS name, lack of FIR / action, prayer for direction.
- Cite Section 173(4) BNSS if MAGISTRATE stage.
- Under 500 words. Return only letter text.
`;

// -------- Public API --------

exports.parseIncident = async (narrative, meta) => {
  const prompt = INCIDENT_PARSER_PROMPT(narrative, meta);
  const { text, mocked } = await callGemini(prompt, { responseMimeType: 'application/json' });
  if (mocked || !text) {
    return {
      incident_type: 'other',
      summary_en: narrative.slice(0, 200),
      summary_hi: narrative.slice(0, 200),
      date_of_incident: null,
      time_of_incident: null,
      location: { state: meta?.state || null, district: meta?.district || null, address: null },
      parties: { complainant: meta?.name || null, accused: null },
      items: [],
      sections_suggested: [],
      urgency: 'medium',
      recommended_portal: 'local_ps',
      missing_info: ['date_of_incident', 'location.address', 'parties.accused'],
      _mocked: true
    };
  }
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { raw_text: text, _parse_error: true };
  }
};

exports.draftComplaint = async (parsed, userInfo) => {
  const prompt = COMPLAINT_DRAFT_PROMPT(parsed, userInfo);
  const { text, mocked } = await callGemini(prompt);
  if (mocked || !text) {
    return {
      draft_hi: `सेवा में,\nथाना प्रभारी,\n\nविषय: ${parsed?.incident_type || 'घटना'} की शिकायत।\n\nमहोदय,\nनिवेदन है कि ${parsed?.summary_hi || parsed?.summary_en || 'घटना का विवरण उपलब्ध नहीं।'}\n\nकृपया उचित कार्यवाही कर FIR दर्ज करने की कृपा करें।\n\nयह विवरण सत्य और मेरी जानकारी के अनुसार सही है।\n\nनिवेदक,\n${userInfo?.name || '—'}`,
      _mocked: true
    };
  }
  return { draft_hi: text };
};

exports.generateEscalation = async (caseSummary, stage = 'SP') => {
  const prompt = ESCALATION_PROMPT(caseSummary, stage);
  const { text, mocked } = await callGemini(prompt);
  if (mocked || !text) {
    return {
      letter: `To,\nThe ${stage === 'SP' ? 'Superintendent of Police' : 'Hon’ble Magistrate'},\n\nSubject: Inaction on complaint dated ${caseSummary?.created_at || ''}.\n\nRespected Sir/Madam,\nDespite submission of my complaint at ${caseSummary?.ps_name || 'local police station'}, no FIR has been registered. I humbly pray for directions under applicable law.\n\nYours sincerely,\n${caseSummary?.complainant || '—'}`,
      _mocked: true
    };
  }
  return { letter: text };
};
