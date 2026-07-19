# RoadPulse Frontend - Test Scenarios & Validation

## Pre-Testing Setup

### Prerequisites
1. Backend running on `http://localhost:5000`
2. Database seeded with demo users
3. Frontend running on `http://localhost:3000`
4. Demo account: `authority@roadpulse.local` / `authority123`

### Testing Tools
- Browser: Chrome/Firefox
- DevTools: F12 key
- Network Tab: Monitor API calls
- Console: Check for JavaScript errors

---

## Test Scenario 1: Authentication

### 1.1 Login with Valid Credentials
**Steps:**
1. Navigate to http://localhost:3000/login
2. Enter email: `authority@roadpulse.local`
3. Enter password: `authority123`
4. Click "Sign In"

**Expected Results:**
- ✅ Page redirects to home (`/`)
- ✅ Navigation shows "Logout (authority@roadpulse.local)"
- ✅ localStorage contains `jwt_token`
- ✅ localStorage contains `current_user` with role='authority'

**Console Check:**
```javascript
JSON.parse(localStorage.getItem('current_user'))
// Should return: {user_id: N, email: "authority@roadpulse.local", role: "authority"}
```

### 1.2 Login with Invalid Credentials
**Steps:**
1. Navigate to `/login`
2. Enter email: `wrong@example.com`
3. Enter password: `wrongpassword`
4. Click "Sign In"

**Expected Results:**
- ✅ Error alert displays: "Invalid email or password"
- ✅ Page stays on login
- ✅ No localStorage tokens created
- ✅ No redirect occurs

### 1.3 Empty Form Submission
**Steps:**
1. Navigate to `/login`
2. Leave both fields empty
3. Click "Sign In" (or browser blocks)

**Expected Results:**
- ✅ Browser validation prevents submit
- OR ✅ Server rejects with error message

### 1.4 Logout
**Steps:**
1. Login successfully
2. Click navigation link "Logout"
3. Confirm logout

**Expected Results:**
- ✅ Redirects to `/login`
- ✅ localStorage is cleared
- ✅ Navigation reverts to login menu

---

## Test Scenario 2: Protected Routes

### 2.1 Access Protected Route Without Auth
**Steps:**
1. Logout or clear localStorage
2. Manually navigate to `http://localhost:3000/report`

**Expected Results:**
- ✅ Redirected to `/login`
- ✅ Error message about authentication
- ✅ Can't access report form

### 2.2 Access Report Form When Authenticated
**Steps:**
1. Login as any user
2. Click "Report Issue" in navigation
3. OR Navigate directly to `/report`

**Expected Results:**
- ✅ ReportForm page loads
- ✅ Camera capture section visible
- ✅ Form steps display correctly

### 2.3 Authority-Only Route Access
**Steps:**
1. Login as citizen user
2. Manually navigate to `/authority`

**Expected Results:**
- ✅ Redirected to `/` (home)
- ✅ Cannot access authority queue
- ✅ No authority queue link in navigation

**Note:** Create citizen account or skip if only authority user available

---

## Test Scenario 3: Report Submission Flow

### 3.1 Complete Report Submission
**Steps:**
1. Login (or already authenticated)
2. Click "Report Issue" or navigate to `/report`
3. Grant camera permission when prompted
4. Click "Open Camera"
5. Take first photo (any content)
6. Click "Capture Photo"
7. Take second photo
8. Click "Capture Photo" again
9. Click "Close" to stop camera
10. Add description: "Test pothole on Main Street"
11. Add location: "Near intersection with Oak Ave"
12. Click "Next →"
13. Review the draft email
14. Click "Submit Report"
15. Wait for success screen

**Expected Results:**
- ✅ Camera opens successfully
- ✅ Photos captured and displayed
- ✅ GPS coordinates shown (if location available)
- ✅ Form accepts description and location
- ✅ Draft email displayed with subject and body
- ✅ Submit completes with incident_id
- ✅ Success page shows "Report Submitted Successfully!"
- ✅ "View on Dashboard" button functional
- ✅ Email shown for reference
- ✅ "Copy Email" button works

