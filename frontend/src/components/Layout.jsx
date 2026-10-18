import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  KeyRound, 
  Bot, 
  PhoneCall, 
  History, 
  Share2, 
  LogOut, 
  Mic 
} from 'lucide-react';

function Layout({ onLogout }) {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <Mic size={24} className="primary-hover" style={{ color: '#8b5cf6' }} />
          <span className="logo-text">VoiceAgent AI</span>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="nav-links">
            <li>
              <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/credentials" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <KeyRound size={18} />
                <span>API Keys</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/agents" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Bot size={18} />
                <span>AI Voice Agents</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/campaigns" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <PhoneCall size={18} />
                <span>Campaigns</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/calls" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <History size={18} />
                <span>Call Logs</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/crm" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Share2 size={18} />
                <span>CRM Webhooks</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Sidebar Footer Logout */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <button className="nav-item btn-logout" onClick={handleLogoutClick} style={{ 
            width: '100%', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <LogOut size={18} style={{ color: 'var(--error)' }} />
            <span style={{ color: 'var(--error)' }}>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Outlet */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
