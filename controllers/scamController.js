const svc = require('../services/scamService');

exports.check = (req, res, next) => {
  try {
    const { kind, value } = req.body;
    if (!kind || !value) return res.status(400).json({ error: 'kind and value required' });
    if (!['phone', 'message'].includes(kind))
      return res.status(400).json({ error: 'kind must be "phone" or "message"' });
    res.json(svc.check({ kind, value }));
  } catch (e) { next(e); }
};
