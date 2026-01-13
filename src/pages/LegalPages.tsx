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
      <nav
        aria-label="Main navigation"
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
            maxWidth: 800,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <a
            href="/"
            aria-label="Elterngeld Guide - Home"
            style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
          >
            <img src="/logo.svg" alt="Elterngeld Guide" style={{ height: 47 }} />
          </a>
          <a
            href="/guide"
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              ...typography.caption,
              fontWeight: 700,
              backgroundColor: colors.black,
              color: colors.white,
              textDecoration: "none",
            }}
          >
            Start planning →
          </a>
        </div>
      </nav>

      {/* CONTENT */}
      <article style={{ padding: "120px 24px 80px", maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ ...typography.h1, color: colors.textDark, marginBottom: 40 }}>{title}</h1>
        <div style={{ ...typography.body, color: colors.text }}>{children}</div>
      </article>

      {/* FOOTER */}
      <footer
        role="contentinfo"
        style={{ padding: "40px 24px", backgroundColor: colors.tile, borderTop: `1px solid ${colors.border}` }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <a href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/logo.svg" alt="Elterngeld Guide" style={{ height: 32 }} />
          </a>
          <div style={{ display: "flex", gap: 24 }}>
            <a href="/privacy" style={{ ...typography.caption, color: colors.textDark, textDecoration: "none" }}>
              Privacy
            </a>
            <a href="/disclaimer" style={{ ...typography.caption, color: colors.textDark, textDecoration: "none" }}>
              Disclaimer
            </a>
            <a href="/imprint" style={{ ...typography.caption, color: colors.textDark, textDecoration: "none" }}>
              Imprint
            </a>
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

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => <p style={{ marginBottom: 16 }}>{children}</p>;

const List: React.FC<{ items: string[] }> = ({ items }) => (
  <ul style={{ marginBottom: 16, paddingLeft: 24 }}>
    {items.map((item, i) => (
      <li key={i} style={{ marginBottom: 8 }}>
        {item}
      </li>
    ))}
  </ul>
);

// ===========================================
// PRIVACY POLICY
// ===========================================
export const PrivacyPolicy = () => (
  <LegalLayout title="Datenschutzerklärung">
    <Section title="1. Verantwortlicher">
      <P>Verantwortlich für die Datenverarbeitung auf dieser Website ist:</P>
      <P>
        <strong>Elterngeld Guide</strong>
        <br />
        Jochen Friedrich
        <br />
        Rathenaustraße 54
        <br />
        22297 Hamburg
        <br />
        Deutschland
      </P>
      <P>E-Mail: contact@elterngeldguide.com</P>
      <P>Ein Datenschutzbeauftragter ist nicht benannt, da hierfür keine gesetzliche Verpflichtung besteht.</P>
    </Section>

    <Section title="2. Allgemeine Hinweise zur Datenverarbeitung">
      <P>
        Der Schutz Ihrer personenbezogenen Daten ist uns ein wichtiges Anliegen. Personenbezogene Daten werden auf
        dieser Website ausschließlich im Rahmen der gesetzlichen Bestimmungen der Datenschutz-Grundverordnung (DSGVO)
        verarbeitet.
      </P>
      <P>Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.</P>
    </Section>

    <Section title="3. Hosting">
      <P>
        Diese Website wird über Lovable / GPT Engineer bereitgestellt. Beim Aufruf der Website verarbeitet der Hoster
        technisch notwendige Daten (z.B. IP-Adresse, Zeitpunkt des Zugriffs), um den sicheren Betrieb der Website zu
        gewährleisten.
      </P>
      <P>
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren und
        stabilen Websitebetrieb)
      </P>
    </Section>

    <Section title="4. Datenbank & Authentifizierung">
      <P>
        Wir nutzen Supabase für die Benutzerauthentifizierung und Datenspeicherung. Die Supabase-Server befinden sich in
        der EU (Frankfurt). Wenn Sie ein Konto erstellen oder Ihren Plan speichern, werden folgende Daten gespeichert:
      </P>
      <List items={["E-Mail-Adresse", "Plandaten (Ihre Elterngeld-Planung)", "Datum der Kontoerstellung"]} />
      <P>
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
      </P>
    </Section>

    <Section title="5. KI-Chatbot (Gemini)">
      <P>
        Elterngeld Guide stellt einen KI-gestützten Chatbot bereit, der Nutzerinnen und Nutzer bei allgemeinen Fragen
        zum Thema Elterngeld unterstützt.
      </P>
      <P>
        <strong>Wichtiger Hinweis zur Datentrennung:</strong>
      </P>
      <List
        items={[
          "Personenbezogene Daten (Name, Adresse, Geburtsdaten, Bankdaten) werden ausschließlich über separate Formulare erhoben",
          "Diese Daten werden NICHT an das KI-Modell weitergeleitet",
          "Chat-Eingaben können zur Verarbeitung an Gemini (Google) übermittelt werden",
          "Dabei kann es zu einer Datenübermittlung in Drittländer (z.B. USA) kommen",
        ]}
      />
      <P>
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung des Dienstes), Art. 6 Abs. 1 lit. f
        DSGVO (berechtigtes Interesse)
      </P>
    </Section>

    <Section title="6. E-Mail-Dienst">
      <P>
        Wir nutzen Loops für transaktionale E-Mails (z.B. Magic-Link-Login, Benachrichtigungen). Ihre E-Mail-Adresse
        wird zu diesem Zweck verarbeitet.
      </P>
      <P>
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
      </P>
    </Section>

    <Section title="7. Formulardaten">
      <P>
        Zur Unterstützung bei der Erstellung Ihres Elterngeld-Antrags können Sie freiwillig personenbezogene Daten
        eingeben, darunter:
      </P>
      <List
        items={[
          "Name",
          "E-Mail-Adresse",
          "Adresse",
          "Geburtsdatum",
          "Bankverbindung",
          "Angaben zu Kindern und Partnern",
        ]}
      />
      <P>
        Diese Daten werden ausschließlich zur lokalen PDF-Erstellung verwendet und in Ihrem Supabase-Konto gespeichert,
        wenn Sie dies wählen.
      </P>
    </Section>

    <Section title="8. Cookies">
      <P>
        Wir verwenden ausschließlich technisch notwendige Cookies für Authentifizierung und Session-Management. Es
        werden keine Tracking- oder Marketing-Cookies eingesetzt.
      </P>
    </Section>

    <Section title="9. Ihre Rechte">
      <P>Sie haben jederzeit das Recht auf:</P>
      <List
        items={[
          "Auskunft (Art. 15 DSGVO)",
          "Berichtigung (Art. 16 DSGVO)",
          "Löschung (Art. 17 DSGVO)",
          "Einschränkung der Verarbeitung (Art. 18 DSGVO)",
          "Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)",
          "Datenübertragbarkeit (Art. 20 DSGVO)",
        ]}
      />
      <P>Anfragen richten Sie bitte an: contact@elterngeldguide.com</P>
    </Section>

    <Section title="10. Aktualität">
      <P>
        Diese Datenschutzerklärung wird bei Bedarf angepasst, insbesondere bei Weiterentwicklung des Angebots (z.B.
        Bezahlfunktionen).
      </P>
      <P>
        <strong>Stand:</strong> Januar 2026
      </P>
    </Section>
  </LegalLayout>
);

