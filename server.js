require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const aiRoutes = require('./routes/ai');
const casesRoutes = require('./routes/cases');
const routingRoutes = require('./routes/routing');
const escalationsRoutes = require('./routes/escalations');
const filesRoutes = require('./routes/files');
const notificationsRoutes = require('./routes/notifications');

const errorHandler = require('./middleware/errorHandler');
const { initScheduler } = require('./services/notificationScheduler');

const app = express();

// Security + parsing
app.use(helmet());
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'));

// Static uploads (works on Render/Railway ephemeral disk; use S3/Supabase Storage for persistence)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health
app.get('/', (_req, res) =>
  res.json({
    name: 'F.A.S.T. eFIR Assistance & Submission Tool API',
    status: 'ok',
    disclaimer: 'This app is not affiliated with any government entity. It only assists users in preparing and routing complaints to official portals.'
  })
);
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Routes
app.use('/auth', authRoutes);
app.use('/me', userRoutes);
app.use('/ai', aiRoutes);
app.use('/cases', casesRoutes);
app.use('/routing', routingRoutes);
app.use('/escalations', escalationsRoutes);
app.use('/files', filesRoutes);
app.use('/notifications', notificationsRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.originalUrl }));

// Error handler
app.use(errorHandler);

// Boot
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[F.A.S.T.] Listening on port ${PORT}`);
  initScheduler();
});

module.exports = app;
