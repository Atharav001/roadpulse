# RoadPulse Backend Routes - Implementation Summary

## Overview

Successfully implemented the complete RoadPulse backend API with four route modules and a main Express server. All routes include graceful error handling and integrate seamlessly with the AI agent pipeline.

## Files Created

### Core Routes (5 files)

1. **`src/routes/reports.js`**
   - POST /reports - Submit road/traffic issue reports
   - GET /reports/:id - Fetch report details
   - Integrates all 5 agents in sequence with graceful fallbacks

2. **`src/routes/incidents.js`**
   - GET /incidents - List all incidents with optional filtering
   - GET /incidents/:id - Fetch incident details with linked reports and email draft

3. **`src/routes/dashboard.js`**
   - GET /dashboard/ward/:ward_id - Ward statistics and pending incidents
   - GET /dashboard/pending - Overdue incidents (>60 days old)

4. **`src/routes/auth.js`**
   - POST /auth/login - Authenticate users
   - POST /auth/register - Create new user accounts
   - Simple JWT token generation for hackathon

5. **`src/server.js`**
   - Main Express application
   - Routes setup and middleware configuration
   - Graceful shutdown handling
   - Health check endpoint

### Documentation (3 files)

1. **`ROUTES.md`** - Complete API reference with all endpoints, parameters, and responses
2. **`API_EXAMPLES.md`** - Real-world usage examples with curl and JavaScript
3. **`ROUTES_README.md`** - This file

### Testing

1. **`src/routes/routes.test.js`** - Route structure verification
2. **`src/routes/integration-test.js`** - Comprehensive integration testing

## Architecture

### Agent Pipeline (POST /reports)

The submit-a-report endpoint orchestrates five agents:

```
POST /reports
    ↓
1. classify(photoUrls, text)
    → {issue_type, severity}
    ↓ (fallback: {issue_type: 'unclassified', severity: 'unknown'})
2. getLandmark(latitude, longitude, ward_id)
    → {landmark_description, ward_id}
    ↓ (fallback: '<ward_name> area')
3. routeDepartment(issue_type)
    → department_name
    ↓ (fallback: 'unknown')
4. clusterOrCreate(incidentData, pool)
    → {incident_id, created}
    ↓ (fallback: uses report_id as incident_id)
5. draftEmail(incident, user_email)
    → {subject, body}
    ↓ (fallback: generic template)
Response: {incident_id, report_id, issue_type, severity, landmark_description, draft_email, status: 'reported'}
```

### Error Handling Strategy

**All agents use try/catch with graceful fallbacks:**
- Classification failures → `{issue_type: 'unclassified', severity: 'unknown'}`
- Landmark failures → `'<ward_name> area'`
- Routing failures → `'unknown'` department
- Clustering failures → Report is still created; incident linking fails gracefully
- Email draft failures → Generic complaint template

**The submit endpoint NEVER blocks on agent failures** - the report is always created and returned to the user.

## API Endpoints

### Authentication
- `POST /auth/login` - Login with email/password
- `POST /auth/register` - Create account

### Reports
- `POST /reports` - Submit new report (orchestrates agent pipeline)
- `GET /reports/:id` - Fetch report details

### Incidents
- `GET /incidents` - List incidents with filtering (status, ward_id, department)
- `GET /incidents/:id` - Get incident with all linked reports and email draft

### Dashboard
- `GET /dashboard/ward/:ward_id` - Ward statistics (total, resolved, open, rate, response time)
- `GET /dashboard/pending` - Overdue incidents (>60 days without resolution)

### System
- `GET /health` - Health check

## Database Integration

Routes use PostgreSQL via the connection pool:
- Read from: users, reports, incidents, incident_reports, wards, departments
- Write to: users (auth), reports (submit), incidents (clustering), incident_reports (join)

## Features Implemented

✅ **Submit Report Endpoint**
- Accepts photos, location, text, ward_id
- Runs classification, landmark, routing, clustering, email agents
- Graceful fallbacks for all agent failures
- Returns incident_id, report_id, issue_type, severity, landmark, draft email

✅ **Report Retrieval**
- GET by ID with all details
- Photo URLs included
- Timestamps preserved

