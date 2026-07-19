# RoadPulse Frontend - Architecture Overview

## Project Structure

```
roadpulse/frontend/
├── index.html                          # HTML entry point
├── vite.config.js                      # Vite build configuration
├── package.json                        # Dependencies (React, React Router)
├── .env.example                        # Environment template
├── src/
│   ├── main.jsx                        # React entry point
│   ├── App.jsx                         # Main app (routing)
│   ├── index.css                       # Global styles (700+ lines)
│   ├── pages/                          # Page components
│   │   ├── Home.jsx                    # Landing page (/)
│   │   ├── Login.jsx                   # Auth page (/login)
│   │   ├── ReportForm.jsx              # Multi-step reporter (/report)
│   │   ├── MyReports.jsx               # User reports (/my-reports)
│   │   ├── Dashboard.jsx               # Statistics (/dashboard)
│   │   ├── IncidentDetail.jsx          # Single incident (/incident/:id)
│   │   └── AuthorityQueue.jsx          # Authority console (/authority)
│   ├── components/                     # Reusable components
│   │   ├── Navigation.jsx              # Top nav bar
│   │   ├── CameraCapture.jsx           # Photo capture
│   │   ├── IncidentCard.jsx            # Incident list item
│   │   └── StatCard.jsx                # Statistics card
│   └── api/
│       └── client.js                   # API wrapper (centralized)
└── Documentation/
    ├── README.md                       # Complete documentation
    ├── SETUP_GUIDE.md                  # Setup & testing
    ├── QUICK_REFERENCE.md              # Developer reference
    ├── FRONTEND_SUMMARY.md             # Implementation details
    └── [This file]                     # Architecture overview
```

## Component Hierarchy

```
App (Router, Protected Routes)
│
├── Navigation (sticky top nav)
│   ├── Home link
│   ├── Report link (if authenticated)
│   ├── My Reports link (if authenticated)
│   ├── Dashboard link
│   ├── Authority Queue link (if authority)
│   └── Logout button (if authenticated)
│
└── <Route> (main content)
    ├── Home page
    │   └── StatCard x4 (features)
    │
    ├── Login page
    │   └── Form (email, password)
    │
    ├── ReportForm page (protected)
    │   ├── Step 1: CameraCapture
    │   ├── Step 2: Form inputs
    │   ├── Step 3: Review + StatCard (draft email)
    │   └── Step 4: Success message
    │
    ├── MyReports page (protected)
    │   └── IncidentCard x N
    │
    ├── Dashboard page
    │   ├── Ward selector
    │   ├── StatCard x 3
    │   └── IncidentCard x N
    │
    ├── IncidentDetail page
    │   ├── Incident info
    │   ├── Photo gallery
    │   └── Draft email display
    │
    └── AuthorityQueue page (protected, authority only)
        ├── Incident list
        └── IncidentCard + "Mark Resolved" button
```

## Data Flow

### Authentication Flow
```
Login page
  └─→ authAPI.login(email, password)
      └─→ Backend POST /auth/login
          └─→ Response: {token, user_id, email, role}
              └─→ localStorage.setItem('jwt_token', token)
                  └─→ localStorage.setItem('current_user', user)
                      └─→ Navigate to home page
                          └─→ Navigation updates to show user menu
```

### Report Submission Flow
```
ReportForm page (Step 1-2-3)
  ├─→ Step 1: CameraCapture
  │   └─→ navigator.mediaDevices.getUserMedia()
  │       └─→ User captures 2 photos + GPS
  │
  ├─→ Step 2: Form inputs
  │   └─→ User adds description and location
  │
  ├─→ Step 3: Review
  │   └─→ Display draft email (preview)
  │
  └─→ Submit
      └─→ reportsAPI.submit(reportData)
          └─→ Backend POST /reports
              └─→ Response: {incident_id, draft_email}
                  └─→ Step 4: Show success + email
                      └─→ Navigate to /incident/:id
```

### Incident Management Flow
```
Dashboard page
  └─→ dashboardAPI.getWardStats(ward_id)
      └─→ Backend GET /dashboard/ward/:id
          └─→ Display stats + pending incidents
              └─→ Click IncidentCard
                  └─→ Navigate to /incident/:id
                      └─→ IncidentDetail page
                          └─→ incidentsAPI.getById(id)
                              └─→ Display all info
```

