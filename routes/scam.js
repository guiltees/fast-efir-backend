const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const { check } = require('../controllers/scamController');
const fed = require('../controllers/federatedController');

// Classic manual check (rule-based).
router.post('/check', authRequired, check);

// ----- Federated learning -----
// Accepts ONLY weight-delta packets. Rejects any body key that smells like
// raw user data (see federatedService.validate).
router.post('/federated/update', authRequired, fed.submitUpdate);

// Model distribution — unauthenticated reads are intentional: models are
// public artifacts and caching-friendly.
router.get('/models/latest', fed.latestModel);
router.get('/models/:version/file', fed.downloadModel);
router.get('/models/:version/vocab', fed.downloadVocab);
module.exports = router;
