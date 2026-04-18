/**
 * Routing engine — maps state + incident type to official portals & helplines.
 * All URLs are publicly known official portals. This app only routes; it does not file FIRs.
 */

const STATE_CONFIG = {
  MP: {
    name: 'Madhya Pradesh',
    portal: 'https://citizen.mppolice.gov.in/',
    complaint_portal: 'https://citizen.mppolice.gov.in/Complaint/ComplaintRegistration',
    helplines: { police: '100', women: '1091', emergency: '112', cyber: '1930' }
  },
  UP: {
    name: 'Uttar Pradesh',
    portal: 'https://uppolice.gov.in/',
    complaint_portal: 'https://cybercrime.gov.in/',
    helplines: { police: '112', women: '1090', emergency: '112', cyber: '1930' }
  },
  DL: {
    name: 'Delhi',
    portal: 'https://delhipolice.gov.in/',
    complaint_portal: 'https://www.delhipolice.gov.in/online-services',
    helplines: { police: '112', women: '1091', emergency: '112', cyber: '1930' }
  }
};

const INCIDENT_ROUTING = {
  cyber: {
    portal: 'https://cybercrime.gov.in/',
    helpline: '1930',
    eligibility:
      'Cyber-crime, online fraud, UPI fraud: use the National Cyber Crime Reporting Portal (NCRP) or dial 1930 within 24 hours for financial frauds.'
  },
  missing_person: {
    portal: 'https://trackthemissingchild.gov.in/',
    helpline: '1098 (child) / 112',
    eligibility:
      'Missing person cases: you may walk in to the nearest police station immediately; no jurisdictional bar (Zero FIR).'
  },
  women_harassment: {
    portal: 'https://ncwapps.nic.in/onlinecomplaintsv2/',
    helpline: '1091 / 181',
    eligibility: 'Harassment / domestic violence: NCW online complaint + local women cell. Emergency: 112.'
  },
  default: {
    portal: null,
    helpline: '112',
    eligibility:
      'For cognizable offences, you may register a Zero FIR at any police station irrespective of jurisdiction.'
  }
};

exports.suggestRoute = ({ state, incident_type, urgency }) => {
  const s = (state || '').toUpperCase();
  const stateCfg = STATE_CONFIG[s] || null;
  const incCfg = INCIDENT_ROUTING[incident_type] || INCIDENT_ROUTING.default;

  const route = {
    state: stateCfg?.name || state || 'Unknown',
    state_portal: stateCfg?.complaint_portal || stateCfg?.portal || null,
    incident_portal: incCfg.portal,
    helplines: {
      emergency: '112',
      primary: incCfg.helpline,
      state: stateCfg?.helplines || null
    },
    eligibility_notes: [
      incCfg.eligibility,
      'A Zero FIR can be filed at any police station for cognizable offences (BNSS 2023).',
      'You may also file a complaint under Section 173(4) BNSS if police refuse to register FIR.',
      'This app does NOT file FIRs on your behalf; it only helps you prepare and submit through official portals.'
    ],
    recommended_action:
      urgency === 'high'
        ? 'Call 112 immediately. Use this app afterwards to document the incident.'
        : 'Prepare draft in this app, then submit via the portal link below.',
    disclaimer:
      'F.A.S.T. is an independent assistive tool. We are not affiliated with any government agency.'
  };
  return route;
};

exports.STATE_CONFIG = STATE_CONFIG;
exports.INCIDENT_ROUTING = INCIDENT_ROUTING;
