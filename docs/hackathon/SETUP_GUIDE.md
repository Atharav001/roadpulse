# RoadPulse Frontend - Setup & Testing Guide

## Quick Start

### 1. Install Dependencies
```bash
cd roadpulse/frontend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` to match your backend URL (default is `http://localhost:5000`).

### 3. Start Development Server
```bash
npm run dev
```

Frontend will start on `http://localhost:3000`

### 4. Access the Application
- **Home**: http://localhost:3000/
- **Login**: http://localhost:3000/login
- **Report Issue**: http://localhost:3000/report
- **Dashboard**: http://localhost:3000/dashboard

---

## File Structure

### Pages (Features)
All pages are in `src/pages/`:

| File | Route | Purpose |
|------|-------|---------|
| `Home.jsx` | `/` | Landing page with navigation |
| `Login.jsx` | `/login` | Authentication |
| `ReportForm.jsx` | `/report` | Multi-step incident reporting |
| `MyReports.jsx` | `/my-reports` | User's submitted reports |
| `Dashboard.jsx` | `/dashboard` | Ward statistics & incidents |
| `IncidentDetail.jsx` | `/incident/:id` | Single incident view |
| `AuthorityQueue.jsx` | `/authority` | Authority management console |

### Components (Reusable)
All components are in `src/components/`:

| File | Purpose |
|------|---------|
| `Navigation.jsx` | Top navigation bar with role-based menu |
| `CameraCapture.jsx` | Photo capture with GPS embedding |
| `IncidentCard.jsx` | Incident list item component |
| `StatCard.jsx` | Statistics display card |

### API Layer
- **`src/api/client.js`** - Centralized API wrapper
  - JWT token management
  - Endpoints for auth, reports, incidents, dashboard
  - Error handling

### Core Files
| File | Purpose |
|------|---------|
| `App.jsx` | Main app with React Router setup |
| `main.jsx` | Entry point |
| `index.css` | Global styles (mobile-responsive) |
| `vite.config.js` | Vite build configuration |

---

## Testing the Application

### 1. Authentication Flow
```
1. Go to /login
2. Use demo account:
   - Email: authority@roadpulse.local
   - Password: authority123
3. Should redirect to home page
4. Check localStorage for jwt_token
```

**Expected:**
- JWT token stored in localStorage
- User data in localStorage
- Navigation shows "Logout (authority@roadpulse.local)"

### 2. Report Submission Flow
```
1. Click "Report Issue" (requires authentication)
2. Grant camera & location permissions
3. Capture 2 photos (test: can click "Capture Photo" twice)
4. Add description and location
5. Review and submit
6. See success screen with incident_id
```

**Expected:**
- Photos captured and displayed
- GPS coordinates shown
- Draft email displayed
- Incident ID returned
- Redirect available to incident detail

### 3. Dashboard Viewing
```
1. Go to /dashboard
2. Select a ward from dropdown
3. View statistics (total, resolved, rate)
4. View pending incidents list
```

**Expected:**
- Stats cards display numbers
- Incident cards clickable
- Ward selector functional
- No auth required

### 4. Incident Detail View
```
1. Click any incident from dashboard
2. See full incident info
3. View linked reports
4. See draft complaint email
5. Copy email button functional
```

**Expected:**
- All incident data displayed
- Photos visible
- Email copyable to clipboard
- Timeline information shown

### 5. Authority Queue
```
1. Login as authority (authority@roadpulse.local)
2. Go to Authority Queue (in navigation)
3. See unresolved incidents
4. Click "Mark Resolved"
5. Incident should disappear from list
```

**Expected:**
- Only unresolved incidents shown
- Mark Resolved button works
- Incident removed after resolution
- Role check prevents citizen access

### 6. My Reports
```
1. Login as any user
2. Go to My Reports
3. See all your submitted reports
```

**Expected:**
- List of incidents
- Click to navigate to detail
- Reports organized by status

---

## Backend Integration Checklist

### Required Endpoints
Verify these endpoints exist on backend (default: `http://localhost:5000`):

```
POST   /auth/login
POST   /auth/register
POST   /reports
GET    /reports/:id
GET    /incidents
GET    /incidents/:id
PUT    /incidents/:id/status
GET    /dashboard/ward/:ward_id
GET    /dashboard/pending
```

