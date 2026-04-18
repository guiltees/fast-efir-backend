const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const { suggest } = require('../controllers/routingController');

router.get('/suggest', authRequired, suggest);

module.exports = router;