// ===========================================
// DISCLAIMER
// ===========================================
export const Disclaimer = () => (
  <LegalLayout title="Haftungsausschluss">
    <Section title="1. Allgemeine Hinweise">
      <P>
        Elterngeld Guide ist ein digitales Informationsangebot. Die bereitgestellten Inhalte dienen ausschließlich der
        allgemeinen Information und stellen keine Rechtsberatung, Steuerberatung oder verbindliche Auskunft dar.
      </P>
      <P>
        Trotz sorgfältiger Erstellung und laufender Aktualisierung kann keine Gewähr für die Richtigkeit,
        Vollständigkeit oder Aktualität der Inhalte übernommen werden. Maßgeblich sind stets die jeweils geltenden
        gesetzlichen Regelungen sowie die Entscheidungen der zuständigen Elterngeldstellen.
      </P>
    </Section>

    <Section title="2. Nutzung des KI-Chatbots">
      <P>
        Das zentrale Produkt von Elterngeld Guide ist ein KI-gestützter Chatbot, der Nutzerinnen und Nutzer bei
        allgemeinen Fragen rund um das Thema Elterngeld unterstützt.
      </P>
      <P>Die durch den Chatbot bereitgestellten Antworten:</P>
      <List
        items={[
          "basieren auf automatisierter Verarbeitung und Wahrscheinlichkeiten",
          "stellen keine individuelle Beratung dar",
          "ersetzen keine verbindliche Auskunft durch Behörden oder qualifizierte Fachstellen",
        ]}
      />
      <P>
        Der Chatbot kann Fehler enthalten oder unvollständige bzw. verallgemeinerte Informationen liefern. Für
        Entscheidungen mit rechtlicher oder finanzieller Tragweite wird empfohlen, die Informationen zu prüfen und sich
        an die zuständige Elterngeldstelle oder eine qualifizierte Beratungsstelle zu wenden.
      </P>
    </Section>

    <Section title="3. Keine Haftung für Entscheidungen der Nutzer">
      <P>
        Die Nutzung der bereitgestellten Informationen, einschließlich der durch den KI-Chatbot generierten Inhalte,
        erfolgt auf eigene Verantwortung. Der Betreiber übernimmt keine Haftung für Schäden materieller oder
        immaterieller Art, die aus der Nutzung oder Nichtnutzung der angebotenen Informationen entstehen, sofern kein
        vorsätzliches oder grob fahrlässiges Verhalten vorliegt.
      </P>
    </Section>

    <Section title="4. Änderungen der Rechtslage">
      <P>
        Gesetzliche Grundlagen, Verwaltungsvorschriften und Auslegungspraxis im Bereich des Elterngeldes können sich
        jederzeit ändern. Der Betreiber übernimmt keine Haftung dafür, dass bereitgestellte Informationen mit der
        aktuellen Rechtslage oder der individuellen Entscheidungspraxis einzelner Behörden übereinstimmen.
      </P>
    </Section>

    <Section title="5. Externe Verweise">
      <P>
        Soweit diese Website Verweise auf externe Websites Dritter enthält, wird auf deren Inhalte kein Einfluss
        genommen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.
      </P>
    </Section>
  </LegalLayout>
);

