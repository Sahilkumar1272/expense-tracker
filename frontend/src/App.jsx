// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingProvider, useLoading } from './context/LoadingContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardLayout from './pages/DashboardLayout';
import HomeDashboard from './pages/HomeDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import Transactions from './pages/Transactions';


// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  
  React.useEffect(() => {
  if (loading) {
    showLoading('Loading...');
  } else {
    hideLoading();
  }
}, [loading]);
  
  if (loading) {
    return null; // Loading spinner will be shown by LoadingProvider
  }
  
  return user ? children : <Navigate to="/login" replace />;
};

// Public Route Component - Only redirect if user is authenticated AND not loading
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  
 React.useEffect(() => {
  if (loading) {
    showLoading('Loading...');
  } else {
    hideLoading();
  }
}, [loading]);
  
  if (loading) {
    return null; // Loading spinner will be shown by LoadingProvider
  }
  
  // Only redirect to dashboard if we have a confirmed authenticated user
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <LoadingProvider>
          <div className="App">
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPasswordPage />
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicRoute>
                  <ResetPasswordPage />
                </PublicRoute>
              }
            />

            {/* Protected Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomeDashboard />} />
              {/* <Route path="overview" element={<DashboardOverview />} /> */}
              <Route path="analytics" element={<AnalyticsDashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="settings" element={<div className="text-white">Settings Page (To be implemented)</div>} />
            </Route>

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </div>
        </LoadingProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;