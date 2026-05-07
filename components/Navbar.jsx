'use client';
import ThemeToggle from './ThemeToggle';
import { Menu } from 'lucide-react';

export default function Navbar({ title, actions, onMenuClick }) {
  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="btn btn-ghost btn-icon" onClick={onMenuClick} style={{ display: 'none' }} id="mobile-menu-btn">
          <Menu size={20} />
        </button>
        {title && <h1 className="navbar-title" style={{ fontSize: '1rem', fontWeight: 700 }}>{title}</h1>}
      </div>
      <div className="navbar-right">
        {actions}
        <ThemeToggle />
      </div>
      <style jsx>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
