const ruleRepo = require('../services/ruleRepository');
const cloudIntel = require('../services/cloudIntelligenceService');

exports.getRules = (req, res, next) => {
    try {
        const payload = ruleRepo.getLatestRules();
        res.json(payload);
    } catch (err) {
        next(err);
    }
};

exports.deepScan = async (req, res, next) => {
    try {
        const context = req.body;
        if (!context || !context.input) {
            return res.status(400).json({ error: 'Valid ThreatContext required' });
        }
        const result = await cloudIntel.analyzeThreat(context);
        res.json(result);
    } catch (err) {
        next(err);
    }
};
