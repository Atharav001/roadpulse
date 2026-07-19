# RoadPulse Frontend - Quick Reference Guide

## Quick Start (3 steps)
```bash
cd roadpulse/frontend
npm install
npm run dev  # Starts on http://localhost:3000
```

## Demo Login
- **Email:** authority@roadpulse.local
- **Password:** authority123

## File Quick Lookup

### Find Page for Route
| Route | File |
|-------|------|
| `/` | `pages/Home.jsx` |
| `/login` | `pages/Login.jsx` |
| `/report` | `pages/ReportForm.jsx` |
| `/my-reports` | `pages/MyReports.jsx` |
| `/dashboard` | `pages/Dashboard.jsx` |
| `/incident/:id` | `pages/IncidentDetail.jsx` |
| `/authority` | `pages/AuthorityQueue.jsx` |

### Find Component
| Component | File |
|-----------|------|
| Photo capture | `components/CameraCapture.jsx` |
| Stat card | `components/StatCard.jsx` |
| Incident card | `components/IncidentCard.jsx` |
| Navigation | `components/Navigation.jsx` |

### API Methods
```javascript
import { authAPI, reportsAPI, incidentsAPI, dashboardAPI } from './api/client';

// Auth
authAPI.login(email, password)
authAPI.register(email, password, role)

// Reports
reportsAPI.submit({photos, latitude, longitude, text, user_id, ward_id})
reportsAPI.getById(reportId)

// Incidents
incidentsAPI.list({status, ward_id, department, limit, offset})
incidentsAPI.getById(incidentId)
incidentsAPI.updateStatus(incidentId, status)

// Dashboard
dashboardAPI.getWardStats(wardId)
dashboardAPI.getPendingIncidents()
```

## Common Tasks

### Add a New Page
1. Create `src/pages/NewPage.jsx`
2. Add import in `App.jsx`
3. Add route in `<Routes>`

### Add a New Component
1. Create `src/components/NewComponent.jsx`
2. Import in page/component where needed
3. Export default function

### Fix Styling
- Mobile first: edit base styles in `index.css`
- Component specific: use inline `style={{...}}`
- Colors: use CSS variables (--primary, --danger, etc.)
- Responsive: add @media queries in `index.css`

### Change API Endpoint
- Edit `src/api/client.js`
- All endpoints in one file
- Search and replace across frontend

### Add Protected Route
```jsx
<Route
  path="/new-protected"
  element={
    <ProtectedRoute requiredRole="authority">
      <MyComponent />
    </ProtectedRoute>
  }
/>
```

### Debug API Calls
```javascript
// Browser console:
localStorage.getItem('jwt_token')  // Check token
fetch('http://localhost:5000/incidents').then(r => r.json()).then(console.log)
```

## CSS Utilities

### Flexbox
- `.flex` - display: flex
- `.flex-col` - flex-direction: column
- `.flex-center` - center items and content
- `.justify-between` - space-between

### Spacing
- `.gap-1` - 0.25rem gap
- `.gap-2` - 0.5rem gap
- `.gap-4` - 1rem gap
- `.mt-1 .mt-2 .mt-4` - margin-top
- `.mb-1 .mb-2 .mb-4` - margin-bottom

### Text
- `.text-center` - text-align: center
- `.text-small` - font-size: 0.875rem
- `.text-muted` - color: gray
- `.font-bold` - font-weight: 700
- `.font-semibold` - font-weight: 600

### Components
- `.card` - Card styling with shadow
- `.btn-primary .btn-secondary .btn-danger` - Button styles
- `.badge-reported .badge-resolved` - Status badges
- `.alert-success .alert-error` - Alert boxes
- `.grid .grid-2 .grid-3` - Grid layouts

## Common Errors & Quick Fixes

| Error | Fix |
|-------|-----|
| API not connecting | Check `REACT_APP_API_URL` in `.env` |
| Camera not working | Grant browser permissions, ensure HTTPS in prod |
| Login failing | Check backend is running on port 5000 |
| Styling looks off | Clear browser cache (Ctrl+Shift+R) |
| State not updating | Check `.catch()` in async functions |
| Route not found | Verify route in `App.jsx` matches file path |

