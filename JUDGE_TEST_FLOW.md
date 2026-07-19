# RoadPulse: Judge's Test Flow

**Exact steps to verify all 10 hackathon features are working**

This guide walks you through each feature with:
- **What to do** (UI clicks & inputs)
- **Expected result** (what you'll see)
- **Database state** (proof it worked)

**Estimated time: 5–7 minutes**

---

## Prerequisites

✓ Both servers running (see [QUICKSTART.md](./QUICKSTART.md))
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

✓ Browser open to `http://localhost:5173`

---

## **Feature 1: Citizen Reports an Issue with Photos**

**What to do:**
1. On the home page, click **"Report an Issue"**
   - If prompted to log in, use: `citizen@roadpulse.local` / `password123`
2. Fill in the form:
   - **Description:** "Large pothole at Main St"
   - **Latitude:** `40.7128` (example)
   - **Longitude:** `-74.0060` (example)
   - **Photos:** Upload 1–2 images (any image file)
   - Click **"Submit Report"**

**Expected result:**
- Green success message: "Report submitted successfully!"
- Shows Issue Type: `pothole` (or auto-classified result)
- Shows Severity: `high` or similar
- Shows Landmark: `Manhattan area` or nearest landmark
- Button: **"View Incident"** or **"My Reports"**

**Database state:**
Check via `psql postgresql://postgres:postgres@localhost:5432/roadpulse`:
```sql
SELECT id, issue_type, severity, landmark_description, report_count 
FROM incidents 
ORDER BY created_at DESC LIMIT 1;
```
Expected: 1 row with `issue_type='pothole'`, `report_count=1`

---

## **Feature 2: Auto-Classification (Vision Agent)**

**What to do:**
1. Still in the report form, submit another report:
   - **Description:** "Accident on Broadway"
   - **Latitude:** `40.7150`
   - **Longitude:** `-74.0055`
   - **Photos:** Upload 1 image
   - Click **"Submit Report"**

**Expected result:**
- Issue Type automatically detected (e.g., `accident`, `traffic_congestion`, etc.)
- Severity assigned (e.g., `critical` for accident)
- This proves the classification agent worked

**Database state:**
```sql
SELECT issue_type, severity, created_at 
FROM incidents 
ORDER BY created_at DESC LIMIT 2;
```
Expected: 2 rows; second row has a classified `issue_type`

---

## **Feature 3: Auto-Landmark Detection (Landmark Agent)**

**What to do:**
1. Submit a new report (from Feature 1 or 2)
2. On success screen, note the **Landmark** field

**Expected result:**
- Shows human-readable location: `"Manhattan area"`, `"Times Square, New York"`, or fallback like `"Ward 1 area"`
- Landmark is retrieved from Google Places API (or graceful fallback)

**Database state:**
```sql
SELECT landmark_description 
FROM incidents 
ORDER BY created_at DESC LIMIT 1;
```
Expected: Non-empty string with location name

---

## **Feature 4: Duplicate Detection & Merging (Clustering Agent)**

**What to do:**
1. Submit a **near-duplicate** report:
   - **Description:** "Pothole on Main Street"
   - **Latitude:** `40.7129` (very close to Feature 1's 40.7128)
   - **Longitude:** `-74.0061` (very close to Feature 1's -74.0060)
   - **Photos:** Upload an image
   - Click **"Submit Report"**

**Expected result:**
- Success message says: "Report submitted and merged into existing incident"
- OR success shows: "Incident ID: [same ID as Feature 1]"
- Same incident shown, but **report_count increased**

**Database state:**
```sql
SELECT id, report_count, created_at 
FROM incidents 
ORDER BY created_at ASC LIMIT 1;
```
Expected: Original incident now has `report_count=2`

```sql
SELECT COUNT(*) FROM incident_reports WHERE incident_id = '[incident_id_from_above]';
```
Expected: Result = 2 (two reports now linked to one incident)

---

## **Feature 5: Automatic Department Routing (Routing Agent)**

**What to do:**
1. After submitting report(s), navigate to **"Authority Dashboard"** (login if needed with `authority@roadpulse.local`)
2. View the incident queue

**Expected result:**
- Incidents are shown with assigned **Department** (e.g., "Pothole Repair", "Traffic Management")
- Each `issue_type` is routed to the correct department

**Database state:**
```sql
SELECT issue_type, department 
FROM incidents 
ORDER BY created_at DESC LIMIT 1;
```
Expected: Incident has a `department` value assigned

---

## **Feature 6: Incident Queue for Authorities**

**What to do:**
1. You're on the Authority Dashboard
2. Scroll through the list of incidents
3. Note the status badges (e.g., "Reported", "Routed", "In Progress")

**Expected result:**
- See all incidents with:
  - Issue type
  - Severity (colored badge: red=critical, orange=high, yellow=medium, green=low)
  - Report count ("3 reports")
  - Landmark
  - Status

**Database state:**
```sql
SELECT COUNT(*) FROM incidents WHERE status='reported';
```
Expected: At least 1 row (incidents awaiting review)

---

## **Feature 7: Update Incident Status (Authority Action)**

**What to do:**
1. On the Authority Dashboard, click any incident
2. Click **"Update Status"** or **"Resolve"** button
3. Change status to **"In Progress"** → then to **"Resolved"**

**Expected result:**
- Incident card updates to show new status
- Success message: "Status updated to Resolved"
- Incident no longer appears in "Reported" section (or moves to resolved)

**Database state:**
```sql
SELECT id, status, updated_at 
FROM incidents 
WHERE id = '[the_incident_you_just_updated]';
```
Expected: `status='resolved'` and `updated_at` is recent

---

## **Feature 8: Auto-Draft Complaint Email (Email Agent)**

**What to do:**
1. Submit a new report (or check an existing one)
2. On the success/detail page, look for **"Draft Email"** section
3. Email should be visible/copyable

**Expected result:**
- Shows a formal complaint email:
  ```
  Subject: Road Issue Report - [Issue Type]
  
  Dear [Department],
  
  I am writing to report a [severity] [issue_type] at [landmark].
  
  Location: [coordinates]
  
  ...
  ```
- Email is ready to send to the assigned department

**Database state:**
Check the **reports** table for the `draft_email` field (if stored):
```sql
SELECT id, issue_type, landmark_description 
FROM reports 
ORDER BY created_at DESC LIMIT 1;
```
(Email draft is generated on-the-fly; not necessarily stored, but appears in API response)

---

## **Feature 9: Public Dashboard (Stats & Visibility)**

**What to do:**
1. Navigate to **"View Dashboard"** (public page, no auth needed)
2. Scroll to see stats

**Expected result:**
- Shows:
  - Total incidents reported
  - Total reports submitted
  - Incidents by severity (pie chart or breakdown)
  - Incidents by status (reported, in_progress, resolved)
  - Pending incidents list with details

**Database state:**
```sql
SELECT 
  COUNT(DISTINCT id) as total_incidents,
  SUM(report_count) as total_reports,
  COUNT(CASE WHEN status='resolved' THEN 1 END) as resolved
FROM incidents;
```
Expected: Numbers match dashboard display

---

## **Feature 10: Graceful Fallbacks (Error Resilience)**

**What to do:**
1. Submit report(s) with demo API keys (no real Google/Vision API calls)
2. Observe that:
   - Reports still submit successfully
   - Classifications don't fail (uses `"unclassified"` fallback)
   - Landmarks don't fail (uses `"<Ward> area"` fallback)
   - Routing still works (maps to departments)

**Expected result:**
- All 10 features work even without real API keys
- No crashes or 500 errors
- Fallback values are graceful and reasonable

**Database state:**
```sql
SELECT issue_type, severity, landmark_description 
FROM incidents 
WHERE issue_type='unclassified' OR landmark_description LIKE '%area%';
```
Expected: Some rows with fallback values (proving graceful degradation works)

---

## **Full Flow: From Report to Resolution**

Here's a complete 60-second demo:

1. **Login as citizen** → Report an issue (pothole, add photo, click submit)
2. **See auto-classification & landmark** → Green success message with details
3. **Submit near-duplicate** → See merge/clustering happen (report_count +1)
4. **Login as authority** → View dashboard with incident queue
5. **Click incident** → Update status to "Resolved"
6. **Return to public dashboard** → See resolved count increase

---

## **Verification Checklist**

Use this checklist to verify all 10 features:

- [ ] Feature 1: Citizen can submit report with photo(s)
- [ ] Feature 2: Auto-classification assigns issue_type & severity
- [ ] Feature 3: Landmark auto-detected from coordinates
- [ ] Feature 4: Duplicate nearby reports merge (clustering)
- [ ] Feature 5: Issue routed to correct department
- [ ] Feature 6: Authority sees incident queue
- [ ] Feature 7: Authority can update incident status
- [ ] Feature 8: Draft complaint email generated
- [ ] Feature 9: Public dashboard shows stats & incidents
- [ ] Feature 10: All features work with demo/fallback API keys

---

## **Troubleshooting During Demo**

| Issue | Solution |
|-------|----------|
| Login fails | Check credentials: `authority@roadpulse.local` / `password123` |
| Photos don't upload | Check browser console (F12) for errors; ensure backend is running |
| Issue type shows "unclassified" | Expected with demo keys; system has graceful fallback |
| Landmark shows "<Ward> area" | Expected fallback when Google Places returns no results |
| Dashboard is empty | Submit at least 1 report first |
| Status update button not working | Ensure you're logged in as authority |

---

## **Next Steps**

- ✅ All features verified?
- 📖 Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design details
- 🧪 Run backend tests: `cd backend && npm test`
- 📊 Check [backend/AGENTS_SETUP.md](./backend/AGENTS_SETUP.md) for agent implementation details

**Congratulations! You've verified all 10 RoadPulse features.** 🎉
