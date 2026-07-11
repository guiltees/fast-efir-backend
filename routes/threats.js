const express = require('express');
const router = express.Router();
const threatController = require('../controllers/threatController');

const { authRequired } = require('../middleware/auth');

// GET /api/v1/threats/rules
router.get('/rules', threatController.getRules);

// POST /api/v1/threats/deep-scan (Protected)
router.post('/deep-scan', authRequired, threatController.deepScan);

module.exports = router;
