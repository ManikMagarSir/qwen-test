import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import CreateInstance from './components/CreateInstance';
import Monitoring from './components/Monitoring';
import InstanceDetail from './components/InstanceDetail';
import Profile from './components/Profile';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import { Cloud } from 'lucide-react';
import './styles.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const sidebarWidth = isMobile ? 0 : (collapsed ? '64px' : '240px');

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--bg-deep)' }}>
      {mobileMenu && isMobile && (
        <div onClick={() => setMobileMenu(false)} style={{
          position: 'fixed', inset: 0, zIndex: 95,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }} />
      )}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileMenu}
        onMobileClose={() => setMobileMenu(false)}
        isMobile={isMobile}
      />
      <div style={{
        flex: 1,
        marginLeft: isMobile ? '0' : sidebarWidth,
        transition: 'margin-left var(--transition-slow)',
        display: 'flex', flexDirection: 'column',
      }}>
        <Navbar collapsed={collapsed} isMobile={isMobile} onMenuClick={() => setMobileMenu(!mobileMenu)} />
        <main style={{ paddingTop: '64px', paddingBottom: isMobile ? '64px' : '0', minHeight: '100dvh' }}>
          {children}
        </main>
      </div>
      {isMobile && <BottomNav />}
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
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-deep)', gap: '24px',
    }}>
      <div style={{
        width: '52px', height: '52px', borderRadius: 'var(--radius-lg)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(24px)',
        border: '1px solid var(--glass-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'breathe 2s ease-in-out infinite',
      }}>
        <Cloud size={24} color="var(--accent)" />
      </div>
      <div style={{
        width: '20px', height: '20px',
        border: '2px solid var(--glass-border)',
        borderTopColor: 'var(--accent)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreateInstance /></ProtectedRoute>} />
          <Route path="/monitoring" element={<ProtectedRoute><Monitoring /></ProtectedRoute>} />
          <Route path="/monitor/:id" element={<ProtectedRoute><InstanceDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
