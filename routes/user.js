const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const { getMe, updateMe } = require('../controllers/userController');

router.get('/', authRequired, getMe);
router.patch('/', authRequired, updateMe);

module.exports = router;
