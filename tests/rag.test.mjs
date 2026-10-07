import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../api/config.mjs';
import { POST } from '../api/chat.mjs';
import { sanitizeInput, buildRagReply, ChatError } from '../lib/rag.mjs';

const config = { apiKey: 'test-api-key', vectorStoreId: 'vs_test123', model: 'gpt-4.1-mini', accessCode: 'test-access-code-only', ready: true };
const payload = {
  question: '첫 고객을 확보하려면 어떤 행동이 필요합니까?',
  profile: { name: '테스트', business: '직장인 식단 서비스', customer: '30대 직장인', stage: 'validation', hours: 5 },
  metrics: [{ id: 1, name: '유료 체험고객', current: 1, target: 3, unit: '명' }],
  tasks: [{ title: '고객 인터뷰', done: true, note: '가격을 확인하고 싶다는 반응입니다.' }],
  history: [{ role: 'user', text: '인터뷰는 진행했습니다.' }]
};
const search = { data: [{
  file_id: 'file_test', filename: 'interview.md', score: 0.8,
  attributes: { title: '테스트 인터뷰', source_url: 'https://example.com/interview?t=30', speaker: '테스트 발언자', timestamp: '00:30' },
  content: [{ type: 'text', text: '이것은 검증용 가상 자료입니다. 고객의 실제 선택을 확인했습니다.' }]
}] };
const generated = {
  text: '검증용 답변입니다. 고객에게 체험 조건을 제안합니다. [S1]',
  source_ids: ['S1'],
  task: { title: '체험 조건을 고객 3명에게 제안하기', why: '실제 선택을 확인합니다.', output: '제안과 응답 3건입니다.', duration: 60, metricId: 1 }
};
function responses(value) {
  return { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] };
}
function mockApi(result = generated, source = search) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
    return Response.json(url.endsWith('/search') ? source : responses(result));
  };
  return { fetcher, calls };
}

test('설정 조회는 준비 상태만 반환하고 서버 비밀값을 노출하지 않습니다.', async () => {
  const body = await GET().json();
  assert.deepEqual(Object.keys(body), ['ragReady']);
  assert.equal(typeof body.ragReady, 'boolean');
});

test('설정 또는 접근코드가 없으면 유료 API 호출 없이 거절합니다.', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('호출되면 안 됩니다.'); };
  try {
    delete process.env.OPENAI_API_KEY;
    const request = () => new Request('http://localhost/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    assert.equal((await POST(request())).status, 503);
    Object.assign(process.env, { OPENAI_API_KEY: config.apiKey, OPENAI_VECTOR_STORE_ID: config.vectorStoreId, DEMO_ACCESS_CODE: config.accessCode });
    assert.equal((await POST(request())).status, 401);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }
});

test('질문 길이와 허용된 사업 데이터만 서버 입력으로 받습니다.', () => {
  assert.throws(() => sanitizeInput({ question: 'x'.repeat(1001) }), ChatError);
  const input = sanitizeInput({ ...payload, apiKey: 'client-secret', model: 'client-model' });
  assert.equal(input.apiKey, undefined);
  assert.equal(input.model, undefined);
  assert.equal(input.metrics[0].current, 1);
});

test('검색된 근거와 대표님의 실행 기록을 답변에 전달하고 근거 링크를 반환합니다.', async () => {
  const mock = mockApi();
  const result = await buildRagReply(sanitizeInput(payload), config, mock.fetcher);
  assert.equal(mock.calls.length, 2);
  assert.match(mock.calls[0].url, /\/vector_stores\/vs_test123\/search$/);
  const supplied = JSON.parse(mock.calls[1].body.input[0].content);
  assert.equal(supplied.tasks[0].note, payload.tasks[0].note);
  assert.match(supplied.references[0].excerpt, /가상 자료/);
  assert.equal(mock.calls[1].body.store, false);
  assert.equal(result.sources[0].url, 'https://example.com/interview?t=30');
  assert.equal(result.task.metricId, 1);
  assert.equal(payload.metrics[0].current, 1);
});

test('검색에 없는 출처, 위험한 링크, 존재하지 않는 지표 연결을 제거합니다.', async () => {
  const unsafeSearch = structuredClone(search);
  unsafeSearch.data[0].attributes.source_url = 'javascript:alert(1)';
  const mock = mockApi({ ...generated, text: '근거 [S1] [S99]', source_ids: ['S1', 'S99'], task: { ...generated.task, metricId: 999 } }, unsafeSearch);
  const result = await buildRagReply(sanitizeInput(payload), config, mock.fetcher);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].url, '');
  assert.doesNotMatch(result.text, /S99/);
  assert.equal(result.task, null);
});

test('검색 결과가 없으면 자료 기반 답변으로 표시하지 않습니다.', async () => {
  const mock = mockApi({ text: '관련 자료가 없어 일반적인 검증 방향을 안내합니다.', source_ids: ['S9'], task: null }, { data: [] });
  const result = await buildRagReply(sanitizeInput(payload), config, mock.fetcher);
  assert.equal(result.grounded, false);
  assert.deepEqual(result.sources, []);
});
