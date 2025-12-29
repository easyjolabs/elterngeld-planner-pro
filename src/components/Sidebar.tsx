import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const colors = {
  background: '#FAF9F5',
  tile: '#F0EEE6',
  text: '#57534E',
  textDark: '#1C1917',
  basis: '#FF8752',
  border: '#E7E5E4',
  progress: '#FF6347',
};

// Logo SVG component - Original, smaller
const LogoIcon = () => (
  <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="20" fill={colors.basis}/>
    <ellipse cx="50" cy="42" rx="18" ry="20" fill="white"/>
    <ellipse cx="42" cy="70" rx="10" ry="12" fill="white"/>
    <ellipse cx="58" cy="70" rx="10" ry="12" fill="white"/>
    <circle cx="45" cy="38" r="3" fill={colors.basis}/>
    <circle cx="55" cy="38" r="3" fill={colors.basis}/>
  </svg>
);

interface SidebarProps {
  children: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'guide', path: '/beratung', label: 'Elterngeld Guide', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20V10M18 20V4M6 20v-4"/>
      </svg>
    )},
    { id: 'application', path: '/', label: 'Elterngeld Application', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    )},
    { id: 'chat', path: '/', label: 'Elterngeld Chat', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    )},
  ];

  const getActiveNav = () => {
    if (location.pathname === '/beratung') return 'guide';
    return 'application';
  };

  const activeNav = getActiveNav();

  return (
    <div style={{ 
      display: 'flex', 
      height: '100dvh', 
      backgroundColor: colors.background,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
    }}>

      {/* Sidebar */}
      <div style={{ 
        width: sidebarOpen ? 220 : 64, 
        backgroundColor: colors.background,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0,
      }}>

        {/* Logo - fixed height */}
        <div style={{ 
          padding: 16, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 10,
          height: 60,
        }}>
          <LogoIcon />
          {sidebarOpen && (
            <span style={{ 
              fontSize: 15, 
              fontWeight: 600, 
              color: colors.textDark,
              whiteSpace: 'nowrap',
            }}>
              ElterngeldHelper
            </span>
          )}
        </div>

        {/* Nav */}
        <div style={{ flex: 1, padding: '8px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-all ${sidebarOpen ? '' : 'justify-center'}`}
                style={{ 
                  backgroundColor: activeNav === item.id ? colors.tile : 'transparent',
                  color: activeNav === item.id ? colors.textDark : colors.text,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Profile */}
        <div style={{ padding: 12, borderTop: `1px solid ${colors.border}` }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10,
            padding: 8,
            borderRadius: 8,
          }}>
            <div style={{ 
              width: 32, 
              height: 32, 
              borderRadius: 8, 
              backgroundColor: colors.tile,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 500,
              color: colors.text,
              flexShrink: 0,
            }}>
              J
            </div>
            {sidebarOpen && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ 
                  fontSize: 13, 
                  fontWeight: 500, 
                  color: colors.textDark,
                  whiteSpace: 'nowrap',
                }}>Jochen</div>
                <div style={{ 
                  fontSize: 11, 
                  color: colors.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>jochen@email.com</div>
              </div>
            )}
          </div>
        </div>

        {/* Collapse */}
        <div style={{ padding: 12, paddingTop: 0 }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-lg"
            style={{ 
              backgroundColor: colors.tile, 
              color: colors.text,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {sidebarOpen ? '«' : '»'}
          </button>
        </div>

      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {children}
      </div>

    </div>
  );
}
