const cron = require('node-cron');
const db = require('../config/db');

function initScheduler() {
  // Every 15 minutes: mark due notifications, in a real system we'd push via FCM.
  cron.schedule('*/15 * * * *', async () => {
    try {
      const { rows } = await db.query(
        `UPDATE notifications
         SET status = 'due', updated_at = now()
         WHERE status = 'scheduled' AND scheduled_at <= now()
         RETURNING id, user_id, title, body`
      );
      if (rows.length) {
        console.log(`[SCHEDULER] Marked ${rows.length} notifications due`);
      }
    } catch (e) {
      console.error('[SCHEDULER] error', e.message);
    }
  });
  console.log('[SCHEDULER] notification cron started (every 15m)');
}

module.exports = { initScheduler };
