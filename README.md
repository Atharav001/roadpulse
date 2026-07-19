# RoadPulse

**Civic road accountability** — citizens report live geotagged damage; AI classifies, merges duplicates, routes departments, and exposes ward performance on a public dashboard.

| | |
|---|---|
| **Live app** | [https://roadpulse-omega.vercel.app](https://roadpulse-omega.vercel.app) |
| **API** | [https://roadpulse-production.up.railway.app](https://roadpulse-production.up.railway.app) |
| **Stack** | React (Vite) · Express · PostgreSQL (Neon) · Gemini Flash |

---

## Problem statement

Cities receive the same pothole dozens of times, with gallery photos from the wrong place, no landmark, and no public trail of whether anything was fixed. RoadPulse closes that gap:

1. **Credible intake** — GPS confirmed before camera; 2–4 live photos stamped with coordinates + time (gallery blocked).
2. **Less duplicate noise** — same issue type within ~15m merges into one incident; all reporters and photos kept.
3. **Actionable routing** — severity + type → department; draft complaint email ready to send.
4. **Public accountability** — ward resolution rates, pending pools, and escalations visible without login.

Built for the Product Space × Code Benders hackathon (Manipal / multi-city demos).

---

## Architecture summary

```
┌─────────────────────┐     HTTPS      ┌──────────────────────┐
│  Vercel (frontend)  │ ─────────────► │  Railway (Express)   │
│  React + Vite PWA   │                │  /auth /reports …    │
└─────────────────────┘                └──────────┬───────────┘
                                                  │
                       ┌──────────────────────────┼──────────────────────────┐
                       ▼                          ▼                          ▼
                 Neon Postgres              Gemini Flash              OSM / Places
                 users, reports,            classify +                landmarks
                 incidents, wards           email draft
```

**Report pipeline (in order):** Classification → Landmark → Clustering (~15m) → Routing → Email draft.

**Auth:** Email/password, Quick Demo users, optional Google Identity Services (ID token verified on API).

**i18n:** English · हिन्दी · ಕನ್ನಡ (nav language switcher; brand wordmark **RoadPulse** stays fixed).

---

## Demo credentials (after seed)

| Role | Email | Password |
|------|--------|----------|
| Citizen | `citizen@roadpulse.local` | `password123` |
| Authority | `authority@roadpulse.local` | `password123` |

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL (local) **or** Neon connection string
- Optional: Gemini API key, Google OAuth Web Client ID

### 1. Clone & install

```bash
git clone <your-repo-url> roadpulse
cd roadpulse
cd backend && npm install
cd ../frontend && npm install
```

### 2. Backend env (`backend/.env`)

```env
DATABASE_URL=postgresql://...
PORT=5001
JWT_SECRET=change-me
VISION_MODEL_PROVIDER=gemini
VISION_MODEL_API_KEY=your_gemini_key
DEMO_MODE=true
CLUSTERING_DISTANCE_THRESHOLD=15
CORS_ORIGINS=http://localhost:3000,https://roadpulse-omega.vercel.app
CORS_ALLOW_VERCEL=true
GOOGLE_CLIENT_ID=          # optional — enables Google Sign-In
```

```bash
cd backend
npm run migrate
npm run seed
npm run dev                # http://localhost:5001
```

Health check: `GET /health` → `{"status":"OK"}`

### 3. Frontend

```bash
cd frontend
# Dev: Vite proxies /api → localhost:5001
npm run dev                # http://localhost:3000
```

Production (Vercel) env:

```env
VITE_API_URL=https://roadpulse-production.up.railway.app
VITE_GOOGLE_CLIENT_ID=     # optional if GOOGLE_CLIENT_ID is set on Railway
```

### 4. Deploy (current production)

| Layer | Host | Root / notes |
|-------|------|----------------|
| DB | [Neon](https://neon.tech) | `DATABASE_URL` |
| API | [Railway](https://railway.app) | Root `backend` · `npm start` · migrate + seed once |
| Web | [Vercel](https://vercel.com) | Root `frontend` · set `VITE_API_URL` |

Google Sign-In: set `GOOGLE_CLIENT_ID` on Railway (OAuth Web client). Authorized JavaScript origins must include `http://localhost:3000` and `https://roadpulse-omega.vercel.app`. The login page always shows **Continue with Google**; it activates once the Client ID is present on the API.

Full checklist: [`DEMO_SETUP.md`](./DEMO_SETUP.md) · API keys: [`docs/API_KEYS.md`](./docs/API_KEYS.md)

---

## Screenshots

> Drop PNGs into `docs/screenshots/` and they will render below. Suggested captures for judges:

| File | Capture |
|------|---------|
| `docs/screenshots/01-home.png` | Home hero + live city pulse |
| `docs/screenshots/02-report.png` | Photo guidance + live camera |
| `docs/screenshots/03-dashboard.png` | Ward intelligence / resolution ring |
| `docs/screenshots/04-community.png` | Nearby community issues |
| `docs/screenshots/05-authority.png` | Authority queue (Quick Demo → Authority) |
| `docs/screenshots/06-i18n.png` | Same screen in हिन्दी |

![Home](docs/screenshots/01-home.png)

![Report flow](docs/screenshots/02-report.png)

![Dashboard](docs/screenshots/03-dashboard.png)

![Community](docs/screenshots/04-community.png)

![Authority](docs/screenshots/05-authority.png)

![Hindi UI](docs/screenshots/06-i18n.png)

---

## Key features

| # | Feature |
|---|---------|
| 1 | Live GPS-first report intake (2–4 stamped photos, optional short video) |
| 2 | AI issue classification + severity (Gemini Flash, graceful fallback) |
| 3 | Landmark / reverse-geocode (Places or OpenStreetMap) |
| 4 | Duplicate clustering (~15m, same issue type) |
| 5 | Department routing + complaint email draft |
| 6 | Public ward dashboard (pools, resolution rate, escalations) |
| 7 | Community nearby map list |
| 8 | Authority resolve queue |
| 9 | EN / HI / KN UI language switcher |
| 10 | Demo-resilient fallbacks when keys are missing |

---

## Project layout

```
roadpulse/
├── README.md                 ← you are here
├── DEMO_SETUP.md             ← deploy checklist
├── backend/                  ← Express API + agents
│   └── src/agents/           ← classify, landmark, cluster, route, email
└── frontend/                 ← React (Vite) UI
    └── src/i18n/strings.json ← EN / HI / KN
```

---

## Judge quick path (5 minutes)

1. Open [live app](https://roadpulse-omega.vercel.app)  
2. Sign in → **Quick demo → Citizen**  
3. Report → confirm GPS → follow photo guidance → submit  
4. Open **Dashboard** (no login) → ward tabs  
5. Sign out → **Quick demo → Authority** → resolve an item  
6. Switch language to **हिन्दी** / **ಕನ್ನಡ** in the nav  

Local: `backend` on `:5001`, `frontend` on `:3000` (see Setup).

---

## License

MIT — hackathon submission.
