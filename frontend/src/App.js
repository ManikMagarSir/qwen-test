import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import CreateInstance from './components/CreateInstance';
import Monitoring from './components/Monitoring';
import Profile from './components/Profile';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { Cloud } from 'lucide-react';
import './styles.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div style={{
        flex: 1,
        marginLeft: collapsed ? '64px' : '240px',
        transition: 'margin-left var(--transition-normal)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Navbar />
        <main style={{
          paddingTop: '64px',
          minHeight: '100dvh',
          background: 'var(--color-background)',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div style={loadingStyles.container}>
      <div style={loadingStyles.logoWrap}>
        <Cloud size={32} color="#22C55E" />
      </div>
      <div style={loadingStyles.spinner} />
      <p style={loadingStyles.text}>Loading Cloud Manager...</p>
    </div>
  );
}

const loadingStyles = {
  container: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-background)',
    gap: '20px',
  },
  logoWrap: {
    width: '56px',
    height: '56px',
    borderRadius: 'var(--radius-lg)',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'breathe 2s ease-in-out infinite',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid var(--color-border)',
    borderTopColor: 'var(--color-accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  text: {
    color: '#64748B',
    fontSize: '0.88rem',
  },
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreateInstance /></ProtectedRoute>} />
          <Route path="/monitoring" element={<ProtectedRoute><Monitoring /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
