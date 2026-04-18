const db = require('../config/db');
const { signToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const MOCK_OTP = '123456';
const inMemoryOtp = new Map(); // phone -> { otp, expiresAt }

exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^\+?\d{10,15}$/.test(phone))
      return res.status(400).json({ error: 'Valid phone number required' });

    // In production, integrate with MSG91 / Twilio. Here we mock.
    inMemoryOtp.set(phone, { otp: MOCK_OTP, expiresAt: Date.now() + 5 * 60 * 1000 });

    return res.json({
      ok: true,
      message: 'OTP sent (mock). Use 123456 to verify.',
      debug_otp: MOCK_OTP
    });
  } catch (e) {
    next(e);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp, name, language } = req.body;
    if (!phone || !otp)
      return res.status(400).json({ error: 'phone and otp are required' });

    const record = inMemoryOtp.get(phone);
    const isValid = otp === MOCK_OTP || (record && record.otp === otp && record.expiresAt > Date.now());
    if (!isValid) return res.status(401).json({ error: 'Invalid OTP' });
    inMemoryOtp.delete(phone);

    // Upsert user
    const existing = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    let user;
    if (existing.rows.length) {
      user = existing.rows[0];
    } else {
      const id = uuidv4();
      const inserted = await db.query(
        `INSERT INTO users (id, phone, name, language, created_at)
         VALUES ($1,$2,$3,$4, now()) RETURNING *`,
        [id, phone, name || null, language || 'hi']
      );
      user = inserted.rows[0];
    }

    const token = signToken({ id: user.id, phone: user.phone });
    return res.json({ token, user });
  } catch (e) {
    next(e);
  }
};