### Authority Workflow
```
AuthorityQueue page
  └─→ incidentsAPI.list({status: 'reported'})
      └─→ Backend GET /incidents?status=reported
          └─→ Display unresolved incidents
              └─→ User clicks "Mark Resolved"
                  └─→ incidentsAPI.updateStatus(id, 'resolved')
                      └─→ Backend PUT /incidents/:id/status
                          └─→ Remove from local list
```

## State Management

### Local Component State (useState)
- Form inputs (email, password, description)
- Loading states
- Error messages
- Data from API responses
- UI toggles (menu open/close)

### Persistent State (localStorage)
- `jwt_token` - JWT token for authentication
- `current_user` - User object {user_id, email, role}

### Session State (React Router)
- Current route/pathname
- Route parameters (:id)
- Query parameters (filters)

**No global state library needed** - React hooks sufficient for this app!

## API Layer Design

```
src/api/client.js
├── Global Config
│   └── API_URL from env or default (localhost:5000)
│
├── Utility Functions
│   ├── getToken() - retrieve JWT from localStorage
│   ├── fetchAPI(endpoint, options) - wrapper with JWT injection
│   └── Auth token setters
│
└── API Groups (exported)
    ├── authAPI
    │   ├── login()
    │   └── register()
    │
    ├── reportsAPI
    │   ├── submit()
    │   ├── getById()
    │   └── getByUser()
    │
    ├── incidentsAPI
    │   ├── list()
    │   ├── getById()
    │   └── updateStatus()
    │
    └── dashboardAPI
        ├── getWardStats()
        └── getPendingIncidents()
```

## Styling Architecture

### CSS Organization (index.css)
```
1. CSS Variables (root)
   - Colors (primary, danger, success, etc.)
   - Shadows
   - Font sizes

2. Base Styles
   - HTML, body, elements
   - Typography
   - Forms

3. Component Styles
   - Cards
   - Buttons
   - Badges
   - Alerts

4. Utility Classes
   - Flexbox (.flex, .flex-col)
   - Spacing (.gap-*, .mt-*, .mb-*)
   - Text (.text-center, .text-small)
   - Responsive (.grid-2, .grid-3)

5. Mobile Breakpoint
   - @media (max-width: 640px)
   - Hamburger menu
   - Single column layouts
   - Font sizing
```

### Color System
```
--primary:        #2563eb (blue)     - CTAs, active states
--primary-dark:   #1d4ed8            - Hover states
--success:        #16a34a (green)    - Resolved, positive
--warning:        #eab308 (yellow)   - Medium severity, caution
--danger:         #dc2626 (red)      - High severity, errors
--secondary:      #64748b (gray)     - Secondary actions

Severity Colors:
  low      → --success (green)
  medium   → --warning (yellow)
  high     → --danger (red)
  critical → #7c2d12 (dark red)

Status Badge Colors:
  reported    → blue background
  routed      → yellow background
  in_progress → blue background
  resolved    → green background
```

## Security Architecture

### Authentication
- JWT token-based (not secure for production, OK for hackathon)
- Token stored in localStorage (accessible to XSS)
- Token included in all API requests via Authorization header
- Backend validates token on every request

### Route Protection
- Client-side route protection with ProtectedRoute wrapper
- Role-based access control (citizen vs authority)
- Redirects to /login if not authenticated
- Redirects to / if wrong role

### Data Handling
- Sensitive data only in localStorage (tokens, user ID)
- No passwords stored client-side
- Photos converted to data URLs (in memory)
- Form inputs cleared on logout

## Performance Optimization

### Bundle Size
- No external CSS frameworks (custom CSS only)
- 3 dependencies only: React, ReactDOM, React Router
- Vite tree-shaking removes unused code
- ~100KB uncompressed, ~20KB gzipped

### Code Splitting
- React Router lazy loading (not explicit, implicit via build)
- Each page is a separate component
- Vite bundles smartly

### Rendering Optimization
- React.StrictMode for development warnings
- useState for local state only
- No unnecessary re-renders
- useEffect for side effects

