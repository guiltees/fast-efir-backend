const svc = require('../services/alertsService');

exports.list = (_req, res) => res.json(svc.list());
