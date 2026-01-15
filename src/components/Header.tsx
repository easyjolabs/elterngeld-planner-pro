import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGuide } from "./GuideContext";

// ===========================================
// DESIGN TOKENS
// ===========================================
const colors = {
  background: "#FAFAF9",
  border: "#E7E5E4",
  text: "#78716c",
  textDark: "#1C1917",
  white: "#FFFFFF",
  buttonDark: "#000000",
};

// ===========================================
// HEADER HEIGHT (exported for layout calculations)
// ===========================================
export const HEADER_HEIGHT = 72;

// ===========================================
// TYPES
// ===========================================
export type HeaderVariant = "landing" | "app";

interface HeaderProps {
  variant?: HeaderVariant;
}

// ===========================================
// HEADER COMPONENT
// ===========================================
export const Header: React.FC<HeaderProps> = ({ variant = "landing" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canGoBack, goBack, restart, openChat } = useGuide();

  const isGuidePage = location.pathname === "/guide" || location.pathname === "/planner";
  const isChatPage = location.pathname === "/chat";

  const handleLogoClick = () => {
    navigate("/");
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: HEADER_HEIGHT,
        padding: "0 24px",
        backgroundColor: "rgba(250, 250, 249, 0.95)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Left: Logo */}
      <div style={{ display: "flex", alignItems: "center", zIndex: 1 }}>
        <button
          onClick={handleLogoClick}
          aria-label="Elterngeld Guide - Home"
          style={{
            display: "flex",
            alignItems: "center",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <img src="/logo.svg" alt="Elterngeld Guide" style={{ height: 47 }} />
        </button>
      </div>

      {/* Middle: Back button aligned with centered content (max-w-2xl = 672px) */}
      {variant === "app" && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 672,
              paddingLeft: 20,
              paddingRight: 20,
              display: "flex",
              alignItems: "center",
            }}
          >
            {canGoBack && (
              <button
                onClick={goBack}
                style={{
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 8,
                  pointerEvents: "auto",
                }}
                title="Back"
              >
                <svg width="20" height="20" fill="none" stroke={colors.textDark} strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Right: Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, zIndex: 1 }}>
        {variant === "landing" && (
          <a
            href="/guide"
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 700,
              backgroundColor: colors.buttonDark,
              color: colors.white,
              textDecoration: "none",
            }}
          >
            Start planning →
          </a>
        )}

        {variant === "app" && (
          <>
            {/* Chat button - show on guide page, not on chat page */}
            {isGuidePage && !isChatPage && (
              <button
                onClick={() => openChat()}
                style={{
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 8,
                }}
                title="Chat"
              >
                <svg width="20" height="20" fill="none" stroke={colors.text} strokeWidth={1.5} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </button>
            )}

            {/* Restart button - show on guide and chat pages */}
            {(isGuidePage || isChatPage) && (
              <button
                onClick={restart}
                style={{
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 8,
                }}
                title="Restart"
              >
                <svg width="20" height="20" fill="none" stroke={colors.text} strokeWidth={1.5} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
