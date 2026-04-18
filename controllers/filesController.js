const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const id = uuidv4();
    const url = `/uploads/${req.file.filename}`;
    const { rows } = await db.query(
      `INSERT INTO files (id, user_id, filename, mime_type, size_bytes, url, created_at)
       VALUES ($1,$2,$3,$4,$5,$6, now()) RETURNING *`,
      [id, req.user.id, req.file.originalname, req.file.mimetype, req.file.size, url]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};
