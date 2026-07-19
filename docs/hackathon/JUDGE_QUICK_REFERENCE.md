# RoadPulse: Judge's Quick Reference Card

**Demo Time**: 5–7 minutes  
**Credentials**: See setup guide

---

## The 10 Required Features

| # | Feature | How to Test | Expected Result |
|---|---------|-------------|-----------------|
| 1 | **Citizen Reports Issue** | Login as citizen → Click "Report an Issue" → Fill form (description, coords, photo) → Submit | Green success message with incident ID, auto-detected issue type, severity, landmark |
| 2 | **Auto-Classification** | Report shows issue_type (e.g., "pothole", "accident") instead of "unclassified" | Issue type auto-detected from photo/text (Vision Agent) |
| 3 | **Landmark Detection** | Report shows human-readable location (e.g., "Times Square, NYC") | Landmark retrieved from GPS coordinates (Landmark Agent) |
| 4 | **Duplicate Clustering** | Submit 2 reports at same location (lat/lng within 0.001°) | Second report merges into first; incident's report_count increases |
| 5 | **Department Routing** | Login as authority → View queue → Check incident | Incident has assigned department (e.g., "Pothole Repair") |
| 6 | **Authority Queue** | Login as authority → "Authority Queue" button visible → Click | See list of incidents by status (Reported, In Progress, Resolved) |
| 7 | **Status Updates** | Click incident in authority queue → Update status dropdown | Can change status; incident moves or hides based on new status |
| 8 | **Email Draft** | On report success page or incident detail → Look for email section | Formal complaint email generated and ready to copy/send |
| 9 | **Public Dashboard** | Click "View Dashboard" (no auth) → Select ward | Shows stats: total incidents, resolved count, pending count, severity breakdown |
| 10 | **Graceful Fallbacks** | Use system with demo API keys (no real Google/Vision APIs) | All 10 features work; no crashes; fallback values shown (e.g., "Ward-A area" if landmark fails) |

---

## 60-Second Demo Flow

1. **[30 sec] Citizen Side**
   - Home → Login as `citizen@roadpulse.local` / `password123`
   - Report an Issue → Fill in description, upload photo, submit
   - See success with auto-detected type, severity, landmark

2. **[20 sec] Authority Side**
   - Logout → Login as `authority@roadpulse.local` / `password123`
   - Navigate to Authority Queue
   - Click incident → Update status to "Resolved"

3. **[10 sec] Public View**
   - Logout
   - Click "View Dashboard"
   - See stats updated (resolved count increased)

---

## Demo Credentials

```
Authority:  authority@roadpulse.local / password123
Citizen:    citizen@roadpulse.local / password123
```

---

## Server URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

---

## Key Endpoints to Know

| Endpoint | Method | What It Does |
|----------|--------|--------------|
| `/auth/login` | POST | User login (returns JWT token) |
| `/reports` | POST | Submit a report with photos |
| `/incidents` | GET | List all incidents (paginated) |
| `/incidents/:id/status` | PUT | Update incident status |
| `/dashboard/ward/:ward_id` | GET | Get ward stats |
| `/dashboard/pending` | GET | Get pending (escalation-flagged) incidents |

---

## Database Verification (Optional)

If you want to verify database state during demo:

```bash
# In another terminal, connect to database
psql postgresql://postgres:postgres@localhost:5432/roadpulse

# Check incidents
SELECT id, issue_type, severity, landmark_description, report_count 
FROM incidents 
ORDER BY created_at DESC LIMIT 5;

# Check if clustering worked (same incident, 2+ reports)
SELECT i.id, COUNT(r.id) as report_count 
FROM incidents i 
LEFT JOIN incident_reports ir ON i.id = ir.incident_id 
LEFT JOIN reports r ON ir.report_id = r.id 
GROUP BY i.id 
HAVING COUNT(r.id) > 1;
```

---

## Troubleshooting During Demo

| Problem | Fix |
|---------|-----|
| Login fails | Check credentials are exact: `@roadpulse.local` (not `.local`) |
| Photo upload doesn't work | Check browser console (F12) for errors; ensure backend is running |
| Issue type shows "unclassified" | ✅ Normal with demo API keys; system has graceful fallback |
| Landmark shows "Ward-X area" | ✅ Normal with demo API keys; fallback is working |
| Authority Queue shows no incidents | Submit at least 1 report first (feature 1) |
| Status update button not working | Ensure you're logged in as authority AND incident exists |
| Database connection failed | Check PostgreSQL is running: `brew services start postgresql@15` |

---

## Feature Interaction Diagram

```
Citizen Report (Feature 1)
    ↓
Classification Agent (Feature 2) → issue_type, severity
    ↓
Landmark Agent (Feature 3) → landmark_description
    ↓
Clustering Agent (Feature 4) → detect duplicates, merge reports
    ↓
Routing Agent (Feature 5) → assign department
    ↓
Store in Database
    ↓
Authority Views Queue (Feature 6)
    ↓
Authority Updates Status (Feature 7)
    ↓
Email Agent (Feature 8) → draft email
    ↓
Public Dashboard (Feature 9) → shows stats
    ↓
All features work with fallbacks (Feature 10)
```

---

## Severity Color Legend

- 🔴 **Critical** (red) - Accident, major hazard
- 🟠 **High** (orange) - Large pothole, flooding
- 🟡 **Medium** (yellow) - Minor damage, debris
- 🟢 **Low** (green) - Cosmetic issue, marking

---

## Success Indicators

✅ You'll know the demo is working when you see:

1. Citizen can submit report without errors
2. Report success page shows auto-detected values (not all defaults)
3. Authority can view the incident in their queue
4. Status can be changed and persists
5. Public dashboard updates after status change
6. No 500 errors in browser console or terminal
7. Database shows related incidents merged (report_count > 1)

**All 10 features confirmed = Demo Success! 🎉**

---

## Pro Tips

- 📸 Use any image file (PNG, JPG) for photo upload
- 📍 Use demo coordinates: lat=40.7128, lng=-74.0060 (NYC area)
- 🏘️ System has 3 wards: Ward-A (Downtown), Ward-B (East Side), Ward-C (Suburbs)
- 🚗 Use keywords like "pothole", "accident", "flooding" in descriptions for better classification
- 📊 Dashboard works without login (public access)
- 🔐 Authority role gets extra "Authority Queue" button on home page
