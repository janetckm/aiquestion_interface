/* Vercel serverless function: cloud backup of every submitted study session.
 *
 * Environment variables (Vercel → Project → Settings → Environment Variables):
 *   UPSTASH_REDIS_REST_URL    required  injected by the Upstash integration
 *   UPSTASH_REDIS_REST_TOKEN  required  injected by the Upstash integration
 *   STUDY_REDIS_KEY           optional  Redis key holding the sessions (default: study:sessions)
 *   EXPORT_TOKEN              optional  set it to enable GET export of all sessions
 *   ALLOWED_ORIGIN            optional  comma-separated page origins, same as api/chat.js
 *
 * The frontend only ever sees this function's URL, never the Redis token.
 *
 * Storage: one Redis hash, field = participant_id, value = the session JSON.
 * Re-submitting the same participant overwrites the row instead of duplicating it.
 */

const REDIS_URL = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '')
  .replace(/\/+$/, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
const STUDY_KEY = process.env.STUDY_REDIS_KEY || 'study:sessions';
const EXPORT_TOKEN = process.env.EXPORT_TOKEN || '';
const MAX_BYTES = 200 * 1024;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

function resolveAllowedOrigin(requestOrigin) {
  if (ALLOWED_ORIGINS.length === 0) return '*';
  if (!requestOrigin) return ALLOWED_ORIGINS[0];   // non-browser client (e.g. curl): CORS does not apply
  return ALLOWED_ORIGINS.indexOf(requestOrigin) !== -1 ? requestOrigin : ALLOWED_ORIGINS[0];
}

/* Run commands against Upstash over its REST pipeline endpoint. */
async function redis(commands) {
  const res = await fetch(REDIS_URL + '/pipeline', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + REDIS_TOKEN
    },
    body: JSON.stringify(commands)
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(data)) {
    throw new Error('Redis request failed: ' + JSON.stringify(data));
  }
  const failed = data.find((entry) => entry && entry.error);
  if (failed) throw new Error('Redis command failed: ' + failed.error);

  return data.map((entry) => entry.result);
}

async function exportAll(req, res) {
  if (!EXPORT_TOKEN) {
    return res.status(403).json({ error: 'Export is disabled: set EXPORT_TOKEN to enable it' });
  }
  const given = req.headers['x-export-token'] || (req.query && req.query.token) || '';
  if (given !== EXPORT_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [values] = await redis([['HVALS', STUDY_KEY]]);
    const sessions = (values || []).map((raw) => {
      try { return JSON.parse(raw); } catch (e) { return { unparsed: raw }; }
    });
    sessions.sort((a, b) => String(a.submitted_at).localeCompare(String(b.submitted_at)));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="study_sessions.json"');
    return res.status(200).send(JSON.stringify(sessions, null, 2));
  } catch (err) {
    return res.status(502).json({ error: 'Could not read the sessions: ' + err.message });
  }
}

module.exports = async function handler(req, res) {
  // A browser from a non-listed origin gets a mismatched value and is blocked by CORS.
  res.setHeader('Access-Control-Allow-Origin', resolveAllowedOrigin(req.headers.origin));
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Export-Token');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Server is missing the Upstash Redis environment variables' });
  }

  if (req.method === 'GET') {
    return exportAll(req, res);
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const session = body.session;
  const id = body.participant_id || (session && session.participant_id);

  if (!session || typeof session !== 'object') {
    return res.status(400).json({ error: 'session object is required' });
  }
  if (!id) {
    return res.status(400).json({ error: 'participant_id is required' });
  }

  const json = JSON.stringify(session);
  if (Buffer.byteLength(json, 'utf8') > MAX_BYTES) {
    return res.status(413).json({ error: 'Session is larger than ' + MAX_BYTES + ' bytes' });
  }

  try {
    const [, stored] = await redis([
      ['HSET', STUDY_KEY, String(id), json],
      ['HLEN', STUDY_KEY]
    ]);
    return res.status(200).json({ ok: true, participant_id: String(id), stored: stored });
  } catch (err) {
    return res.status(502).json({ error: 'Could not store the session: ' + err.message });
  }
};
