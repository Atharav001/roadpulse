# RoadPulse — Deploy for demo (Vercel + hosted API)

Vercel hosts the **frontend only**. The Express + PostgreSQL backend needs a separate host.

## 1. Database (required)

Pick one free Postgres:

| Option | Notes |
|--------|--------|
| **Neon** (recommended) | Free tier, serverless Postgres — [neon.tech](https://neon.tech) |
| **Supabase** | Free Postgres + dashboard — [supabase.com](https://supabase.com) |
| **Railway Postgres** | Easy if you also host the API there |

Copy the connection string into `DATABASE_URL`.

On the backend host, run once:

```bash
npm run migrate
npm run seed
```

Demo users after seed:

- Citizen: `citizen@roadpulse.local` / `password123`
- Authority: `authority@roadpulse.local` / `password123`

## 2. Backend API (required)

Deploy `backend/` to **Railway**, **Render**, or **Fly.io**.

Set env vars (see checklist below). Expose HTTPS URL, e.g. `https://roadpulse-api.onrender.com`.

Photos are stored under `/uploads` on disk — fine for demo; for production use Cloudinary/S3.

## 3. Frontend on Vercel

1. Import this repo in Vercel
2. **Root Directory:** `frontend`
3. Framework: Vite
4. Env:
   - `VITE_API_URL` = your backend HTTPS URL (no trailing slash)
   - `VITE_GOOGLE_CLIENT_ID` = same Web Client ID as backend `GOOGLE_CLIENT_ID`

Redeploy after changing env vars.

## 4. Google Sign-In

1. Google Cloud Console → APIs & Services → Credentials → **OAuth 2.0 Client ID** → Web
2. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://YOUR-APP.vercel.app`
3. Set `VITE_GOOGLE_CLIENT_ID` (frontend) and `GOOGLE_CLIENT_ID` (backend) to that Client ID

## Env checklist

### Backend

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Postgres |
| `PORT` | Host sets | Often auto |
| `JWT_SECRET` | Yes | Random secret |
| `JWT_EXPIRATION` | No | Default `7d` |
| `CORS_ORIGINS` | Yes prod | `https://YOUR-APP.vercel.app` |
| `CORS_ALLOW_VERCEL` | Optional | `true` to allow all `*.vercel.app` |
| `GOOGLE_CLIENT_ID` | For Google login | Same as VITE_ |
| `VISION_MODEL_API_KEY` | For AI classify | Gemini / OpenAI |
| `VISION_MODEL_PROVIDER` | No | `gemini` (default) |
| `GOOGLE_PLACES_API_KEY` | Nice for demo | Landmarks |
| `CLUSTERING_DISTANCE_THRESHOLD` | No | `15` |
| `DEMO_MODE` | No | `true` for graceful fallbacks |

### Frontend (Vercel)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_API_URL` | Yes on Vercel | Backend base URL |
| `VITE_GOOGLE_CLIENT_ID` | For Google login | GIS client ID |

## Local run (before YouTube)

```bash
# Terminal 1
cd backend && npm run migrate && npm run seed && npm run dev   # :5001

# Terminal 2
cd frontend && npm run dev   # :3000, proxies /api → :5001
```

Quick demo buttons on Sign in log you in with one click (Citizen / Authority).

## API keys — what to add now

See the “APIs & models” section in the chat reply / `docs/API_KEYS.md`.
