'use strict';

const fs = require('fs/promises');
const path = require('path');

const MAX_SAVE_BYTES = 64 * 1024;
const MAX_LEADERBOARD_ENTRIES = 20;
const KV_KEY = 'kanto_mini_quest:db:v1';

const isVercel = Boolean(process.env.VERCEL);
const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

const localDbPath = isVercel
  ? path.join('/tmp', 'kanto-mini-quest-db.json')
  : path.join(process.cwd(), '.data', 'db.json');

function getRuntimeInfo() {
  let storage = 'local-file';
  if (kvUrl && kvToken) {
    storage = 'upstash-kv';
  } else if (isVercel) {
    storage = 'vercel-tmp';
  }
  return {
    mode: isVercel ? 'vercel' : 'local',
    storage,
    persistent: storage !== 'vercel-tmp'
  };
}

function emptyDb() {
  return {
    saves: {},
    leaderboard: []
  };
}

async function readFromKv() {
  const res = await fetch(`${kvUrl.replace(/\/$/, '')}/get/${encodeURIComponent(KV_KEY)}`, {
    headers: { Authorization: `Bearer ${kvToken}` }
  });
  if (!res.ok) {
    throw new Error(`KV read failed with status ${res.status}`);
  }
  const payload = await res.json();
  if (!payload || payload.result == null) return emptyDb();
  const parsed = typeof payload.result === 'string' ? JSON.parse(payload.result) : payload.result;
  return {
    saves: parsed && typeof parsed.saves === 'object' ? parsed.saves : {},
    leaderboard: parsed && Array.isArray(parsed.leaderboard) ? parsed.leaderboard : []
  };
}

