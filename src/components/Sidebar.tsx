import React, { useState, useEffect } from 'react';

// Colors matching ElterngeldGuide
const colors = {
  background: '#FAF9F7',
  white: '#FFFFFF',
  tile: '#F0EFED',
  border: '#E8E6E3',
  text: '#78716c',
  textDark: '#1C1917',
  accent: '#C0630B',
};

export type SidebarView = 'home' | 'guide' | 'chat' | 'pdf';

interface SidebarProps {
  activeView: SidebarView;
  onNavigate: (view: SidebarView) => void;
}

// Hook to detect mobile (400px breakpoint)
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 400);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

// Tooltip wrapper component
const Tooltip: React.FC<{ label: string; show: boolean; children: React.ReactNode }> = ({ label, show, children }) => (
  <div className="relative group">
    {children}
    {show && (
      <div 
        className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50"
        style={{ 
          backgroundColor: colors.textDark, 
          color: colors.white,
          transition: 'opacity 0.15s ease-in-out 0.3s',
        }}
      >
        {label}
      </div>
    )}
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  onNavigate,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  const navItems: Array<{ id: SidebarView; label: string; icon: React.ReactNode }> = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      id: 'guide',
      label: 'Guide',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      id: 'pdf',
      label: 'PDF',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
  ];

  const handleMobileNavigate = (view: SidebarView) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <>
        {/* Mobile: Hamburger Button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 right-3 z-40 w-10 h-10 rounded-lg flex items-center justify-center transition-all"
          style={{ backgroundColor: colors.tile, color: colors.textDark }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Mobile: Fullscreen Menu */}
        <div 
          className={`fixed inset-0 z-50 flex flex-col transition-all duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          style={{ backgroundColor: colors.background }}
        >
          {/* Header with Close */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border }}>
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: colors.accent, color: colors.white }}
              >
                E
              </div>
              <span className="text-base font-semibold" style={{ color: colors.textDark }}>
                Elterngeld
              </span>
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
              style={{ backgroundColor: colors.tile, color: colors.textDark }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {navItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMobileNavigate(item.id)}
                    className="w-full h-14 rounded-xl flex items-center px-4 gap-4 transition-all active:scale-[0.98]"
                    style={{
                      backgroundColor: isActive ? colors.tile : 'transparent',
                      color: colors.textDark,
                    }}
                  >
                    <span style={{ color: colors.textDark }}>{item.icon}</span>
                    <span className="text-base font-medium" style={{ color: colors.textDark }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t" style={{ borderColor: colors.border }}>
            <button
              className="w-full h-14 rounded-xl flex items-center px-4 gap-4 transition-all active:scale-[0.98]"
              style={{ backgroundColor: colors.tile }}
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                style={{ backgroundColor: colors.textDark, color: colors.white }}
              >
                U
              </div>
              <span className="text-base font-medium" style={{ color: colors.textDark }}>
                User Profile
              </span>
            </button>
          </div>
        </div>
      </>
    );
  }

  // Desktop Layout
  return (
    <div 
      className="h-screen flex flex-col border-r transition-all duration-200"
      style={{ 
        width: expanded ? 240 : 56,
        backgroundColor: colors.background, 
        borderColor: colors.border 
      }}
    >
      {/* Logo */}
      <div className={`p-2 ${expanded ? 'px-3' : ''}`}>
        <div 
          className={`h-10 rounded-lg flex items-center ${expanded ? 'px-2 gap-2' : 'justify-center'}`}
        >
          <div 
            className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold shrink-0"
            style={{ backgroundColor: colors.accent, color: colors.white }}
          >
            E
          </div>
          {expanded && (
            <span className="text-sm font-semibold" style={{ color: colors.textDark }}>
              Elterngeld
            </span>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-2 mt-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <Tooltip key={item.id} label={item.label} show={!expanded}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full h-10 rounded-lg flex items-center transition-all hover:bg-stone-100 ${expanded ? 'px-3 gap-3' : 'justify-center'}`}
                  style={{
                    backgroundColor: isActive ? colors.tile : 'transparent',
                    color: colors.textDark,
                  }}
                >
                  <span style={{ color: colors.textDark }}>{item.icon}</span>
                  {expanded && (
                    <span className="text-sm" style={{ color: colors.textDark }}>
                      {item.label}
                    </span>
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-2 border-t" style={{ borderColor: colors.border }}>
        {/* User Profile */}
        <Tooltip label="Profile" show={!expanded}>
          <button
            className={`w-full h-10 rounded-lg flex items-center transition-all hover:bg-stone-100 mb-1 ${expanded ? 'px-3 gap-3' : 'justify-center'}`}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
              style={{ backgroundColor: colors.textDark, color: colors.white }}
            >
              U
            </div>
            {expanded && (
              <span className="text-sm flex-1 text-left truncate" style={{ color: colors.textDark }}>
                User
              </span>
            )}
          </button>
        </Tooltip>

        {/* Expand/Collapse Button */}
        <Tooltip label={expanded ? 'Collapse' : 'Expand'} show={!expanded}>
          <button
            onClick={() => setExpanded(!expanded)}
            className={`w-full h-10 rounded-lg flex items-center transition-all hover:bg-stone-100 ${expanded ? 'px-3' : 'justify-center'}`}
            style={{ color: colors.text }}
          >
            <svg 
              className="w-5 h-5 transition-transform duration-200" 
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              fill="none" 
              stroke="currentColor" 
              strokeWidth={1.5} 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export { Sidebar };
export default Sidebar;
