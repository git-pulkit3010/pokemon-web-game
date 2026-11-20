'use strict';

const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const healthHandler = require('./api/health');
const saveHandler = require('./api/save');
const leaderboardHandler = require('./api/leaderboard');
const { sendJson } = require('./lib/store');

const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const BLOCKED_PREFIXES = ['/api/', '/lib/', '/.data/', '/.git/', '/.github/', '/node_modules/'];
const BLOCKED_FILES = new Set(['/server.js', '/package.json', '/package-lock.json', '/vercel.json', '/.gitignore']);

async function serveStatic(req, res, pathname) {
  const decoded = decodeURIComponent(pathname);
  const normalized = path.posix.normalize(decoded);

  if (
    normalized.includes('..') ||
    BLOCKED_FILES.has(normalized) ||
    BLOCKED_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  ) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Not Found');
    return;
  }

  const relPath = normalized === '/' ? 'index.html' : normalized.replace(/^\/+/, '');
  const fullPath = path.resolve(ROOT_DIR, relPath);

  if (!fullPath.startsWith(ROOT_DIR + path.sep) && fullPath !== ROOT_DIR) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    const content = await fs.readFile(fullPath);
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(content);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Not Found');
      return;
    }
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Internal Server Error');
  }
}

function createServer() {
  return http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    if (pathname === '/api/health') return healthHandler(req, res);
    if (pathname === '/api/save') return saveHandler(req, res);
    if (pathname === '/api/leaderboard') return leaderboardHandler(req, res);

    if (pathname.startsWith('/api/')) {
      sendJson(res, 404, { ok: false, error: `Unknown API route: ${pathname}` });
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.end('Method Not Allowed');
      return;
    }

    return serveStatic(req, res, pathname);
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`Pokemon: Kanto Mini Quest server running at http://${HOST}:${PORT}`);
  });
}

module.exports = { createServer };
