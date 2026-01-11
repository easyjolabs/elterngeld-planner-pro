import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import UserDropdown from "@/components/UserDropdown";

// Colors matching ElterngeldGuide
const colors = {
  background: "#FAF9F7",
  white: "#FFFFFF",
  tile: "#F0EFED",
  border: "#E8E6E3",
  text: "#78716c",
  textDark: "#1C1917",
  accent: "#C0630B",
};

export type SidebarView = "home" | "guide" | "chat" | "pdf";

interface SidebarProps {
  activeView: SidebarView;
  onNavigate: (view: SidebarView) => void;
  onSignInClick: () => void;
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

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, onSignInClick }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const isMobile = useIsMobile();

  // Helper for initials
  const getInitials = () => {
    if (!user?.email) return "?";
    return user.email[0].toUpperCase();
  };

  const navItems: Array<{ id: SidebarView; label: string; icon: React.ReactNode }> = [
    {
      id: "home",
      label: "Overview",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
          />
        </svg>
      ),
    },
    {
      id: "guide",
      label: "Planner",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
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
    {
      id: "pdf",
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
          className={`fixed inset-0 z-50 flex flex-col transition-all duration-300 ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          style={{ backgroundColor: colors.background }}
        >
          {/* Header with Close */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border }}>
            {/* Logo */}
            <div className="flex items-center">
              <svg className="w-8 h-8" viewBox="0 0 64 71" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M47.83 2.64c-4.28-1.43-7.74-2.27-10.36-2.52-2.52-.24-8.22-.2-13.23.91-4.47.99-8.31 2.95-10.26 4.2-2.64 1.68-6.67 5.36-9.33 9.49-1.78 2.77-2.72 6.29-3.1 7.53-.69 2.22-1.2 5.76-1.55 10.61 0 2.12 0 13.72 0 34.8 0 .09.23 1.88 1.19 2.78.75.7 2.22.58 2.58.49 1.02-.26 2.53-1.44 2.62-1.71.02-.05 2.26-2.19 4.74-4.79.81-.84 3.04-3.13 6.07-4.11 3.58-1.15 13.84-.83 13.96-.85 1.74-.42 6.71.26 13.56-1.87 1.35-.42 6.47-2.42 10.26-5.88 1.87-1.71 4.38-4.33 5.89-7.5 2.05-4.27 2.84-9.13 2.96-10.26.45-4.21-.04-7.59-.26-9.99-.05-.57-1.06-5.63-2.7-9.24-1.5-3.33-3.62-5.24-4.18-5.84-2.61-2.79-7.31-5.8-8.85-6.24z"
                  fill="#C0630B"
                />
                <ellipse cx="28.59" cy="25.68" rx="7.74" ry="8.69" fill="#fff" />
                <ellipse cx="47.08" cy="25.68" rx="7.74" ry="8.69" fill="#fff" />
                <ellipse cx="29.84" cy="27.17" rx="4" ry="4.22" fill="#000" />
                <ellipse cx="48.83" cy="27.17" rx="4" ry="4.22" fill="#000" />
              </svg>
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
                    className="w-full h-14 rounded-xl flex items-center px-4 gap-4 transition-all"
                    style={{
                      backgroundColor: isActive ? colors.tile : "transparent",
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

          {/* Bottom Section - Auth Aware */}
          <div className="p-4 border-t" style={{ borderColor: colors.border }}>
            {user ? (
              <button
                onClick={() => {
                  navigate("/settings");
                  setMobileOpen(false);
                }}
                className="w-full h-14 rounded-xl flex items-center px-4 gap-4 transition-all"
                style={{ backgroundColor: colors.tile }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ backgroundColor: colors.textDark, color: colors.white }}
                >
                  {getInitials()}
                </div>
                <div className="flex-1 text-left">
                  <span className="text-base font-medium block truncate" style={{ color: colors.textDark }}>
                    {user.email}
                  </span>
                  <span className="text-sm" style={{ color: colors.text }}>
                    View settings
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => {
                  onSignInClick();
                  setMobileOpen(false);
                }}
                className="w-full h-14 rounded-xl flex items-center justify-center gap-2 transition-all"
                style={{ backgroundColor: colors.textDark, color: colors.white }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                  />
                </svg>
                <span className="text-base font-medium">Sign in</span>
              </button>
            )}
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
        width: expanded ? 200 : 56,
        backgroundColor: colors.background,
        borderColor: colors.border,
      }}
    >
      {/* Logo */}
      <div className="p-2">
        <div className="h-10 rounded-lg flex items-center">
          <div className="w-10 flex items-center justify-center shrink-0">
            <svg className="w-8 h-8" viewBox="0 0 64 71" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M47.83 2.64c-4.28-1.43-7.74-2.27-10.36-2.52-2.52-.24-8.22-.2-13.23.91-4.47.99-8.31 2.95-10.26 4.2-2.64 1.68-6.67 5.36-9.33 9.49-1.78 2.77-2.72 6.29-3.1 7.53-.69 2.22-1.2 5.76-1.55 10.61 0 2.12 0 13.72 0 34.8 0 .09.23 1.88 1.19 2.78.75.7 2.22.58 2.58.49 1.02-.26 2.53-1.44 2.62-1.71.02-.05 2.26-2.19 4.74-4.79.81-.84 3.04-3.13 6.07-4.11 3.58-1.15 13.84-.83 13.96-.85 1.74-.42 6.71.26 13.56-1.87 1.35-.42 6.47-2.42 10.26-5.88 1.87-1.71 4.38-4.33 5.89-7.5 2.05-4.27 2.84-9.13 2.96-10.26.45-4.21-.04-7.59-.26-9.99-.05-.57-1.06-5.63-2.7-9.24-1.5-3.33-3.62-5.24-4.18-5.84-2.61-2.79-7.31-5.8-8.85-6.24z"
                fill="#C0630B"
              />
              <ellipse cx="28.59" cy="25.68" rx="7.74" ry="8.69" fill="#fff" />
              <ellipse cx="47.08" cy="25.68" rx="7.74" ry="8.69" fill="#fff" />
              <ellipse cx="29.84" cy="27.17" rx="4" ry="4.22" fill="#000" />
              <ellipse cx="48.83" cy="27.17" rx="4" ry="4.22" fill="#000" />
            </svg>
          </div>
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
                    <span className="text-sm ml-2" style={{ color: colors.textDark }}>
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
        {/* User Profile / Sign In */}
        <div className="relative">
          {user ? (
            <>
              <Tooltip label="Profile" show={!expanded}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="w-full h-10 rounded-lg flex items-center transition-all hover:bg-stone-100 mb-1"
                >
                  <div className="w-10 flex items-center justify-center shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                      style={{ backgroundColor: colors.textDark, color: colors.white }}
                    >
                      {getInitials()}
                    </div>
                  </div>
                  {expanded && (
                    <span className="text-sm flex-1 text-left truncate ml-2" style={{ color: colors.textDark }}>
                      {user.email}
                    </span>
                  )}
                </button>
              </Tooltip>
              <UserDropdown
                isOpen={showUserDropdown}
                onClose={() => setShowUserDropdown(false)}
                user={{ name: user.email || "", email: user.email || "" }}
                onNavigate={(route) => {
                  navigate(`/${route}`);
                  setShowUserDropdown(false);
                }}
                onLogout={() => {
                  signOut();
                  setShowUserDropdown(false);
                }}
              />
            </>
          ) : (
            <Tooltip label="Sign in" show={!expanded}>
              <button
                onClick={onSignInClick}
                className="w-full h-10 rounded-lg flex items-center transition-all hover:bg-stone-100 mb-1"
              >
                <div className="w-10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke={colors.textDark} strokeWidth={1.5} viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                    />
                  </svg>
                </div>
                {expanded && (
                  <span className="text-sm ml-2" style={{ color: colors.textDark }}>
                    Sign in
                  </span>
                )}
              </button>
            </Tooltip>
          )}
        </div>

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
