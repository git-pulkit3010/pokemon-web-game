# Pokemon: Kanto Mini Quest

A retro Game Boy Advance pixel-art Pokemon mini web game built with HTML5 Canvas, CSS variables, a zero-dependency Web Audio API 8-bit chiptune synthesizer, and a lightweight zero-dependency Node.js backend ready for local dev, **Vercel**, and **GitHub Pages**.

## Project Structure

- `index.html` - Main entry point with GBA console frame, Trainer HUD, and Cloud Save / Hall of Fame panel
- `styles.css` - Responsive GBA console frame, Trainer HUD, light/dark theme variables, and print rules
- `game.js` - Complete game engine: 8-bit audio synth, 16x16 pixel-art sprite matrices, overworld maps, turn-based battle system, capture mechanics, evolutions, and `localStorage` auto-save
- `api-client.js` - Frontend API client that auto-detects `/api/health` (online on local server / Vercel; graceful static-mode fallback on GitHub Pages)
- `server.js` - Zero-dependency local Node.js HTTP server serving the frontend + `/api/*` endpoints
- `api/` - Vercel Serverless Functions (`health.js`, `save.js`, `leaderboard.js`) sharing `lib/store.js`
- `lib/store.js` - Shared persistence layer (`.data/db.json` locally, `/tmp` on Vercel by default, or permanent Upstash/Vercel KV when env vars are set)
- `vercel.json` - Vercel routing & CORS header configuration
- `.github/workflows/deploy-pages.yml` - Automated GitHub Pages static deployment workflow
- `standalone/Pokemon Mini Adventure.html` - Single-file portable bundle with inline CSS and JavaScript

## Run Locally (Zero `npm install` Needed)

Requires **Node.js 18+**:

```bash
npm start
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000).

- Use `npm run dev` for auto-reload (`node --watch server.js`).
- Local cloud saves and leaderboard entries are stored in `.data/db.json` (gitignored).

### API Endpoints

- `GET /api/health` - Runtime status (`mode`, `storage`, `persistent`)
- `GET /api/save?trainerId=<id>` - Load a trainer's cloud save
- `POST /api/save` - Save `{ trainerId, trainerName, saveData }`
- `DELETE /api/save?trainerId=<id>` - Delete a trainer's cloud save
- `GET /api/leaderboard` - Fetch top 20 Hall of Fame trainers
- `POST /api/leaderboard` - Submit/update a trainer's run

## Deploy to Vercel (Frontend + Live Backend)

1. Import this GitHub repository at [vercel.com/new](https://vercel.com/new).
2. Leave **Framework Preset** as `Other` and **Build Command** empty.
3. Click **Deploy** — Vercel automatically serves the static app and deploys `/api/health`, `/api/save`, and `/api/leaderboard` as Serverless Functions.
4. *(Optional, for permanent cloud saves across cold starts)* Connect Upstash Redis / Vercel KV and add `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) in your Vercel project Environment Variables.

## Deploy to GitHub Pages (Static Frontend)

1. In your GitHub repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Push to `main` (or manually trigger **Deploy to GitHub Pages** in the **Actions** tab).
4. GitHub Pages only hosts static files, so the app automatically switches to **Static Mode** (`localStorage` saves + local Hall of Fame).
5. *(Optional)* To connect your GitHub Pages frontend to your Vercel backend, open your Pages URL with `?api=https://your-app.vercel.app`.

## How to Play

1. Choose your starter (`Bulbasaur`, `Charmander`, `Squirtle`, or `Pikachu`).
2. Move and navigate menus with `WASD` or `Arrow Keys` (or click/tap the on-screen GBA D-Pad).
3. Press `Z`, `Enter`, or `Space` (`A` button) to confirm, talk to NPCs, or read signs.
4. Press `X` or `Esc` (`B` button) to cancel/go back, and `M` (`START` button) to open the pause menu.
