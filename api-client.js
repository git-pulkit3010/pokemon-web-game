(function () {
  'use strict';

  const SAVE_KEY = 'kanto_mini_quest_save_v1';
  const TRAINER_ID_KEY = 'kanto_mini_quest_trainer_id';
  const LOCAL_BOARD_KEY = 'kanto_mini_quest_local_leaderboard_v1';

  const statusPill = document.getElementById('apiStatusPill');
  const trainerIdInput = document.getElementById('trainerIdInput');
  const cloudSaveBtn = document.getElementById('cloudSaveBtn');
  const cloudLoadBtn = document.getElementById('cloudLoadBtn');
  const submitScoreBtn = document.getElementById('submitScoreBtn');
  const cloudFeedback = document.getElementById('cloudFeedback');
  const leaderboardList = document.getElementById('leaderboardList');

  if (!statusPill || !trainerIdInput || !leaderboardList) return;

  function resolveApiBase() {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get('api');
      if (fromQuery && /^https?:\/\//i.test(fromQuery)) {
        return fromQuery.replace(/\/+$/, '');
      }
    } catch (_) {}
    if (typeof window.POKEMON_API_BASE === 'string' && window.POKEMON_API_BASE.trim()) {
      return window.POKEMON_API_BASE.trim().replace(/\/+$/, '');
    }
    return '';
  }

  const API_BASE = resolveApiBase();
  let backendOnline = false;
  let runtimeStorage = 'local-browser';

  function apiUrl(pathname) {
    return API_BASE ? `${API_BASE}${pathname}` : pathname;
  }

  function setFeedback(message, isError) {
    if (!cloudFeedback) return;
    cloudFeedback.textContent = message;
    cloudFeedback.classList.toggle('is-error', Boolean(isError));
  }

  function setApiStatus(online, label) {
    backendOnline = online;
    statusPill.textContent = label;
    statusPill.classList.toggle('online', online);
    statusPill.classList.toggle('static-mode', !online);
    if (cloudSaveBtn) cloudSaveBtn.disabled = !online;
    if (cloudLoadBtn) cloudLoadBtn.disabled = !online;
  }

  function getTrainerId() {
    const raw = (trainerIdInput.value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (raw) {
      try { localStorage.setItem(TRAINER_ID_KEY, raw); } catch (_) {}
    }
    return raw;
  }

  function readLocalSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.party) || parsed.party.length === 0) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function summarizeSave(saveData) {
    const caughtCount = saveData.caught && typeof saveData.caught === 'object'
      ? Object.keys(saveData.caught).length
      : 0;
    const highestLevel = saveData.party.reduce((max, p) => Math.max(max, Number(p && p.level) || 1), 1);
    const leadPokemon = (saveData.party[0] && (saveData.party[0].name || saveData.party[0].species)) || 'Starter';
    return {
      caughtCount,
      highestLevel,
      leadPokemon,
      money: Number(saveData.money) || 0,
      hasBoulderBadge: Boolean(saveData.flags && saveData.flags.boulderBadge)
    };
  }

  function renderLeaderboard(entries) {
    leaderboardList.innerHTML = '';
    if (!Array.isArray(entries) || entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-hint';
      empty.textContent = backendOnline
        ? 'No trainers ranked yet. Submit your run to claim #1!'
        : 'Static mode: submit your run to track local browser records.';
      leaderboardList.appendChild(empty);
      return;
    }

    entries.slice(0, 8).forEach((entry, idx) => {
      const row = document.createElement('div');
      row.className = 'lb-row';

      const rank = document.createElement('span');
      rank.className = 'lb-rank';
      rank.textContent = `#${idx + 1}`;

      const info = document.createElement('div');
      info.className = 'lb-info';

      const name = document.createElement('span');
      name.className = 'lb-name';
      name.textContent = `${entry.trainerName || entry.trainerId}${entry.hasBoulderBadge ? ' ★' : ''}`;

      const sub = document.createElement('span');
      sub.className = 'lb-sub';
      sub.textContent = `${entry.leadPokemon || 'Starter'} · Lv.${entry.highestLevel || 1} · $${entry.money || 0}`;

      info.appendChild(name);
      info.appendChild(sub);

      const score = document.createElement('span');
      score.className = 'lb-dex';
      score.textContent = `${entry.caughtCount || 0}/16`;

      row.appendChild(rank);
      row.appendChild(info);
      row.appendChild(score);
      leaderboardList.appendChild(row);
    });
  }

  function loadLocalLeaderboard() {
    try {
      const raw = localStorage.getItem(LOCAL_BOARD_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveLocalLeaderboard(entries) {
    try {
      localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(entries.slice(0, 20)));
    } catch (_) {}
  }

  async function refreshLeaderboard() {
    if (!backendOnline) {
      renderLeaderboard(loadLocalLeaderboard());
      return;
    }
    try {
      const res = await fetch(apiUrl('/api/leaderboard'), { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const data = await res.json();
      renderLeaderboard(data.entries || []);
    } catch (_) {
      renderLeaderboard(loadLocalLeaderboard());
    }
  }

  async function checkHealth() {
    if (window.location.protocol === 'file:' && !API_BASE) {
      setApiStatus(false, 'STATIC MODE');
      setFeedback('Opened as a local file. Run "npm start" for Cloud Save & live API.', false);
      renderLeaderboard(loadLocalLeaderboard());
      return;
    }
    try {
      const res = await fetch(apiUrl('/api/health'), { cache: 'no-store' });
      if (!res.ok) throw new Error('Health check returned non-200');
      const data = await res.json();
      if (!data || !data.ok) throw new Error('Invalid health response');
      runtimeStorage = data.storage || 'api';
      const modeTag = data.mode === 'vercel' ? 'API: VERCEL' : 'API: ONLINE';
      setApiStatus(true, modeTag);
      setFeedback(`Connected (${runtimeStorage}). Cloud Save & Hall of Fame active.`, false);
      await refreshLeaderboard();
    } catch (_) {
      setApiStatus(false, 'STATIC MODE');
      setFeedback('Static host detected (e.g. GitHub Pages). Using browser localStorage.', false);
      renderLeaderboard(loadLocalLeaderboard());
    }
  }

  if (cloudSaveBtn) {
    cloudSaveBtn.addEventListener('click', async () => {
      if (!backendOnline) {
        setFeedback('Cloud Save requires the local server or Vercel deployment.', true);
        return;
      }
      const trainerId = getTrainerId();
      if (trainerId.length < 2) {
        setFeedback('Enter a Trainer ID (2+ letters/numbers) first.', true);
        trainerIdInput.focus();
        return;
      }
      const saveData = readLocalSave();
      if (!saveData) {
        setFeedback('Pick a starter Pokemon on the GBA screen before saving.', true);
        return;
      }
      setFeedback('Uploading save...', false);
      try {
        const res = await fetch(apiUrl('/api/save'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trainerId,
            trainerName: trainerIdInput.value.trim(),
            saveData
          })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Could not save to cloud.');
        }
        setFeedback(`Saved "${trainerId}" to cloud (${data.summary.caughtCount}/16 caught).`, false);
      } catch (err) {
        setFeedback(err.message || 'Cloud save failed.', true);
      }
    });
  }

  if (cloudLoadBtn) {
    cloudLoadBtn.addEventListener('click', async () => {
      if (!backendOnline) {
        setFeedback('Cloud Load requires the local server or Vercel deployment.', true);
        return;
      }
      const trainerId = getTrainerId();
      if (trainerId.length < 2) {
        setFeedback('Enter a Trainer ID (2+ letters/numbers) to load.', true);
        trainerIdInput.focus();
        return;
      }
      setFeedback('Loading save...', false);
      try {
        const res = await fetch(apiUrl(`/api/save?trainerId=${encodeURIComponent(trainerId)}`), {
          cache: 'no-store'
        });
        const data = await res.json();
        if (!res.ok || !data.ok || !data.saveData) {
          throw new Error(data.error || 'No cloud save found.');
        }
        localStorage.setItem(SAVE_KEY, JSON.stringify(data.saveData));
        setFeedback(`Loaded "${trainerId}"! Reloading game...`, false);
        setTimeout(() => window.location.reload(), 300);
      } catch (err) {
        setFeedback(err.message || 'Cloud load failed.', true);
      }
    });
  }

  if (submitScoreBtn) {
    submitScoreBtn.addEventListener('click', async () => {
      const trainerId = getTrainerId();
      if (trainerId.length < 2) {
        setFeedback('Enter a Trainer ID (2+ letters/numbers) first.', true);
        trainerIdInput.focus();
        return;
      }
      const saveData = readLocalSave();
      if (!saveData) {
        setFeedback('Pick a starter Pokemon first before submitting.', true);
        return;
      }
      const summary = summarizeSave(saveData);
      const payload = {
        trainerId,
        trainerName: trainerIdInput.value.trim() || trainerId.toUpperCase(),
        ...summary
      };

      if (!backendOnline) {
        const board = loadLocalLeaderboard().filter((item) => item.trainerId !== trainerId);
        board.push({ ...payload, updatedAt: new Date().toISOString() });
        board.sort((a, b) =>
          (Number(Boolean(b.hasBoulderBadge)) - Number(Boolean(a.hasBoulderBadge))) ||
          ((b.caughtCount || 0) - (a.caughtCount || 0)) ||
          ((b.highestLevel || 0) - (a.highestLevel || 0))
        );
        saveLocalLeaderboard(board);
        renderLeaderboard(board);
        setFeedback(`Recorded "${payload.trainerName}" in local Hall of Fame.`, false);
        return;
      }

      setFeedback('Submitting to Hall of Fame...', false);
      try {
        const res = await fetch(apiUrl('/api/leaderboard'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Submission failed.');
        }
        renderLeaderboard(data.entries || []);
        setFeedback(`Submitted "${payload.trainerName}" to Hall of Fame!`, false);
      } catch (err) {
        setFeedback(err.message || 'Hall of Fame submission failed.', true);
      }
    });
  }

  try {
    const savedId = localStorage.getItem(TRAINER_ID_KEY);
    if (savedId) trainerIdInput.value = savedId;
  } catch (_) {}

  checkHealth();
})();
