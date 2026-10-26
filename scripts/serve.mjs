import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createSteamClient } from './steam.mjs';

if (Number(process.versions.node.split('.')[0]) < 20) {
  console.error('Score Duel requires Node.js 20 or newer. Download: https://nodejs.org/');
  process.exit(1);
}

const localUrl = 'http://127.0.0.1:4173';
const shouldOpen = process.argv.includes('--open');
function openBrowser() {
  if (!shouldOpen) return;
  const command = process.platform === 'win32' ? 'rundll32.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', localUrl] : [localUrl];
  const child = spawn(command, args, { windowsHide: true, stdio: 'ignore' });
  child.on('error', () => console.log(`Open this address in your browser: ${localUrl}`));
  child.unref();
}

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const steam = createSteamClient({ cachePath: fileURLToPath(new URL('../.cache/steam.json', import.meta.url)), snapshotPath: path.join(root, 'data/games.json') });
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/api/health') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ app: 'score-duel', version: 2 }));
      return;
    }
    if (url.pathname === '/api/games') {
      try {
        const data = await steam.batch();
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify(data));
      } catch {
        response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: 'unavailable' }));
      }
      return;
    }
    const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    const relative = path.relative(root, filename);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const file = await readFile(filename);
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(file);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});
server.on('error', async error => {
  if (error.code === 'EADDRINUSE') {
    try {
      const response = await fetch(`${localUrl}/api/health`, { signal: AbortSignal.timeout(1500) });
      const health = response.ok ? await response.json() : null;
      if (health?.app === 'score-duel' && health.version === 2) {
        console.log(`Score Duel is already running: ${localUrl}\nKeep the original server window open.`);
        openBrowser();
        return;
      }
      if (health?.app === 'score-duel') {
        console.error('An older Score Duel server is running. Stop it with Ctrl+C, then start again.');
        process.exitCode = 1;
        return;
      }
    } catch { /* Another application may be using the port. Do not stop it. */ }
    console.error('Port 4173 is being used by another application. Close that application or free the port, then try again.');
  } else console.error(`Server could not start: ${error.message}`);
  process.exitCode = 1;
});
server.listen(4173, '127.0.0.1', () => {
  console.log(`Score Duel: ${localUrl}\nKeep this window open while playing. Press Ctrl+C to stop.`);
  openBrowser();
});
