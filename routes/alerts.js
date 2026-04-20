const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const { list } = require('../controllers/alertsController');

router.get('/', authRequired, list);

module.exports = router;
