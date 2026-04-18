const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const { schedule, list } = require('../controllers/notificationsController');

router.post('/schedule', authRequired, schedule);
router.get('/', authRequired, list);

module.exports = router;
