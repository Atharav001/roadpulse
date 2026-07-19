# RoadPulse API Examples

Complete working examples for all API endpoints.

## Table of Contents

1. [Authentication](#authentication)
2. [Submit a Report](#submit-a-report)
3. [Fetch Reports and Incidents](#fetch-reports-and-incidents)
4. [Dashboard and Statistics](#dashboard-and-statistics)

---

## Authentication

### Register a New User

Create a new citizen account.

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123",
    "role": "citizen"
  }'
```

**Response:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "role": "citizen",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIiwicm9sZSI6ImNpdGl6ZW4ifQ...."
}
```

### Login

Authenticate with existing credentials.

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**Response:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "role": "citizen",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIiwicm9sZSI6ImNpdGl6ZW4ifQ...."
}
```

---

## Submit a Report

### Basic Report (Text Only)

Submit a report with just text, no photos.

```bash
curl -X POST http://localhost:5000/reports \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "text": "Large pothole at intersection of Main Street and Oak Avenue",
    "timestamp": "2024-01-15T14:30:00Z",
    "ward_id": "W001"
  }'
```

**Response:**
```json
{
  "incident_id": "660e8401-f29c-41d4-a716-446655440001",
  "report_id": "770e8402-f29c-41d4-a716-446655440002",
  "issue_type": "pothole",
  "severity": "high",
  "landmark_description": "~100m from Central Market, near Coffee Shop",
  "draft_email": {
    "subject": "Road Issue Report: pothole at Central Market",
    "body": "Dear Municipal Roads Department,\n\nWe are writing to report a road/traffic issue that requires your immediate attention.\n\nIssue Type: pothole\nSeverity: critical\nLocation: ~100m from Central Market, near Coffee Shop\n\nThis issue has been reported through the RoadPulse citizen reporting system..."
  },
  "status": "reported"
}
```

### Report with Photo

Submit a report with one or more photos.

```bash
curl -X POST http://localhost:5000/reports \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "photos": [
      {
        "url": "https://example.com/images/pothole-001.jpg",
        "timestamp": "2024-01-15T14:25:00Z"
      },
      {
        "url": "https://example.com/images/pothole-002.jpg",
        "timestamp": "2024-01-15T14:26:00Z"
      }
    ],
    "latitude": 19.0760,
    "longitude": 72.8777,
    "text": "Large pothole, can see water pooling inside",
    "timestamp": "2024-01-15T14:30:00Z",
    "ward_id": "W001"
  }'
```

**Response (with AI-generated classification):**
```json
{
  "incident_id": "660e8401-f29c-41d4-a716-446655440001",
  "report_id": "770e8402-f29c-41d4-a716-446655440002",
  "issue_type": "pothole",
  "severity": "high",
  "landmark_description": "~100m from Central Market, near Coffee Shop & Gas Station",
  "draft_email": {
    "subject": "Urgent: Critical Pothole Hazard at Central Market",
    "body": "Dear Municipal Roads Department,\n\nWe are writing to report a critical road hazard requiring immediate attention.\n\nIssue Type: pothole\nSeverity: critical\nLocation: ~100m from Central Market, near Coffee Shop & Gas Station\n\nThe pothole shows signs of water accumulation and poses a significant public safety risk..."
  },
  "status": "reported"
}
```

### Report with Minimal Information

Even with minimal data, the system gracefully handles it.

```bash
curl -X POST http://localhost:5000/reports \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response (with fallbacks):**
```json
{
  "incident_id": "880e8403-f29c-41d4-a716-446655440003",
  "report_id": "880e8403-f29c-41d4-a716-446655440003",
  "issue_type": "unclassified",
  "severity": "unknown",
  "landmark_description": "Unknown location",
  "draft_email": {
    "subject": "Road Issue Report: unclassified",
    "body": "Thank you for your report. Our team will review and take action."
  },
  "status": "reported"
}
```

### Multiple Reports on Same Issue (Clustering)

When multiple citizens report the same issue at nearby locations (within 30m), they get clustered into a single incident.

**First Report:**
```bash
curl -X POST http://localhost:5000/reports \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "text": "Pothole on Main Street",
    "ward_id": "W001"
  }'
```

Response shows incident creation:
```json
{
  "incident_id": "660e8401-f29c-41d4-a716-446655440001",
  "report_id": "770e8402-f29c-41d4-a716-446655440002",
  ...
}
```

