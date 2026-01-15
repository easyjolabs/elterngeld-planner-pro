import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { HEADER_HEIGHT } from "./Header";

// ===========================================
// DESIGN TOKENS
// ===========================================
const colors = {
  background: "#FAFAF9",
  white: "#FFFFFF",
  tile: "#F0EFED",
  border: "#E8E6E3",
  text: "#78716c",
  textDark: "#1C1917",
};

// ===========================================
// TYPES
// ===========================================
export type SidebarView = "planner" | "application" | "chat";

interface SidebarProps {
  activeView: SidebarView;
  onNavigate: (view: SidebarView) => void;
  onSignInClick?: () => void;
}

// ===========================================
// SIDEBAR WIDTH (exported for layout)
// ===========================================
export const SIDEBAR_WIDTH_COLLAPSED = 56;
export const SIDEBAR_WIDTH_EXPANDED = 200;

// ===========================================
// HOOKS
// ===========================================
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

// ===========================================
// TOOLTIP COMPONENT
// ===========================================
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

// ===========================================
// SIDEBAR COMPONENT
// ===========================================
const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, onSignInClick }) => {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const userName = user?.email?.split("@")[0] || "User";
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
            d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
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

  const PersonIcon = ({ color = colors.white, size = "w-4 h-4" }: { color?: string; size?: string }) => (
    <svg className={size} fill="none" stroke={color} strokeWidth={1.5} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );

  // Mobile: Bottom navigation or hamburger menu
  if (isMobile) {
    return (
      <>
        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            top: 20,
            right: 20,
            zIndex: 50,
            backgroundColor: colors.tile,
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke={colors.textDark} strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Mobile overlay */}
        {mobileOpen && <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setMobileOpen(false)} />}

        {/* Mobile slide-in menu */}
        <div
          className={`fixed top-0 left-0 z-50 h-full flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
          style={{ backgroundColor: colors.background, width: 280, paddingTop: HEADER_HEIGHT }}
        >
          <nav className="flex-1 p-3">
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileOpen(false);
                  }}
                  className="w-full h-12 rounded-xl flex items-center px-3 gap-3"
                  style={{
                    backgroundColor: activeView === item.id ? colors.tile : "transparent",
                    color: colors.textDark,
                  }}
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Bottom: Auth */}
          <div className="p-3 border-t" style={{ borderColor: colors.border }}>
            {user ? (
              <button
                onClick={() => {
                  navigate("/settings");
                  setMobileOpen(false);
                }}
                className="w-full h-12 rounded-xl flex items-center px-3 gap-3"
                style={{ backgroundColor: colors.tile }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ backgroundColor: colors.textDark, color: colors.white }}
                >
                  {userInitial}
                </div>
                <span className="text-sm font-medium" style={{ color: colors.textDark }}>
                  {userName}
                </span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onSignInClick?.();
                  setMobileOpen(false);
                }}
                className="w-full h-12 rounded-xl flex items-center px-3 gap-3"
                style={{ backgroundColor: colors.tile }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: colors.textDark }}
                >
                  <PersonIcon />
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

  // Desktop: Fixed sidebar
  return (
    <div
      className="fixed left-0 flex flex-col border-r transition-all duration-200"
      style={{
        top: HEADER_HEIGHT,
        height: `calc(100vh - ${HEADER_HEIGHT}px)`,
        width: expanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED,
        backgroundColor: colors.background,
        borderColor: colors.border,
      }}
    >
      {/* Navigation */}
      <nav className="flex-1 px-2 pt-3">
        {/* Expand/Collapse Toggle */}
        <Tooltip label={expanded ? "Collapse" : "Expand"} show={!expanded}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full h-10 rounded-lg flex items-center transition-all hover:bg-stone-100 mb-4"
            style={{ color: colors.text, opacity: 0.5 }}
          >
            <div className="w-10 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                {expanded ? (
                  <>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                  </>
                ) : (
                  <>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                  </>
                )}
              </svg>
            </div>
          </button>
        </Tooltip>

        <div className="space-y-1">
          {navItems.map((item) => (
            <Tooltip key={item.id} label={item.label} show={!expanded}>
              <button
                onClick={() => onNavigate(item.id)}
                className="w-full h-10 rounded-lg flex items-center transition-all hover:bg-stone-100"
                style={{
                  backgroundColor: activeView === item.id ? colors.tile : "transparent",
                  color: colors.textDark,
                }}
              >
                <div className="w-10 flex items-center justify-center shrink-0">{item.icon}</div>
                {expanded && (
                  <span className="text-sm" style={{ color: colors.textDark }}>
                    {item.label}
                  </span>
                )}
              </button>
            </Tooltip>
          ))}
        </div>
      </nav>

      {/* Bottom: User */}
      <div className="p-2">
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
              onClick={onSignInClick}
              className="w-full h-10 rounded-lg flex items-center transition-all hover:bg-stone-100 mb-1"
            >
              <div className="w-10 flex items-center justify-center shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: colors.textDark }}
                >
                  <PersonIcon />
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
      </div>
    </div>
  );
};

export { Sidebar };
export default Sidebar;