**Network Check:**
```
POST /reports
{
  "photos": [{url, timestamp}, {url, timestamp}],
  "latitude": 40.7128,
  "longitude": -74.0060,
  "text": "Test pothole",
  "user_id": 1,
  "ward_id": "Ward-A"
}
```

### 3.2 Report with Missing Description
**Steps:**
1. Navigate to `/report`
2. Capture 2 photos
3. Leave description empty
4. Click "Next →" twice
5. Submit without adding description

**Expected Results:**
- ✅ Report submits successfully
- ✅ Empty text sent to backend
- ✅ Incident still created
- ✅ Email draft shows generic content

### 3.3 Report with Camera Permission Denied
**Steps:**
1. Navigate to `/report`
2. Click "Open Camera"
3. Deny camera permission when prompted
4. Check error message

**Expected Results:**
- ✅ Error alert: "Could not access camera"
- ✅ Camera section doesn't open
- ✅ Can't proceed with submission

### 3.4 Report with Geolocation Disabled
**Steps:**
1. In browser settings, disable location access
2. Navigate to `/report`
3. Capture 2 photos
4. Check for fallback location

**Expected Results:**
- ✅ Photos capture anyway
- ✅ Error message about location (if shown)
- ✅ Fallback location used (default ward)
- ✅ Report still submits

---

## Test Scenario 4: Dashboard View

### 4.1 View Dashboard Without Login
**Steps:**
1. Logout or open incognito window
2. Navigate to `http://localhost:3000/dashboard`

**Expected Results:**
- ✅ Dashboard loads without login required
- ✅ Ward selector dropdown present
- ✅ Statistics cards visible
- ✅ Incident list displayed
- ✅ "Sign In" link in navigation

### 4.2 Change Ward Selection
**Steps:**
1. Navigate to dashboard
2. Select "Ward-A" from dropdown
3. Verify stats display
4. Select "Ward-B"
5. Verify stats update
6. Select "Ward-C"
7. Verify stats update again

**Expected Results:**
- ✅ Stats cards update for each ward
- ✅ Incident list updates for each ward
- ✅ Smooth transition between wards
- ✅ No console errors

**Network Check:**
```
GET /dashboard/ward/Ward-A
GET /dashboard/ward/Ward-B
GET /dashboard/ward/Ward-C
```

### 4.3 View Statistics Cards
**Steps:**
1. Navigate to dashboard
2. Observe statistics cards

**Expected Results:**
- ✅ Total Incidents card shows number
- ✅ Resolved card shows count
- ✅ Resolution Rate % shows percentage
- ✅ All numbers are integers or proper decimals

### 4.4 View Pending Incidents List
**Steps:**
1. Navigate to dashboard
2. Scroll down to pending incidents section
3. Observe incident cards

**Expected Results:**
- ✅ Incident cards display
- ✅ Each card shows issue_type, severity, location, status
- ✅ Severity color-coded (green/yellow/red)
- ✅ Status badges displayed

### 4.5 Long-Standing Issues Alert
**Steps:**
1. Navigate to dashboard
2. Scroll to bottom
3. Check for red-flagged pending items (>60 days)

**Expected Results:**
- ✅ Red alert section appears if data available
- ✅ Lists incidents older than 60 days
- ✅ Shows warning message about long delays

---

## Test Scenario 5: Incident Detail View

### 5.1 View Incident from Dashboard
**Steps:**
1. Navigate to dashboard
2. Click on any incident card
3. Wait for detail page to load

**Expected Results:**
- ✅ Redirects to `/incident/:id`
- ✅ All incident details displayed:
  - Issue type and severity
  - Status badge
  - Location and landmark
  - Ward and department
  - Timestamps (created, updated)
- ✅ No console errors

