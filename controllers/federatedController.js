/**
 * Controllers for the on-device federated-learning flow.
 *
 * Routes wired in routes/scam.js:
 *   POST /scam/federated/update
 *   GET  /scam/models/latest
 *   GET  /scam/models/:version/file    -- serves .tflite
 *   GET  /scam/models/:version/vocab   -- serves vocab.txt
 *
 * Distribution strategy (MVP):
 *   - Built-in models live under backend/ml/models/<version>.tflite
 *   - A CDN-backed swap is straightforward: replace the sendFile() call with
 *     a redirect to a signed CDN URL. The controller contract stays the same.
 */

const path = require('path');
const fs = require('fs');
const svc = require('../services/federatedService');

const MODEL_DIR = path.join(__dirname, '..', 'ml', 'models');

exports.submitUpdate = async (req, res, next) => {
  try {
    const out = await svc.submitUpdate(req.body);
    res.json(out);
  } catch (e) {
    // Validation errors we raised ourselves carry human-readable codes.
    if (/^(bad_|banned_key|norm_clip)/.test(e.message)) {
      return res.status(400).json({ error: e.message });
    }
    next(e);
  }
};

exports.latestModel = async (_req, res, next) => {
  try { res.json(await svc.latestModel()); } catch (e) { next(e); }
};

exports.downloadModel = (req, res, next) => {
  try {
    const { version } = req.params;
    if (!/^v?[\w.\-]{1,40}$/.test(version)) {
      return res.status(400).json({ error: 'bad_version' });
    }
    const file = path.join(MODEL_DIR, `${version}.tflite`);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'not_found' });
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${version}.tflite"`);
    res.sendFile(file);
  } catch (e) { next(e); }
};

exports.downloadVocab = (req, res, next) => {
  try {
    const { version } = req.params;
    if (!/^v?[\w.\-]{1,40}$/.test(version)) {
      return res.status(400).json({ error: 'bad_version' });
    }
    const file = path.join(MODEL_DIR, `${version}.vocab.txt`);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'not_found' });
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(file);
  } catch (e) { next(e); }
};
