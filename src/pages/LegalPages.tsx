// ===========================================
// LEGAL PAGES - Privacy, Disclaimer, Imprint
// ===========================================
import React from "react";

// ===========================================
// DESIGN TOKENS (same as Landing Page)
// ===========================================
const colors = {
  background: "#F9F8F4",
  tile: "#F0EEE6",
  text: "#57534E",
  textDark: "#000000",
  border: "#E7E5E4",
  white: "#FFFFFF",
  black: "#000000",
  basis: "#C0630B",
};

const fonts = {
  headline: "'Space Grotesk', -apple-system, sans-serif",
  body: "'Inter', -apple-system, sans-serif",
};

const typography = {
  h1: { fontFamily: fonts.headline, fontSize: 42, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15 },
  h2: { fontFamily: fonts.headline, fontSize: 28, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.25 },
  h3: { fontFamily: fonts.headline, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.3 },
  body: { fontFamily: fonts.body, fontSize: 16, fontWeight: 400, lineHeight: 1.7 },
  caption: { fontFamily: fonts.body, fontSize: 14, fontWeight: 500, lineHeight: 1.5 },
};

// ===========================================
// SHARED LAYOUT
// ===========================================
const LegalLayout: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  return (
    <main style={{ backgroundColor: "#FAFAF9", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        a:focus-visible, button:focus-visible { outline: 2px solid ${colors.black}; outline-offset: 2px; }
        a:focus:not(:focus-visible), button:focus:not(:focus-visible) { outline: none; }
      `}</style>

      {/* NAV */}
      <nav aria-label="Main navigation" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: "16px 24px", backgroundColor: "rgba(250, 250, 249, 0.95)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" aria-label="Elterngeld Guide - Home" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/logo.svg" alt="Elterngeld Guide" style={{ height: 47 }} />
          </a>
          <a href="/guide" style={{ padding: "10px 20px", borderRadius: 999, ...typography.caption, fontWeight: 700, backgroundColor: colors.black, color: colors.white, textDecoration: "none" }}>
            Start planning →
          </a>
        </div>
      </nav>

      {/* CONTENT */}
      <article style={{ padding: "120px 24px 80px", maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ ...typography.h1, color: colors.textDark, marginBottom: 40 }}>{title}</h1>
        <div style={{ ...typography.body, color: colors.text }}>
          {children}
        </div>
      </article>

      {/* FOOTER */}
      <footer role="contentinfo" style={{ padding: "40px 24px", backgroundColor: colors.tile, borderTop: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/logo.svg" alt="Elterngeld Guide" style={{ height: 32 }} />
          </a>
          <div style={{ display: "flex", gap: 24 }}>
            <a href="/privacy" style={{ ...typography.caption, color: colors.textDark, textDecoration: "none" }}>Privacy</a>
            <a href="/disclaimer" style={{ ...typography.caption, color: colors.textDark, textDecoration: "none" }}>Disclaimer</a>
            <a href="/imprint" style={{ ...typography.caption, color: colors.textDark, textDecoration: "none" }}>Imprint</a>
          </div>
        </div>
      </footer>
    </main>
  );
};

// Styled Section
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={{ marginBottom: 40 }}>
    <h2 style={{ ...typography.h2, color: colors.textDark, marginBottom: 16 }}>{title}</h2>
    <div style={{ color: colors.text }}>{children}</div>
  </section>
);

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ marginBottom: 16 }}>{children}</p>
);

const List: React.FC<{ items: string[] }> = ({ items }) => (
  <ul style={{ marginBottom: 16, paddingLeft: 24 }}>
    {items.map((item, i) => (
      <li key={i} style={{ marginBottom: 8 }}>{item}</li>
    ))}
  </ul>
);

// ===========================================
// PRIVACY POLICY
// ===========================================
export const PrivacyPolicy = () => (
  <LegalLayout title="Privacy Policy">
    <Section title="1. Data Controller">
      <P>Responsible for data processing on this website:</P>
      <P>
        <strong>Elterngeld Guide</strong><br />
        Jochen Friedrich<br />
        Rathenaustraße 54<br />
        22297 Hamburg<br />
        Germany
      </P>
      <P>Email: contact@elterngeldguide.com</P>
      <P>A data protection officer is not required as there is no legal obligation.</P>
    </Section>

    <Section title="2. General Information">
      <P>Protecting your personal data is important to us. Personal data is processed exclusively in accordance with the General Data Protection Regulation (GDPR).</P>
      <P>Personal data is any data that can be used to personally identify you.</P>
    </Section>

    <Section title="3. Hosting">
      <P>This website is hosted by Lovable / GPT Engineer. When accessing the website, technically necessary data (e.g., IP address, time of access) is processed to ensure secure operation.</P>
      <P><strong>Legal basis:</strong> Art. 6 (1) lit. f GDPR (legitimate interest in secure website operation)</P>
    </Section>

    <Section title="4. Database & Authentication">
      <P>We use Supabase for user authentication and data storage. Supabase servers are located in the EU (Frankfurt). When you create an account or save your plan, the following data is stored:</P>
      <List items={[
        "Email address",
        "Plan data (your Elterngeld planning)",
        "Account creation date"
      ]} />
      <P><strong>Legal basis:</strong> Art. 6 (1) lit. b GDPR (contract fulfillment)</P>
    </Section>

    <Section title="5. AI Chat (Gemini)">
      <P>Elterngeld Guide provides an AI-powered chatbot to assist with general questions about Elterngeld.</P>
      <P><strong>Important note on data separation:</strong></P>
      <List items={[
        "Personal data (name, address, birth dates, bank details) is collected only through separate forms",
        "This data is NOT sent to the AI model",
        "Chat inputs may be transmitted to Gemini (Google) for processing",
        "Data transfer to third countries (USA) may occur"
      ]} />
      <P><strong>Legal basis:</strong> Art. 6 (1) lit. b GDPR (service provision), Art. 6 (1) lit. f GDPR (legitimate interest)</P>
    </Section>

    <Section title="6. Email Service">
      <P>We use Loops for transactional emails (e.g., magic link login, notifications). Your email address is processed for this purpose.</P>
      <P><strong>Legal basis:</strong> Art. 6 (1) lit. b GDPR (contract fulfillment)</P>
    </Section>

    <Section title="7. Form Data">
      <P>To help create your Elterngeld application, you may voluntarily enter personal data including:</P>
      <List items={[
        "Name",
        "Email address", 
        "Address",
        "Date of birth",
        "Bank details",
        "Information about children and partners"
      ]} />
      <P>This data is used exclusively for local PDF generation and is stored in your Supabase account if you choose to save it.</P>
    </Section>

    <Section title="8. Cookies">
      <P>We only use technically necessary cookies for authentication and session management. No tracking or marketing cookies are used.</P>
    </Section>

    <Section title="9. Your Rights">
      <P>You have the right to:</P>
      <List items={[
        "Access your data (Art. 15 GDPR)",
        "Rectification (Art. 16 GDPR)",
        "Erasure (Art. 17 GDPR)",
        "Restriction of processing (Art. 18 GDPR)",
        "Object to processing (Art. 21 GDPR)",
        "Data portability (Art. 20 GDPR)"
      ]} />
      <P>Contact: contact@elterngeldguide.com</P>
    </Section>

    <Section title="10. Updates">
      <P>This privacy policy may be updated as our service evolves (e.g., payment features).</P>
      <P><strong>Last updated:</strong> January 2026</P>
    </Section>
  </LegalLayout>
);

// ===========================================
// DISCLAIMER
// ===========================================
export const Disclaimer = () => (
  <LegalLayout title="Disclaimer">
    <Section title="1. General Notice">
      <P>Elterngeld Guide is a digital information service. The content provided is for general information purposes only and does not constitute legal advice, tax advice, or binding information.</P>
      <P>Despite careful preparation and regular updates, no guarantee can be given for the accuracy, completeness, or timeliness of the content. The applicable legal regulations and decisions of the responsible Elterngeld offices are always authoritative.</P>
    </Section>

    <Section title="2. Use of the AI Chatbot">
      <P>The core product of Elterngeld Guide is an AI-powered chatbot that assists users with general questions about Elterngeld.</P>
      <P>The answers provided by the chatbot:</P>
      <List items={[
        "Are based on automated processing and probabilities",
        "Do not constitute individual advice",
        "Do not replace binding information from authorities or qualified professionals"
      ]} />
      <P>The chatbot may contain errors or provide incomplete or generalized information. For decisions with legal or financial implications, we recommend verifying the information and contacting the responsible Elterngeld office or a qualified advisor.</P>
    </Section>

    <Section title="3. No Liability for User Decisions">
      <P>The use of the information provided, including content generated by the AI chatbot, is at your own risk. The operator assumes no liability for material or immaterial damages arising from the use or non-use of the information offered, unless intentional or grossly negligent conduct is involved.</P>
    </Section>

    <Section title="4. Changes in Legal Situation">
      <P>Legal bases, administrative regulations, and interpretation practices in the area of Elterngeld can change at any time. The operator assumes no liability for ensuring that the information provided corresponds to the current legal situation or the individual decision-making practices of individual authorities.</P>
    </Section>

    <Section title="5. External Links">
      <P>Where this website contains links to external third-party websites, no influence is exerted on their content. The respective provider or operator is always responsible for the content of the linked pages.</P>
    </Section>
  </LegalLayout>
);

// ===========================================
// IMPRINT
// ===========================================
export const Imprint = () => (
  <LegalLayout title="Imprint">
    <Section title="Information according to § 5 TMG">
      <P>
        <strong>Elterngeld Guide</strong><br />
        Jochen Friedrich<br />
        Rathenaustraße 54<br />
        22297 Hamburg<br />
        Germany
      </P>
    </Section>

    <Section title="Contact">
      <P>Email: contact@elterngeldguide.com</P>
    </Section>

    <Section title="Responsible for Content">
      <P>Responsible for content according to § 18 (2) MStV:</P>
      <P>
        Jochen Friedrich<br />
        Rathenaustraße 54<br />
        22297 Hamburg
      </P>
    </Section>

    <Section title="Copyright">
      <P>The content and works published on this website are subject to German copyright law. Reproduction, editing, distribution, or any form of use beyond the limits of copyright law requires the prior written consent of the operator.</P>
    </Section>

    <Section title="Disclaimer">
      <P>For further legal information, please see our <a href="/disclaimer" style={{ color: colors.basis }}>Disclaimer</a>.</P>
    </Section>
  </LegalLayout>
);

export default { PrivacyPolicy, Disclaimer, Imprint };
