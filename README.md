# 🚗 RoadPulse

**A web app where citizens report road and traffic problems (potholes, accidents, congestion, etc.) for city authorities to address.**

---

## 🚀 Quick Start for Judges

**⏱️ Get running in < 5 minutes:**
→ **[QUICKSTART.md](./QUICKSTART.md)** — Clone, install, run.

**✅ Verify all 10 features:**
→ **[JUDGE_TEST_FLOW.md](./JUDGE_TEST_FLOW.md)** — Exact steps, expected results, database proofs.

**📐 Understand the architecture:**
→ **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design, agents, database, APIs.

---

## 🎯 The 10 Hackathon Features

| # | Feature | Status |
|---|---------|--------|
| 1 | Citizens submit reports with photos & GPS | ✅ |
| 2 | Auto-classification (pothole, accident, etc.) | ✅ |
| 3 | Auto-landmark detection (location names) | ✅ |
| 4 | Duplicate detection & merging (clustering) | ✅ |
| 5 | Automatic department routing | ✅ |
| 6 | Authority incident queue | ✅ |
| 7 | Status tracking & resolution | ✅ |
| 8 | Auto-draft complaint emails | ✅ |
| 9 | Public dashboard with stats | ✅ |
| 10 | Graceful fallbacks (resilient to API failures) | ✅ |

---

## 📦 Project Structure

```
roadpulse/
├── QUICKSTART.md              ← Start here (judges)
├── JUDGE_TEST_FLOW.md         ← Test scenarios (judges)
├── ARCHITECTURE.md            ← System design (builders)
├── .env.example.complete      ← Config template
│
├── backend/                   ← Express.js + AI agents
│  ├── src/
│  │  ├── agents/              [5-agent pipeline]
│  │  ├── routes/              [API endpoints]
│  │  ├── models/              [Database layer]
│  │  └── db/                  [Migrations & seeding]
│  └── package.json
│
└── frontend/                  ← React SPA (Vite)
   ├── src/
   │  ├── pages/               [Citizen, Authority, Public views]
   │  ├── components/          [Reusable UI]
   │  └── api/                 [Backend client]
   └── package.json
```

---

## 💻 Tech Stack

### Backend
- **Express.js** — HTTP server
- **PostgreSQL** — Data storage
- **Node.js** — JavaScript runtime
- **Axios** — HTTP client for external APIs

### Frontend
- **React 18** — UI framework
- **Vite** — Build tool
- **React Router** — Client routing

### AI / External APIs
- **Gemini 2.5 Flash** or **GPT-4 Mini** — Issue classification
- **Google Places API** — Landmark detection
- **Google Geocoding API** — Reverse geocoding

---

## 🎮 Demo Credentials

Use these to log in locally:

| Role | Email | Password |
|------|-------|----------|
| Authority | `authority@roadpulse.local` | `password123` |
| Citizen | `citizen@roadpulse.local` | `password123` |

---

## 🏗️ System Architecture at a Glance

When a citizen submits a report, a **5-agent pipeline** automatically:

1. **Classifies** the issue (pothole, accident, congestion, etc.)
2. **Detects** the landmark/location name
3. **Clusters** duplicate nearby reports into one incident
4. **Routes** to the correct department
5. **Drafts** a formal complaint email

All with **graceful fallbacks** — if any API fails, the report still submits.

```
Citizen Report
    ↓
[Classification Agent] → issue_type, severity
    ↓
[Landmark Agent] → location name
    ↓
[Clustering Agent] → merge or create incident
    ↓
[Routing Agent] → assign department
    ↓
[Email Draft Agent] → formal complaint
    ↓
Authority sees incident in queue
```

---

## 📖 Documentation

| Document | Audience | Purpose |
|----------|----------|---------|
| **[QUICKSTART.md](./QUICKSTART.md)** | **Judges / Anyone** | Get running in < 5 min |
| **[JUDGE_TEST_FLOW.md](./JUDGE_TEST_FLOW.md)** | **Judges** | Test all 10 features |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | **Builders** | System design deep-dive |
| **[.env.example.complete](./.env.example.complete)** | **Ops / DevOps** | Full config reference |
| `backend/AGENTS_SETUP.md` | **Builders** | Agent implementation details |
| `backend/README_ROUTES.md` | **API users** | Full API contract |
| `backend/DEPLOYMENT_GUIDE.md` | **DevOps** | Production deployment |

---

## 🧪 Testing