✅ **Incident Management**
- List with filtering (status, ward, department)
- Pagination support
- Get single incident with all linked reports
- Email draft generation on demand

✅ **Dashboard/Analytics**
- Ward-level statistics
- Resolution rate calculation
- Average response time
- Pending incidents list (within 60 days)
- Overdue incidents detection (>60 days)

✅ **Authentication**
- User registration and login
- JWT token generation
- Password hashing (SHA256 for hackathon - use bcrypt in production)

✅ **Error Handling**
- Graceful degradation
- Informative error messages
- Proper HTTP status codes (400, 401, 404, 500)

## Testing

Run all tests:

```bash
cd roadpulse/backend

# Route structure tests
node src/routes/routes.test.js

# Integration tests
node src/routes/integration-test.js
```

## Startup

```bash
# Development (auto-reload with nodemon)
npm run dev

# Production
npm start
```

Server will log: `Server running on port 5000`

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgres://user:password@localhost:5432/roadpulse

# Server
PORT=5000

# API Keys
VISION_MODEL_API_KEY=your_gemini_api_key
GOOGLE_PLACES_API_KEY=your_google_places_api_key

# JWT
JWT_SECRET=your_jwt_secret_key
```

### Default Values

- PORT: 5000
- JWT_SECRET: 'roadpulse-hackathon-secret-key-do-not-use-in-production'
- DATABASE_URL: Must be set in .env

## Code Quality

✅ All files pass Node.js syntax check
✅ All endpoints follow REST conventions
✅ Consistent error response format
✅ Comprehensive JSDoc comments
✅ Graceful error handling throughout
✅ No blocking operations on agent failures

## Example Usage

### Submit a Report

```bash
curl -X POST http://localhost:5000/reports \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "text": "Large pothole on Main Street",
    "ward_id": "W001"
  }'
```

### Get Ward Dashboard

```bash
curl "http://localhost:5000/dashboard/ward/W001"
```

### List Reported Incidents

```bash
curl "http://localhost:5000/incidents?status=reported&limit=10"
```

See `API_EXAMPLES.md` for more examples.

## Architecture Notes

### Clustering Logic

Multiple reports within 30 meters of the same issue_type are clustered:
- Uses haversine distance formula in SQL
- Updates existing incident with new report count
- Links report to incident via incident_reports join table

### Severity Normalization

Classification returns (low, med, high) → Database uses (low, medium, high, critical)
- low → low
- med → medium  
- high → high
- unknown → low (default)

### Department Routing

- pothole → Municipal Road Dept
- waterlogging → Drainage Dept
- accident → Traffic Police
- signal_failure → Traffic Police
- blocked_road → Traffic Police
- unclassified → unknown

### Dashboard Metrics

**Resolution Rate:** (resolved_count / total_incidents) × 100
**Response Time:** Average of (updated_at - first_reported_at) for resolved incidents only
**Pending Incidents:** status='reported' AND first_reported_at >= 60 days ago
**Overdue:** status='reported' AND first_reported_at < 60 days ago (globally)

## Production Considerations

⚠️ **For Production Deployment:**

1. **Password Hashing**: Replace SHA256 with bcrypt
   ```javascript
   const bcrypt = require('bcrypt');
   const hash = await bcrypt.hash(password, 10);
   ```

2. **JWT Secret**: Use strong random secret, store in .env
   ```bash
   JWT_SECRET=$(openssl rand -base64 32)
   ```

3. **Rate Limiting**: Add express-rate-limit middleware
4. **Input Validation**: Add joi or express-validator
5. **CORS**: Configure allowed origins
6. **HTTPS**: Always use HTTPS in production
7. **Database**: Use connection pooling (already done)
8. **Logging**: Add structured logging (Winston, Pino)
9. **Monitoring**: Add APM (New Relic, DataDog)
10. **Database Backup**: Set up automated backups

## Support

For detailed information:
- See `ROUTES.md` for complete API reference
- See `API_EXAMPLES.md` for usage examples
- Check `src/routes/*.js` for implementation details
- Review `src/agents/*.js` for agent documentation
