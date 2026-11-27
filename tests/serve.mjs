import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve('dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

createServer(async (request, response) => {
  const pathname = decodeURIComponent(
    new URL(request.url, 'http://localhost').pathname,
  );
  const file = resolve(
    root,
    `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`,
  );
  if (!file.startsWith(`${root}/`)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, {
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
    });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(4381, '127.0.0.1');
