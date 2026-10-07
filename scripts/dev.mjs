import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POST } from '../api/chat.mjs';
import { GET } from '../api/config.mjs';

const publicRoot = resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
const port = Number(process.env.PORT || 3000);
const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost:' + port);
  try {
    if (url.pathname === '/api/config' || url.pathname === '/api/chat') {
      let response;
      if (url.pathname === '/api/config' && req.method === 'GET') response = GET();
      else if (url.pathname === '/api/chat' && req.method === 'POST') {
        const chunks = [];
        let length = 0;
        for await (const chunk of req) {
          length += chunk.length;
          if (length > 48000) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '요청이 너무 큽니다.' }));
            return;
          }
          chunks.push(chunk);
        }
        response = await POST(new Request(url, {
          method: 'POST', headers: req.headers, body: Buffer.concat(chunks)
        }));
      } else response = new Response('Method not allowed', { status: 405 });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filename = resolve(publicRoot, '.' + pathname);
    if (!filename.startsWith(publicRoot + sep)) { res.writeHead(403); res.end(); return; }
    const content = await readFile(filename);
    res.writeHead(200, { 'Content-Type': types[extname(filename)] || 'application/octet-stream' });
    res.end(content);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500);
    res.end('요청한 파일을 찾지 못했습니다.');
  }
});
server.listen(port, '127.0.0.1', () => console.log('http://localhost:' + port + ' 에서 MVP를 확인할 수 있습니다.'));
