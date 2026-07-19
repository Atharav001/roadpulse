import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Login from './pages/Login';
import ReportForm from './pages/ReportForm';
import MyReports from './pages/MyReports';
import Dashboard from './pages/Dashboard';
import IncidentDetail from './pages/IncidentDetail';
import AuthorityQueue from './pages/AuthorityQueue';
import { isAuthenticated, getCurrentUser } from './api/client';

function ProtectedRoute({ children, requiredRole = null }) {
  const user = getCurrentUser();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    const user = localStorage.getItem('current_user');
    if (token && !user) {
      localStorage.removeItem('jwt_token');
    }
  }, []);

  return (
    <ThemeProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navigation />
          <main style={{ flex: 1, paddingTop: '0.5rem' }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/incident/:id" element={<IncidentDetail />} />
              <Route path="/report" element={<ProtectedRoute><ReportForm /></ProtectedRoute>} />
              <Route path="/my-reports" element={<ProtectedRoute><MyReports /></ProtectedRoute>} />
              <Route path="/authority" element={<ProtectedRoute requiredRole="authority"><AuthorityQueue /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}