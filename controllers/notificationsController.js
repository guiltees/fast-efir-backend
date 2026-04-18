const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.schedule = async (req, res, next) => {
  try {
    const { case_id, title, body, scheduled_at } = req.body;
    if (!title || !scheduled_at) return res.status(400).json({ error: 'title and scheduled_at required' });
    const id = uuidv4();
    const { rows } = await db.query(
      `INSERT INTO notifications (id, user_id, case_id, title, body, scheduled_at, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,'scheduled', now()) RETURNING *`,
      [id, req.user.id, case_id || null, title, body || '', scheduled_at]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY scheduled_at DESC LIMIT 100',
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
};
