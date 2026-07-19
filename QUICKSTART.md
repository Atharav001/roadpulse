# RoadPulse Quickstart Guide

**Get RoadPulse running locally in < 5 minutes**

## Prerequisites
- Node.js v16+ ([download](https://nodejs.org/))
- PostgreSQL v12+ ([download](https://www.postgresql.org/download/))
- Git

## Step 1: Clone Repository

```bash
git clone https://github.com/your-org/roadpulse.git
cd roadpulse
```

## Step 2: Install Backend & Frontend Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies (in another terminal)
cd frontend
npm install
```

## Step 3: Create `.env` File

In the `backend/` directory, create or copy `.env` from `.env.example`:

```bash
cd backend
cp .env.example .env
```

**For demo purposes**, you can use placeholder API keys. Edit `backend/.env`:

```
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/roadpulse

# API Keys (use placeholder strings for demo)
GOOGLE_PLACES_API_KEY=demo_places_key_12345
GOOGLE_GEOCODING_API_KEY=demo_geocoding_key_12345
VISION_MODEL_API_KEY=demo_vision_key_12345

# Environment
NODE_ENV=development
PORT=5000
```

**Note:** The app includes graceful fallbacks, so demo requests will still work with placeholder keys.

## Step 4: Initialize Database

From the `backend/` directory:

```bash
# Run migrations (creates tables)
npm run migrate

# Seed demo data (users, wards, departments)
npm run seed
```

Expected output:
```
✓ Database migrated successfully
✓ Demo data seeded: 2 users, 5 wards, 5 departments
```

## Step 5: Start Backend Server

From the `backend/` directory:

```bash
npm run dev
```

Expected output:
```
Server running on http://localhost:5000
```

**Keep this terminal open.**

## Step 6: Start Frontend Server

From the `frontend/` directory (in a **new terminal**):

```bash
npm run dev
```

Expected output:
```
  VITE v5.0.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
```

## Step 7: Open in Browser

Navigate to **http://localhost:5173**

You should see the RoadPulse home page with a big 🚗 emoji and login options.

---

## Demo Credentials

Use these credentials to log in and explore:

| Role | Email | Password |
|------|-------|----------|
| Authority | `authority@roadpulse.local` | `password123` |
| Citizen | `citizen@roadpulse.local` | `password123` |

---

## Judge's Test Flow (Quick Demo)

Ready to verify all 10 features? Follow **[JUDGE_TEST_FLOW.md](./JUDGE_TEST_FLOW.md)** for exact steps to reproduce the hackathon demo.

Each step shows:
- What to do
- Expected result
- Database state verification

---

## Troubleshooting

### Port 5000 or 5173 already in use?
Change the port in:
- **Backend:** `backend/.env` → `PORT=5001`
- **Frontend:** `frontend/vite.config.js` → update port

### Database connection failed?
1. Verify PostgreSQL is running: `psql --version`
2. Check `DATABASE_URL` in `backend/.env`
3. Try: `psql postgresql://postgres:postgres@localhost:5432/postgres`

### npm dependencies fail to install?
```bash
rm -rf node_modules package-lock.json
npm install
```

### Agent APIs return "unclassified"?
This is expected with demo keys. The system falls back gracefully—check the agent logs in terminal to see what happened.

---

## Architecture & API Reference

For a detailed look at the system:
- **Architecture overview:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API contracts:** [backend/README_ROUTES.md](./backend/README_ROUTES.md)

---

## Next Steps

1. ✅ App is running
2. 📖 Read [JUDGE_TEST_FLOW.md](./JUDGE_TEST_FLOW.md) to understand the demo
3. 📋 Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
4. 🧪 Run backend tests: `cd backend && npm test`

**Happy testing!**
