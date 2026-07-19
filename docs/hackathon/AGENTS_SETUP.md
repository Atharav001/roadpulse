# RoadPulse Agent Modules - Setup & Integration Guide

## Overview

The RoadPulse backend includes a five-stage agent pipeline that processes incoming road/traffic reports automatically. Each agent handles a specific task in sequence, with graceful error handling and fallbacks.

## File Structure

```
roadpulse/backend/src/agents/
├── classification.js       # Stage 1: Classify issue type & severity
├── landmark.js             # Stage 2: Geocode & describe location
├── clustering.js           # Stage 3: Group similar incidents
├── routing.js              # Stage 4: Route to appropriate department
├── emailDraft.js           # Stage 5: Generate formal complaint email
├── integration-example.js  # Complete pipeline example
├── agents.test.js          # Test suite
└── README.md               # Agent documentation
```

## Environment Variables Required

Add these to your `.env` file:

```env
# API Keys for external services
VISION_MODEL_API_KEY=your_gemini_api_key_here
GOOGLE_PLACES_API_KEY=your_google_cloud_places_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/roadpulse
```

## Quick Start

### 1. Install Dependencies

```bash
cd roadpulse/backend
npm install
```

### 2. Set Environment Variables

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Run Tests

```bash
npm test
# or directly:
node src/agents/agents.test.js
```

## Agent Pipeline Overview

### Stage 1: Classification
**File**: `classification.js`  
**Function**: `classify(photoUrls, text)`

Analyzes photos and text to classify the road issue.

```javascript
const result = await classify(
  ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
  'Large pothole on main street'
);
// Returns: { issue_type: 'pothole', severity: 'high' }
```

**Issue Types**: 
- `pothole`
- `waterlogging` 
- `accident`
- `signal_failure`
- `blocked_road`

**Severity Levels**:
- `low` - Minor cosmetic damage
- `med` - Moderate damage with safety concern
- `high` - Severe damage or immediate hazard

**Fallback**: `{ issue_type: 'unclassified', severity: 'unknown' }`

### Stage 2: Landmark Lookup
**File**: `landmark.js`  
**Function**: `getLandmark(latitude, longitude, ward_id)`

Gets landmark description and formats location string.

```javascript
const landmark = await getLandmark(40.7128, -74.0060, 'W001');
// Returns: { 
//   landmark_description: '~100m from Central Park, near Main St & 5th Ave',
//   ward_id: 'W001' 
// }
```

**Fallback**: Returns `"<Ward name> area"` if API fails

### Stage 3: Clustering
**File**: `clustering.js`  
**Function**: `clusterOrCreate(incidentData, pool)`

Groups similar incidents or creates new ones.

```javascript
const result = await clusterOrCreate({
  issue_type: 'pothole',
  severity: 'med',
  latitude: 40.7128,
  longitude: -74.0060,
  landmark_description: '~100m from Central Park',
  ward_id: 'W001',
  department: 'Municipal Road Dept',
  user_id: 'user-123',
  report_id: 'report-456'
}, pool);
// Returns: { incident_id: 'inc-789', created: true }
```

**Clustering Logic**:
- Matches open incidents (status ≠ 'resolved')
- Same `issue_type`
- Within 30 meters (haversine distance)

**Severity Mapping**:
- `low` → `low`
- `med` → `medium`
- `high` → `high`

### Stage 4: Routing
**File**: `routing.js`  
**Function**: `routeDepartment(issue_type)`

Routes issues to appropriate departments.

```javascript
const department = routeDepartment('pothole');
// Returns: 'Municipal Road Dept'
```

**Routing Table**:
| Issue Type | Department |
|-----------|-----------|
| pothole | Municipal Road Dept |
| waterlogging | Drainage Dept |
| accident | Traffic Police |
| signal_failure | Traffic Police |
| blocked_road | Traffic Police |
| unclassified | unknown |

### Stage 5: Email Draft
**File**: `emailDraft.js`  
**Function**: `draftEmail(incident, user_email)`

Generates formal complaint email to department.

