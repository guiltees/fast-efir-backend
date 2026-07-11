const crypto = require('crypto');
// We use a Map as an in-memory placeholder for Redis for this MVP.
const threatCache = new Map();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const BASE = 'https://generativelanguage.googleapis.com/v1/models';

const THREAT_PROMPT = `
ROLE: You are an expert fraud and cybersecurity analyst evaluating suspicious inputs.

GOAL: Extract psychological tactics, deceptive intents, and provide prioritized defensive actions based on the provided context.

RULES:
1. DO NOT output conversational text.
2. DO NOT calculate a final risk score (the local engine does this).
3. Evaluate the provided context and findings objectively.
4. Output strictly in the specified JSON SCHEMA.

JSON SCHEMA:
{
  "findings": [
    {
      "type": "Fear | Urgency | Authority | Credential Theft | Reward | Curiosity",
      "evidence": "Quote or specific reason why",
      "confidence": number (0-100)
    }
  ],
  "actions": [
    {
      "priority": "critical | high | medium | low",
      "action": "Specific recommendation (e.g., Do not click the link)"
    }
  ]
}

NEGATIVE EXAMPLES:
Do not include keys like "risk" or "category". Do not wrap the output in markdown blocks like \`\`\`json.

POSITIVE EXAMPLES:
{
  "findings": [
    { "type": "Fear", "evidence": "The message claims immediate account suspension.", "confidence": 93 }
  ],
  "actions": [
    { "priority": "critical", "action": "Do not share OTP." }
  ]
}

NEVER DO: Do not hallucinate URLs or entities that are not in the context.

OUTPUT: Return only the JSON object.
`;

async function callGemini(contextString) {
    if (!GEMINI_API_KEY) {
        return { findings: [], actions: [] }; // Graceful degrade
    }
    const url = `${BASE}/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const body = {
        contents: [{ role: 'user', parts: [{ text: THREAT_PROMPT + '\n\nCONTEXT:\n' + contextString }] }],
        generationConfig: {
            temperature: 0.2,
            topP: 0.95,
            responseMimeType: 'application/json'
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
    const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || '{}';
    
    try {
        const clean = text.replace(/```json|```/g, '').trim();
        return JSON.parse(clean);
    } catch {
        return { findings: [], actions: [] };
    }
}

exports.analyzeThreat = async (threatContext) => {
    const contextString = JSON.stringify(threatContext);
    
    // 1. Hash-based caching
    const hash = crypto.createHash('sha256').update(contextString).digest('hex');
    
    if (threatCache.has(hash)) {
        console.log(`[CloudIntelligence] Cache HIT for hash ${hash}`);
        return threatCache.get(hash);
    }
    
    console.log(`[CloudIntelligence] Cache MISS for hash ${hash}. Calling Gemini Provider...`);
    
    // 2. Call Gemini
    const result = await callGemini(contextString);
    
    // 3. Store in cache
    threatCache.set(hash, result);
    
    return result;
};