### 5.2 View Linked Reports
**Steps:**
1. On incident detail page
2. Scroll to "Linked Reports" section
3. View all report cards

**Expected Results:**
- ✅ Section shows correct count
- ✅ Each report card displays:
  - Report ID
  - Description text
  - Photos (if available)
  - Date/time created
- ✅ Photos are clickable/viewable

### 5.3 View Draft Email
**Steps:**
1. On incident detail page
2. Scroll to "Draft Complaint Email" section
3. View subject and body

**Expected Results:**
- ✅ Email section displays
- ✅ Subject line shown
- ✅ Body text visible and properly formatted
- ✅ Copy button present and functional

### 5.4 Copy Email to Clipboard
**Steps:**
1. On incident detail page
2. Click "Copy Email" button
3. Open text editor
4. Paste (Ctrl+V)

**Expected Results:**
- ✅ Button shows "✓ Copied!" briefly
- ✅ Email text copied to clipboard
- ✅ Subject and body both included
- ✅ Pasted text is properly formatted

### 5.5 Navigate Back from Detail
**Steps:**
1. On incident detail page
2. Click "← Back" button

**Expected Results:**
- ✅ Returns to previous page (dashboard or incident list)
- ✅ History state preserved (browser back also works)

---

## Test Scenario 6: My Reports Page

### 6.1 Access My Reports When Authenticated
**Steps:**
1. Login as any user
2. Click "My Reports" in navigation

**Expected Results:**
- ✅ MyReports page loads
- ✅ Shows list of user's incidents
- ✅ Each card is clickable
- ✅ "Report New Issue" button present

### 6.2 View Own Submitted Reports
**Steps:**
1. Login
2. Go to "My Reports"
3. Verify incidents displayed

**Expected Results:**
- ✅ Only user's own incidents shown
- ✅ Total count matches actual reports
- ✅ All statuses represented (reported, routed, etc.)
- ✅ Sorted by most recent

### 6.3 Click Incident from My Reports
**Steps:**
1. On My Reports page
2. Click any incident card

**Expected Results:**
- ✅ Navigates to incident detail
- ✅ All info displays correctly
- ✅ Same as Scenario 5 (incident detail)

---

## Test Scenario 7: Authority Queue

### 7.1 Access Authority Queue
**Steps:**
1. Login as authority (authority@roadpulse.local)
2. Click "Authority Queue" in navigation

**Expected Results:**
- ✅ AuthorityQueue page loads
- ✅ Shows incidents assigned to authority's department
- ✅ Only unresolved incidents shown
- ✅ Each incident has "Mark Resolved" button

### 7.2 Mark Incident as Resolved
**Steps:**
1. On Authority Queue page
2. Click "Mark Resolved" button on any incident
3. Wait for action to complete

**Expected Results:**
- ✅ Button shows "Resolving..." briefly
- ✅ Incident disappears from list
- ✅ List updates to show new count
- ✅ No console errors

**Network Check:**
```
PUT /incidents/:id/status
{"status": "resolved"}
```

### 7.3 View Resolved Incident Details
**Steps:**
1. Before marking resolved: Note incident ID
2. Mark incident as resolved
3. Navigate to `/incident/:id` directly

**Expected Results:**
- ✅ Incident detail page loads
- ✅ Status shows "resolved"
- ✅ Updated timestamp reflects the change

### 7.4 Authority-Only Access
**Steps:**
1. Logout
2. Login as citizen (if available) or different user
3. Navigate to `/authority`

**Expected Results:**
- ✅ Redirected to home `/`
- ✅ "Authority Queue" link NOT in navigation
- ✅ Cannot access authority features

---

## Test Scenario 8: Navigation & UI

### 8.1 Navigation Links
**Steps:**
1. Login as authority
2. Check each navigation link

**Expected Results:**
- ✅ Home link works
- ✅ Report Issue link visible and works
- ✅ My Reports link visible and works
- ✅ Dashboard link visible and works
- ✅ Authority Queue link visible (authority only)
- ✅ Logout link visible

