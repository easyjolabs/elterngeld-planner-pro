import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lightbulb, FileText, MessageCircle, ChevronsLeft, ChevronsRight, Menu, X } from 'lucide-react';
import logoIcon from '@/assets/logo-icon.svg';
import logoFull from '@/assets/logo-full.svg';

const colors = {
  background: '#FAF9F5',
  tile: '#F0EEE6',
  text: '#57534E',
  textDark: '#1C1917',
  basis: '#FF8752',
  border: '#E7E5E4',
  progress: '#FF6347',
};

interface SidebarProps {
  children: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navItems = [
    { id: 'guide', path: '/beratung', label: 'Elterngeld Guide', icon: <Lightbulb size={20} /> },
    { id: 'application', path: '/', label: 'Elterngeld Application', icon: <FileText size={20} /> },
    { id: 'chat', path: '/', label: 'Elterngeld Chat', icon: <MessageCircle size={20} /> },
  ];

  const getActiveNav = () => {
    if (location.pathname === '/beratung') return 'guide';
    return 'application';
  };

  const activeNav = getActiveNav();

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  // Sidebar content component to avoid duplication
  const SidebarContent = ({ showLabels }: { showLabels: boolean }) => (
    <>
      {/* Logo - fixed height */}
      <div style={{ 
        padding: 16, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 10,
        height: 60,
      }}>
        {showLabels ? (
          <img src={logoFull} alt="ElterngeldHelper" style={{ height: 28 }} />
        ) : (
          <img src={logoIcon} alt="ElterngeldHelper" style={{ width: 28, height: 28 }} />
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '8px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-all ${showLabels ? '' : 'justify-center'}`}
              style={{ 
                backgroundColor: activeNav === item.id ? colors.tile : 'transparent',
                color: activeNav === item.id ? colors.textDark : colors.text,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {item.icon}
              {showLabels && <span>{item.label}</span>}
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
          {showLabels && (
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

      {/* Collapse - only on desktop */}
      {!isMobile && (
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
            {sidebarOpen ? <ChevronsLeft size={20} /> : <ChevronsRight size={20} />}
          </button>
        </div>
      )}
    </>
  );

  return (
    <div style={{ 
      display: 'flex', 
      height: '100dvh', 
      backgroundColor: colors.background,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
    }}>

      {/* Mobile Header */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          backgroundColor: colors.background,
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 40,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={logoFull} alt="ElterngeldHelper" style={{ height: 28 }} />
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textDark,
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobile && mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 45,
            }}
          />
          {/* Slide-in Menu */}
          <div style={{
            position: 'fixed',
            top: 56,
            left: 0,
            bottom: 0,
            width: 260,
            backgroundColor: colors.background,
            borderRight: `1px solid ${colors.border}`,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideIn 0.2s ease-out',
          }}>
            <SidebarContent showLabels={true} />
          </div>
        </>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div style={{ 
          width: sidebarOpen ? 220 : 64, 
          backgroundColor: colors.background,
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          flexShrink: 0,
        }}>
          <SidebarContent showLabels={sidebarOpen} />
        </div>
      )}

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        minWidth: 0,
        marginTop: isMobile ? 56 : 0,
      }}>
        {children}
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
