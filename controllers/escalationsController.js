const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const ai = require('../services/aiService');

exports.generate = async (req, res, next) => {
  try {
    const { case_id, stage } = req.body;
    if (!case_id) return res.status(400).json({ error: 'case_id required' });
    const { rows } = await db.query(
      'SELECT * FROM cases WHERE id = $1 AND user_id = $2',
      [case_id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Case not found' });
    const c = rows[0];
    const out = await ai.generateEscalation(
      {
        title: c.title,
        incident_type: c.incident_type,
        summary: c.parsed?.summary_en,
        created_at: c.created_at,
        ps_name: c.parsed?.location?.ps_name,
        complainant: c.parsed?.parties?.complainant
      },
      stage || 'SP'
    );
    res.json(out);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { case_id, stage, letter, sent_to, sent_at } = req.body;
    if (!case_id || !letter) return res.status(400).json({ error: 'case_id and letter required' });
    const id = uuidv4();
    const { rows } = await db.query(
      `INSERT INTO escalations (id, case_id, user_id, stage, letter, sent_to, sent_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now()) RETURNING *`,
      [id, case_id, req.user.id, stage || 'SP', letter, sent_to || null, sent_at || null]
    );
    await db.query(
      `INSERT INTO timeline_events (id, case_id, kind, note, created_at)
       VALUES ($1,$2,'escalated',$3, now())`,
      [uuidv4(), case_id, `Escalation created (${stage || 'SP'})`]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};
