# Daily leaderboard refresh (production)

Nightly full refresh of all linked Valorant players (rank, MMR, player cards).  
**Driver:** GitHub Actions (not Vercel cron).  
**API:** `GET /api/cron/sync-ranks?mode=start|continue`

## Why GitHub Actions

Vercel Hobby limits each function to **60 seconds**. A full refresh takes **~6–10 minutes** for ~45 players (Henrik rate limit).  
Vercel `after()` and self-HTTP continuation are unreliable. GHA loops `mode=continue` until `complete: true`.

## Before first deploy

### 1. Database migration

```bash
npm run db:migrate:deploy
```

Requires migrations through `20250626120000_leaderboard_refresh_run_kind` (adds `kind` on `LeaderboardRefreshRun`).

### 2. Vercel production env

| Variable | Required | Notes |
|----------|----------|--------|
| `CRON_SECRET` | Yes | Long random string; same value in GitHub secrets |
| `VALORANT_CURRENT_ACT` | Yes | e.g. `e11a3` |
| `HENRIKDEV_API_KEY` | Yes | Henrik API key |
| `DATABASE_URL` | Yes | Neon production |
| `UPSTASH_REDIS_REST_URL` | Strongly recommended | Global 26 req/min Henrik cap |
| `UPSTASH_REDIS_REST_TOKEN` | Strongly recommended | Pair with URL |
| `LEADERBOARD_SYNC_NOTIFY` | Optional | `1` for start/finish emails |
| `LEADERBOARD_SYNC_NOTIFY_EMAIL` | Optional | Your ops email |
| `RESEND_API_KEY` + `EMAIL_FROM` | If notify on | Resend |

**Do not** enable `LEADERBOARD_HOURLY_REFRESH_ENABLED` on production unless testing hourly staging.

### 3. GitHub repository secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|--------|--------|
| `SITE_URL` | `https://www.ntgesports.com` (no trailing slash) |
| `CRON_SECRET` | Same as Vercel `CRON_SECRET` |

### 4. Deploy branch to Vercel production

Push `feature/hourly-leaderboard-refresh` (or merge to `main`) and deploy.

`vercel.json` **no longer** schedules `/api/cron/sync-ranks` — only GHA triggers it.

### 5. Enable GitHub Actions schedule

Workflow: `.github/workflows/daily-leaderboard-refresh.yml`  
Default schedule: **12:00 AM IST (midnight)** (`30 18 * * *` UTC).

**Manual test:** Actions → Daily leaderboard refresh → **Run workflow**.

### 6. Verify

1. Workflow run succeeds (~6–10 min).
2. Vercel logs show `[daily-refresh] started` / `complete`.
3. Admin → Rank sync → **Daily refresh runs** shows `COMPLETE`.
4. Superadmin: live cron banner + emails (if notify enabled).
5. Uncheck **Rank changes only** in audit to see all cron rows.

## API behaviour

- `GET /api/cron/sync-ranks?mode=start` — new run, first ~52s segment  
- `GET /api/cron/sync-ranks?mode=continue` — resume from DB cursor  
- Auth: `Authorization: Bearer <CRON_SECRET>`  
- 3 Henrik calls per player (v2 + v3 + card), same as manual refresh  

## Disable

- Pause/delete the GitHub Actions workflow, or  
- Remove `CRON_SECRET` from GitHub secrets (workflow will fail safely)