async function writeToKv(db) {
  const res = await fetch(`${kvUrl.replace(/\/$/, '')}/set/${encodeURIComponent(KV_KEY)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${kvToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(db)
  });
  if (!res.ok) {
    throw new Error(`KV write failed with status ${res.status}`);
  }
}

async function readFromFile() {
  try {
    const raw = await fs.readFile(localDbPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      saves: parsed && typeof parsed.saves === 'object' ? parsed.saves : {},
      leaderboard: parsed && Array.isArray(parsed.leaderboard) ? parsed.leaderboard : []
    };
  } catch (err) {
    if (err && err.code === 'ENOENT') return emptyDb();
    return emptyDb();
  }
}

async function writeToFile(db) {
  await fs.mkdir(path.dirname(localDbPath), { recursive: true });
  await fs.writeFile(localDbPath, JSON.stringify(db, null, 2), 'utf8');
}

async function readDb() {
  if (kvUrl && kvToken) {
    return readFromKv();
  }
  return readFromFile();
}

async function writeDb(db) {
  if (kvUrl && kvToken) {
    return writeToKv(db);
  }
  return writeToFile(db);
}

function sanitizeTrainerId(raw) {
  if (typeof raw !== 'string') return '';
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (cleaned.length < 2 || cleaned.length > 32) return '';
  return cleaned;
}

function sanitizeTrainerName(raw, fallback) {
  const base = typeof raw === 'string' ? raw.trim() : '';
  const cleaned = base.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 18).trim();
  return cleaned || fallback || 'RED';
}

function validateSaveData(saveData) {
  if (!saveData || typeof saveData !== 'object' || Array.isArray(saveData)) {
    return 'saveData must be a JSON object.';
  }
  if (!Array.isArray(saveData.party) || saveData.party.length === 0) {
    return 'saveData must include a non-empty party array (choose a starter first).';
  }
  const serialized = JSON.stringify(saveData);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_SAVE_BYTES) {
    return 'saveData exceeds the 64KB size limit.';
  }
  return null;
}

async function getSave(rawTrainerId) {
  const trainerId = sanitizeTrainerId(rawTrainerId);
  if (!trainerId) {
    return { error: 'Invalid trainerId. Use 2-32 letters, numbers, "-" or "_".', status: 400 };
  }
  const db = await readDb();
  const record = db.saves[trainerId];
  if (!record) {
    return { error: `No cloud save found for trainer "${trainerId}".`, status: 404 };
  }
  return { status: 200, data: record };
}

async function putSave({ trainerId: rawTrainerId, trainerName: rawName, saveData }) {
  const trainerId = sanitizeTrainerId(rawTrainerId);
  if (!trainerId) {
    return { error: 'Invalid trainerId. Use 2-32 letters, numbers, "-" or "_".', status: 400 };
  }
  const validationError = validateSaveData(saveData);
  if (validationError) {
    return { error: validationError, status: 400 };
  }

  const db = await readDb();
  const trainerName = sanitizeTrainerName(rawName, trainerId.toUpperCase());
  const now = new Date().toISOString();
  const record = {
    trainerId,
    trainerName,
    updatedAt: now,
    summary: {
      caughtCount: saveData.caught && typeof saveData.caught === 'object' ? Object.keys(saveData.caught).length : 0,
      hasBoulderBadge: Boolean(saveData.flags && saveData.flags.boulderBadge),
      highestLevel: saveData.party.reduce((max, p) => Math.max(max, Number(p && p.level) || 1), 1),
      money: Number(saveData.money) || 0,
      leadPokemon: (saveData.party[0] && (saveData.party[0].name || saveData.party[0].species)) || 'Unknown'
    },
    saveData
  };

  db.saves[trainerId] = record;
  await writeDb(db);
  return { status: 200, data: record };
}

async function deleteSave(rawTrainerId) {
  const trainerId = sanitizeTrainerId(rawTrainerId);
  if (!trainerId) {
    return { error: 'Invalid trainerId.', status: 400 };
  }
  const db = await readDb();
  if (!db.saves[trainerId]) {
    return { error: `No cloud save found for trainer "${trainerId}".`, status: 404 };
  }
  delete db.saves[trainerId];
  await writeDb(db);
  return { status: 200, data: { deleted: true, trainerId } };
}

function sortLeaderboard(entries) {
  return entries.sort((a, b) => {
    if (Boolean(b.hasBoulderBadge) !== Boolean(a.hasBoulderBadge)) {
      return Number(Boolean(b.hasBoulderBadge)) - Number(Boolean(a.hasBoulderBadge));
    }
    if ((b.caughtCount || 0) !== (a.caughtCount || 0)) {
      return (b.caughtCount || 0) - (a.caughtCount || 0);
    }
    if ((b.highestLevel || 0) !== (a.highestLevel || 0)) {
      return (b.highestLevel || 0) - (a.highestLevel || 0);
    }
    if ((b.money || 0) !== (a.money || 0)) {
      return (b.money || 0) - (a.money || 0);
    }
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  });
}

async function getLeaderboard() {
  const db = await readDb();
  const entries = sortLeaderboard(db.leaderboard.slice()).slice(0, MAX_LEADERBOARD_ENTRIES);
  return { status: 200, data: { entries } };
}

async function submitLeaderboard(payload) {
  const trainerId = sanitizeTrainerId(payload && payload.trainerId);
  if (!trainerId) {
    return { error: 'Invalid trainerId. Use 2-32 letters, numbers, "-" or "_".', status: 400 };
  }
  const trainerName = sanitizeTrainerName(payload && payload.trainerName, trainerId.toUpperCase());
  const caughtCount = Math.max(0, Math.min(16, Number(payload && payload.caughtCount) || 0));
  const highestLevel = Math.max(1, Math.min(100, Number(payload && payload.highestLevel) || 1));
  const money = Math.max(0, Math.min(999999, Number(payload && payload.money) || 0));
  const hasBoulderBadge = Boolean(payload && payload.hasBoulderBadge);
  const leadPokemon = sanitizeTrainerName(payload && payload.leadPokemon, 'Starter');

  const db = await readDb();
  const now = new Date().toISOString();
  const entry = {
    trainerId,
    trainerName,
    leadPokemon,
    caughtCount,
    highestLevel,
    money,
    hasBoulderBadge,
    updatedAt: now
  };

  const existingIdx = db.leaderboard.findIndex((item) => item.trainerId === trainerId);
  if (existingIdx >= 0) {
    db.leaderboard[existingIdx] = entry;
  } else {
    db.leaderboard.push(entry);
  }
  db.leaderboard = sortLeaderboard(db.leaderboard).slice(0, 100);
  await writeDb(db);

  return {
    status: 200,
    data: {
      entry,
      entries: db.leaderboard.slice(0, MAX_LEADERBOARD_ENTRIES)
    }
  };
}

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, body) {
  applyCors(res);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body);
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw, 'utf8') > MAX_SAVE_BYTES + 4096) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (_) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function getQueryParam(req, name) {
  if (req.query && typeof req.query[name] === 'string') {
    return req.query[name];
  }
  try {
    const parsed = new URL(req.url, 'http://localhost');
    return parsed.searchParams.get(name) || '';
  } catch (_) {
    return '';
  }
}

module.exports = {
  getRuntimeInfo,
  getSave,
  putSave,
  deleteSave,
  getLeaderboard,
  submitLeaderboard,
  applyCors,
  sendJson,
  readJsonBody,
  getQueryParam
};
