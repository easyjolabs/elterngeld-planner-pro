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
    { id: 'guide', path: '/guide', label: 'Elterngeld Guide', icon: <Lightbulb size={20} /> },
    { id: 'application', path: '/', label: 'Elterngeld Application', icon: <FileText size={20} /> },
    { id: 'chat', path: '/beratung', label: 'Elterngeld Chat', icon: <MessageCircle size={20} /> },
  ];

  const getActiveNav = () => {
    if (location.pathname === '/guide') return 'guide';
    if (location.pathname === '/beratung') return 'chat';
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
  const SidebarContent = ({ showLabels, hideLogo = false }: { showLabels: boolean; hideLogo?: boolean }) => (
    <>
      {/* Logo - both rendered, controlled by opacity to prevent blink - hidden on mobile */}
      {!hideLogo && (
        <div style={{ 
          padding: 16, 
          display: 'flex', 
          alignItems: 'center', 
          height: 60,
          overflow: 'hidden',
        }}>
          <div style={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center' }}>
            <img 
              src={logoFull} 
              alt="ElterngeldHelper" 
              style={{ 
                height: 28,
                opacity: showLabels ? 1 : 0,
                transition: 'opacity 0.2s ease',
                position: showLabels ? 'relative' : 'absolute',
                left: 0,
              }} 
            />
            <img 
              src={logoIcon} 
              alt="ElterngeldHelper" 
              style={{ 
                width: 28,
                height: 28,
                opacity: showLabels ? 0 : 1,
                transition: 'opacity 0.2s ease',
                position: showLabels ? 'absolute' : 'relative',
                left: 0,
              }} 
            />
          </div>
        </div>
      )}

      {/* Nav */}
      <div style={{ flex: 1, padding: '8px 12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className="w-full flex items-center gap-2 px-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
              style={{ 
                height: 40,
                backgroundColor: activeNav === item.id ? colors.tile : 'transparent',
                color: activeNav === item.id ? colors.textDark : colors.text,
                border: 'none',
                cursor: 'pointer',
                justifyContent: showLabels ? 'flex-start' : 'center',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                if (activeNav !== item.id) {
                  e.currentTarget.style.backgroundColor = colors.tile;
                }
              }}
              onMouseLeave={(e) => {
                if (activeNav !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              <span style={{ 
                whiteSpace: 'nowrap',
                opacity: showLabels ? 1 : 0,
                width: showLabels ? 'auto' : 0,
                overflow: 'hidden',
                transition: 'opacity 0.2s ease',
              }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Profile */}
      <div style={{ padding: 12, borderTop: `1px solid ${colors.border}`, height: 72, overflow: 'hidden' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 10,
          padding: 8,
          borderRadius: 8,
          height: 48,
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
          <div style={{ 
            overflow: 'hidden',
            opacity: showLabels ? 1 : 0,
            width: showLabels ? 'auto' : 0,
            transition: 'opacity 0.2s ease',
          }}>
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
        </div>
      </div>

      {/* Collapse - only on desktop */}
      {!isMobile && (
        <div style={{ padding: 12, paddingTop: 0, height: 52 }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-lg"
            style={{ 
              height: 40,
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

      {/* Mobile Menu Overlay - Full Screen */}
      {isMobile && mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: 56,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.background,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <SidebarContent showLabels={true} hideLogo={true} />
        </div>
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
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
