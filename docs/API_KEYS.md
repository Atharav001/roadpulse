# APIs & models for RoadPulse demo

## Add these now (minimum for a solid demo)

Full walkthrough with screenshots-style steps: see [`DEMO_SETUP.md`](../DEMO_SETUP.md).

| # | What | Env var | Where to get | Cost |
|---|------|---------|--------------|------|
| 1 | **Postgres** | `DATABASE_URL` | [Neon](https://neon.tech) or [Supabase](https://supabase.com) | Free tier |
| 2 | **Gemini API key** (vision + email draft) | `VISION_MODEL_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) | Free tier (generous) — **Plan A** |
| 3 | Hosted backend | — | [Railway](https://railway.app) (easiest) or [Render](https://render.com) | Free tier |
| 4 | Frontend | `VITE_API_URL` | [Vercel](https://vercel.com) — root `frontend` | Free |
| 5 | **Google OAuth** (optional) | `GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_ID` | [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials) | Free |

Set backend: `VISION_MODEL_PROVIDER=gemini`

Landmarks work without Places via OpenStreetMap reverse geocode (free).

Optional but recommended for landmarks:

| What | Env var | Notes |
|------|---------|--------|
| Places API (New) | `GOOGLE_PLACES_API_KEY` | Same Google Cloud project; enable Places API. Free credit usually enough for demo. Without it, ward-name fallback still works. |

## Model options

### Option A — Free / best value (recommended for hackathon)

| Job | Model | Why |
|-----|--------|-----|
| Photo classification + severity | **Gemini 2.5 Flash** (or Flash-Lite) | Fast, multimodal, free tier at AI Studio |
| Complaint email draft | Same Gemini key | Already wired via classification/email agents |
| Landmarks | Google Places Nearby (or skip) | Ward fallback if no key |
| Auth | Google Identity Services | Free |

### Option B — Higher quality / paid fallback

| Job | Model | Why |
|-----|--------|-----|
| Classification | **GPT-4o-mini** (`VISION_MODEL_PROVIDER=openai`) | Strong vision, low cost |
| Email draft | GPT-4o-mini or Claude Haiku | Polished copy |
| Landmarks | Google Places | Same as above |

If Gemini free quota is exhausted during the demo day, switch to Option B with an OpenAI key.

## Not required for demo

- Geocoding key (nice-to-have; Places/ward cover most cases)
- Cloudinary/S3 (local `/uploads` works on one backend instance)
- SendGrid (we only draft emails)

## Vercel note

Vercel = frontend. Backend + Postgres must be elsewhere. Point `VITE_API_URL` at the public API.
