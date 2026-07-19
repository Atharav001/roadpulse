# RoadPulse Backend Routes Documentation

## Overview

This document describes all API routes available in the RoadPulse backend service. The server runs on `http://localhost:5000` (or `PORT` environment variable) and provides endpoints for submitting road/traffic issue reports, managing incidents, viewing dashboards, and user authentication.

## Server Startup

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server logs will show:
```
Server running on port 5000
```

## Routes

### Authentication Routes (`/auth`)

#### POST /auth/login
Authenticate a user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "citizen",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Invalid email or password"
}
```

#### POST /auth/register
Create a new user account.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "citizen"
}
```

**Response (201 Created):**
```json
{
  "user_id": "uuid",
  "email": "newuser@example.com",
  "role": "citizen",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (409 Conflict):**
```json
{
  "error": "User with this email already exists"
}
```

---

### Reports Routes (`/reports`)

#### POST /reports
Submit a new road/traffic issue report. This is the main endpoint that orchestrates the agent pipeline:
1. Classify issue (via vision model)
2. Create report in database
3. Get landmark description
4. Route to appropriate department
5. Cluster into existing incident or create new one
6. Generate email draft

**Request:**
```json
{
  "user_id": "uuid",
  "photos": [
    {
      "url": "https://example.com/image1.jpg",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "latitude": 19.0760,
  "longitude": 72.8777,
  "text": "Deep pothole on Main Street",
  "timestamp": "2024-01-15T10:35:00Z",
  "ward_id": "W001"
}
```

**Response (201 Created):**
```json
{
  "incident_id": "uuid-of-incident",
  "report_id": "uuid-of-report",
  "issue_type": "pothole",
  "severity": "high",
  "landmark_description": "~100m from Central Park, near Gas Station",
  "draft_email": {
    "subject": "Road Issue Report: pothole at Central Park",
    "body": "Dear Roads Department,\n\nWe are writing to report a road/traffic issue..."
  },
  "status": "reported"
}
```

**Graceful Fallback:**
If any agent fails (classification, landmark, routing, clustering, email), the system:
- Logs the error
- Uses fallback values
- **Still completes the submission** and returns a successful response

Example fallback response:
```json
{
  "incident_id": "report-uuid",
  "report_id": "report-uuid",
  "issue_type": "unclassified",
  "severity": "unknown",
  "landmark_description": "Ward 1 area",
  "draft_email": {
    "subject": "Road Issue Report: unclassified",
    "body": "Thank you for your report. Our team will review and take action."
  },
  "status": "reported"
}
```

#### GET /reports/:id
Fetch details of a specific report.

**Response (200 OK):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "photos": [
    {
      "url": "https://example.com/image1.jpg",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "latitude": 19.0760,
  "longitude": 72.8777,
  "text": "Deep pothole on Main Street",
  "issue_type": "pothole",
  "severity": "high",
  "landmark_description": "~100m from Central Park",
  "created_at": "2024-01-15T10:35:00Z"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Report not found"
}
```

---

### Incidents Routes (`/incidents`)

#### GET /incidents
List all incidents with optional filtering.

**Query Parameters:**
- `status`: Filter by status (reported, routed, in_progress, resolved)
- `ward_id`: Filter by ward
- `department`: Filter by department
- `limit`: Pagination limit (default: 50)
- `offset`: Pagination offset (default: 0)

**Example Request:**
```
GET /incidents?status=reported&ward_id=W001&limit=10
```

**Response (200 OK):**
```json
{
  "incidents": [
    {
      "id": "uuid",
      "issue_type": "pothole",
      "severity": "high",
      "status": "reported",
      "landmark_description": "~100m from Central Park",
      "ward_id": "W001",
      "department": "Municipal Road Dept",
      "report_count": 3,
      "first_reported_at": "2024-01-15T10:35:00Z",
      "created_at": "2024-01-15T10:35:00Z",
      "updated_at": "2024-01-15T12:00:00Z",
      "linked_reports_count": 3
    }
  ],
  "count": 1
}
```

#### GET /incidents/:id
Fetch incident details including all linked reports and draft email.

**Response (200 OK):**
```json
{
  "id": "uuid",
  "issue_type": "pothole",
  "severity": "high",
  "status": "reported",
  "landmark_description": "~100m from Central Park",
  "ward_id": "W001",
  "department": "Municipal Road Dept",
  "report_count": 3,
  "first_reported_at": "2024-01-15T10:35:00Z",
  "created_at": "2024-01-15T10:35:00Z",
  "updated_at": "2024-01-15T12:00:00Z",
  "linked_reports": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "photos": [...],
      "latitude": 19.0760,
      "longitude": 72.8777,
      "text": "Deep pothole",
      "issue_type": "pothole",
      "severity": "high",
      "landmark_description": "~100m from Central Park",
      "created_at": "2024-01-15T10:35:00Z"
    }
  ],
  "draft_email": {
    "subject": "Road Issue Report: pothole at Central Park",
    "body": "..."
  }
}
```

---

### Dashboard Routes (`/dashboard`)

#### GET /dashboard/ward/:ward_id
Get statistics for a specific ward.

**Response (200 OK):**
```json
{
  "ward_id": "W001",
  "total_incidents": 45,
  "resolved_count": 32,
  "open_count": 13,
  "resolution_rate_percent": 71.11,
  "avg_response_time_hours": 48.5,
  "pending_incidents_list": [
    {
      "id": "uuid",
      "issue_type": "pothole",
      "severity": "high",
      "landmark_description": "~100m from Central Park",
      "report_count": 3,
      "first_reported_at": "2024-01-15T10:35:00Z"
    }
  ]
}
```

**Pending Definition:** `status='reported' AND first_reported_at >= 60 days ago`

#### GET /dashboard/pending
List all incidents that are overdue (reported but not resolved for > 60 days).

**Response (200 OK):**
```json
{
  "pending_count": 5,
  "threshold_days": 60,
  "pending_incidents": [
    {
      "id": "uuid",
      "issue_type": "waterlogging",
      "severity": "critical",
      "landmark_description": "~100m from Market Square",
      "ward_id": "W002",
      "department": "Drainage Dept",
      "report_count": 7,
      "first_reported_at": "2023-11-10T10:35:00Z",
      "created_at": "2023-11-10T10:35:00Z",
      "updated_at": "2024-01-10T12:00:00Z",
      "days_pending": 67
    }
  ]
}
```

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200 OK** - Successful GET request
- **201 Created** - Successful POST request creating a resource
- **400 Bad Request** - Invalid input parameters
- **401 Unauthorized** - Authentication failed
- **404 Not Found** - Resource not found
- **409 Conflict** - Resource already exists (e.g., user email)
- **500 Internal Server Error** - Server error

Error response format:
```json
{
  "error": "Error message",
  "message": "Additional details (optional)"
}
```

---

## Agent Pipeline (POST /reports)

The POST /reports endpoint orchestrates the following agents in sequence:

### 1. Classification Agent
- **Function:** `classify(photoUrls, text)`
- **Returns:** `{issue_type, severity}`
- **Fallback:** `{issue_type: 'unclassified', severity: 'unknown'}`
- **On Failure:** Logs error, continues with fallback

### 2. Landmark Agent
- **Function:** `getLandmark(latitude, longitude, ward_id)`
- **Returns:** `{landmark_description, ward_id}`
- **Fallback:** `{landmark_description: '<ward_name> area', ward_id}`
- **On Failure:** Logs error, continues with fallback

### 3. Routing Agent
- **Function:** `routeDepartment(issue_type)`
- **Returns:** Department name (string)
- **Mappings:**
  - pothole → Municipal Road Dept
  - waterlogging → Drainage Dept
  - accident → Traffic Police
  - signal_failure → Traffic Police
  - blocked_road → Traffic Police
  - unclassified → unknown

### 4. Clustering Agent
- **Function:** `clusterOrCreate(incidentData, pool)`
- **Returns:** `{incident_id, created: boolean}`
- **Logic:**
  - Finds nearby incidents (within 30m) with same issue_type
  - Updates existing incident or creates new one
  - Links report to incident via incident_reports table

### 5. Email Draft Agent
- **Function:** `draftEmail(incident, user_email)`
- **Returns:** `{subject, body}`
- **Fallback:** Generic complaint template
- **On Failure:** Logs error, continues with fallback

---

## Database Schema

Key tables used by these routes:

- **users** - User accounts with email, password_hash, role
- **reports** - Individual citizen reports
- **incidents** - Clustered road/traffic issues
- **incident_reports** - Join table linking reports to incidents
- **wards** - Geographic subdivisions
- **departments** - Responsible authorities

---

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 5000)

Optional:
- `VISION_MODEL_API_KEY` - Gemini API key for classification and email
- `GOOGLE_PLACES_API_KEY` - Google Places API for landmarks
- `JWT_SECRET` - Secret for JWT token signing (default: 'roadpulse-hackathon-secret-key-do-not-use-in-production')

---

## Testing Routes

**Health Check:**
```bash
curl http://localhost:5000/health
```

**Login:**
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

**Submit Report:**
```bash
curl -X POST http://localhost:5000/reports \
  -H "Content-Type: application/json" \
  -d '{
    "user_id":"uuid",
    "latitude":19.0760,
    "longitude":72.8777,
    "text":"Pothole on Main Street",
    "ward_id":"W001"
  }'
```

**List Incidents:**
```bash
curl "http://localhost:5000/incidents?status=reported&limit=10"
```

**Dashboard:**
```bash
curl "http://localhost:5000/dashboard/ward/W001"
```
