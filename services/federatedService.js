/**
 * Federated learning aggregator — server-side (PostgreSQL backed).
 *
 * Responsibilities:
 *   1. Accept incoming weight-delta packets from devices.
 *   2. Reject payloads that look like they contain raw user data.
 *   3. Reject outliers using L2-norm clipping.
 *   4. Periodically aggregate a round: weighted average by `samples_seen`.
 *   5. Expose the resulting global model version.
 */

const db = require('../config/db');

const FEATURE_DIM = 8;
const MAX_DELTA_NORM = 2.5;
const MIN_ROUND_CLIENTS = 5;
const OUTLIER_SIGMA = 3.0;

const BANNED_KEYS = [
  'text', 'message', 'sms', 'body', 'phone', 'phone_number',
  'sender', 'recipient', 'contact', 'email', 'address',
  'aadhaar', 'pan', 'user_id', 'name'
];

function validate(body) {
  if (!body || typeof body !== 'object') throw new Error('bad_body');

  for (const k of Object.keys(body)) {
    if (BANNED_KEYS.includes(k.toLowerCase())) {
      throw new Error(`banned_key:${k}`);
    }
  }

  const w = body.head_weights;
  if (!Array.isArray(w) || w.length !== FEATURE_DIM) {
    throw new Error('bad_shape');
  }
  for (const v of w) {
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('bad_weights');
  }
  if (typeof body.head_bias !== 'number' || !Number.isFinite(body.head_bias)) {
    throw new Error('bad_bias');
  }
  const n = Math.hypot(...w);
  if (n > MAX_DELTA_NORM) {
    throw new Error(`norm_clip:${n.toFixed(2)}`);
  }
  const samples = body.samples_seen || 0;
  if (typeof samples !== 'number' || samples < 1 || samples > 10000) {
    throw new Error('bad_samples');
  }
  return {
    head_weights: JSON.stringify(w),
    head_bias: body.head_bias,
    samples_seen: samples,
    model_version: body.model_version || null,
    device_nonce: String(body.device_nonce || ''),
    delta_norm: n
  };
}

function aggregate(updates) {
  if (!updates.length) return null;

  const norms = updates.map((u) => parseFloat(u.delta_norm));
  const mean = norms.reduce((a, b) => a + b, 0) / norms.length;
  const variance =
    norms.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(norms.length - 1, 1);
  const sd = Math.sqrt(variance);
  const kept = updates.filter((u) => parseFloat(u.delta_norm) <= mean + OUTLIER_SIGMA * sd);

  if (!kept.length) return null;

  const totalSamples = kept.reduce((a, u) => a + u.samples_seen, 0);
  const w = Array(FEATURE_DIM).fill(0);
  let b = 0;
  for (const u of kept) {
    const coef = u.samples_seen / totalSamples;
    const weights = typeof u.head_weights === 'string' ? JSON.parse(u.head_weights) : u.head_weights;
    for (let i = 0; i < FEATURE_DIM; i++) w[i] += coef * weights[i];
    b += coef * parseFloat(u.head_bias);
  }
  return { deltaW: w, deltaB: b, contributors: kept.length, rejected: updates.length - kept.length };
}

function bumpVersion(v) {
  const parts = String(v || 'v0.0.0').replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return 'v' + parts.join('.');
}

exports.submitUpdate = async (body) => {
  const clean = validate(body);
  
  await db.query(
    `INSERT INTO fl_pending_updates (head_weights, head_bias, samples_seen, model_version, device_nonce, delta_norm)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [clean.head_weights, clean.head_bias, clean.samples_seen, clean.model_version, clean.device_nonce, clean.delta_norm]
  );

  let flushedVersion = null;
  let currentRound = null;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const globalRes = await client.query('SELECT * FROM fl_global_model WHERE id = 1 FOR UPDATE');
    let globalHead = globalRes.rows[0];
    
    if (!globalHead) {
      const res = await client.query(`
        INSERT INTO fl_global_model (id, version, weights, bias, round, updated_at)
        VALUES (1, 'v0.1.0', '[0,0,0,0,0,0,0,0]'::jsonb, 0, 0, now())
        RETURNING *
      `);
      globalHead = res.rows[0];
    }
    
    currentRound = globalHead.round;

    const countRes = await client.query('SELECT COUNT(*) as c FROM fl_pending_updates');
    const pendingCount = parseInt(countRes.rows[0].c, 10);

    if (pendingCount >= MIN_ROUND_CLIENTS) {
      const { rows: batch } = await client.query('DELETE FROM fl_pending_updates RETURNING *');
      
      const agg = aggregate(batch);
      if (agg) {
        const oldWeights = typeof globalHead.weights === 'string' ? JSON.parse(globalHead.weights) : globalHead.weights;
        const newW = oldWeights.map((x, i) => x + agg.deltaW[i]);
        const newB = parseFloat(globalHead.bias) + agg.deltaB;
        const newVersion = bumpVersion(globalHead.version);
        const newRound = globalHead.round + 1;

        await client.query(
          `UPDATE fl_global_model 
           SET version = $1, weights = $2, bias = $3, round = $4, updated_at = now()
           WHERE id = 1`,
          [newVersion, JSON.stringify(newW), newB, newRound]
        );
        flushedVersion = newVersion;
        currentRound = newRound;
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const { rows: finalCount } = await db.query('SELECT COUNT(*) as c FROM fl_pending_updates');

  return {
    accepted: true,
    global_model_version: flushedVersion || (await exports.latestModel()).version,
    queued: parseInt(finalCount[0].c, 10),
    round: currentRound
  };
};

exports.latestModel = async () => {
  const { rows } = await db.query('SELECT * FROM fl_global_model WHERE id = 1');
  if (!rows.length) {
    return {
      version: 'v0.1.0',
      round: 0,
      updated_at: new Date().toISOString(),
      feature_dim: FEATURE_DIM,
      head_weights: Array(FEATURE_DIM).fill(0),
      head_bias: 0
    };
  }
  const globalHead = rows[0];
  const weights = typeof globalHead.weights === 'string' ? JSON.parse(globalHead.weights) : globalHead.weights;
  
  return {
    version: globalHead.version,
    round: globalHead.round,
    updated_at: globalHead.updated_at,
    feature_dim: FEATURE_DIM,
    head_weights: weights,
    head_bias: parseFloat(globalHead.bias)
  };
};

exports._debugState = async () => {
  const globalHead = await exports.latestModel();
  const { rows: countRows } = await db.query('SELECT COUNT(*) as c FROM fl_pending_updates');
  return { globalHead, pending: parseInt(countRows[0].c, 10) };
};
