import { json, settings, isAuthorized } from '../lib/settings.mjs';
import { buildRagReply, sanitizeInput, ChatError } from '../lib/rag.mjs';

export async function POST(request) {
  const config = settings();
  if (!config.ready) return json({ error: '실제 AI 답변은 아직 준비 중입니다. 예시 답변을 이용해주세요.' }, 503);
  if (!isAuthorized(request, config.accessCode)) return json({ error: '테스트 접근코드를 확인해주세요.' }, 401);
  if (!(request.headers.get('content-type') || '').includes('application/json')) {
    return json({ error: 'JSON 요청이 필요합니다.' }, 415);
  }
  try {
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 48000) return json({ error: '질문과 실행 기록이 너무 깁니다.' }, 413);
    const body = await request.text();
    if (Buffer.byteLength(body, 'utf8') > 48000) return json({ error: '질문과 실행 기록이 너무 깁니다.' }, 413);
    let raw;
    try { raw = JSON.parse(body); } catch { return json({ error: '요청 형식을 확인해주세요.' }, 400); }
    const input = sanitizeInput(raw);
    return json(await buildRagReply(input, config));
  } catch (error) {
    if (error instanceof ChatError) return json({ error: error.message }, error.status);
    if (['TimeoutError', 'AbortError'].includes(error.name)) {
      return json({ error: '답변 준비에 시간이 걸리고 있습니다. 잠시 후 다시 시도해주세요.' }, 504);
    }
    console.error('mentor_request_failed', error.name);
    return json({ error: '답변을 가져오지 못했습니다. 다시 시도해주세요.' }, 502);
  }
}