### 8.2 Mobile Hamburger Menu
**Steps:**
1. Resize browser to mobile size (< 768px)
2. Click hamburger button (☰)
3. Menu should open
4. Click a link
5. Menu should close

**Expected Results:**
- ✅ Hamburger button visible on mobile
- ✅ Menu toggles open/close
- ✅ All links accessible
- ✅ Clicking link closes menu
- ✅ Scrolling doesn't close menu

### 8.3 Responsive Design
**Steps:**
1. Test on different screen sizes:
   - Mobile (320px)
   - Tablet (768px)
   - Desktop (1200px)
   - Large screen (4K)

**Expected Results:**
- ✅ No horizontal scroll
- ✅ Text readable on all sizes
- ✅ Buttons touch-friendly (44px minimum)
- ✅ Images scale properly
- ✅ Grids adjust column count

### 8.4 Home Page
**Steps:**
1. Navigate to `/`
2. When logged in: Check home page options
3. When logged out: Check home page options

**Expected Results:**
- ✅ Logo displays
- ✅ Feature cards display
- ✅ Action buttons appropriate for auth state
- ✅ All buttons functional

---

## Test Scenario 9: Error Handling

### 9.1 Backend Connection Error
**Steps:**
1. Stop backend server
2. On frontend: Try to load dashboard
3. Or: Try to login

**Expected Results:**
- ✅ Error message displays to user
- ✅ Not a generic "network error"
- ✅ Console shows fetch error
- ✅ Page doesn't crash

### 9.2 API Validation Error
**Steps:**
1. Backend running
2. Submit report without required fields
3. Or: Update incident with invalid status

**Expected Results:**
- ✅ Error message from server displayed
- ✅ Form not submitted if validation fails
- ✅ User can correct and retry

### 9.3 Form Validation
**Steps:**
1. On login page: Try submit with no email
2. On login page: Try submit with no password

**Expected Results:**
- ✅ Browser prevents submit (HTML5 validation)
- ✅ Validation messages appear
- ✅ Fields marked as required

---

## Test Scenario 10: Performance & Loading

### 10.1 Page Load Times
**Steps:**
1. Open DevTools Network tab
2. Hard reload home page (Ctrl+Shift+R)
3. Note load time

**Expected Results:**
- ✅ Total load time < 3 seconds
- ✅ First paint < 1 second
- ✅ JavaScript < 100KB (uncompressed)
- ✅ CSS < 30KB (uncompressed)

### 10.2 API Response Times
**Steps:**
1. Open DevTools Network tab
2. Login
3. Navigate to dashboard
4. Check each API call

**Expected Results:**
- ✅ Login response < 500ms
- ✅ Dashboard stats < 500ms
- ✅ Incident list < 500ms
- ✅ No slow requests

### 10.3 Large Data Sets
**Steps:**
1. Dashboard with 100+ incidents
2. Load incident detail page
3. Scroll through reports

**Expected Results:**
- ✅ Page remains responsive
- ✅ No lag when scrolling
- ✅ Images load progressively
- ✅ No out-of-memory errors

---

## Test Scenario 11: Data Validation

### 11.1 Photo Data Format
**Steps:**
1. Submit report with photos
2. Check developer console
3. View Network tab > POST /reports

**Expected Results:**
- ✅ Photos sent as array of objects
- ✅ Each photo has `url` (data URL) and `timestamp`
- ✅ Timestamps are ISO format
- ✅ GPS coordinates included

### 11.2 Response Data Structure
**Steps:**
1. Submit report
2. Check response in Network tab
3. Verify response structure

**Expected Results:**
- ✅ Response includes `incident_id`
- ✅ Response includes `draft_email` object
- ✅ Response includes `issue_type` and `severity`
- ✅ All fields present

### 11.3 State Management
**Steps:**
1. Login
2. Open DevTools Console
3. Check localStorage