## Environment Variables

```
REACT_APP_API_URL=http://localhost:5000
```

Set before building for production!

## Browser DevTools Tips

### Check Auth Status
```javascript
// Console:
JSON.parse(localStorage.getItem('current_user'))
localStorage.getItem('jwt_token')
```

### Mock API Response
```javascript
// Console:
fetch('http://localhost:5000/incidents').then(r => r.json()).then(console.log)
```

### Clear Cache
```javascript
// Console:
localStorage.clear()
sessionStorage.clear()
```

## Git Workflow

```bash
# Make changes
git add .
git commit -m "Add feature description"

# Push to remote
git push origin branch-name

# Create PR
```

## Performance Tips

1. Use `.image-gallery` for multiple images
2. Limit list items shown (pagination)
3. Use inline styles for dynamic properties
4. Avoid inline function definitions in JSX

## Accessibility Checklist

- ✅ Use `<label htmlFor="id">` for form inputs
- ✅ Use semantic HTML (nav, main, section)
- ✅ Alt text for images
- ✅ Color not only indicator (add text/icons)
- ✅ Focus visible on buttons
- ✅ Touch targets 44x44px minimum

## Testing Checklist

- [ ] Test on mobile (DevTools or real device)
- [ ] Test login flow
- [ ] Test report submission
- [ ] Test dashboard with all wards
- [ ] Test incident detail view
- [ ] Test authority queue
- [ ] Test offline behavior
- [ ] Test error states
- [ ] Test with slow network (DevTools throttle)

## Key Code Patterns

### Async API Call with Error Handling
```jsx
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

useEffect(() => {
  const fetch = async () => {
    try {
      const data = await incidentsAPI.getById(id);
      setData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  fetch();
}, [id]);
```

### Protected Route
```jsx
{isAuthenticated() && user.role === 'authority' ? (
  <AuthorityQueue />
) : (
  <Navigate to="/login" />
)}
```

### Form Submit
```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const response = await API.submit(data);
    navigate(`/success/${response.id}`);
  } catch (err) {
    setError(err.message);
  }
};
```

## Key Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| F12 | Open DevTools |
| Ctrl+Shift+C | Inspect element |
| Ctrl+Shift+J | Open console |
| Ctrl+Shift+K | Search console |
| Ctrl+R | Reload page |
| Ctrl+Shift+R | Hard reload (clear cache) |

## Important Phone Numbers & Contacts

**Backend Server:**
- Port: 5000
- Health check: http://localhost:5000/health

**Frontend Server:**
- Port: 3000
- Development: http://localhost:3000

**Database:**
- Type: PostgreSQL (see backend)

## Useful Links

- React Docs: https://react.dev
- React Router: https://reactrouter.com
- Vite: https://vitejs.dev
- MDN Web Docs: https://developer.mozilla.org

## Common Git Commands

```bash
# Check status
git status

# View changes
git diff

# Stage changes
git add .

# Commit
git commit -m "message"

# Push
git push

# Pull
git pull

# Switch branch
git checkout branch-name

# Create branch
git checkout -b feature/name
```

## Terminal Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install dependencies
npm install

# Update dependencies
npm update

# Clean install (remove node_modules)
rm -rf node_modules && npm install
```

## Important Notes

1. **Always** start backend before frontend
2. **Always** run `npm install` after pulling
3. **Always** check `.env` file is configured
4. **Always** test on mobile before pushing
5. **Never** commit `.env` with real secrets
6. **Never** use `require()` in frontend (use ES6 import)

## What To Do If Stuck

1. Check browser console for errors (F12)
2. Check network tab for API failures
3. Check if backend is running (`curl http://localhost:5000/health`)
4. Clear cache and reload (`Ctrl+Shift+R`)
5. Read error message carefully
6. Search error in documentation
7. Check git logs: `git log --oneline`
8. Ask for help with specific error message
