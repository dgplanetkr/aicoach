import { createHash, timingSafeEqual } from 'node:crypto';

export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}

export function settings(env = process.env) {
  const apiKey = (env.OPENAI_API_KEY || '').trim();
  const vectorStoreId = (env.OPENAI_VECTOR_STORE_ID || '').trim();
  const model = (env.OPENAI_MODEL || 'gpt-4.1-mini').trim();
  const accessCode = (env.DEMO_ACCESS_CODE || '').trim();
  const ready = Boolean(apiKey && /^vs_[a-zA-Z0-9]+$/.test(vectorStoreId) && model && accessCode.length >= 16);
  return { apiKey, vectorStoreId, model, accessCode, ready };
}

export function isAuthorized(request, code) {
  if (!code || code.length < 16) return false;
  const supplied = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!supplied || supplied.length > 256) return false;
  const hash = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(supplied), hash(code));
}
