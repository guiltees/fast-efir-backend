const { suggestRoute } = require('../services/routingService');

exports.suggest = (req, res) => {
  const { state, incident_type, urgency } = req.query;
  if (!state) return res.status(400).json({ error: 'state query param required' });
  const out = suggestRoute({ state, incident_type, urgency });
  res.json(out);
};