### Testing Backend Connectivity
```bash
# Test if backend is running
curl http://localhost:5000/health

# Test login endpoint
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"authority@roadpulse.local","password":"authority123"}'
```

---

## Common Issues & Solutions

### Issue: Camera not working
**Solution:**
- Check browser permissions (Settings > Privacy)
- Camera only works on HTTPS in production (HTTP on localhost is OK)
- Test with Chrome/Edge first

### Issue: Location not detected
**Solution:**
- Grant location permission when prompted
- Works best with good GPS signal
- Fallback uses default ward if location unavailable

### Issue: Backend not responding
**Solution:**
```bash
# Check REACT_APP_API_URL in .env
# Should be: http://localhost:5000

# Start backend server first:
cd ../backend
npm install
npm start
```

### Issue: Photos not showing
**Solution:**
- Check browser console for errors
- Ensure camera permission granted
- Try different camera app to test camera hardware
- Clear localStorage and try again

### Issue: Login not working
**Solution:**
```bash
# Verify backend seeded demo user:
cd ../backend
npm run seed

# Check backend logs for auth errors
```

---

## Development Workflow

### Adding a New Page
1. Create file in `src/pages/NewPage.jsx`
2. Add route in `App.jsx`
3. Add navigation link in `Navigation.jsx` if needed

### Adding a New Component
1. Create file in `src/components/NewComponent.jsx`
2. Import and use in pages

### Styling
- Use `index.css` for global styles
- Use inline styles for component-specific styling
- Mobile-first approach (mobile styles by default, @media for desktop)

### API Calls
```javascript
import { reportsAPI, incidentsAPI } from '../api/client';

// Always use the API wrapper functions
const response = await reportsAPI.submit(data);
```

---

## Production Build

### Build
```bash
npm run build
```

Output: `dist/` folder with optimized files

### Deploy
1. Set `REACT_APP_API_URL` to production backend URL
2. Build: `npm run build`
3. Upload `dist/` to web server
4. Configure web server to serve `index.html` for all routes (SPA)

### NGINX Example
```nginx
server {
  listen 80;
  server_name yourdomain.com;
  
  root /path/to/dist;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

---

## Performance Tips

### Optimize Build
- `npm run build` automatically minifies
- Vite handles code splitting
- No external CSS frameworks needed

### Optimize Runtime
- Photos converted to data URLs (can be memory intensive)
- Consider image compression before sending to backend
- Use lazy loading for incident lists (implement pagination)

---

## Mobile Testing

### Test on Real Device
1. Get your local IP: `ifconfig | grep inet`
2. Start dev server: `npm run dev`
3. Access from phone: `http://YOUR_LOCAL_IP:3000`
4. Grant camera and location permissions

### Test on Mobile Browser Emulator
- Chrome DevTools (F12) > Device toolbar
- Test responsive behavior
- Test camera/location permissions simulation

---

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 90+ | ✅ Full | Primary development browser |
| Firefox 88+ | ✅ Full | Fully supported |
| Safari 14+ | ✅ Full | May need HTTPS for camera |
| Edge 90+ | ✅ Full | Chromium-based |
| Mobile Chrome | ✅ Full | Primary mobile browser |
| Mobile Safari | ✅ Full | May need App mode for camera |

---

## Debugging Tips

### Check Authentication
```javascript
// In browser console:
localStorage.getItem('jwt_token');
localStorage.getItem('current_user');
```

### Check API Calls
- Open DevTools (F12)
- Go to Network tab
- Make an API call
- Check request/response

### Check State
- Use React DevTools extension
- Inspect component props and state

### Clear All Data
```javascript
// In browser console:
localStorage.clear();
location.reload();
```

---

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Configure `.env` file
3. ✅ Start backend server on port 5000
4. ✅ Start frontend: `npm run dev`
5. ✅ Test authentication flow
6. ✅ Test report submission
7. ✅ Test dashboard
8. ✅ Test authority features

## Support

For issues or questions:
1. Check browser console for errors
2. Check network tab for API failures
3. Verify backend is running
4. Check `.env` configuration
5. Review backend logs
