/* Vercel serverless function: proxy to SiliconFlow so the API key never reaches the browser.
 *
 * Environment variables (set in Vercel → Project → Settings → Environment Variables):
 *   SILICONFLOW_API_KEY  required  your key, e.g. sk-xxxx
 *   SILICONFLOW_MODEL    optional  defaults to deepseek-ai/DeepSeek-R1-0528-Qwen3-8B
 *   ALLOWED_ORIGIN       optional  comma-separated list of page origins that may call this
 *                                  function, e.g. https://user.github.io,https://myapp.vercel.app
 *                                  Defaults to * (any origin). Trailing slashes are ignored.
 *
 * The frontend only ever sees this function's URL, never the key.
 */

const SILICONFLOW_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V4-Flash';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

function resolveAllowedOrigin(requestOrigin) {
  if (ALLOWED_ORIGINS.length === 0) return '*';
  if (!requestOrigin) return ALLOWED_ORIGINS[0];   // non-browser client (e.g. curl): CORS does not apply
  return ALLOWED_ORIGINS.indexOf(requestOrigin) !== -1 ? requestOrigin : ALLOWED_ORIGINS[0];
}

module.exports = async function handler(req, res) {
  // A browser from a non-listed origin gets a mismatched value and is blocked by CORS.
  res.setHeader('Access-Control-Allow-Origin', resolveAllowedOrigin(req.headers.origin));
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing SILICONFLOW_API_KEY' });
  }

  const messages = req.body && req.body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages[] is required' });
  }

  try {
    const upstream = await fetch(SILICONFLOW_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: process.env.SILICONFLOW_MODEL || DEFAULT_MODEL,
        messages: messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 512,
        enable_thinking: false
      })
    });

    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(body);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream request failed: ' + err.message });
  }
};
