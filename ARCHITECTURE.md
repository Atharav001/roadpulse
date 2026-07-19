# RoadPulse Architecture

**A comprehensive guide to the system design, agents, database, and API structure.**

---

## System Overview

RoadPulse is a **citizen-centric road issue reporting platform** with **authority management** and **AI-powered classification**.

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Layer (Browser)                      │
│  React SPA @ localhost:5173 (Citizen | Authority | Public)       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    HTTP REST API
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   API Layer (Express.js)                         │
│           Backend @ localhost:5000 (/api/...)                    │
│  ├─ POST /api/reports          [Citizen submits report]          │
│  ├─ GET  /api/incidents        [Authority views queue]           │
│  ├─ PATCH /api/incidents/:id   [Authority updates status]        │
│  ├─ GET  /api/dashboard        [Public stats]                    │
│  └─ POST /api/auth/login       [Login]                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌─────▼─────┐    ┌───▼────────┐
    │  Database    │  AI Agents │    │  External  │
    │ PostgreSQL   │  Pipeline  │    │   APIs     │
    └────────────┘    └─────────┘    └────────────┘
```

---

## 5-Agent AI Pipeline

When a citizen submits a report, the backend runs this **sequential pipeline**:

### **1. Classification Agent** (`src/agents/classification.js`)
- **Input:** Photo URLs + text description
- **Task:** Classify issue type (pothole, accident, congestion, etc.) & severity (low/medium/high/critical)
- **Model:** Gemini Flash 2.5 or GPT-4 Mini (via API)
- **Fallback:** `{ issue_type: 'unclassified', severity: 'unknown' }`
- **Error handling:** Retry once; if both fail, use fallback

### **2. Landmark Agent** (`src/agents/landmark.js`)
- **Input:** Latitude, longitude, ward_id
- **Task:** Get human-readable location name (e.g., "Times Square, NYC")
- **API:** Google Places Nearby Search
- **Fallback:** `"<Ward Name> area"`
- **Error handling:** If API fails or no results, return ward-based fallback

### **3. Report Creation** (Database)
- **Input:** All report fields + classification + landmark
- **Task:** Store report in `reports` table
- **Output:** `report_id`

### **4. Clustering Agent** (`src/agents/clustering.js`)
- **Input:** New report location + existing incidents within 30m radius
- **Task:** If near-duplicate found, merge into existing incident; else create new
- **Distance metric:** Haversine formula (30m threshold)
- **Output:** `incident_id` (existing or new)

### **5. Routing Agent** (`src/agents/routing.js`)
- **Input:** `issue_type`
- **Task:** Map to correct department (Pothole Repair, Traffic Management, etc.)
- **Lookup table:** 5 issue types → 5 departments
- **Output:** `department_id`

### **6. Email Draft Agent** (`src/agents/emailDraft.js`)
- **Input:** Incident details, reporter email
- **Task:** Generate formal complaint email template
- **Model:** Text model API call (or fallback template)
- **Output:** Draft email ready to send

---

## Database Schema

**PostgreSQL v12+**

```sql
-- Users (Citizens & Authorities)
users (
  id: UUID PRIMARY KEY,
  email: VARCHAR UNIQUE,
  password_hash: VARCHAR,
  role: 'citizen' | 'authority',
  created_at: TIMESTAMP
)

-- Administrative regions
wards (
  id: VARCHAR PRIMARY KEY,
  name: VARCHAR,
  created_at: TIMESTAMP
)

-- Response teams
departments (
  id: VARCHAR PRIMARY KEY,
  name: VARCHAR,
  created_at: TIMESTAMP
)

-- Individual citizen submissions
reports (
  id: UUID PRIMARY KEY,
  user_id: UUID → users.id,
  photos: JSONB [{ url, timestamp }, ...],
  latitude: DECIMAL,
  longitude: DECIMAL,
  text: TEXT,
  issue_type: VARCHAR (classification output),
  severity: VARCHAR (classification output),
  landmark_description: TEXT (landmark agent output),
  created_at: TIMESTAMP
)

