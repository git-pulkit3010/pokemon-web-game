'use strict';

const { getRuntimeInfo, applyCors, sendJson } = require('../lib/store');

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }
  const info = getRuntimeInfo();
  sendJson(res, 200, {
    ok: true,
    service: 'kanto-mini-quest-api',
    mode: info.mode,
    storage: info.storage,
    persistent: info.persistent,
    timestamp: new Date().toISOString()
  });
};
