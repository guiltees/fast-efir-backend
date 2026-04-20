const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const { check } = require('../controllers/scamController');

router.post('/check', authRequired, check);

module.exports = router;