-- Merged incidents (clustering output)
incidents (
  id: UUID PRIMARY KEY,
  first_reported_at: TIMESTAMP,
  status: 'reported' | 'routed' | 'in_progress' | 'resolved',
  issue_type: VARCHAR,
  severity: VARCHAR,
  department: VARCHAR → departments.id,
  ward_id: VARCHAR → wards.id,
  landmark_description: TEXT,
  report_count: INTEGER (how many reports merged),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)

-- Junction table (incidents ← reports)
incident_reports (
  incident_id: UUID → incidents.id,
  report_id: UUID → reports.id,
  PRIMARY KEY (incident_id, report_id)
)
```

### Key Design Patterns:
- **Many reports → One incident** (via clustering & incident_reports join)
- **Audit trail:** First report timestamp preserved in `first_reported_at`
- **Status workflow:** reported → routed → in_progress → resolved
- **Indexes:** On frequently queried columns (status, created_at) for O(1) lookups

---

## API Contract Overview

All endpoints return JSON. Authentication uses simple JWT token (bearer token in header).

### **Public Endpoints** (No auth required)

#### `GET /api/dashboard`
Get public statistics and incident list.

**Response:**
```json
{
  "total_incidents": 12,
  "total_reports": 28,
  "by_status": { "reported": 5, "in_progress": 3, "resolved": 4 },
  "by_severity": { "critical": 2, "high": 4, "medium": 3, "low": 3 },
  "recent_incidents": [
    {
      "id": "uuid",
      "issue_type": "pothole",
      "severity": "high",
      "landmark_description": "Main St, Ward 1",
      "report_count": 3,
      "status": "reported",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### **Auth Endpoints**

#### `POST /api/auth/login`
Authenticate as citizen or authority.

**Request:**
```json
{ "email": "user@example.com", "password": "password123" }
```

**Response:**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "citizen",
  "token": "eyJhbGciOiJIUzI1NiI..."
}
```

---

### **Citizen Endpoints** (Auth required)

#### `POST /api/reports`
Submit a new report (triggers full 5-agent pipeline).

**Request:**
```json
{
  "user_id": "uuid",
  "photos": [
    { "url": "https://example.com/photo1.jpg", "timestamp": "2024-01-15T10:00:00Z" }
  ],
  "latitude": 40.7128,
  "longitude": -74.0060,
  "text": "Large pothole at Main St intersection",
  "ward_id": "ward_1"
}
```

**Response:**
```json
{
  "incident_id": "uuid",
  "report_id": "uuid",
  "issue_type": "pothole",
  "severity": "high",
  "landmark_description": "Main St, Manhattan",
  "draft_email": "Dear City Department...",
  "status": "reported",
  "report_count": 1,
  "merged": false
}
```

#### `GET /api/reports` (My Reports)
Get reports submitted by the current citizen.

**Response:**
```json
{
  "reports": [
    {
      "id": "uuid",
      "incident_id": "uuid",
      "issue_type": "pothole",
      "status": "in_progress",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### **Authority Endpoints** (Auth required, role=authority)

#### `GET /api/incidents`
Get all incidents (queue view for authorities).

**Query params:**
- `status`: Filter by status (reported, in_progress, resolved)
- `sort`: Order by created_at, severity, report_count

**Response:**
```json
{
  "incidents": [
    {
      "id": "uuid",
      "issue_type": "pothole",
      "severity": "high",
      "landmark_description": "Main St",
      "report_count": 3,
      "status": "reported",
      "department": "pothole_repair",
      "ward_id": "ward_1",
      "first_reported_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:05:00Z"
    }
  ]
}
```

#### `GET /api/incidents/:id`
Get detailed incident (includes all linked reports).

**Response:**
```json
{
  "incident": {
    "id": "uuid",
    "issue_type": "pothole",
    "severity": "high",
    "status": "reported",
    "department": "pothole_repair",
    "landmark_description": "Main St",
    "report_count": 3,
    "reports": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "photos": [{ "url": "...", "timestamp": "..." }],
        "latitude": 40.7128,
        "longitude": -74.0060,
        "text": "Pothole at Main St",
        "created_at": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

#### `PATCH /api/incidents/:id`
Update incident status (authority action).

**Request:**
```json
{ "status": "in_progress" }
```

**Response:**
```json
{ "success": true, "incident_id": "uuid", "status": "in_progress" }
```

---

## Frontend Routes & Components

**React Router SPA** (Vite dev server)

### **Public Routes** (No auth)
| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `Home.jsx` | Landing page; links to report/dashboard |
| `/dashboard` | `Dashboard.jsx` | Public stats, recent incidents |
| `/login` | `Login.jsx` | Authentication |

### **Citizen Routes** (Auth required, role=citizen)
| Route | Component | Purpose |
|-------|-----------|---------|
| `/report` | `ReportForm.jsx` | Submit new report with photo upload |
| `/my-reports` | `MyReports.jsx` | List citizen's submitted reports |
| `/incident/:id` | `IncidentDetail.jsx` | View merged incident & all reports |

### **Authority Routes** (Auth required, role=authority)
| Route | Component | Purpose |
|-------|-----------|---------|
| `/authority` | `AuthorityQueue.jsx` | Incident queue, filter by status/severity |
| `/incident/:id` | `IncidentDetail.jsx` | View incident details + status update button |

### **Component Hierarchy**
```
<App>
├─ <Navigation>           [Top navbar with home/login/logout]
├─ <Home>
├─ <ReportForm>
│  └─ <CameraCapture>     [Photo upload widget]
├─ <Dashboard>
│  ├─ <StatCard>          [Stats like total incidents]
│  └─ <IncidentCard>      [List items]
├─ <AuthorityQueue>
│  └─ <IncidentCard>      [Filterable/sortable list]
├─ <IncidentDetail>
│  └─ [Status update form]
└─ <MyReports>
   └─ <IncidentCard>
```

---

## Error Handling & Graceful Fallbacks

**Philosophy:** Never let an external API failure crash the app. Always have a sensible fallback.

### **Classification Fallback**
```
1. Call Gemini/GPT-4 API
2. If error → Retry once (network timeout)
3. If still error → Return {issue_type: 'unclassified', severity: 'unknown'}
4. Report still submits; authority manually reviews
```

### **Landmark Fallback**
```
1. Call Google Places Nearby Search
2. If error or no results → Return "<Ward Name> area"
3. Example: "Ward 1 area" (graceful degradation)
```

### **Routing Fallback**
```
1. Lookup department for issue_type
2. If not found → Assign to 'general_maintenance' (catch-all)
```

### **Email Draft Fallback**
```
1. Call text model API
2. If error → Use hardcoded template
3. Ensure email is always available (even if generic)
```

---

## Data Flow Diagram

### **Citizen Submitting Report**
```
Citizen uploads photo + location + text
         ↓
POST /api/reports
         ↓
┌─────────────────────────────────────┐
│      5-Agent Pipeline (Sequential)  │
├─────────────────────────────────────┤
│ 1. Classification Agent             │
│    → issue_type, severity           │
├─────────────────────────────────────┤
│ 2. Landmark Agent                   │
│    → landmark_description           │
├─────────────────────────────────────┤
│ 3. Report Storage (DB)              │
│    → reports table                  │
├─────────────────────────────────────┤
│ 4. Clustering Agent                 │
│    → Merge or create incident       │
├─────────────────────────────────────┤
│ 5. Routing Agent                    │
│    → Department assignment          │
├─────────────────────────────────────┤
│ 6. Email Draft Agent                │
│    → Formal complaint email         │
└─────────────────────────────────────┘
         ↓
Response: {incident_id, issue_type, severity, landmark, draft_email}
         ↓
Citizen sees success screen
```

### **Authority Resolving Incident**
```
Authority views incident queue
         ↓
Clicks incident
         ↓
GET /api/incidents/:id
         ↓
Sees all linked reports & photos
         ↓
Clicks "Update Status"
         ↓
PATCH /api/incidents/:id {status: "resolved"}
         ↓
Incident moves from "reported" to "resolved"
         ↓
Dashboard stats update (report_count decreases in pending)
```

---

## Deployment Considerations

### **Environment Variables**
Required for production:
```
DATABASE_URL=postgresql://user:pass@host:5432/db
GOOGLE_PLACES_API_KEY=...
GOOGLE_GEOCODING_API_KEY=...
VISION_MODEL_API_KEY=...
NODE_ENV=production
PORT=5000
JWT_SECRET=strong-secret-key-here
```

### **Scaling Points**
1. **Database:** Add read replicas for dashboard queries
2. **AI Agents:** Queue submissions via Bull/RabbitMQ if response time matters
3. **File storage:** Move photos to S3 or CDN; store URLs only in DB
4. **Caching:** Redis for hot incidents/departments/wards

### **Security**
- HTTPS in production
- JWT tokens with short TTL
- Validate coordinates (lat/lon within valid range)
- Rate limit report submissions per user
- Authenticate all write operations

---

## Testing

### **Unit Tests**
```bash
cd backend
npm test  # Run agents.test.js & routes.test.js
```

### **Integration Tests**
- Submit report → Verify all 5 agents executed
- Clustering: Submit 2 reports 30m apart → Verify merge
- Authority workflow: Create incident → Update status → Check dashboard

### **Manual Testing**
See [JUDGE_TEST_FLOW.md](./JUDGE_TEST_FLOW.md) for step-by-step test scenarios.

---

## File Structure

```
roadpulse/
├── README.md                      [Project overview]
├── QUICKSTART.md                  [Setup in < 5 min]
├── JUDGE_TEST_FLOW.md             [Test scenarios]
├── ARCHITECTURE.md                [This file]
│
├── backend/
│  ├── package.json                [Dependencies]
│  ├── .env.example                [Config template]
│  ├── src/
│  │  ├── server.js                [Express entry point]
│  │  ├── db/
│  │  │  ├── migrate.js            [Create tables]
│  │  │  └── seed.js               [Insert demo data]
│  │  ├── models/
│  │  │  ├── schema.sql            [SQL DDL]
│  │  │  └── db.js                 [Pool wrapper]
│  │  ├── routes/
│  │  │  ├── auth.js               [Login endpoint]
│  │  │  ├── reports.js            [Submit report]
│  │  │  ├── incidents.js          [Authority queue]
│  │  │  └── dashboard.js          [Public stats]
│  │  └── agents/
│  │     ├── classification.js     [Classify issue]
│  │     ├── landmark.js           [Get location name]
│  │     ├── clustering.js         [Merge duplicates]
│  │     ├── routing.js            [Assign department]
│  │     ├── emailDraft.js         [Generate email]
│  │     └── agents.test.js        [Agent tests]
│  │
│  └── [docs: AGENTS_SETUP.md, API_EXAMPLES.md, DEPLOYMENT_GUIDE.md]
│
└── frontend/
   ├── package.json                [Dependencies]
   ├── vite.config.js              [Build config]
   ├── src/
   │  ├── main.jsx                 [Entry point]
   │  ├── App.jsx                  [Router setup]
   │  ├── index.css                [Global styles]
   │  ├── api/
   │  │  └── client.js             [API wrapper]
   │  ├── components/
   │  │  ├── Navigation.jsx        [Top navbar]
   │  │  ├── CameraCapture.jsx     [Photo upload]
   │  │  ├── IncidentCard.jsx      [Incident display]
   │  │  └── StatCard.jsx          [Stats display]
   │  └── pages/
   │     ├── Home.jsx              [Landing]
   │     ├── ReportForm.jsx        [Submit report]
   │     ├── Dashboard.jsx         [Public stats]
   │     ├── AuthorityQueue.jsx    [Authority view]
   │     ├── IncidentDetail.jsx    [Incident detail]
   │     ├── MyReports.jsx         [Citizen's reports]
   │     └── Login.jsx             [Auth]
   │
   └── [index.html, README.md]
```

---

## Key Metrics & Monitoring

Track these for production:
- **Report submission rate** (reports/min)
- **Clustering efficiency** (% merged vs. new incidents)
- **Agent success rate** (% classification succeeded)
- **API latency** (P50, P95 response time)
- **Database query time** (slow queries)
- **User conversion** (citizen sign-up → first report)

---

## Next Steps

1. **Read QUICKSTART.md** to set up locally
2. **Follow JUDGE_TEST_FLOW.md** to verify all features
3. **Check backend/AGENTS_SETUP.md** for agent implementation details
4. **Review backend/README_ROUTES.md** for API contract details

---

**For questions or issues, refer to the individual module READMEs in backend/ and frontend/.**
