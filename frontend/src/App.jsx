import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Login from './pages/Login';
import ReportForm from './pages/ReportForm';
import MyReports from './pages/MyReports';
import Dashboard from './pages/Dashboard';
import IncidentDetail from './pages/IncidentDetail';
import AuthorityQueue from './pages/AuthorityQueue';
import { isAuthenticated, getCurrentUser } from './api/client';

// Protected Route wrapper
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
    // Check for auth token on app load
    const token = localStorage.getItem('jwt_token');
    const user = localStorage.getItem('current_user');
    if (token && !user) {
      // Token exists but user data is missing, redirect to login
      localStorage.removeItem('jwt_token');
    }
  }, []);

  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navigation />
        <main style={{ flex: 1 }}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/incident/:id" element={<IncidentDetail />} />

            {/* Protected routes - Citizen */}
            <Route
              path="/report"
              element={
                <ProtectedRoute>
                  <ReportForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-reports"
              element={
                <ProtectedRoute>
                  <MyReports />
                </ProtectedRoute>
              }
            />

            {/* Protected routes - Authority */}
            <Route
              path="/authority"
              element={
                <ProtectedRoute requiredRole="authority">
                  <AuthorityQueue />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
