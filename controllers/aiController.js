const ai = require('../services/aiService');

exports.parseIncident = async (req, res, next) => {
  try {
    const { narrative, meta } = req.body;
    if (!narrative) return res.status(400).json({ error: 'narrative is required' });
    const parsed = await ai.parseIncident(narrative, meta);
    res.json({ parsed });
  } catch (e) { next(e); }
};

exports.draftComplaint = async (req, res, next) => {
  try {
    const { parsed, userInfo } = req.body;
    if (!parsed) return res.status(400).json({ error: 'parsed is required' });
    const draft = await ai.draftComplaint(parsed, userInfo || {});
    res.json(draft);
  } catch (e) { next(e); }
};

exports.generateEscalation = async (req, res, next) => {
  try {
    const { caseSummary, stage } = req.body;
    if (!caseSummary) return res.status(400).json({ error: 'caseSummary is required' });
    const out = await ai.generateEscalation(caseSummary, stage || 'SP');
    res.json(out);
  } catch (e) { next(e); }
};
