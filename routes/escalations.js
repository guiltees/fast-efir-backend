const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const { generate, create } = require('../controllers/escalationsController');

router.post('/generate', authRequired, generate);
router.post('/', authRequired, create);

module.exports = router;
