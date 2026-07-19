# RoadPulse Backend Deployment Guide

## Quick Start

### Prerequisites
- Node.js 14+
- PostgreSQL 12+
- npm 6+

### Setup Steps

#### 1. Install Dependencies
```bash
cd roadpulse/backend
npm install
```

#### 2. Create Database
```bash
# Create database
createdb roadpulse

# Run migrations
psql roadpulse < src/models/schema.sql

# Seed sample data (optional)
node src/db/seed.js
```

#### 3. Configure Environment
```bash
# Copy example
cp .env.example .env

# Edit .env with your values
nano .env
```

Required environment variables:
```
DATABASE_URL=postgres://user:password@localhost:5432/roadpulse
PORT=5000
VISION_MODEL_API_KEY=your_gemini_api_key
GOOGLE_PLACES_API_KEY=your_google_places_api_key
JWT_SECRET=your_jwt_secret_key
```

#### 4. Start Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will output:
```
Server running on port 5000
```

## Testing

### Run Tests
```bash
# Route structure tests
node src/routes/routes.test.js

# Integration tests
node src/routes/integration-test.js
```

Both should pass with all checks showing ✓

### Manual Testing
```bash
# Health check
curl http://localhost:5000/health

# Submit a report
curl -X POST http://localhost:5000/reports \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test-uuid","latitude":19.0760,"longitude":72.8777,"text":"Pothole","ward_id":"W001"}'

# List incidents
curl "http://localhost:5000/incidents?status=reported"
```

## API Endpoints Summary

### Authentication
```
POST   /auth/login                  - Login
POST   /auth/register               - Register
```

### Reports
```
POST   /reports                     - Submit report
GET    /reports/:id                 - Get report
```

### Incidents
```
GET    /incidents                   - List incidents
GET    /incidents/:id               - Get incident details
```

### Dashboard
```
GET    /dashboard/ward/:ward_id     - Ward statistics
GET    /dashboard/pending           - Overdue incidents
```

### System
```
GET    /health                      - Health check
```

## Architecture Overview

### Request Flow

```
Client Request
    ↓
Express Middleware (CORS, JSON parser)
    ↓
Route Handler
    ↓
Agent Pipeline (for POST /reports)
    - Classification
    - Landmark lookup
    - Department routing
    - Incident clustering
    - Email drafting
    ↓
Database Operations
    ↓
Response (with graceful fallbacks)
```

### Database Schema

**Key Tables:**
- `users` - User accounts
- `reports` - Individual reports
- `incidents` - Clustered issues
- `incident_reports` - Report-to-incident mapping
- `wards` - Geographic divisions
- `departments` - Responsible authorities

**Relationships:**
```
users (1) → (many) reports
incidents (1) → (many) incident_reports (many) ← (1) reports
```

### Agent Pipeline

Each POST /reports call runs:

1. **Classification Agent** (Gemini Flash)
   - Analyzes photos and text
   - Returns: issue_type, severity
   - Fallback: unclassified, unknown

2. **Landmark Agent** (Google Places)
   - Gets location description
   - Returns: landmark_description
   - Fallback: "<ward_name> area"

3. **Routing Agent** (Local)
   - Maps issue_type to department
   - Returns: department name
   - Fallback: unknown

4. **Clustering Agent** (Database)
   - Finds nearby incidents (30m radius)
   - Creates or updates incident
   - Links reports together

5. **Email Draft Agent** (Gemini Flash)
   - Generates formal complaint email
   - Returns: subject, body
   - Fallback: generic template

**Key Feature:** All agents fail gracefully - submission never blocks

## Monitoring

### Logs to Watch
```
Server running on port 5000           # Server started
Classification attempt 1 failed...     # Agent retry
Classification failed after retries   # Fallback used
Database error creating report        # DB issue
```

### Common Issues

**Port Already in Use**
```bash
# Find process on port 5000
lsof -i :5000

# Kill it
kill -9 <PID>
```

**Database Connection Failed**
- Check DATABASE_URL in .env
- Verify PostgreSQL is running: `psql postgres`
- Check credentials

**Agent Failures**
- Check API keys in .env
- Review logs for specific errors
- Reports still submit with fallback values

## Performance Tuning

### Database
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM incidents WHERE status = 'reported';

