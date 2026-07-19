# RoadPulse — Chat Handoff Context (paste into a new agent chat)

## What RoadPulse is
Civic web app (React + Express + Postgres): citizens report road issues with **live camera + GPS**, AI classifies severity, merges nearby duplicates, finds landmarks, routes to a department, drafts a complaint email, and shows a **public ward dashboard** + **community nearby** feed. Authority demo login can resolve queue items.

## Stack
- Frontend: `frontend/` Vite React, routes `/`, `/report`, `/my-reports`, `/community`, `/dashboard`, `/incident/:id`, `/login`, `/signup`, `/authority`
- Backend: `backend/` Express on **PORT 5001** (see `backend/.env`), Postgres `DATABASE_URL`
- Agents (sync in `POST /reports`): Classification → Landmark → Clustering (~15m) → Routing → Email
- Auth: email/password, device-login, `POST /auth/google` (demo Google email flow)

## Recently implemented (this session)
- Municipal palette (navy + road orange), light default, Source Serif/Sans
- LocationContext: ask GPS on app open; persist last location
- Report flow: **confirm GPS before camera**; live getUserMedia only; **2–4 photos**; GPS+timestamp stamped on image; gallery blocked
- Community page `/community` via `GET /incidents/nearby?lat=&lng=`
- Clustering default **15m** (phones can’t reliably do true 5m GPS)
- Dashboard/home metrics from real DB aggregates (`/dashboard/overview`, `/dashboard/ward/:id`)

## Demo accounts
- `authority@roadpulse.local` / `password123` (municipal-roads)
- `citizen@roadpulse.local` / `password123`
- Or Google demo / device login on Sign in page

## Run
```bash
cd backend && npm run migrate && npm run seed && npm run dev
cd frontend && npm run dev
```
Restart backend after route changes so `/incidents/nearby` and `/auth/google` load.

## Known gaps for production / stronger credibility
- Native app later for tighter anti-fraud (EXIF, offline queue, push)
- Real Google OAuth client ID (current Google login is hackathon email demo)
- Real Gemini/Places keys (fallbacks work for demo)
- Video upload not built yet
- AI image detection / device attestation not built
- Map UI for community optional
- Rate limits, CAPTCHA, CI — out of hackathon scope per plan

## Plan constraint
Keep monolith; agents inline; 🟢 hackathon features only; 🔵 roadmap items (alerts, native app, multi-source) later.
