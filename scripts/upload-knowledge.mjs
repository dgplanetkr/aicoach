import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { resolve, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';

const apiKey = (process.env.OPENAI_API_KEY || '').trim();
const args = process.argv.slice(2);
if (!args.length) {
  console.error('사용법: npm run knowledge:upload -- knowledge\nknowledge 폴더에 검토를 마친 .md 또는 .txt 자료를 넣습니다.');
  process.exit(1);
}
if (!apiKey) {
  console.error('.env.local의 OPENAI_API_KEY를 먼저 입력해주세요.');
  process.exit(1);
}

async function call(path, body, method = 'POST') {
  const multipart = body instanceof FormData;
  const response = await fetch('https://api.openai.com/v1' + path, {
    method, signal: AbortSignal.timeout(60000),
    headers: { Authorization: 'Bearer ' + apiKey, ...(multipart || body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) })
  });
  if (!response.ok) {
    throw new Error('OpenAI 요청 실패 (' + response.status + '). API 키, 결제 설정, 저장소 ID를 확인해주세요.');
  }
  return response.json();
}

async function inputs(paths) {
  const result = [];
  for (const argument of paths) {
    const path = resolve(argument);
    const info = await stat(path);
    if (info.isDirectory()) {
      for (const entry of await readdir(path, { withFileTypes: true })) {
        if (entry.isFile() && /\.(md|txt)$/i.test(entry.name)) result.push(resolve(path, entry.name));
      }
    } else if (/\.(md|txt)$/i.test(path)) result.push(path);
  }
  return [...new Set(result)].sort();
}

function metadata(text, path) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fields = Object.create(null);
  for (const line of (match?.[1] || '').split(/\r?\n/)) {
    const pair = line.match(/^([a-z_]+):\s*(.*)$/);
    if (pair) fields[pair[1]] = pair[2].trim();
  }
  if (fields.permission !== 'confirmed') {
    throw new Error(basename(path) + ': 이용 범위를 확인한 뒤 permission: confirmed로 표시해주세요.');
  }
  if (!fields.title || /\[.*\]/.test(fields.title) || text.includes('[내용을 작성]')) {
    throw new Error(basename(path) + ': 템플릿에 실제 자료를 작성해주세요.');
  }
  if (text.replace(match?.[0] || '', '').trim().length < 40) {
    throw new Error(basename(path) + ': 본문이 너무 짧습니다.');
  }
  const attributes = { title: fields.title };
  for (const key of ['source_url', 'speaker', 'timestamp', 'record_type', 'stage', 'industry', 'published_date', 'permission']) {
    if (fields[key]) attributes[key] = fields[key].slice(0, 512);
  }
  attributes.title = attributes.title.slice(0, 512);
  return attributes;
}

try {
  const paths = await inputs(args);
  if (!paths.length) throw new Error('업로드할 .md 또는 .txt 자료가 없습니다.');
  // 원격 업로드를 시작하기 전에 모든 자료의 입력 상태를 확인합니다.
  const files = [];
  for (const path of paths) {
    const bytes = await readFile(path);
    if (bytes.length > 5 * 1024 * 1024) throw new Error(basename(path) + ': 이 스크립트는 파일당 5MB까지 지원합니다.');
    files.push({ path, bytes, attributes: metadata(bytes.toString('utf8'), path),
      hash: createHash('sha256').update(bytes).digest('hex') });
  }
  const manifestPath = resolve('knowledge-upload-manifest.json');
  let manifest = [];
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { /* 첫 업로드입니다. */ }
  if (!Array.isArray(manifest)) manifest = [];
  let storeId = (process.env.OPENAI_VECTOR_STORE_ID || '').trim();
  if (!storeId) {
    const created = await call('/vector_stores', { name: '랜선창업선배 지식' });
    storeId = created.id;
    console.log('새 지식 저장소를 만들었습니다. 아래 ID를 .env.local과 Vercel에 저장합니다.');
    console.log('OPENAI_VECTOR_STORE_ID=' + storeId);
  }
  if (!/^vs_[a-zA-Z0-9]+$/.test(storeId)) throw new Error('지식 저장소 ID 형식을 확인해주세요.');
  for (const file of files) {
    const previous = manifest.find(x => x.hash === file.hash && x.storeId === storeId && x.status === 'completed');
    if (previous) { console.log(basename(file.path) + ': 이미 등록한 동일 자료입니다. 건너뜁니다.'); continue; }
    const form = new FormData();
    form.append('purpose', 'assistants');
    form.append('file', new Blob([file.bytes], { type: extname(file.path) === '.md' ? 'text/markdown' : 'text/plain' }), basename(file.path));
    const uploaded = await call('/files', form);
    let record = await call('/vector_stores/' + storeId + '/files', {
      file_id: uploaded.id, attributes: file.attributes
    });
    const entry = { filename: basename(file.path), hash: file.hash, storeId, fileId: uploaded.id, status: record.status };
    manifest.push(entry);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    const deadline = Date.now() + 180000;
    while (record.status === 'in_progress' && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      record = await call('/vector_stores/' + storeId + '/files/' + uploaded.id, undefined, 'GET');
    }
    entry.status = record.status;
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    if (record.status !== 'completed') {
      throw new Error(basename(file.path) + ': 검색 색인 준비 상태가 ' + record.status + '입니다. 관리 화면에서 처리 상태를 확인해주세요.');
    }
    console.log(basename(file.path) + ': 검색 준비를 완료했습니다.');
  }
  console.log('\nVercel 환경변수 OPENAI_VECTOR_STORE_ID=' + storeId + '를 설정하고 Redeploy합니다.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