-- Add indexes if needed
CREATE INDEX idx_incidents_department ON incidents(department);
```

### Server
```javascript
// In server.js, adjust for load:
const pool = createPool({ max: 20 }); // Connection pool size
```

## Security Considerations

### Production Checklist

- [ ] Use bcrypt for password hashing (not SHA256)
- [ ] Use strong, random JWT_SECRET
- [ ] Enable HTTPS only
- [ ] Set secure CORS origins
- [ ] Add rate limiting (express-rate-limit)
- [ ] Add input validation (joi, express-validator)
- [ ] Use environment variables (never hardcode secrets)
- [ ] Enable SQL parameterization (already done with pg)
- [ ] Add request logging and monitoring
- [ ] Implement API authentication/authorization
- [ ] Regular database backups
- [ ] DDoS protection (CloudFlare, AWS Shield)

## Scaling

### Horizontal Scaling

1. **Load Balancer** (nginx, AWS ALB)
   - Distribute traffic across instances

2. **Database** (RDS, managed PostgreSQL)
   - Use managed service for reliability
   - Read replicas for scaling reads

3. **Cache Layer** (Redis)
   - Cache incident list, dashboard stats
   - Reduce database hits

### Vertical Scaling

- Increase Node.js process heap size
- Increase database connection pool
- Add database indexes for common queries

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check disk space

**Weekly:**
- Review slow queries
- Check incident statistics
- Update dependencies: `npm update`

**Monthly:**
- Database optimization: `VACUUM ANALYZE`
- Review security logs
- Update dependencies: `npm audit`

### Backup Strategy

```bash
# Daily backup
pg_dump roadpulse > backup_$(date +%Y%m%d).sql

# Store in S3/cloud storage
aws s3 cp backup_*.sql s3://roadpulse-backups/

# Restore if needed
psql roadpulse < backup_20240115.sql
```

## Deployment Options

### Local Development
```bash
npm run dev
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src ./src
EXPOSE 5000
CMD ["npm", "start"]
```

```bash
docker build -t roadpulse-backend .
docker run -e DATABASE_URL=... -p 5000:5000 roadpulse-backend
```

### Heroku
```bash
git push heroku main
heroku logs -t
```

### AWS EC2
```bash
# SSH into instance
ssh -i key.pem ubuntu@ec2-instance

# Clone repo
git clone https://github.com/roadpulse/backend.git
cd backend

# Setup
npm install
npm start
```

### Cloud Run / App Engine
```bash
gcloud app deploy app.yaml
```

## Monitoring & Observability

### Key Metrics to Track

1. **API Performance**
   - Request/response time
   - Error rate
   - Request volume

2. **Database**
   - Query time
   - Connection pool usage
   - Slow queries

3. **System**
   - CPU usage
   - Memory usage
   - Disk space

### Tools

- **Logs**: CloudWatch, Stackdriver, ELK
- **Metrics**: Prometheus, Datadog, New Relic
- **Tracing**: Jaeger, Zipkin, DataDog APM
- **Uptime**: Pingdom, StatusPage

## Support & Troubleshooting

### Common Errors

**400 Bad Request**
- Missing required field (user_id)
- Invalid JSON format
- Check request body

**401 Unauthorized**
- Invalid credentials
- Expired token
- Check email/password

**404 Not Found**
- Report/incident doesn't exist
- Wrong endpoint path
- Check ID format

**500 Internal Server Error**
- Database connection failed
- Agent API error
- Check logs: `docker logs <container>`

### Debug Mode

```bash
# Enable detailed logging
DEBUG=roadpulse:* npm start

# Enable PostgreSQL logging
psql roadpulse
alter database roadpulse set log_statement = 'all';
```

## Next Steps

1. ✅ Create database and run migrations
2. ✅ Set environment variables
3. ✅ Start server (`npm run dev`)
4. ✅ Run tests to verify
5. ✅ Test endpoints with curl or Postman
6. ✅ Connect frontend to backend
7. ✅ Deploy to production

## Support

For issues, questions, or contributions:
- Review ROUTES.md for API reference
- Check API_EXAMPLES.md for usage patterns
- See source code in src/routes/*.js
- Review agent code in src/agents/*.js

Happy building! 🚀