### Run Agent Tests
```bash
cd backend
npm test
```

### Manual Integration Testing
Follow **[JUDGE_TEST_FLOW.md](./JUDGE_TEST_FLOW.md)** for step-by-step verification.

---

## 🚀 Deployment

### Local Development
1. Follow **[QUICKSTART.md](./QUICKSTART.md)**
2. Backend: `http://localhost:5000`
3. Frontend: `http://localhost:5173`

### Production
See **`backend/DEPLOYMENT_GUIDE.md`** for:
- Environment configuration
- Database setup (managed PostgreSQL)
- API key management
- Monitoring & logging

---

## 🛠️ Key APIs

### For Citizens
- `POST /api/reports` — Submit a report
- `GET /api/reports` — View my reports

### For Authorities
- `GET /api/incidents` — View incident queue
- `PATCH /api/incidents/:id` — Update incident status

### Public
- `GET /api/dashboard` — View public stats

See **`backend/README_ROUTES.md`** for full API contract.

---

## 💾 Database

PostgreSQL with 5 core tables:
- `users` — Citizens & authorities
- `reports` — Individual submissions
- `incidents` — Merged incident clusters
- `wards` — Geographic regions
- `departments` — Response teams

See **[ARCHITECTURE.md](./ARCHITECTURE.md#database-schema)** for schema details.

---

## ✨ Key Features Explained

### Automatic Classification
Photos & description → AI model → Issue type (pothole, accident, etc.) + severity

### Smart Clustering
If 2+ reports within 30m → Merge into 1 incident (shows "3 reports merged")

### Graceful Fallbacks
All API calls have fallbacks:
- Classification → `"unclassified"` if API fails
- Landmark → `"<Ward> area"` if API fails
- Routing → `"general_maintenance"` if unmapped
- Email → Hardcoded template if API fails

### Authority Workflow
1. View incident queue (filtered by status/severity)
2. Click incident to see all linked reports
3. Update status: reported → in_progress → resolved
4. Dashboard stats update in real-time

---

## 📊 Database Workflow

```
Citizen submits report
    ↓
INSERT into reports table
    ↓
Clustering agent checks for duplicates
    ├─ Found within 30m? INSERT into incidents (if new)
    │                   INSERT into incident_reports (link)
    └─ Not found?       INSERT into incidents (new)
    ↓
Authority sees incident in queue
    ↓
Authority updates status
    ↓
UPDATE incidents SET status = 'resolved'
```

---

## 🔒 Security Considerations

- JWT tokens for authentication
- Password hashing (bcrypt)
- Request validation on all endpoints
- Rate limiting (optional, for production)
- HTTPS in production (reverse proxy)

---

## 📝 License

MIT

---

## 🤝 Contributing

This is a hackathon project. For modifications or contributions:
1. Read **[ARCHITECTURE.md](./ARCHITECTURE.md)** for system design
2. Check **`backend/AGENTS_SETUP.md`** for agent details
3. Follow the existing code structure in `backend/src/` and `frontend/src/`

---

## ❓ FAQ

**Q: How do I log in?**
A: Use demo credentials (see table above) or create a new user via `/api/auth/register`.

**Q: What if I don't have API keys?**
A: Use placeholder strings; the system has graceful fallbacks. (See `DEMO_MODE` in `.env.example.complete`.)

**Q: Can I run without PostgreSQL?**
A: No, but you can use a managed service (AWS RDS, Heroku Postgres, etc.). Update `DATABASE_URL` in `.env`.

**Q: How do I verify Feature X is working?**
A: Follow **[JUDGE_TEST_FLOW.md](./JUDGE_TEST_FLOW.md)** — it has step-by-step instructions and database queries to verify each feature.

**Q: What's the haversine distance threshold?**
A: 30 meters by default (adjustable in `CLUSTERING_DISTANCE_THRESHOLD` in `.env`).

**Q: How many reports can one incident have?**
A: Unlimited. `incidents.report_count` increments each time a new report is merged.

---

## 🎉 Ready to Go?

1. **First time?** → **[QUICKSTART.md](./QUICKSTART.md)**
2. **Want to demo?** → **[JUDGE_TEST_FLOW.md](./JUDGE_TEST_FLOW.md)**
3. **Building on it?** → **[ARCHITECTURE.md](./ARCHITECTURE.md)**

**Questions? Check the individual module READMEs in `backend/` and `frontend/`.**

---

**Made with ❤️ for the hackathon. Deployed with 🚀.**
