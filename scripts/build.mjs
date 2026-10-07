import { mkdir, rm, cp, readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
if (!html.startsWith('<!doctype html>') || !html.includes('/api/chat')) {
  throw new Error('배포용 HTML과 채팅 연결 코드를 확인해주세요.');
}
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await cp(new URL('../public/', import.meta.url), new URL('../dist/', import.meta.url), { recursive: true });
console.log('배포 파일을 dist 폴더에 준비했습니다. 서버 함수는 api 폴더에서 Vercel이 처리합니다.');