**Second Report (same location, same issue type):**
```bash
curl -X POST http://localhost:5000/reports \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "660e8400-e29b-41d4-a716-446655440000",
    "latitude": 19.0761,
    "longitude": 72.8778,
    "text": "Same pothole is still there!",
    "ward_id": "W001"
  }'
```

Response shows **same incident** with updated report count:
```json
{
  "incident_id": "660e8401-f29c-41d4-a716-446655440001",
  "report_id": "880e8404-f29c-41d4-a716-446655440004",
  ...
}
```

The incident now has 2 linked reports instead of 1.

---

## Fetch Reports and Incidents

### Get Specific Report

Fetch the full details of a single report.

```bash
curl http://localhost:5000/reports/770e8402-f29c-41d4-a716-446655440002
```

**Response:**
```json
{
  "id": "770e8402-f29c-41d4-a716-446655440002",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "photos": [
    {
      "url": "https://example.com/images/pothole-001.jpg",
      "timestamp": "2024-01-15T14:25:00Z"
    }
  ],
  "latitude": 19.0760,
  "longitude": 72.8777,
  "text": "Large pothole on Main Street",
  "issue_type": "pothole",
  "severity": "high",
  "landmark_description": "~100m from Central Market",
  "created_at": "2024-01-15T14:30:00Z"
}
```

### List All Incidents

Get a list of all incidents with optional filtering.

```bash
curl "http://localhost:5000/incidents?limit=10&offset=0"
```

**Response:**
```json
{
  "incidents": [
    {
      "id": "660e8401-f29c-41d4-a716-446655440001",
      "issue_type": "pothole",
      "severity": "high",
      "status": "reported",
      "landmark_description": "~100m from Central Market",
      "ward_id": "W001",
      "department": "Municipal Road Dept",
      "report_count": 2,
      "first_reported_at": "2024-01-15T14:30:00Z",
      "created_at": "2024-01-15T14:30:00Z",
      "updated_at": "2024-01-15T15:00:00Z",
      "linked_reports_count": 2
    },
    {
      "id": "990e8405-f29c-41d4-a716-446655440005",
      "issue_type": "waterlogging",
      "severity": "critical",
      "status": "in_progress",
      "landmark_description": "~100m from Market Square",
      "ward_id": "W002",
      "department": "Drainage Dept",
      "report_count": 5,
      "first_reported_at": "2024-01-10T10:00:00Z",
      "created_at": "2024-01-10T10:00:00Z",
      "updated_at": "2024-01-15T16:00:00Z",
      "linked_reports_count": 5
    }
  ],
  "count": 2
}
```

### Filter by Status

Get only reported (open) incidents in a specific ward.

```bash
curl "http://localhost:5000/incidents?status=reported&ward_id=W001"
```

**Response:**
```json
{
  "incidents": [
    {
      "id": "660e8401-f29c-41d4-a716-446655440001",
      "issue_type": "pothole",
      "severity": "high",
      "status": "reported",
      ...
    }
  ],
  "count": 1
}
```

### Filter by Department

Get all incidents assigned to a specific department.

```bash
curl "http://localhost:5000/incidents?department=Traffic%20Police"
```

### Get Incident Details with All Reports

Fetch a specific incident with all linked reports and the draft email.

```bash
curl http://localhost:5000/incidents/660e8401-f29c-41d4-a716-446655440001
```

**Response:**
```json
{
  "id": "660e8401-f29c-41d4-a716-446655440001",
  "issue_type": "pothole",
  "severity": "high",
  "status": "reported",
  "landmark_description": "~100m from Central Market",
  "ward_id": "W001",
  "department": "Municipal Road Dept",
  "report_count": 2,
  "first_reported_at": "2024-01-15T14:30:00Z",
  "created_at": "2024-01-15T14:30:00Z",
  "updated_at": "2024-01-15T15:00:00Z",
  "linked_reports": [
    {
      "id": "770e8402-f29c-41d4-a716-446655440002",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "photos": [...],
      "latitude": 19.0760,
      "longitude": 72.8777,
      "text": "Large pothole on Main Street",
      "issue_type": "pothole",
      "severity": "high",
      "landmark_description": "~100m from Central Market",
      "created_at": "2024-01-15T14:30:00Z"
    },
    {
      "id": "880e8404-f29c-41d4-a716-446655440004",
      "user_id": "660e8400-e29b-41d4-a716-446655440000",
      "photos": [],
      "latitude": 19.0761,
      "longitude": 72.8778,
      "text": "Same pothole is still there!",
      "issue_type": "pothole",
      "severity": "high",
      "landmark_description": "~100m from Central Market",
      "created_at": "2024-01-15T15:00:00Z"
    }
  ],
  "draft_email": {
    "subject": "Urgent: Critical Pothole Hazard at Central Market",
    "body": "Dear Municipal Roads Department,\n\nWe are writing to report a critical road hazard requiring immediate attention..."
  }
}
```

