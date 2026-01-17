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

  const handleLogoClick = () => {
    navigate("/");
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: -8,
        right: 0,
        zIndex: 50,
        height: HEADER_HEIGHT,
        padding: "0 24px",
        backgroundColor: "rgba(250, 250, 249, 0.95)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: variant === "app" ? "1px solid #E7E5E4" : "none",
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
          <img src="/logo.svg" alt="Elterngeld Guide" style={{ height: 40 }} />
        </button>
      </div>

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
      </div>
    </header>
  );
};

export default Header;
