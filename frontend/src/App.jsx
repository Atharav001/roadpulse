import React, { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { LocationProvider } from './LocationContext';
import { LanguageProvider } from './i18n';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import ReportForm from './pages/ReportForm';
import MyReports from './pages/MyReports';
import Community from './pages/Community';
import Dashboard from './pages/Dashboard';
import IncidentDetail from './pages/IncidentDetail';
import AuthorityQueue from './pages/AuthorityQueue';
import { getCurrentUser, isAuthenticated } from './api/client';

function ProtectedRoute({ children, requiredRole = null }) {
  const user = getCurrentUser();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
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
    if (token && !user) localStorage.removeItem('jwt_token');
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <LocationProvider>
          <Router>
            <div className="app-shell">
              <Navigation />
              <main className="app-main">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login mode="login" />} />
                  <Route path="/signup" element={<Login mode="signup" />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/community" element={<Community />} />
                  <Route path="/incident/:id" element={<IncidentDetail />} />
                  <Route path="/report" element={<ProtectedRoute><ReportForm /></ProtectedRoute>} />
                  <Route path="/my-reports" element={<ProtectedRoute><MyReports /></ProtectedRoute>} />
                  <Route
                    path="/authority"
                    element={(
                      <ProtectedRoute requiredRole="authority">
                        <AuthorityQueue />
                      </ProtectedRoute>
                    )}
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </LocationProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