---

## Dashboard and Statistics

### Ward Dashboard

Get comprehensive statistics for a specific ward.

```bash
curl http://localhost:5000/dashboard/ward/W001
```

**Response:**
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
      "id": "660e8401-f29c-41d4-a716-446655440001",
      "issue_type": "pothole",
      "severity": "high",
      "landmark_description": "~100m from Central Market",
      "report_count": 2,
      "first_reported_at": "2024-01-15T14:30:00Z"
    },
    {
      "id": "111e8406-f29c-41d4-a716-446655440006",
      "issue_type": "signal_failure",
      "severity": "medium",
      "landmark_description": "Traffic Light at Oak Street",
      "report_count": 1,
      "first_reported_at": "2024-01-13T10:00:00Z"
    }
  ]
}
```

**Metrics Explanation:**
- **total_incidents** - All incidents ever reported in the ward
- **resolved_count** - Incidents with status = 'resolved'
- **open_count** - Incidents with status != 'resolved'
- **resolution_rate_percent** - (resolved_count / total_incidents) * 100
- **avg_response_time_hours** - Average time from first_reported_at to resolved (for resolved incidents)
- **pending_incidents_list** - Issues reported within the last 60 days that are still open

### Overdue Incidents

Get all incidents that have been reported but not resolved for more than 60 days.

```bash
curl http://localhost:5000/dashboard/pending
```

**Response:**
```json
{
  "pending_count": 3,
  "threshold_days": 60,
  "pending_incidents": [
    {
      "id": "222e8407-f29c-41d4-a716-446655440007",
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
    },
    {
      "id": "333e8408-f29c-41d4-a716-446655440008",
      "issue_type": "blocked_road",
      "severity": "high",
      "landmark_description": "Main Street near Hospital",
      "ward_id": "W003",
      "department": "Traffic Police",
      "report_count": 2,
      "first_reported_at": "2023-10-15T09:00:00Z",
      "created_at": "2023-10-15T09:00:00Z",
      "updated_at": "2024-01-12T14:00:00Z",
      "days_pending": 92
    }
  ]
}
```

---

## JavaScript Client Examples

### Using Node.js with axios

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:5000';

// Register
async function registerUser(email, password) {
  const response = await axios.post(`${API_BASE}/auth/register`, {
    email,
    password,
    role: 'citizen'
  });
  return response.data;
}

// Login
async function loginUser(email, password) {
  const response = await axios.post(`${API_BASE}/auth/login`, {
    email,
    password
  });
  return response.data;
}

// Submit Report
async function submitReport(userId, latitude, longitude, text, ward_id) {
  const response = await axios.post(`${API_BASE}/reports`, {
    user_id: userId,
    latitude,
    longitude,
    text,
    ward_id,
    timestamp: new Date().toISOString(),
    photos: []
  });
  return response.data;
}

// Get Incidents
async function getIncidents(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await axios.get(`${API_BASE}/incidents?${params}`);
  return response.data;
}

// Get Ward Dashboard
async function getWardDashboard(wardId) {
  const response = await axios.get(`${API_BASE}/dashboard/ward/${wardId}`);
  return response.data;
}

// Usage
(async () => {
  // Register a user
  const user = await registerUser('citizen@example.com', 'password123');
  console.log('Registered:', user);

  // Submit a report
  const report = await submitReport(
    user.user_id,
    19.0760,
    72.8777,
    'Pothole on Main Street',
    'W001'
  );
  console.log('Report submitted:', report);

  // Get dashboard stats
  const dashboard = await getWardDashboard('W001');
  console.log('Ward Dashboard:', dashboard);
})();
```

---

## Error Handling Examples

### Missing Required Field

```bash
curl -X POST http://localhost:5000/reports \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response (400 Bad Request):**
```json
{
  "error": "user_id is required"
}
```

### Invalid Credentials

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@example.com","password":"wrongpass"}'
```

**Response (401 Unauthorized):**
```json
{
  "error": "Invalid email or password"
}
```

### User Already Exists

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

When john@example.com is already registered:

**Response (409 Conflict):**
```json
{
  "error": "User with this email already exists"
}
```

### Not Found

```bash
curl http://localhost:5000/reports/invalid-uuid
```

**Response (404 Not Found):**
```json
{
  "error": "Report not found"
}
```
