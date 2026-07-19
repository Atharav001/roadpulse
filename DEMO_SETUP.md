# RoadPulse — what to do before the demo (step by step)

You already know **Vercel**. Use it for the website. Host the API elsewhere (free). Models: **Plan A (Gemini free)**.

---

## Architecture (remember this)

```
Vercel (frontend React)  →  Railway/Render (Express API)  →  Neon Postgres
```

Vercel alone cannot run this Express + Postgres backend.

---

## Step 1 — Free Postgres (Neon) ~5 min

1. Open: https://neon.tech  
2. Sign up → **Create project** → copy the connection string (`postgresql://...`)  
3. Keep it for Step 2 as `DATABASE_URL`

Alt: https://supabase.com → Project Settings → Database → Connection string (URI)

---

## Step 2 — Deploy backend (Railway — easiest with Vercel experience) ~10 min

1. Open: https://railway.app → Login with GitHub  
2. **New Project** → **Deploy from GitHub repo** → select `roadpulse`  
3. Set **Root Directory** to `backend`  
4. Add variables (Railway → Variables):

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Neon string from Step 1 |
| `JWT_SECRET` | any long random string |
| `JWT_EXPIRATION` | `7d` |
| `PORT` | `5001` (or leave Railway default) |
| `VISION_MODEL_PROVIDER` | `gemini` |
| `VISION_MODEL_API_KEY` | from Step 3 |
| `CORS_ORIGINS` | your Vercel URL later, e.g. `https://roadpulse.vercel.app` |
| `CORS_ALLOW_VERCEL` | `true` |
| `DEMO_MODE` | `true` |
| `CLUSTERING_DISTANCE_THRESHOLD` | `15` |
| `GOOGLE_CLIENT_ID` | from Step 4 (optional for demo day) |

5. After deploy, open the public URL (e.g. `https://xxx.up.railway.app`)  
6. In Railway **shell** or one-off command:

```bash
npm run migrate
npm run seed
```

7. Test: open `https://YOUR-API/health` → should show `{"status":"OK"}`

**Alt host:** https://render.com → New Web Service → root `backend` → same env vars → free web service.

---

## Step 3 — Gemini API key (Plan A — free, generous) ~3 min

1. Open: https://aistudio.google.com/apikey  
2. **Create API key** → copy  
3. Put in backend env: `VISION_MODEL_API_KEY=...` and `VISION_MODEL_PROVIDER=gemini`  
4. Redeploy backend

This powers photo classification + email draft. Free tier is usually enough for a hackathon demo. If it runs out later, switch to OpenAI later (Plan B).

---

## Step 4 — (Optional) Google Sign-In ~8 min

Skip if demo with email / Quick demo is enough.

1. https://console.cloud.google.com/apis/credentials  
2. Create project → **OAuth client ID** → Application type **Web**  
3. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://YOUR-APP.vercel.app`
4. Copy Client ID  
5. Backend: `GOOGLE_CLIENT_ID=...`  
6. Frontend (Vercel): `VITE_GOOGLE_CLIENT_ID=...` (same value)

---

## Step 5 — Deploy frontend on Vercel (you know this) ~5 min

1. https://vercel.com → Import GitHub repo  
2. **Root Directory:** `frontend`  
3. Framework: Vite  
4. Environment variables:

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://YOUR-API.up.railway.app` (no trailing slash) |
| `VITE_GOOGLE_CLIENT_ID` | same as Step 4 (optional) |

5. Deploy → open the site  
6. Update backend `CORS_ORIGINS` to that Vercel URL and redeploy API once

---

## Step 6 — Local check before YouTube recording

```bash
# Terminal 1
cd backend
npm run migrate && npm run seed
npm run dev          # http://localhost:5001

# Terminal 2
cd frontend
npm run dev          # http://localhost:3000
```

- Quick demo → **Citizen** / **Authority**  
- Report flow: allow **precise location** (Delhi should show Delhi coords, not Manipal)  
- Language switcher in nav: English / हिन्दी / ಕನ್ನಡ  

Demo users after seed:

- `citizen@roadpulse.local` / `password123`  
- `authority@roadpulse.local` / `password123`

---

## Optional APIs (nice, not blocking)

| API | Link | Env |
|-----|------|-----|
| Google Places (landmarks) | https://console.cloud.google.com/apis/library/places-backend.googleapis.com | `GOOGLE_PLACES_API_KEY` |

Without Places, we use OpenStreetMap reverse geocode (free) so Delhi does **not** get labeled as Udupi–Manipal Highway.

---

## Checklist day-of-demo

- [ ] Neon DB live + migrate + seed  
- [ ] Backend `/health` OK  
- [ ] Gemini key set  
- [ ] Vercel `VITE_API_URL` points to backend  
- [ ] CORS allows Vercel URL  
- [ ] Quick demo Citizen + Authority work on production URL  
- [ ] Phone: location permission = precise / while using app  
- [ ] Clear browser site data once if an old Manipal pin was cached  

---

## If Gemini credits run out later (Plan B)

1. https://platform.openai.com/api-keys  
2. Backend: `VISION_MODEL_PROVIDER=openai` + `VISION_MODEL_API_KEY=<openai key>`  
3. Redeploy backend only