// ===========================================
// IMPRINT
// ===========================================
export const Imprint = () => (
  <LegalLayout title="Impressum">
    <Section title="Angaben gemäß § 5 TMG">
      <P>
        <strong>Elterngeld Guide</strong>
        <br />
        Jochen Friedrich
        <br />
        Rathenaustraße 54
        <br />
        22297 Hamburg
        <br />
        Deutschland
      </P>
    </Section>

    <Section title="Kontakt">
      <P>E-Mail: contact@elterngeldguide.com</P>
    </Section>

    <Section title="Verantwortlich für den Inhalt">
      <P>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:</P>
      <P>
        Jochen Friedrich
        <br />
        Rathenaustraße 54
        <br />
        22297 Hamburg
      </P>
    </Section>

    <Section title="Urheberrecht">
      <P>
        Die auf dieser Website veröffentlichten Inhalte und Werke unterliegen dem deutschen Urheberrecht. Eine
        Vervielfältigung, Bearbeitung, Verbreitung oder sonstige Verwertung außerhalb der Grenzen des Urheberrechts
        bedarf der vorherigen schriftlichen Zustimmung des Betreibers.
      </P>
    </Section>

    <Section title="Haftungsausschluss">
      <P>
        Weitere rechtliche Hinweise finden Sie im{" "}
        <a href="/disclaimer" style={{ color: colors.basis }}>
          Haftungsausschluss
        </a>
        .
      </P>
    </Section>
  </LegalLayout>
);

export default { PrivacyPolicy, Disclaimer, Imprint };
