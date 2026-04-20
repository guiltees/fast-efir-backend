/**
 * Lightweight scam/fraud heuristic checker.
 * Phase 1: deterministic rules + keyword heuristics (no external API).
 * Phase 2 (future): integrate TRAI DND, Truecaller, or Anthropic/Gemini classifier.
 */

// Known-bad phone prefixes / patterns (illustrative).
const BAD_PHONE_PATTERNS = [
  /^\+?0{3,}/,                // lots of leading zeros
  /^(\+91)?140\d{7}$/,        // DND promo series in India
  /^(\+91)?1800\d{6,7}$/,     // toll-free impersonation
  /(\d)\1{6,}/                // 6+ repeated digits
];

// High-signal scam keywords (English + Hindi transliteration).
const MSG_KEYWORDS = [
  'kyc', 'suspended', 'blocked', 'verify account', 'last warning',
  'electricity bill', 'your package', 'parcel held', 'customs',
  'lottery', 'winner', 'prize', 'aapki id', 'otp share', 'anydesk',
  'teamviewer', 'refund click', 'reward point', 'pan update',
  'कष्टकर', 'ओटीपी', 'खाता बंद', 'पैन अपडेट', 'पुरस्कार'
];

const SHORTENER_HOSTS = ['bit.ly', 'tinyurl.com', 't.co', 'rb.gy', 'cutt.ly', 'shorturl.at'];

function scorePhone(raw) {
  const num = String(raw || '').replace(/[^\d+]/g, '');
  const reasons = [];
  let score = 0;

  if (!num) return { score: 0, reasons: ['empty input'] };
  if (num.length < 7 || num.length > 15) {
    score += 30;
    reasons.push('unusual length for a phone number');
  }
  BAD_PHONE_PATTERNS.forEach((re, i) => {
    if (re.test(num)) {
      score += 40;
      reasons.push(`matches suspicious pattern #${i + 1}`);
    }
  });
  if (/^(\+91)?9\d{9}$/.test(num) === false && /^\+?\d{10,}$/.test(num)) {
    // non-standard Indian mobile → mild signal
    score += 10;
    reasons.push('not a standard Indian mobile pattern');
  }
  return { score, reasons };
}

function scoreMessage(text) {
  const t = String(text || '').toLowerCase();
  const reasons = [];
  let score = 0;

  const hits = MSG_KEYWORDS.filter((k) => t.includes(k.toLowerCase()));
  if (hits.length) {
    score += Math.min(70, hits.length * 20);
    reasons.push(`scam keywords detected: ${hits.slice(0, 4).join(', ')}`);
  }
  // URL checks
  const urls = t.match(/https?:\/\/\S+/g) || [];
  urls.forEach((u) => {
    try {
      const host = new URL(u).hostname;
      if (SHORTENER_HOSTS.some((s) => host.includes(s))) {
        score += 25;
        reasons.push(`shortened URL (${host})`);
      }
      if (/[0-9]/.test(host) && /gov|rbi|sbi|hdfc|icici|upi/.test(host)) {
        score += 40;
        reasons.push(`suspicious bank/gov lookalike domain (${host})`);
      }
    } catch { /* ignore */ }
  });
  // OTP share requests
  if (/share.{0,10}otp|send.{0,10}otp|tell.{0,10}otp/i.test(t)) {
    score += 60;
    reasons.push('asks you to share OTP');
  }
  // Urgency phrases
  if (/(within\s*\d+\s*hour|immediately|urgent|last warning)/i.test(t)) {
    score += 15;
    reasons.push('creates false urgency');
  }
  return { score, reasons };
}

function bucket(score) {
  if (score >= 60) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

exports.check = ({ kind, value }) => {
  const { score, reasons } = kind === 'phone' ? scorePhone(value) : scoreMessage(value);
  const risk = bucket(score);
  const advice = {
    HIGH: 'यह संदेश/कॉल अत्यधिक संदिग्ध है। कोई लिंक न खोलें, OTP साझा न करें। तुरंत 1930 पर कॉल करें और cybercrime.gov.in पर रिपोर्ट करें।',
    MEDIUM: 'संदिग्ध संकेत मिले हैं। आगे बढ़ने से पहले सत्यापन करें; किसी लिंक पर क्लिक न करें।',
    LOW: 'तत्काल कोई ख़तरा नहीं मिला, लेकिन सतर्क रहें। किसी अजनबी से मिली जानकारी पर भरोसा न करें।'
  }[risk];
  return { risk, score, reasons, advice };
};
