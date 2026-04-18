const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.createCase = async (req, res, next) => {
  try {
    const { title, incident_type, narrative, parsed, state, district, urgency } = req.body;
    const id = uuidv4();
    const { rows } = await db.query(
      `INSERT INTO cases (id, user_id, title, incident_type, narrative, parsed, state, district, urgency, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft', now()) RETURNING *`,
      [
        id,
        req.user.id,
        title || 'Untitled case',
        incident_type || 'other',
        narrative || '',
        parsed || {},
        state || null,
        district || null,
        urgency || 'medium'
      ]
    );
    await db.query(
      `INSERT INTO timeline_events (id, case_id, kind, note, created_at)
       VALUES ($1,$2,'created','Case created', now())`,
      [uuidv4(), id]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};

exports.listCases = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM cases WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
};

exports.getCase = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM cases WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Case not found' });
    const caseRow = rows[0];
    const [items, files, timeline, escalations] = await Promise.all([
      db.query('SELECT * FROM items WHERE case_id = $1', [caseRow.id]),
      db.query('SELECT * FROM case_attachments WHERE case_id = $1', [caseRow.id]),
      db.query('SELECT * FROM timeline_events WHERE case_id = $1 ORDER BY created_at ASC', [caseRow.id]),
      db.query('SELECT * FROM escalations WHERE case_id = $1 ORDER BY created_at DESC', [caseRow.id])
    ]);
    res.json({
      ...caseRow,
      items: items.rows,
      attachments: files.rows,
      timeline: timeline.rows,
      escalations: escalations.rows
    });
  } catch (e) { next(e); }
};

exports.updateCase = async (req, res, next) => {
  try {
    const fields = ['title', 'incident_type', 'narrative', 'parsed', 'state', 'district', 'urgency', 'status', 'draft_hi'];
    const sets = [];
    const vals = [];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        vals.push(req.body[f]);
        sets.push(`${f} = $${vals.length + 2}`);
      }
    });
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });

    const { rows } = await db.query(
      `UPDATE cases SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id, ...vals]
    );
    if (!rows.length) return res.status(404).json({ error: 'Case not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

exports.attachFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const id = require('uuid').v4();
    const relPath = `/uploads/${req.file.filename}`;
    const { rows } = await db.query(
      `INSERT INTO case_attachments (id, case_id, user_id, filename, mime_type, size_bytes, url, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now()) RETURNING *`,
      [id, req.params.id, req.user.id, req.file.originalname, req.file.mimetype, req.file.size, relPath]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};

exports.prepareSubmission = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM cases WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Case not found' });
    const c = rows[0];
    const { suggestRoute } = require('../services/routingService');
    const route = suggestRoute({
      state: c.state,
      incident_type: c.incident_type,
      urgency: c.urgency
    });

    await db.query(
      `UPDATE cases SET status = 'ready_to_submit', updated_at = now() WHERE id = $1`,
      [c.id]
    );
    await db.query(
      `INSERT INTO timeline_events (id, case_id, kind, note, created_at)
       VALUES ($1,$2,'prepared','Submission package prepared', now())`,
      [require('uuid').v4(), c.id]
    );

    res.json({
      case_id: c.id,
      route,
      draft_hi: c.draft_hi,
      checklist: [
        'Identity proof (Aadhaar / DL / Passport)',
        'Address proof',
        'Evidence (photos, screenshots, transaction IDs)',
        'Witness names and contact (if any)',
        'List of stolen / damaged items with estimated value'
      ],
      disclaimer:
        'F.A.S.T. prepares your submission. You must file it through the official portal linked above.'
    });
  } catch (e) { next(e); }
};

exports.markSubmitted = async (req, res, next) => {
  try {
    const { portal, reference_no, submitted_at } = req.body;
    const { rows } = await db.query(
      `UPDATE cases
       SET status='submitted', submission_portal=$3, submission_ref=$4,
           submitted_at = COALESCE($5, now()), updated_at = now()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id, portal || null, reference_no || null, submitted_at || null]
    );
    if (!rows.length) return res.status(404).json({ error: 'Case not found' });
    await db.query(
      `INSERT INTO timeline_events (id, case_id, kind, note, created_at)
       VALUES ($1,$2,'submitted',$3, now())`,
      [require('uuid').v4(), req.params.id, `Submitted via ${portal || 'portal'}${reference_no ? ' — ref ' + reference_no : ''}`]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
};
