# RoadPulse Frontend

A React web application for reporting road and traffic issues with automatic classification, landmark detection, and incident clustering.

## Features

- **Report Form** - Submit road issues with photos, GPS location, and description
- **Camera Capture** - Native device camera integration with GPS embedding
- **Auto-Classification** - AI-powered issue type and severity detection
- **Dashboard** - Ward-level statistics and incident tracking
- **Authority Queue** - Incident management for authorities
- **Public Incident Details** - View merged reports and timeline

## Tech Stack

- React 18
- React Router v6
- Vite (build tool)
- CSS (mobile-responsive, no dependencies)

## Installation

```bash
cd roadpulse/frontend
npm install
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Set your API URL:
```
REACT_APP_API_URL=http://localhost:5000
```

## Development

```bash
npm run dev
```

The frontend will start on `http://localhost:3000`

## Build

```bash
npm run build
```

## Project Structure

```
src/
├── pages/
│   ├── Home.jsx           # Landing page
│   ├── Login.jsx          # Authentication
│   ├── ReportForm.jsx     # Issue submission
│   ├── MyReports.jsx      # User's reports
│   ├── Dashboard.jsx      # Public statistics
│   ├── IncidentDetail.jsx # Single incident view
│   └── AuthorityQueue.jsx # Authority management
├── components/
│   ├── Navigation.jsx     # Top navigation bar
│   ├── CameraCapture.jsx  # Photo capture component
│   ├── IncidentCard.jsx   # Incident list item
│   └── StatCard.jsx       # Statistics display
├── api/
│   └── client.js          # API wrapper functions
├── App.jsx                # Main app with routing
├── main.jsx               # Entry point
└── index.css              # Global styles
```

## Pages

### Home (/)
Landing page with quick actions and feature overview.

### Login (/login)
Authentication page. Demo account: `authority@roadpulse.local` / `authority123`

### Report Form (/report)
- Step 1: Capture two photos with GPS
- Step 2: Add description and location details
- Step 3: Review draft complaint email
- Step 4: Confirmation with incident ID

### My Reports (/my-reports)
List of all reports submitted by the logged-in user.

### Dashboard (/dashboard)
- Ward selector dropdown
- Statistics cards (total, resolved, resolution rate)
- Pending incidents list
- Long-standing issues (>60 days)

### Incident Detail (/incident/:id)
- Full incident information
- All linked reports with photos
- Draft complaint email (copy-to-clipboard)
- Timeline information

### Authority Queue (/authority)
- List of unresolved incidents
- Quick "Mark Resolved" action
- View incident details button

## Components

### CameraCapture
```jsx
<CameraCapture 
  onCapture={handlePhotos}
  maxPhotos={2}
/>
```
- Opens device camera (camera-only, no gallery)
- Captures sequential photos with timestamps
- Embeds GPS coordinates
- Returns: `{photos, latitude, longitude, timestamp}`

### StatCard
```jsx
<StatCard 
  title="Total Incidents" 
  value={42}
  icon="📊"
  color="primary"
  trend="↑ 5% this week"
/>
```

### IncidentCard
```jsx
<IncidentCard incident={incidentData} />
```
- Clickable card navigating to detail page
- Shows issue type, severity, status, location

### Navigation
- Sticky top navigation with responsive menu
- Shows different links based on user role
- Logout button with user email

## API Integration

All API calls are wrapped in `src/api/client.js`:

```javascript
import { 
  authAPI, 
  reportsAPI, 
  incidentsAPI, 
  dashboardAPI 
} from './api/client';

// Authentication
await authAPI.login(email, password);
await authAPI.register(email, password, role);

// Reports
await reportsAPI.submit(reportData);
await reportsAPI.getById(reportId);

// Incidents
await incidentsAPI.list(filters);
await incidentsAPI.getById(incidentId);
await incidentsAPI.updateStatus(incidentId, status);

// Dashboard
await dashboardAPI.getWardStats(wardId);
await dashboardAPI.getPendingIncidents();
```

## Authentication

- JWT token stored in `localStorage.jwt_token`
- User data stored in `localStorage.current_user`
- Token automatically included in all API requests
- Protected routes redirect to `/login` if not authenticated
- Authority routes check user role

## Styling

- Mobile-first responsive design
- CSS variables for theming (colors, shadows)
- Tailwind-like utility classes
- Severity color coding (low=green, medium=yellow, high=red)
- Status badges with color schemes

## Accessibility

- Semantic HTML
- Proper form labels
- ARIA-friendly button states
- Mobile-optimized touch targets
- Responsive viewport

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Modern mobile browsers

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | `http://localhost:5000` | Backend API base URL |

## Performance

- Lazy-loaded routes (React Router)
- Optimized image rendering
- Minimal bundle size (no UI framework)
- Efficient state management with hooks

## Deployment

### Build for production
```bash
npm run build
```

### Deploy to static host
The `dist/` folder contains the optimized production build.

### Backend URL
Update `REACT_APP_API_URL` environment variable before building.

## Development Notes

### Testing API locally
Start the backend server on `:5000`, then:
```bash
npm run dev
# Frontend on :3000, proxy to :5000
```

### Camera & Geolocation
- Requires HTTPS in production (except localhost)
- User must grant camera and location permissions
- Fallback to default ward if location unavailable

### Photo Storage
- Photos are converted to data URLs (Blob → ObjectURL)
- Sent as `{url, timestamp}` objects
- Backend handles image storage

## Known Limitations

- No offline support
- Photos stored as data URLs in localStorage (memory intensive)
- Single-page navigation (full page reloads not needed)
- No image optimization/compression in browser

## Future Enhancements

- Image compression before upload
- Offline draft saving
- Map integration (show location)
- Multi-language support
- Dark mode theme
- Notification system
- File upload alternative to camera
