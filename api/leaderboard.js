'use strict';

const {
  getLeaderboard,
  submitLeaderboard,
  applyCors,
  sendJson,
  readJsonBody
} = require('../lib/store');

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const result = await getLeaderboard();
      sendJson(res, 200, { ok: true, ...result.data });
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = await submitLeaderboard(body || {});
      if (result.error) {
        sendJson(res, result.status, { ok: false, error: result.error });
        return;
      }
      sendJson(res, 200, { ok: true, ...result.data });
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err && err.message ? err.message : 'Bad request' });
  }
};
