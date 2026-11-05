/**
 * Cloudflare Worker proxy for SiliconFlow chat completions.
 *
 * The API key lives in the Worker's environment (an encrypted secret), never in
 * the static site, so it is not visible to participants who view page source.
 *
 * Setup:
 *   wrangler secret put SILICONFLOW_API_KEY
 *   wrangler deploy
 */

const DEFAULT_UPSTREAM = 'https://api.siliconflow.cn/v1/chat/completions';
const MAX_MESSAGES = 40;
const MAX_CONTENT_CHARS = 4000;
const MAX_TOKENS_CAP = 1024;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = allowedOrigins(env).indexOf(origin) !== -1;

    const cors = {
      'Access-Control-Allow-Origin': allowed ? origin : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return fail('Method not allowed', 405, cors);
    }
    if (!allowed) {
      return fail('Origin not allowed', 403, cors);
    }
    if (!env.SILICONFLOW_API_KEY) {
      return fail('SILICONFLOW_API_KEY secret is not set on this Worker', 500, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return fail('Request body must be valid JSON', 400, cors);
    }

    const messages = sanitizeMessages(body.messages);
    if (!messages.length) {
      return fail('"messages" must be a non-empty array', 400, cors);
    }

    const models = allowedModels(env);
    const model = models.indexOf(body.model) !== -1 ? body.model : models[0];

    const payload = {
      model: model,
      messages: messages,
      stream: false,
      temperature: 0.7,
      max_tokens: Math.min(Number(body.max_tokens) || 512, MAX_TOKENS_CAP)
    };

    let upstream;
    try {
      upstream = await fetch(env.UPSTREAM_URL || DEFAULT_UPSTREAM, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + env.SILICONFLOW_API_KEY
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      return fail('Could not reach the SiliconFlow API', 502, cors);
    }

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
    });
  }
};

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(function (o) { return o.trim(); })
    .filter(Boolean);
}

function allowedModels(env) {
  const list = String(env.ALLOWED_MODELS || 'Qwen/Qwen2.5-7B-Instruct')
    .split(',')
    .map(function (m) { return m.trim(); })
    .filter(Boolean);
  return list.length ? list : ['Qwen/Qwen2.5-7B-Instruct'];
}

function sanitizeMessages(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter(function (m) {
      return m && typeof m === 'object' &&
        ['system', 'user', 'assistant'].indexOf(m.role) !== -1 &&
        typeof m.content === 'string';
    })
    .slice(-MAX_MESSAGES)
    .map(function (m) {
      return { role: m.role, content: m.content.slice(0, MAX_CONTENT_CHARS) };
    });
}

function fail(message, status, cors) {
  return new Response(JSON.stringify({ error: message }), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
  });
}
