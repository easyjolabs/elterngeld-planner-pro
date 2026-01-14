// ===========================================
// SHARED LAYOUT COMPONENTS
// ===========================================
import React from "react";
import Header, { HEADER_HEIGHT } from "./Header";

// ===========================================
// DESIGN TOKENS
// ===========================================
export const colors = {
  background: "#FAFAF9",
  tile: "#F0EEE6",
  text: "#57534E",
  textDark: "#000000",
  border: "#E7E5E4",
  white: "#FFFFFF",
  black: "#000000",
  basis: "#C0630B",
  orange: "#FF8752",
  tan: "#D1B081",
};

const fonts = {
  headline: "'Space Grotesk', -apple-system, sans-serif",
  body: "'Inter', -apple-system, sans-serif",
};

export const typography = {
  h1: { fontFamily: fonts.headline, fontSize: 56, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1 },
  h2: { fontFamily: fonts.headline, fontSize: 42, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15 },
  h3: { fontFamily: fonts.headline, fontSize: 28, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.25 },
  h4: { fontFamily: fonts.headline, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.3 },
  body: { fontFamily: fonts.body, fontSize: 17, fontWeight: 400, lineHeight: 1.6 },
  bodyLarge: { fontFamily: fonts.body, fontSize: 20, fontWeight: 400, lineHeight: 1.6 },
  bodySmall: { fontFamily: fonts.body, fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
  caption: { fontFamily: fonts.body, fontSize: 14, fontWeight: 500, lineHeight: 1.4 },
  label: {
    fontFamily: fonts.headline,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
  },
};

// ===========================================
// GLOBAL STYLES
// ===========================================
export const GlobalStyles: React.FC<{ extraStyles?: string }> = ({ extraStyles = "" }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    a:focus-visible, button:focus-visible { outline: 2px solid ${colors.black}; outline-offset: 2px; }
    a:focus:not(:focus-visible), button:focus:not(:focus-visible) { outline: none; }
    @media (max-width: 600px) {
      .mobile-h1 { font-size: 28px !important; }
      .mobile-h2 { font-size: 24px !important; }
      .mobile-body-large { font-size: 16px !important; }
      .footer-grid { grid-template-columns: 1fr !important; }
    }
    @media (max-width: 900px) {
      .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
      .footer-logo-col { grid-column: 1 / -1 !important; }
    }
    ${extraStyles}
  `}</style>
);

// ===========================================
// SKIP TO CONTENT (Accessibility)
// ===========================================
export const SkipToContent: React.FC = () => (
  <a
    href="#main-content"
    style={{ position: "absolute", left: "-9999px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }}
    onFocus={(e) => {
      e.currentTarget.style.left = "16px";
      e.currentTarget.style.top = "16px";
      e.currentTarget.style.width = "auto";
      e.currentTarget.style.height = "auto";
      e.currentTarget.style.padding = "8px 16px";
      e.currentTarget.style.backgroundColor = colors.black;
      e.currentTarget.style.color = colors.white;
      e.currentTarget.style.borderRadius = "8px";
      e.currentTarget.style.zIndex = "9999";
    }}
    onBlur={(e) => {
      e.currentTarget.style.left = "-9999px";
    }}
  >
    Skip to main content
  </a>
);

// ===========================================
// FOOTER
// ===========================================
interface FooterProps {
  maxWidth?: number;
}

export const Footer: React.FC<FooterProps> = ({ maxWidth = 1100 }) => (
  <footer role="contentinfo" aria-label="Site footer" style={{ padding: "60px 24px", backgroundColor: "#FAFAF9" }}>
    <div style={{ maxWidth, margin: "0 auto" }}>
      <div
        className="footer-grid"
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 48, marginBottom: 48 }}
      >
        <div className="footer-logo-col">
          <div style={{ marginBottom: 16 }}>
            <img src="/logo.svg" alt="Elterngeld Guide" style={{ height: 47 }} />
          </div>
          <p style={{ ...typography.bodySmall, color: colors.textDark, maxWidth: 280 }}>
            Helping internationals in Germany navigate parental benefits since 2025.
          </p>
        </div>
        <div>
          <h4 style={{ ...typography.h4, color: colors.textDark, marginBottom: 16 }}>Main Pages</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Guide", "/guide"],
              ["PDF Application", "/pdf"],
              ["Chat", "/chat"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                style={{
                  ...typography.bodySmall,
                  color: colors.textDark,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {label} <span style={{ fontSize: 12 }}>↗</span>
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 style={{ ...typography.h4, color: colors.textDark, marginBottom: 16 }}>Legal</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Privacy Policy", "/privacy"],
              ["Disclaimer", "/disclaimer"],
              ["Imprint", "/imprint"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                style={{
                  ...typography.bodySmall,
                  color: colors.textDark,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {label} <span style={{ fontSize: 12 }}>↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <p style={{ ...typography.caption, color: colors.textDark }}>© 2025 Elterngeld Guide. All rights reserved.</p>
    </div>
  </footer>
);

// ===========================================
// PAGE LAYOUT (for Landing Page)
// ===========================================
interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: number;
  padding?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children, maxWidth = 1100, padding = "120px 24px 60px" }) => (
  <main style={{ backgroundColor: colors.background, minHeight: "100vh" }}>
    <GlobalStyles />
    <Header variant="landing" />
    <div style={{ padding, maxWidth, margin: "0 auto" }}>{children}</div>
    <Footer maxWidth={maxWidth} />
  </main>
);

// ===========================================
// LEGAL PAGE LAYOUT (narrower)
// ===========================================
export const LegalPageLayout: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <main style={{ backgroundColor: colors.white, minHeight: "100vh" }}>
    <GlobalStyles />
    <Header variant="landing" />
    <article style={{ padding: `${HEADER_HEIGHT + 48}px 24px 60px`, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ ...typography.h2, color: colors.textDark, marginBottom: 40 }} className="mobile-h2">
        {title}
      </h1>
      <div style={{ ...typography.body, color: colors.text }}>{children}</div>
    </article>
    <Footer maxWidth={1100} />
  </main>
);

export default { Footer, PageLayout, LegalPageLayout, GlobalStyles, colors, typography };
