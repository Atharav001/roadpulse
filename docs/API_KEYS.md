# APIs & models for RoadPulse demo

## Add these now (minimum for a solid demo)

| # | What | Env var | Where to get | Cost |
|---|------|---------|--------------|------|
| 1 | **Postgres** | `DATABASE_URL` | [Neon](https://neon.tech) or [Supabase](https://supabase.com) | Free tier |
| 2 | **Gemini API key** (vision + email draft) | `VISION_MODEL_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) | Free tier (generous) |
| 3 | **Google OAuth Web Client ID** | `GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_ID` | [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials) | Free |
| 4 | Hosted backend URL | `VITE_API_URL` on Vercel | Railway / Render / Fly | Free tier |

Set backend: `VISION_MODEL_PROVIDER=gemini`

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
