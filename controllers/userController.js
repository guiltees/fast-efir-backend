const db = require('../config/db');

exports.getMe = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT id, phone, name, language, state, district, created_at FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

exports.updateMe = async (req, res, next) => {
  try {
    const { name, language, state, district } = req.body;
    const { rows } = await db.query(
      `UPDATE users
       SET name = COALESCE($2, name),
           language = COALESCE($3, language),
           state = COALESCE($4, state),
           district = COALESCE($5, district),
           updated_at = now()
       WHERE id = $1
       RETURNING id, phone, name, language, state, district, created_at`,
      [req.user.id, name, language, state, district]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
};
