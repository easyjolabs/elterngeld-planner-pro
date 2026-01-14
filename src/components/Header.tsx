import React from "react";
import { useNavigate } from "react-router-dom";

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

const fonts = {
  body: "'Inter', -apple-system, sans-serif",
};

// ===========================================
// TYPES
// ===========================================
export type HeaderVariant = "landing" | "guide" | "chat";

interface HeaderProps {
  variant?: HeaderVariant;
  // Guide-specific props
  onBack?: () => void;
  canGoBack?: boolean;
  onRestart?: () => void;
  onOpenChat?: () => void;
  // Custom CTA for landing/legal pages
  ctaText?: string;
  ctaHref?: string;
}

// ===========================================
// HEADER COMPONENT
// ===========================================
export const Header: React.FC<HeaderProps> = ({
  variant = "landing",
  onBack,
  canGoBack = false,
  onRestart,
  onOpenChat,
  ctaText = "Start planning →",
  ctaHref = "/guide",
}) => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate("/");
  };

  // ===========================================
  // LANDING / LEGAL VARIANT
  // ===========================================
  if (variant === "landing") {
    return (
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "16px 24px",
          backgroundColor: "rgba(250, 250, 249, 0.95)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
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
          <a
            href={ctaHref}
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              fontFamily: fonts.body,
              fontSize: 14,
              fontWeight: 700,
              backgroundColor: colors.buttonDark,
              color: colors.white,
              textDecoration: "none",
            }}
          >
            {ctaText}
          </a>
        </div>
      </header>
    );
  }

  // ===========================================
  // GUIDE VARIANT
  // ===========================================
  if (variant === "guide") {
    return (
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: colors.background,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ padding: "12px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              maxWidth: 1200,
              margin: "0 auto",
            }}
          >
            {/* Left: Back button or Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {canGoBack && onBack ? (
                <button
                  onClick={onBack}
                  style={{
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: 8,
                  }}
                  title="Back"
                >
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke={colors.textDark}
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              ) : (
                <div style={{ width: 32 }} />
              )}
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
                <img src="/logo.svg" alt="Elterngeld Guide" style={{ height: 40 }} />
              </button>
            </div>

            {/* Right: Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {onOpenChat && (
                <button
                  onClick={onOpenChat}
                  style={{
                    width: 32,
                    height: 32,
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
              {onRestart && (
                <button
                  onClick={onRestart}
                  style={{
                    width: 32,
                    height: 32,
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
            </div>
          </div>
        </div>
      </header>
    );
  }

  // ===========================================
  // CHAT VARIANT
  // ===========================================
  if (variant === "chat") {
    return (
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: colors.background,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ padding: "12px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              maxWidth: 1200,
              margin: "0 auto",
            }}
          >
            {/* Left: Logo */}
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
              <img src="/logo.svg" alt="Elterngeld Guide" style={{ height: 40 }} />
            </button>

            {/* Right: Restart only */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {onRestart && (
                <button
                  onClick={onRestart}
                  style={{
                    width: 32,
                    height: 32,
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
            </div>
          </div>
        </div>
      </header>
    );
  }

  return null;
};

// Export header height for layout calculations
export const HEADER_HEIGHT = 64;

export default Header;
