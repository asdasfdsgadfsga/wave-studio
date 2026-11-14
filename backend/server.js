// Node 24+; run npm ci at the repository root, then npm start.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function start() {
  const root = path.resolve(__dirname, '..');
  for (const relative of ['.dev.vars', 'server/.env']) {
    const vars = path.join(root, relative);
    if (fs.existsSync(vars)) process.loadEnvFile(vars);
  }
  if ((process.env.BOOKING_ADMIN_PASSWORD || '').length < 16) {
    throw new Error('Set BOOKING_ADMIN_PASSWORD (16+ characters) in .dev.vars. See docs/booking-backend.md.');
  }
  const { app } = await import(pathToFileURL(path.join(root, 'lib/api/app.mjs')));
  const { openBookingDatabase } = await import(pathToFileURL(path.join(root, 'lib/booking/sqlite.mjs')));
  const local = path.join(root, '.local');
  fs.mkdirSync(local, { recursive: true });
  const env = { ...process.env, BOOKING_DB: openBookingDatabase(path.join(local, 'booking.sqlite')) };
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
      if (url.pathname.startsWith('/api/')) {
        const chunks = []; let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          const limit = url.pathname === '/api/chat' ? 65536 : 8192;
          if (size > limit) { res.writeHead(413, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ error: 'Слишком большой запрос.' })); return; }
          chunks.push(chunk);
        }
        const headers = new Headers(req.headers);
        headers.set('CF-Connecting-IP', req.socket.remoteAddress || 'local');
        const request = new Request(url, { method: req.method, headers,
          ...(!['GET', 'HEAD'].includes(req.method) ? { body: Buffer.concat(chunks) } : {}) });
        const response = await app.fetch(request, env);
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
      const parts = decodeURIComponent(url.pathname).split('/').filter(Boolean);
      const privateRoots = ['backend', 'server', 'lib', 'migrations', 'tests', 'docs', 'tools', 'functions', 'node_modules', 'archive', '!ДОКИ'];
      if (parts.some(p => p.startsWith('.') || p.includes('\\') || p.includes(':')) || privateRoots.includes(parts[0]?.toLowerCase()) || /\.env(?:\.|$)/i.test(parts.at(-1) || '')) {
        res.writeHead(404); res.end(); return;
      }
      const file = path.resolve(root, ...parts, ...(url.pathname.endsWith('/') ? ['index.html'] : []));
      if (!file.startsWith(root + path.sep)) { res.writeHead(404); res.end(); return; }
      const stat = await fs.promises.stat(file);
      if (!stat.isFile()) { res.writeHead(404); res.end(); return; }
      let start = 0, end = stat.size - 1, status = 200;
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
      if (range) {
        start = Number(range[1]); end = range[2] ? Math.min(Number(range[2]), end) : end;
        if (start > end || start >= stat.size) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); res.end(); return; }
        status = 206;
      }
      res.writeHead(status, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache',
        ...(status === 206 ? { 'Content-Range': `bytes ${start}-${end}/${stat.size}` } : {}) });
      if (req.method === 'HEAD') res.end(); else fs.createReadStream(file, { start, end }).pipe(res);
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end('Unable to serve request');
    }
  });
  server.on('error', error => { console.error('Local booking server:', error.code); process.exitCode = 1; });
  server.listen(Number(process.env.BOOKING_PORT || 3000), '127.0.0.1', () => console.log('WaveMusic · Hono: http://127.0.0.1:' + (process.env.BOOKING_PORT || 3000)));
}
start().catch(error => { console.error(error.message); process.exitCode = 1; });
