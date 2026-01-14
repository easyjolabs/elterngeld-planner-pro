import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Colors matching ElterngeldGuide
const colors = {
  background: "#FAFAF9",
  white: "#FFFFFF",
  tile: "#F0EFED",
  border: "#E8E6E3",
  text: "#78716c",
  textDark: "#1C1917",
  accent: "#C0630B",
};

export type SidebarView = "planner" | "application" | "chat";

interface SidebarProps {
  activeView: SidebarView;
  onNavigate: (view: SidebarView) => void;
  onSignInClick?: () => void;
  headerHeight?: number; // Height of header in pixels
}

// Hook to detect mobile (400px breakpoint)
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 400);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
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
          transition: "opacity 0.15s ease-in-out 0.3s",
        }}
      >
        {label}
      </div>
    )}
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, onSignInClick, headerHeight = 64 }) => {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Get user display info
  const userName = user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();

  const navItems: Array<{ id: SidebarView; label: string; icon: React.ReactNode }> = [
    {
      id: "planner",
      label: "Planner",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
      ),
    },
    {
      id: "application",
      label: "Application",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      ),
    },
    {
      id: "chat",
      label: "Chat",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
    },
  ];

  const handleMobileNavigate = (view: SidebarView) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  // Person icon component
  const PersonIcon = ({ color = colors.white, size = "w-4 h-4" }: { color?: string; size?: string }) => (
    <svg className={size} fill="none" stroke={color} strokeWidth={1.5} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );

  // Mobile Layout - Bottom Sheet Style
  if (isMobile) {
    return (
      <>
        {/* Mobile: Hamburger Button in Header area */}
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-40 w-10 h-10 rounded-lg flex items-center justify-center transition-all"
          style={{ backgroundColor: colors.tile, color: colors.textDark }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Mobile: Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/20 transition-opacity" onClick={() => setMobileOpen(false)} />
        )}

        {/* Mobile: Slide-in Menu */}
        <div
          className={`fixed top-0 left-0 z-50 h-full flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
          style={{ backgroundColor: colors.background, width: 280 }}
        >
          {/* Header with Close */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border }}>
            <span className="text-sm font-medium" style={{ color: colors.textDark }}>
              Menu
            </span>
            <button
              onClick={() => setMobileOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ backgroundColor: colors.tile, color: colors.textDark }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-3">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMobileNavigate(item.id)}
                    className="w-full h-12 rounded-xl flex items-center px-3 gap-3 transition-all"
                    style={{
                      backgroundColor: isActive ? colors.tile : "transparent",
                      color: colors.textDark,
                    }}
                  >
                    <span style={{ color: colors.textDark }}>{item.icon}</span>
                    <span className="text-sm font-medium" style={{ color: colors.textDark }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Bottom Section - Auth Aware */}
          <div className="p-3 border-t" style={{ borderColor: colors.border }}>
            {user ? (
              <div className="space-y-1">
                <button
                  onClick={() => {
                    navigate("/settings");
                    setMobileOpen(false);
                  }}
                  className="w-full h-12 rounded-xl flex items-center px-3 gap-3 transition-all"
                  style={{ backgroundColor: colors.tile }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{ backgroundColor: colors.textDark, color: colors.white }}
                  >
                    {userInitial}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate" style={{ color: colors.textDark }}>
                      {userName}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    signOut();
                    setMobileOpen(false);
                  }}
                  className="w-full h-10 rounded-xl flex items-center justify-center gap-2 transition-all"
                  style={{ backgroundColor: "transparent", border: `1px solid ${colors.border}` }}
                >
                  <svg className="w-4 h-4" fill="none" stroke={colors.text} strokeWidth={1.5} viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                    />
                  </svg>
                  <span className="text-sm" style={{ color: colors.text }}>
                    Log out
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onSignInClick?.();
                  setMobileOpen(false);
                }}
                className="w-full h-12 rounded-xl flex items-center px-3 gap-3 transition-all"
                style={{ backgroundColor: colors.tile }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: colors.textDark }}
                >
                  <PersonIcon color={colors.white} size="w-4 h-4" />
                </div>
                <span className="text-sm font-medium" style={{ color: colors.textDark }}>
                  Sign in
                </span>
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  // Desktop Layout - Below Header
  return (
    <div
      className="fixed left-0 flex flex-col border-r transition-all duration-200"
      style={{
        top: headerHeight,
        height: `calc(100vh - ${headerHeight}px)`,
        width: expanded ? 200 : 56,
        backgroundColor: colors.background,
        borderColor: colors.border,
      }}
    >
      {/* Navigation Items */}
      <nav className="flex-1 px-2 pt-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <Tooltip key={item.id} label={item.label} show={!expanded}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className="w-full h-10 rounded-lg flex items-center transition-all hover:bg-stone-100"
                  style={{
                    backgroundColor: isActive ? colors.tile : "transparent",
                    color: colors.textDark,
                  }}
                >
                  <div className="w-10 flex items-center justify-center shrink-0">
                    <span style={{ color: colors.textDark }}>{item.icon}</span>
                  </div>
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
        {/* User Profile or Sign In */}
        {user ? (
          <Tooltip label="Settings" show={!expanded}>
            <button
              onClick={() => navigate("/settings")}
              className="w-full h-10 rounded-lg flex items-center transition-all hover:bg-stone-100 mb-1"
            >
              <div className="w-10 flex items-center justify-center shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ backgroundColor: colors.textDark, color: colors.white }}
                >
                  {userInitial}
                </div>
              </div>
              {expanded && (
                <span className="text-sm flex-1 text-left truncate" style={{ color: colors.textDark }}>
                  {userName}
                </span>
              )}
            </button>
          </Tooltip>
        ) : (
          <Tooltip label="Sign in" show={!expanded}>
            <button
              onClick={() => onSignInClick?.()}
              className="w-full h-10 rounded-lg flex items-center transition-all hover:bg-stone-100 mb-1"
            >
              <div className="w-10 flex items-center justify-center shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: colors.textDark }}
                >
                  <PersonIcon color={colors.white} size="w-4 h-4" />
                </div>
              </div>
              {expanded && (
                <span className="text-sm" style={{ color: colors.textDark }}>
                  Sign in
                </span>
              )}
            </button>
          </Tooltip>
        )}

        {/* Expand/Collapse Button */}
        <Tooltip label={expanded ? "Collapse" : "Expand"} show={!expanded}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full h-10 rounded-lg flex items-center transition-all hover:bg-stone-100"
            style={{ color: colors.text }}
          >
            <div className="w-10 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 transition-transform duration-200"
                style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export { Sidebar };
export default Sidebar;