### Network Optimization
- Single API_URL configuration
- Centralized fetch wrapper (can add caching)
- No unused network requests
- Error responses handled gracefully

## Testing Strategy

### Manual Testing
- Authentication flow
- Form submissions
- Navigation
- Data display
- Error states
- Mobile responsiveness

### Browser Compatibility
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers

### Responsive Design
- Desktop (1200px+)
- Tablet (768px+)
- Mobile (320px+)
- All breakpoints tested visually

## Deployment Architecture

### Development
```
npm run dev
  └─→ Vite dev server on :3000
      └─→ Hot reload enabled
          └─→ Proxy to backend on :5000
```

### Production
```
npm run build
  └─→ Optimized dist/ folder
      └─→ Minified JavaScript
          └─→ Minified CSS
              └─→ Image optimization
                  └─→ Serve with static file server
```

### Environment Configuration
```
.env (git-ignored)
  └─→ REACT_APP_API_URL
      └─→ Used in import.meta.env.REACT_APP_API_URL
```

## Error Handling Architecture

### API Errors
```
fetchAPI() wrapper
  └─→ response.ok check
      └─→ Parse error JSON
          └─→ Throw error
              └─→ Catch in component
                  └─→ setError(err.message)
                      └─→ Display alert to user
```

### Validation Errors
- Form validation on submit
- Display field-level errors
- Show alert for general errors

### Graceful Fallbacks
- Missing photos: show placeholder
- Missing location: use default ward
- Missing email: show generic subject
- Network error: retry or show message

## Browser Feature Usage

### Required Features
- `navigator.mediaDevices.getUserMedia()` - Camera access
- `navigator.geolocation.getCurrentPosition()` - GPS
- `localStorage` - Data persistence
- `fetch()` - HTTP requests
- `Canvas` - Image capture
- `Blob` - Binary data
- `URL.createObjectURL()` - Object URLs

### Fallback Strategies
- Geolocation unavailable: Use default ward
- Camera unavailable: Show error message
- localStorage unavailable: Alert user

## Code Examples

### Using API Client
```javascript
import { incidentsAPI } from '../api/client';

const [incidents, setIncidents] = useState([]);

useEffect(() => {
  const fetch = async () => {
    try {
      const response = await incidentsAPI.list({status: 'reported'});
      setIncidents(response.incidents);
    } catch (err) {
      setError(err.message);
    }
  };
  fetch();
}, []);
```

### Protected Route
```javascript
<Route
  path="/report"
  element={
    <ProtectedRoute>
      <ReportForm />
    </ProtectedRoute>
  }
/>
```

### Conditional Rendering
```javascript
{isAuthenticated() && user.role === 'authority' ? (
  <a href="/authority">Authority Queue</a>
) : null}
```

## Future Architecture Improvements

### Potential Enhancements
1. **State Management** - Add Context API or Redux for complex state
2. **Image Compression** - Reduce photo size before upload
3. **Service Workers** - Offline support
4. **TypeScript** - Type safety
5. **Component Library** - Storybook for documentation
6. **Testing Framework** - Jest + React Testing Library
7. **Error Boundary** - Catch rendering errors
8. **Analytics** - Track user behavior
9. **Map Integration** - Leaflet or Mapbox
10. **Internationalization** - i18n support

## Architecture Strengths

✅ **Simple** - No complex patterns, easy to understand
✅ **Scalable** - Component-based, easy to add features
✅ **Responsive** - Works on all devices
✅ **Maintainable** - Centralized API, consistent patterns
✅ **Performant** - Small bundle, efficient rendering
✅ **Accessible** - Semantic HTML, ARIA attributes
✅ **Documented** - Comprehensive README and guides

## Architecture Limitations

⚠️ **No Offline** - Requires network connection
⚠️ **localStorage** - Not secure for sensitive data
⚠️ **No Caching** - Every request hits backend
⚠️ **No Real-time** - No WebSocket updates
⚠️ **No Virtualization** - Long lists could be slow
⚠️ **No Error Boundary** - Unhandled errors crash app

---

This architecture balances simplicity, functionality, and performance for a hackathon prototype. It can be evolved into a production application with the enhancements listed above.