```javascript
const email = await draftEmail({
  issue_type: 'pothole',
  severity: 'high',
  landmark_description: '~100m from Central Park',
  department: 'Municipal Road Dept'
}, 'citizen@example.com');
// Returns: { subject: '...', body: '...' }
```

**Email Template**:
- To: Department email address
- Subject: "Road Issue Report: [issue_type] at [landmark]"
- Body: Formal complaint with severity, location, photo reference

## Integration Example

Here's how to use all agents together in a POST /reports route:

```javascript
const { classify } = require('./agents/classification');
const { getLandmark } = require('./agents/landmark');
const { clusterOrCreate } = require('./agents/clustering');
const { routeDepartment } = require('./agents/routing');
const { draftEmail } = require('./agents/emailDraft');
const createPool = require('./models/db');

app.post('/reports', async (req, res) => {
  const { photos, text, latitude, longitude, ward_id, user_id, user_email } = req.body;
  
  const pool = createPool();
  const reportId = generateUUID();
  
  try {
    // 1. Classify the issue
    const classification = await classify(photos, text);
    
    // 2. Get landmark description
    const landmark = await getLandmark(latitude, longitude, ward_id);
    
    // 3. Route to department
    const department = routeDepartment(classification.issue_type);
    
    // 4. Cluster or create incident
    const incident = await clusterOrCreate({
      issue_type: classification.issue_type,
      severity: classification.severity,
      latitude,
      longitude,
      landmark_description: landmark.landmark_description,
      ward_id: landmark.ward_id,
      department,
      user_id,
      report_id: reportId
    }, pool);
    
    // 5. Draft formal email
    const email = await draftEmail({
      issue_type: classification.issue_type,
      severity: classification.severity,
      landmark_description: landmark.landmark_description,
      department
    }, user_email);
    
    // Send email to department (implement separately)
    // sendEmailToDepartment(department, email);
    
    res.json({
      success: true,
      reportId,
      incidentId: incident.incident_id,
      isNewIncident: incident.created,
      classification,
      landmark,
      department
    });
  } catch (error) {
    console.error('Report processing error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    pool.end();
  }
});
```

## Error Handling & Fallbacks

Each agent has built-in error handling:

| Agent | Error | Fallback |
|-------|-------|----------|
| Classification | API timeout/error | `{unclassified, unknown}` |
| Landmark | API failure | `"<Ward> area"` |
| Clustering | Database error | Throws (handled upstream) |
| Routing | Unknown type | `"unknown"` |
| Email | AI failure | Generic template |

## API Key Setup

### Gemini API (Classification & Email)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add to `.env`: `VISION_MODEL_API_KEY=your_key`

### Google Places API (Landmark)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Places API
3. Create an API key
4. Add to `.env`: `GOOGLE_PLACES_API_KEY=your_key`

## Testing

Run the agent test suite:

```bash
# From roadpulse/backend directory
npm test
# or
node src/agents/agents.test.js
```

Expected output: All agents pass logical verification tests ✓

## Performance Considerations

- **Classification**: ~2-3 seconds (includes image fetching)
- **Landmark**: ~1-2 seconds (API call + processing)
- **Clustering**: ~500ms (database query)
- **Routing**: <1ms (lookup table)
- **Email**: ~1-2 seconds (AI generation)

**Total pipeline time**: ~5-9 seconds per report

## Production Checklist

- [ ] API keys configured in environment
- [ ] Database schema migrated (`npm run migrate`)
- [ ] Error logging configured (Sentry/etc)
- [ ] Rate limiting enabled for API routes
- [ ] Email delivery service configured
- [ ] Agents tested with real data
- [ ] Monitoring/alerting set up for agent failures

## Troubleshooting

### "VISION_MODEL_API_KEY not set"
Add your Gemini API key to `.env`

### "GOOGLE_PLACES_API_KEY not set"
Add your Google Places API key to `.env`

### "Classification timeout"
Check API key validity and network connectivity

### "Clustering matches incorrect incidents"
Verify 30-meter haversine calculation with test coordinates

### "Email generation fails"
Check for valid department name in routing

## Support

For issues or questions:
1. Check the agent README: `src/agents/README.md`
2. Review test cases: `src/agents/agents.test.js`
3. Check logs for specific error messages
