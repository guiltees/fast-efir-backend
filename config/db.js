const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('[DB] DATABASE_URL is not set. Database calls will fail until configured.');
}

// Strip any sslmode= from the connection string because we force SSL options below.
// This prevents pg from applying a stricter verifier that trips on Supabase's
// self-signed intermediate cert.
const rawUrl = process.env.DATABASE_URL || '';
const cleanedUrl = rawUrl
  .replace(/([?&])sslmode=[^&]*&?/i, (_m, p1) => (p1 === '?' ? '?' : ''))
  .replace(/[?&]$/, '');

const pool = new Pool({
  connectionString: cleanedUrl,
  ssl: { rejectUnauthorized: false, require: true }
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
