import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Plus, BarChart3, User } from 'lucide-react';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/create', icon: Plus, label: 'New' },
  { to: '/monitoring', icon: BarChart3, label: 'Monitor' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav style={s.nav}>
      {links.map(l => (
        <NavLink key={l.to} to={l.to} end={l.to === '/dashboard'}
          style={({ isActive }) => ({
            ...s.link,
            color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
          })}>
          {({ isActive }) => (
            <>
              {isActive && <div style={s.activeBar} />}
              <l.icon size={20} />
              <span style={s.label}>{l.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

const s = {
  nav: {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 85,
    display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    height: '64px',
    background: 'rgba(5,7,10,0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid var(--glass-border)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  link: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
    textDecoration: 'none', position: 'relative', padding: '6px 16px',
    fontSize: '0.65rem', fontWeight: 500, transition: 'color var(--transition)',
  },
  activeBar: {
    position: 'absolute', top: 0, left: '20%', right: '20%',
    height: '2px', borderRadius: '0 0 2px 2px',
    background: 'var(--accent)',
  },
  label: { fontSize: '0.65rem', marginTop: '1px' },
};
