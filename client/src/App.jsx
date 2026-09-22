import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import InterviewSelectionPage from './pages/InterviewSelectionPage';
import InterviewPage from './pages/InterviewPage';
import ReportPage from './pages/ReportPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        {/* Authentication Route */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Application Routes */}
        <Route 
          path="/interviews" 
          element={
            <ProtectedRoute>
              <InterviewSelectionPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/interview/:id" 
          element={
            <ProtectedRoute>
              <InterviewPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/report/:id" 
          element={
            <ProtectedRoute>
              <ReportPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />

        {/* Fallback Redirection */}
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? "/profile" : "/login"} replace />} 
        />
        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
