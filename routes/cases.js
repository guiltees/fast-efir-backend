const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authRequired } = require('../middleware/auth');
const c = require('../controllers/casesController');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', authRequired, c.createCase);
router.get('/', authRequired, c.listCases);
router.get('/:id', authRequired, c.getCase);
router.patch('/:id', authRequired, c.updateCase);
router.post('/:id/attachments', authRequired, upload.single('file'), c.attachFile);
router.post('/:id/prepare-submission', authRequired, c.prepareSubmission);
router.post('/:id/mark-submitted', authRequired, c.markSubmitted);

module.exports = router;
