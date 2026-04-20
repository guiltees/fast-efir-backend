/**
 * Fraud alert feed. Static data for MVP — swap for an RSS/CMS pull later.
 */
const ALERTS = [
  {
    id: 'a1',
    title: 'बैंक KYC अपडेट स्कैम',
    body:
      'खुद को बैंक अधिकारी बताकर कॉलर KYC अपडेट के नाम पर AnyDesk/TeamViewer डाउनलोड करा रहे हैं। किसी भी अजनबी को स्क्रीन-शेयर या OTP न दें।',
    severity: 'high',
    source: 'RBI / Cybercrime helpline 1930',
    published_at: '2026-04-15'
  },
  {
    id: 'a2',
    title: 'बिजली बिल बकाया — रात में कनेक्शन कटेगा',
    body:
      'SMS/WhatsApp पर "बिजली बिल जमा नहीं हुआ, कनेक्शन कटेगा" के झांसे में APK या लिंक पर क्लिक न करें।',
    severity: 'high',
    source: 'DISCOM advisories',
    published_at: '2026-04-10'
  },
  {
    id: 'a3',
    title: 'पार्सल कस्टम्स में रुका है — कूरियर स्कैम',
    body:
      'Fake courier/customs SMS के ज़रिये UPI/card details माँगे जाते हैं। असली कूरियर कंपनियाँ कभी OTP/UPI नहीं माँगतीं।',
    severity: 'medium',
    source: 'Cybercrime advisory',
    published_at: '2026-04-05'
  },
  {
    id: 'a4',
    title: 'लोन ऐप ब्लैकमेल',
    body:
      'बिना KYC के तुरंत लोन देने वाले ऐप कॉन्टैक्ट/गैलरी एक्सेस लेकर ब्लैकमेल करते हैं। केवल RBI-रजिस्टर्ड NBFCs से ही लोन लें।',
    severity: 'high',
    source: 'RBI Sachet Portal',
    published_at: '2026-03-28'
  },
  {
    id: 'a5',
    title: 'UPI रिफंड रिक्वेस्ट धोखा',
    body:
      'Fake "Collect Request" भेजकर पैसे कटवाए जाते हैं। किसी भी collect request को approve करने से पहले amount और sender ध्यान से पढ़ें।',
    severity: 'medium',
    source: 'NPCI / Cybercrime',
    published_at: '2026-03-20'
  }
];

exports.list = () => ALERTS;
