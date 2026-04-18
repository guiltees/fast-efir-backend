const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const { parseIncident, draftComplaint, generateEscalation } = require('../controllers/aiController');

router.post('/parse-incident', authRequired, parseIncident);
router.post('/draft-complaint', authRequired, draftComplaint);
router.post('/generate-escalation', authRequired, generateEscalation);

module.exports = router;
