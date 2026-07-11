const express = require('express');
const router = express.Router();
const threatController = require('../controllers/threatController');

// GET /api/v1/threats/rules
router.get('/rules', threatController.getRules);

// POST /api/v1/threats/deep-scan
router.post('/deep-scan', threatController.deepScan);

module.exports = router;