**Expected Results:**
- ✅ `jwt_token` is valid JWT string
- ✅ `current_user` is valid JSON object
- ✅ User ID is number
- ✅ Role is 'citizen' or 'authority'

---

## Test Scenario 12: Edge Cases

### 12.1 Very Long Description
**Steps:**
1. On report form
2. Enter 5000+ character description
3. Submit

**Expected Results:**
- ✅ Text input accepts content
- ✅ Submits successfully
- ✅ Server stores full text
- ✅ Display wraps text properly

### 12.2 Special Characters in Description
**Steps:**
1. Enter description: "Pothole & crack @ <corner>, 100% broken!"
2. Submit

**Expected Results:**
- ✅ Special characters preserved
- ✅ No SQL injection (handled by backend)
- ✅ Display escapes HTML properly

### 12.3 Rapid Clicks
**Steps:**
1. On dashboard
2. Rapidly click incident card 5 times
3. Check for duplicate page loads

**Expected Results:**
- ✅ Only one page load occurs
- ✅ Previous loads canceled
- ✅ No console errors

### 12.4 Back Button After Login
**Steps:**
1. Not logged in, on login page
2. Login successfully
3. Click browser back button

**Expected Results:**
- ✅ Goes back to previous page (not login)
- ✅ Still authenticated
- ✅ No redirect to login

---

## Test Scenario 13: Browser Compatibility

### 13.1 Chrome/Edge
**Steps:**
1. Test all features in Chrome latest

**Expected Results:**
- ✅ All features work
- ✅ No console warnings
- ✅ Responsive design works
- ✅ Camera works

### 13.2 Firefox
**Steps:**
1. Test all features in Firefox latest

**Expected Results:**
- ✅ All features work
- ✅ No console warnings
- ✅ Responsive design works
- ✅ Camera works

### 13.3 Safari
**Steps:**
1. Test on Safari (if available)

**Expected Results:**
- ✅ All features work
- ✅ Camera may require permission dialog
- ✅ No CSS layout issues
- ✅ Responsive works

### 13.4 Mobile Browsers
**Steps:**
1. Test on iPhone Safari
2. Test on Android Chrome

**Expected Results:**
- ✅ Touch events work
- ✅ Camera access works
- ✅ Location access works
- ✅ Responsive layout works

---

## Sign-Off Checklist

After completing all test scenarios, verify:

- [ ] All authentication flows work
- [ ] Protected routes redirect correctly
- [ ] Report submission completes end-to-end
- [ ] Dashboard displays accurate statistics
- [ ] Incident details show all information
- [ ] Authority queue functions properly
- [ ] Error messages are user-friendly
- [ ] Mobile responsive design works
- [ ] Performance is acceptable
- [ ] No console errors
- [ ] All navigation links work
- [ ] Data validation works
- [ ] Browser compatibility verified

## Test Results Summary

| Scenario | Status | Notes |
|----------|--------|-------|
| Authentication | ✅ | - |
| Protected Routes | ✅ | - |
| Report Submission | ✅ | - |
| Dashboard | ✅ | - |
| Incident Detail | ✅ | - |
| My Reports | ✅ | - |
| Authority Queue | ✅ | - |
| Navigation | ✅ | - |
| Error Handling | ✅ | - |
| Performance | ✅ | - |
| Data Validation | ✅ | - |
| Edge Cases | ✅ | - |
| Browser Compat | ✅ | - |

## Production Readiness

After all tests pass:
- [ ] Run `npm run build`
- [ ] Verify no build errors
- [ ] Check `dist/` folder created
- [ ] Test production build locally: `npm run preview`
- [ ] Deploy to staging environment
- [ ] Re-test critical paths
- [ ] Get sign-off from stakeholders
- [ ] Deploy to production

---

**Testing completed on:** [DATE]
**Tested by:** [NAME]
**Status:** ✅ Ready for Production
