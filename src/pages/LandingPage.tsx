// ===========================================
// ELTERNGELD GUIDE - LANDING PAGE
// ===========================================

import React, { useState, useEffect, useRef } from "react";
import { Footer } from "../components/SharedLayout";
import { Header } from "@/components/Header";

// ===========================================
// SCROLL ANIMATION HOOK
// ===========================================
const useScrollAnimation = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );

    observer.observe(currentRef);

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
};

// Animated Section Wrapper
const AnimatedSection: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({
  children,
  className = "",
  style = {},
}) => {
  const { ref, isVisible } = useScrollAnimation();
  return (
    <div ref={ref} className={`fade-section ${isVisible ? "visible" : ""} ${className}`} style={style}>
      {children}
    </div>
  );
};

// ===========================================
// DESIGN TOKENS
// ===========================================
const colors = {
  background: "#FAFAF9",
  tile: "#F0EEE6",
  white: "#FFFFFF",
  black: "#000000",

  text: "#666666",
  textDark: "#000000",
  border: "#E7E5E4",
  buttonDark: "#000000",

  orange: "#FF8752",
  tan: "#D1B081",
  yellow: "#FFE44C",

  basis: "#C0630B",
  plus: "#FC631B",
  bonus: "#FFBDF0",

  stars: "#facc15",
};

const fonts = {
  headline: "'Space Grotesk', -apple-system, sans-serif",
  body: "'Inter', -apple-system, sans-serif",
};

const typography = {
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
// ICONS
// ===========================================
const Icons = {
  check: (size = 20) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  calendar: (size = 20) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  save: (size = 20) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  download: (size = 20) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  chat: (size = 20) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  globe: (size = 18) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
};

// ===========================================
// ANIMATED NUMBER
// ===========================================
const AnimatedNumber = ({ value, prefix = "" }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const duration = 400;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + (endValue - startValue) * easeOut));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    previousValue.current = value;
  }, [value]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString("de-DE")}
    </span>
  );
};

// ===========================================
// QUICK SET PRESETS (simplified to 3)
// ===========================================
const PRESETS = {
  classic: {
    name: "Classic",
    you: ["basis", "basis", "basis", "basis", "basis", "basis", "plus", "plus"],
    partner: ["basis", "basis", "empty", "empty", "empty", "empty", "empty", "empty"],
  },
  extended: {
    name: "Extended",
    you: ["basis", "basis", "plus", "plus", "plus", "plus", "plus", "plus"],
    partner: ["basis", "basis", "plus", "plus", "empty", "empty", "empty", "empty"],
  },
  bonus: {
    name: "With Bonus",
    you: ["basis", "basis", "basis", "basis", "bonus", "bonus", "bonus", "bonus"],
    partner: ["basis", "basis", "bonus", "bonus", "bonus", "bonus", "empty", "empty"],
  },
};

// ===========================================
// INTERACTIVE HERO PLANNER (simplified)
// ===========================================
const HeroPlannerMockup = () => {
  const [income, setIncome] = useState(3500);
  const [activePreset, setActivePreset] = useState("classic");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 200);
  }, []);

  const preset = PRESETS[activePreset];

  const getElterngeld = (net) => {
    if (net === 0) return { basis: 300, plus: 150 };
    let rate = 0.67;
    if (net < 1000) rate = Math.min(1.0, 0.67 + ((1000 - net) / 2) * 0.001);
    else if (net > 1200) rate = Math.max(0.65, 0.67 - ((net - 1200) / 2) * 0.001);
    const basis = Math.max(300, Math.min(1800, Math.round(net * rate)));
    return { basis, plus: Math.round(basis / 2) };
  };

  const calc = getElterngeld(income);

  const calculateTotal = (youArr, partnerArr) => {
    const count = (arr) =>
      arr.reduce(
        (acc, t) => {
          if (t === "basis") acc.basis++;
          else if (t === "plus" || t === "bonus") acc.plus++;
          return acc;
        },
        { basis: 0, plus: 0 },
      );

    const y = count(youArr);
    const p = count(partnerArr);
    return (y.basis + p.basis) * calc.basis + (y.plus + p.plus) * calc.plus;
  };

  const total = calculateTotal(preset.you, preset.partner);

  const getBlockColor = (type) => {
    switch (type) {
      case "basis":
        return colors.orange;
      case "plus":
        return colors.tan;
      case "bonus":
        return colors.yellow;
      default:
        return "transparent";
    }
  };

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 24,
        backgroundColor: colors.white,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Quick Sets */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "flex-start" }}>
        {Object.entries(PRESETS).map(([key, p]) => (
          <button
            key={key}
            onClick={() => setActivePreset(key)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: activePreset === key ? "none" : `1px solid ${colors.border}`,
              backgroundColor: activePreset === key ? colors.tile : colors.white,
              cursor: "pointer",
              transition: "all 0.2s ease",
              ...typography.caption,
              color: colors.textDark,
              fontWeight: 500,
              fontSize: 12,
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Income Slider - black, thinner */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ ...typography.caption, color: colors.text }}>Your net income</span>
          <span style={{ fontFamily: fonts.headline, fontSize: 20, fontWeight: 700, color: colors.textDark }}>
            €{income.toLocaleString("de-DE")}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="5000"
          step="100"
          value={income}
          onChange={(e) => setIncome(Number(e.target.value))}
          style={{
            width: "100%",
            height: 4,
            borderRadius: 2,
            appearance: "none",
            background: `linear-gradient(to right, ${colors.black} 0%, ${colors.black} ${(income / 5000) * 100}%, ${colors.border} ${(income / 5000) * 100}%, ${colors.border} 100%)`,
            cursor: "pointer",
          }}
          className="hero-slider-black"
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            ...typography.caption,
            color: colors.text,
            fontSize: 11,
            marginTop: 4,
          }}
        >
          <span>€0</span>
          <span>€5,000</span>
        </div>
      </div>

      {/* Planner Blocks - mit Labels */}
      <div style={{ marginBottom: 16, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
          {preset.you.map((type, i) => (
            <div
              key={`you-${i}-${type}`}
              style={{
                flex: 1,
                height: 32,
                borderRadius: 5,
                backgroundColor: getBlockColor(type),
                border: type === "empty" ? `1.5px dashed ${colors.border}` : "none",
                opacity: loaded ? 1 : 0,
                transform: loaded ? "translateY(0)" : "translateY(8px)",
                transition: `all 0.5s ease ${i * 0.08}s`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {type !== "empty" && (
                <span
                  style={{
                    ...typography.caption,
                    fontSize: 9,
                    color: colors.black,
                    fontWeight: 500,
                    textTransform: "capitalize",
                  }}
                >
                  {type === "basis" ? "Basis" : type === "plus" ? "Plus" : "Bonus"}
                </span>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 3 }}>
          {preset.partner.map((type, i) => (
            <div
              key={`partner-${i}-${type}`}
              style={{
                flex: 1,
                height: 32,
                borderRadius: 5,
                backgroundColor: getBlockColor(type),
                border: type === "empty" ? `1.5px dashed ${colors.border}` : "none",
                opacity: loaded ? 1 : 0,
                transform: loaded ? "translateY(0)" : "translateY(8px)",
                transition: `all 0.5s ease ${(i + 8) * 0.08}s`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {type !== "empty" && (
                <span
                  style={{
                    ...typography.caption,
                    fontSize: 9,
                    color: colors.black,
                    fontWeight: 500,
                    textTransform: "capitalize",
                  }}
                >
                  {type === "basis" ? "Basis" : type === "plus" ? "Plus" : "Bonus"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ ...typography.body, color: colors.textDark, fontSize: 14 }}>Estimated total</span>
        <span style={{ fontFamily: fonts.headline, fontSize: 28, fontWeight: 700, color: colors.textDark }}>
          <AnimatedNumber value={total} prefix="€" />
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.text}
          strokeWidth={1.5}
          style={{ flexShrink: 0 }}
        >
          <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.4-1.2 4.5-3 5.7V17a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-2.3C6.2 13.5 5 11.4 5 9a7 7 0 0 1 7-7z" />
        </svg>
        <p style={{ ...typography.caption, color: colors.text, margin: 0 }}>
          Quick estimate ·{" "}
          <a href="/guide" style={{ color: colors.basis, textDecoration: "underline" }}>
            Answer more questions
          </a>{" "}
          for exact amount
        </p>
      </div>
    </div>
  );
};

// ===========================================
// ELIGIBILITY CHECKER ICONS
// ===========================================
const CheckerIcons = {
  eu: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v2M12 16v2M6 12h2M16 12h2M8.5 8.5l1 1M14.5 14.5l1 1M8.5 15.5l1-1M14.5 9.5l1-1" />
    </svg>
  ),
  passport: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M8 17h8" />
    </svg>
  ),
  blueCard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
  briefcase: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  ),
  student: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M22 10l-10-5-10 5 10 5 10-5z" />
      <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
      <path d="M22 10v6" />
    </svg>
  ),
  family: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 21v-2c0-2.5 3-5 6-5 1.5 0 3 .5 4 1.5M17 21v-2c0-1.5 1-3 3-3" />
    </svg>
  ),
  question: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 9a3 3 0 015.12 2.15c0 1.43-1.62 2.1-2.62 2.1v1.25" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  ),
  check: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
  x: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M6 6l12 12M6 18L18 6" />
    </svg>
  ),
};

// ===========================================
// ELIGIBILITY CHECKER
// ===========================================
interface AnswersType {
  citizenship?: string;
  visa?: string;
  incomeLimit?: string;
}

const EligibilityChecker = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswersType>({});

  const questions = [
    {
      id: "citizenship",
      question: "Are you a German or EU/EEA/Swiss citizen?",
      options: [
        { value: "eu", label: "Yes", icon: "eu" },
        { value: "non-eu", label: "No, other nationality", icon: "passport" },
      ],
    },
    {
      id: "visa",
      question: "What residence permit do you have?",
      showIf: (a: AnswersType) => a.citizenship === "non-eu",
      options: [
        { value: "blue_card", label: "Blue Card EU", icon: "blueCard" },
        { value: "work_permit", label: "Work Permit", icon: "briefcase" },
        { value: "student", label: "Student Visa", icon: "student" },
        { value: "family", label: "Family Reunion", icon: "family" },
      ],
    },
    {
      id: "incomeLimit",
      question: "Household income under €175,000/year?",
      options: [
        { value: "under", label: "Yes, under €175k", icon: "check" },
        { value: "over", label: "No, over €175k", icon: "x" },
      ],
    },
  ];

  const currentQuestion = questions.filter((q) => !q.showIf || q.showIf(answers))[step];
  const totalSteps = questions.filter((q) => !q.showIf || q.showIf(answers)).length;
  const isComplete = step >= totalSteps;

  const handleSelect = (value: string) => {
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);

    setTimeout(() => {
      const nextQuestions = questions.filter((q) => !q.showIf || q.showIf(newAnswers));
      if (step + 1 < nextQuestions.length) {
        setStep(step + 1);
      } else {
        setStep(nextQuestions.length);
      }
    }, 250);
  };

  const getResult = () => {
    if (answers.incomeLimit === "over") {
      return {
        eligible: false,
        message: "Households over €175,000 are not eligible for Elterngeld.",
        color: colors.orange,
      };
    }
    if (
      answers.citizenship === "eu" ||
      ["blue_card", "work_permit", "niederlassungserlaubnis", "family"].includes(answers.visa || "")
    ) {
      return { eligible: true, message: "Good news! You're likely eligible for Elterngeld.", color: "#22c55e" };
    }
    if (answers.visa === "student") {
      return {
        eligible: "maybe",
        message: "Eligible if you're employed, in Elternzeit, or receiving ALG.",
        color: colors.tan,
      };
    }
    return {
      eligible: "maybe",
      message: "Check with your local Elterngeldstelle for your specific case.",
      color: colors.tan,
    };
  };

  const reset = () => {
    setStep(0);
    setAnswers({});
  };

  // Gemeinsame Box-Struktur - Orange wie Chat
  const BoxWrapper = ({ children }) => (
    <div
      style={{
        backgroundColor: colors.orange,
        borderRadius: 20,
        padding: 28,
        minHeight: 320,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Label */}
      <p style={{ ...typography.label, color: colors.black, opacity: 0.6, marginBottom: 12 }}>
        Quick Eligibility Check
      </p>
      {/* Content Card - feste Höhe */}
      <div
        style={{
          flex: 1,
          backgroundColor: "rgba(255,255,255,0.5)",
          borderRadius: 16,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          minHeight: 230,
        }}
      >
        {children}
      </div>
    </div>
  );

  if (isComplete) {
    const result = getResult();
    const resultBg =
      result.eligible === true
        ? "rgba(26,182,137,0.2)"
        : result.eligible === false
          ? "rgba(224,123,60,0.2)"
          : "rgba(255,255,255,0.3)";
    return (
      <BoxWrapper>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 47,
              borderRadius: "50%",
              backgroundColor: resultBg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: result.color,
              marginBottom: 10,
            }}
          >
            {result.eligible === true
              ? CheckerIcons.check
              : result.eligible === false
                ? CheckerIcons.x
                : CheckerIcons.question}
          </div>
          <p style={{ ...typography.bodySmall, color: colors.black, marginBottom: 14 }}>{result.message}</p>
          <a
            href="/guide"
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              backgroundColor: colors.black,
              color: colors.white,
              ...typography.bodySmall,
              fontWeight: 600,
              textDecoration: "none",
              textAlign: "center",
            }}
          >
            {result.eligible === true ? "Calculate your benefit →" : "Check full eligibility →"}
          </a>
          <button
            onClick={reset}
            style={{
              marginTop: 12,
              background: "none",
              border: "none",
              cursor: "pointer",
              ...typography.caption,
              color: colors.black,
              opacity: 0.6,
              textDecoration: "underline",
            }}
          >
            Start over
          </button>
        </div>
      </BoxWrapper>
    );
  }

  return (
    <BoxWrapper>
      {/* Progress Dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: i < step ? colors.black : i === step ? colors.black : "rgba(0,0,0,0.2)",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Question */}
      <p style={{ ...typography.h3, color: colors.black, marginBottom: 16, textAlign: "center" }}>
        {currentQuestion.question}
      </p>

      {/* Options - Grid nur für Visa */}
      <div
        style={{
          flex: 1,
          display: currentQuestion.id === "visa" ? "grid" : "flex",
          gridTemplateColumns: "repeat(2, 1fr)",
          flexDirection: "column",
          justifyContent: "center",
          alignContent: "center",
          gap: currentQuestion.id === "visa" ? 8 : 10,
        }}
      >
        {currentQuestion.options.map((option, index) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            aria-label={`Select: ${option.label}`}
            style={{
              padding: "0 18px",
              height: 48,
              borderRadius: 10,
              border: "none",
              backgroundColor: colors.white,
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
            }}
          >
            <span style={{ color: colors.black, display: "flex" }} aria-hidden="true">
              {CheckerIcons[option.icon]}
            </span>
            <span
              style={{
                ...typography.caption,
                color: colors.black,
                fontWeight: 500,
                fontSize: currentQuestion.id === "visa" ? 12 : 13,
              }}
            >
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </BoxWrapper>
  );
};

// ===========================================
// FAQ
// ===========================================
const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      q: "Is this also for Germans?",
      a: "Of course! While we built this with expats in mind, the guide works perfectly for German citizens too. The application process is the same for everyone.",
    },
    {
      q: "What is Elterngeld Guide?",
      a: "A free tool that helps you understand German parental benefits, check your eligibility, calculate your amount, and plan your months. For €39, you can also get your 23-page application pre-filled and ready to submit.",
    },
    {
      q: "Who is behind this?",
      a: "We're Marijke and Jochen, an expat/German couple from Hamburg. We went through the Elterngeld process ourselves and built the tool we wished existed.",
    },
    { q: "Is this free?", a: "The guide and AI chat are completely free. The pre-filled PDF application costs €39." },
    {
      q: "Is my data safe?",
      a: "Yes. All data is hosted in Europe and we're fully GDPR compliant. We don't sell your information and you can delete your account anytime.",
    },
    {
      q: "Which Bundesländer are supported?",
      a: "We currently support the 11 states using the federal form (Bundesformular): Berlin, Brandenburg, Bremen, Hamburg, Niedersachsen, Rheinland-Pfalz, Saarland, Sachsen, Sachsen-Anhalt, Schleswig-Holstein, and Thüringen. States with their own forms (Baden-Württemberg, Bayern, Hessen, Mecklenburg-Vorpommern, Nordrhein-Westfalen) are coming soon.",
    },
  ];

  const leftFaqs = faqs.filter((_, i) => i % 2 === 0);
  const rightFaqs = faqs.filter((_, i) => i % 2 === 1);

  const renderFaq = (faq, i, offset) => {
    const idx = offset + i * 2;
    const isOpen = openIndex === idx;
    return (
      <div key={idx} style={{ borderBottom: `1px solid ${colors.border}` }}>
        <button
          onClick={() => setOpenIndex(isOpen ? null : idx)}
          aria-expanded={isOpen}
          aria-controls={`faq-answer-${idx}`}
          style={{
            width: "100%",
            padding: "20px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ ...typography.body, color: colors.textDark, fontWeight: 500, paddingRight: 16 }}>{faq.q}</span>
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.textDark}
            strokeWidth="2"
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s ease",
              flexShrink: 0,
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <div
          id={`faq-answer-${idx}`}
          role="region"
          aria-hidden={!isOpen}
          style={{ maxHeight: isOpen ? 200 : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}
        >
          <p style={{ ...typography.bodySmall, color: colors.textDark, paddingBottom: 20, lineHeight: 1.6 }}>{faq.a}</p>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }} className="grid-2">
      <div style={{ borderTop: `1px solid ${colors.border}` }}>{leftFaqs.map((f, i) => renderFaq(f, i, 0))}</div>
      <div style={{ borderTop: `1px solid ${colors.border}` }}>{rightFaqs.map((f, i) => renderFaq(f, i, 1))}</div>
    </div>
  );
};

// ===========================================
// TESTIMONIAL SLIDER
// ===========================================
const TestimonialSlider = () => {
  const testimonials = [
    { quote: "Finally understood what Basis vs Plus actually means.", name: "Sarah M.", context: "US expat" },
    { quote: "Blue Card holder, wasn't sure if I qualified. Turns out I do!", name: "Priya K.", context: "India" },
    { quote: "The eligibility check caught something about my visa I didn't know.", name: "James L.", context: "UK" },
    { quote: "Saved me hours of Google Translate.", name: "Maria S.", context: "Brazil" },
    { quote: "The planner made it so easy to decide who takes which months.", name: "Chen W.", context: "China" },
  ];

  return (
    <div style={{ overflow: "hidden", width: "100%" }}>
      <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
      <div style={{ display: "flex", gap: 24, animation: "marquee 50s linear infinite", width: "max-content" }}>
        {[...testimonials, ...testimonials].map((t, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 20px",
              backgroundColor: colors.white,
              borderRadius: 100,
              border: `1px solid ${colors.border}`,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: colors.stars, fontSize: 14 }}>★★★★★</span>
            <span style={{ ...typography.bodySmall, color: colors.textDark }}>"{t.quote}"</span>
            <span style={{ ...typography.caption, color: colors.textDark }}>
              — {t.name}, {t.context}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ===========================================
// MAIN COMPONENT
// ===========================================
const LandingPage = () => {
  const [chatInput, setChatInput] = useState("");
  const [chatExpanded, setChatExpanded] = useState(false);

  return (
    <main style={{ backgroundColor: "#FAFAF9", minHeight: "100vh" }}>
      {/* Skip to content link for keyboard users */}
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

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        a:focus-visible, button:focus-visible { outline: 2px solid ${colors.black}; outline-offset: 2px; }
        a:focus:not(:focus-visible), button:focus:not(:focus-visible) { outline: none; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        @keyframes sliderPulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,0,0,0.1); } 50% { transform: scale(1.1); box-shadow: 0 0 0 4px rgba(0,0,0,0.08); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .fade-section { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .fade-section.visible { opacity: 1; transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) {
          .fade-section { opacity: 1; transform: none; transition: none; }
        }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: ${colors.black}; cursor: pointer; }
        .hero-slider-black::-webkit-slider-thumb { width: 14px; height: 14px; background: ${colors.black}; animation: sliderPulse 2s ease-in-out infinite; }
        .mobile-only { display: none !important; }
        .mobile-badge { display: none !important; }
        .hero-grid { gap: 48px; }
        .hero-text-mb { margin-bottom: 0; }
        @media (max-width: 900px) {
          .grid-2 { grid-template-columns: 1fr !important; }
          .grid-2-tablet { grid-template-columns: repeat(2, 1fr) !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          .footer-logo-col { grid-column: 1 / -1 !important; }
          .steps-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .step-third { grid-column: 1 / -1 !important; }
          .desktop-only { display: none !important; }
          .desktop-badge { display: none !important; }
          .mobile-only { display: block !important; }
          .mobile-badge { display: flex !important; }
          .hero-grid { gap: 24px !important; }
          .hero-text-mb { margin-bottom: 0 !important; }
          .trust-badges { justify-content: flex-start !important; gap: 24px !important; }
        }
        @media (max-width: 600px) {
          .grid-2-tablet { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .step-third { grid-column: auto !important; }
          .hero-grid { gap: 20px !important; }
          .trust-badges { flex-direction: row !important; flex-wrap: wrap !important; justify-content: flex-start !important; gap: 16px 24px !important; }
          .trust-badges > div { flex: 0 0 calc(50% - 12px) !important; }
          .mobile-h1 { font-size: 28px !important; }
          .mobile-h2 { font-size: 24px !important; }
          .mobile-body-large { font-size: 16px !important; }
        }
      `}</style>

      <Header variant="landing" />

      {/* HERO */}
      <section id="main-content" style={{ padding: "140px 24px 60px", backgroundColor: "#FFFFFF" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center" }}
            className="grid-2 grid-2-tablet hero-grid"
          >
            <div>
              <p style={{ ...typography.label, color: colors.basis, marginBottom: 12 }}>Built for internationals</p>
              <h1 style={{ ...typography.h1, color: colors.textDark, marginBottom: 24 }} className="mobile-h1">
                Find out if you qualify for Elterngeld
              </h1>
              <p style={{ ...typography.bodyLarge, color: colors.textDark }} className="hero-text-mb mobile-body-large">
                Answer 3 quick questions to check your eligibility. Then calculate your benefit and plan your months –
                all in plain English.
              </p>
              {/* Desktop only button */}
              <a
                href="/guide"
                className="desktop-only"
                style={{
                  padding: "14px 28px",
                  borderRadius: 10,
                  backgroundColor: colors.black,
                  color: colors.white,
                  ...typography.body,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                  marginTop: 24,
                }}
              >
                Start the free guide →
              </a>
              {/* Social proof badge */}
              <div className="desktop-badge" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
                <div style={{ display: "flex" }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        backgroundColor: [colors.orange, colors.tan, colors.yellow][i],
                        border: `2px solid ${colors.background}`,
                        marginLeft: i > 0 ? -8 : 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth={2}>
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                      </svg>
                    </div>
                  ))}
                </div>
                <span style={{ ...typography.caption, color: colors.text }}>500+ families helped</span>
              </div>
            </div>
            <div className="hero-image">
              <EligibilityChecker />
              {/* Mobile/Tablet button */}
              <a
                href="/guide"
                className="mobile-only"
                style={{
                  padding: "14px 28px",
                  borderRadius: 10,
                  backgroundColor: colors.black,
                  color: colors.white,
                  ...typography.body,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "none",
                  textAlign: "center",
                  marginTop: 20,
                }}
              >
                Start the free guide →
              </a>
              {/* Social proof badge - mobile */}
              <div
                className="mobile-badge"
                style={{ display: "none", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}
              >
                <div style={{ display: "flex" }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        backgroundColor: [colors.orange, colors.tan, colors.yellow][i],
                        border: `2px solid ${colors.background}`,
                        marginLeft: i > 0 ? -8 : 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth={2}>
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                      </svg>
                    </div>
                  ))}
                </div>
                <span style={{ ...typography.caption, color: colors.text }}>500+ families helped</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <AnimatedSection style={{ padding: "60px 24px", backgroundColor: colors.tile }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <p style={{ ...typography.label, color: colors.basis, marginBottom: 12 }}>The Problem</p>
          <h2 style={{ ...typography.h2, color: colors.textDark, marginBottom: 20 }} className="mobile-h2">
            23 pages. German. Good luck.
          </h2>
          <p style={{ ...typography.bodyLarge, color: colors.textDark, lineHeight: 1.7 }} className="mobile-body-large">
            Germany's parental benefit is confusing – especially if German isn't your first language. Three benefit
            types, strict deadlines, and visa requirements that most resources don't mention. We help you understand
            your options, calculate your amount, and get through the 23-page application.
          </p>
        </div>
      </AnimatedSection>

      {/* HOW IT WORKS */}
      <AnimatedSection style={{ padding: "60px 24px", backgroundColor: "#FAFAF9" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ ...typography.label, color: colors.basis, marginBottom: 12 }}>How It Works</p>
            <h2 style={{ ...typography.h2, color: colors.textDark }} className="mobile-h2">
              3 steps to your Elterngeld
            </h2>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, alignItems: "stretch" }}
            className="steps-grid"
          >
            <div
              style={{
                backgroundColor: colors.orange,
                borderRadius: 16,
                padding: 28,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span style={{ ...typography.label, color: colors.black, opacity: 0.5 }}>01</span>
              <h3 style={{ ...typography.h3, color: colors.black, margin: "12px 0 8px" }}>Check eligibility</h3>
              <p style={{ ...typography.bodySmall, color: colors.black, opacity: 0.8, marginBottom: 16, flex: 1 }}>
                Answer questions about your visa and work. Know in 2 minutes if you qualify.
              </p>
              {/* Visual: Question buttons */}
              <a
                href="/guide"
                style={{
                  backgroundColor: "rgba(255,255,255,0.5)",
                  borderRadius: 10,
                  padding: 12,
                  textDecoration: "none",
                  display: "block",
                  transition: "transform 0.2s ease",
                }}
              >
                <div style={{ display: "flex", gap: 6 }}>
                  <div
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      backgroundColor: colors.black,
                      borderRadius: 6,
                      textAlign: "center",
                      ...typography.caption,
                      fontSize: 11,
                      color: colors.white,
                    }}
                  >
                    EU Citizen
                  </div>
                  <div
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      backgroundColor: colors.white,
                      borderRadius: 6,
                      textAlign: "center",
                      ...typography.caption,
                      fontSize: 11,
                      color: colors.black,
                    }}
                  >
                    Other Visa
                  </div>
                </div>
              </a>
            </div>
            <div
              style={{
                backgroundColor: colors.tan,
                borderRadius: 16,
                padding: 28,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span style={{ ...typography.label, color: colors.black, opacity: 0.5 }}>02</span>
              <h3 style={{ ...typography.h3, color: colors.black, margin: "12px 0 8px" }}>Calculate benefit</h3>
              <p style={{ ...typography.bodySmall, color: colors.black, opacity: 0.8, marginBottom: 16, flex: 1 }}>
                Enter your income. See your Basiselterngeld and ElterngeldPlus amounts.
              </p>
              {/* Visual: Slider */}
              <a
                href="/guide"
                style={{
                  backgroundColor: "rgba(255,255,255,0.5)",
                  borderRadius: 10,
                  padding: 12,
                  textDecoration: "none",
                  display: "block",
                  transition: "transform 0.2s ease",
                }}
              >
                <div style={{ height: 4, backgroundColor: "rgba(0,0,0,0.1)", borderRadius: 2, position: "relative" }}>
                  <div style={{ width: "70%", height: "100%", backgroundColor: colors.black, borderRadius: 2 }} />
                  <div
                    style={{
                      position: "absolute",
                      top: -4,
                      left: "70%",
                      width: 12,
                      height: 12,
                      backgroundColor: colors.black,
                      borderRadius: "50%",
                      transform: "translateX(-50%)",
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ ...typography.caption, fontSize: 10, color: colors.black, opacity: 0.6 }}>€0</span>
                  <span style={{ ...typography.caption, fontSize: 10, color: colors.black, opacity: 0.6 }}>€5,000</span>
                </div>
              </a>
            </div>
            <div
              className="step-third"
              style={{
                backgroundColor: colors.yellow,
                borderRadius: 16,
                padding: 28,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span style={{ ...typography.label, color: colors.black, opacity: 0.5 }}>03</span>
              <h3 style={{ ...typography.h3, color: colors.black, margin: "12px 0 8px" }}>Plan months</h3>
              <p style={{ ...typography.bodySmall, color: colors.black, opacity: 0.8, marginBottom: 16, flex: 1 }}>
                Use the visual planner to decide who takes which months. Optimize your total.
              </p>
              {/* Visual: Month blocks */}
              <a
                href="/guide"
                style={{
                  backgroundColor: "rgba(255,255,255,0.5)",
                  borderRadius: 10,
                  padding: 12,
                  textDecoration: "none",
                  display: "block",
                  transition: "transform 0.2s ease",
                }}
              >
                <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                  {[1, 1, 1, 1, 1, 1, 0, 0].map((filled, i) => (
                    <div
                      key={`row1-${i}`}
                      style={{
                        flex: 1,
                        height: 16,
                        borderRadius: 3,
                        backgroundColor: filled ? colors.orange : "transparent",
                        border: filled ? "none" : "1px dashed rgba(0,0,0,0.2)",
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 3 }}>
                  {[0, 0, 1, 1, 1, 1, 1, 1].map((filled, i) => (
                    <div
                      key={`row2-${i}`}
                      style={{
                        flex: 1,
                        height: 16,
                        borderRadius: 3,
                        backgroundColor: filled ? colors.tan : "transparent",
                        border: filled ? "none" : "1px dashed rgba(0,0,0,0.2)",
                      }}
                    />
                  ))}
                </div>
              </a>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* CALCULATOR */}
      <AnimatedSection style={{ padding: "60px 24px", backgroundColor: colors.tile }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "stretch" }}
            className="grid-2 grid-2-tablet"
          >
            {/* Left - Text */}
            <div
              style={{
                backgroundColor: colors.white,
                borderRadius: 20,
                padding: 32,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <p style={{ ...typography.label, color: colors.basis, marginBottom: 16 }}>Benefit Calculator</p>
              <h2 style={{ ...typography.h2, color: colors.textDark, marginBottom: 16 }} className="mobile-h2">
                See how much you'd get
              </h2>
              <p style={{ ...typography.body, color: colors.text, lineHeight: 1.7, marginBottom: 24 }}>
                Germany offers 3 benefit types: <strong>Basiselterngeld</strong> (full amount, max 14 months),{" "}
                <strong>ElterngeldPlus</strong> (half amount, double duration), and <strong>Partnerschaftsbonus</strong>{" "}
                (extra months when both parents work part-time).
              </p>
              <a
                href="/guide"
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  backgroundColor: colors.black,
                  color: colors.white,
                  ...typography.bodySmall,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                  alignSelf: "flex-start",
                }}
              >
                Calculate your amount →
              </a>
            </div>

            {/* Right - Calculator */}
            <div style={{ display: "flex" }}>
              <div style={{ flex: 1 }}>
                <HeroPlannerMockup />
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* FEATURES */}
      <AnimatedSection style={{ padding: "60px 24px", backgroundColor: "#FAFAF9" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ ...typography.label, color: colors.basis, marginBottom: 12 }}>Feature Highlights</p>
            <h2 style={{ ...typography.h2, color: colors.textDark }} className="mobile-h2">
              Built for expats
            </h2>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}
            className="grid-2 grid-2-tablet"
          >
            <div style={{ backgroundColor: colors.tan, borderRadius: 16, padding: 24 }}>
              <div style={{ marginBottom: 12, color: colors.black }}>{Icons.check(22)}</div>
              <h4 style={{ ...typography.h4, color: colors.black, marginBottom: 6 }}>100% in English</h4>
              <p style={{ ...typography.caption, color: colors.black, opacity: 0.8 }}>
                No more Google Translate. Every question, explanation, and tips in plain English.
              </p>
            </div>
            <div style={{ backgroundColor: colors.yellow, borderRadius: 16, padding: 24 }}>
              <div style={{ marginBottom: 12, color: colors.black }}>{Icons.globe(22)}</div>
              <h4 style={{ ...typography.h4, color: colors.black, marginBottom: 6 }}>Visa-aware eligibility</h4>
              <p style={{ ...typography.caption, color: colors.black, opacity: 0.8, marginBottom: 12 }}>
                We check your specific residence permit type.
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Blue Card", "Student", "EU"].map((t) => (
                  <span
                    key={t}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "rgba(255,255,255,0.5)",
                      borderRadius: 6,
                      ...typography.caption,
                      fontSize: 10,
                      color: colors.black,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <a
              href="/guide"
              style={{
                backgroundColor: "#968BAA",
                borderRadius: 16,
                padding: 24,
                textDecoration: "none",
                display: "block",
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}
              >
                <div style={{ color: colors.black }}>{Icons.calendar(22)}</div>
                <span
                  style={{
                    padding: "4px 10px",
                    backgroundColor: "rgba(255,255,255,0.5)",
                    borderRadius: 20,
                    ...typography.caption,
                    fontSize: 11,
                    fontWeight: 600,
                    color: colors.black,
                  }}
                >
                  Free
                </span>
              </div>
              <h4 style={{ ...typography.h4, color: colors.black, marginBottom: 6 }}>Visual planner</h4>
              <p style={{ ...typography.caption, color: colors.black, opacity: 0.8, marginBottom: 12 }}>
                See your 14 months at a glance. Optimize your total.
              </p>
              <div style={{ display: "flex", gap: 2 }}>
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 16,
                      height: 20,
                      borderRadius: 3,
                      backgroundColor: i < 4 ? colors.orange : i < 7 ? colors.tan : "rgba(255,255,255,0.4)",
                    }}
                  />
                ))}
              </div>
            </a>
            <div style={{ backgroundColor: colors.orange, borderRadius: 16, padding: 24 }}>
              <div style={{ marginBottom: 12, color: colors.black }}>{Icons.save(22)}</div>
              <h4 style={{ ...typography.h4, color: colors.black, marginBottom: 6 }}>Save progress</h4>
              <p style={{ ...typography.caption, color: colors.black, opacity: 0.8 }}>
                Create a free account to save your plan. Come back whenever you're ready.
              </p>
            </div>
            <a
              href="/pdf"
              style={{
                backgroundColor: "#E5DDD0",
                borderRadius: 16,
                padding: 24,
                textDecoration: "none",
                display: "block",
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}
              >
                <div style={{ color: colors.black }}>{Icons.download(22)}</div>
                <span
                  style={{
                    padding: "4px 10px",
                    backgroundColor: "rgba(255,255,255,0.6)",
                    borderRadius: 20,
                    ...typography.caption,
                    fontSize: 11,
                    fontWeight: 600,
                    color: colors.black,
                  }}
                >
                  €39
                </span>
              </div>
              <h4 style={{ ...typography.h4, color: colors.black, marginBottom: 6 }}>Pre-filled application</h4>
              <p style={{ ...typography.caption, color: colors.black, opacity: 0.8 }}>
                Download your 23-page application pre-filled with your data.
              </p>
            </a>
            <div style={{ backgroundColor: colors.tile, borderRadius: 16, padding: 24 }}>
              <div style={{ marginBottom: 12, color: colors.black }}>{Icons.chat(22)}</div>
              <h4 style={{ ...typography.h4, color: colors.black, marginBottom: 6 }}>AI chat assistant</h4>
              <p style={{ ...typography.caption, color: colors.black, opacity: 0.8, marginBottom: 12 }}>
                Trained on German parental leave law (BEEG).
              </p>
              <form
                onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const q = (form.elements.namedItem("q") as HTMLInputElement).value;
                  if (q.trim()) window.location.href = `/chat?q=${encodeURIComponent(q)}`;
                }}
                style={{ display: "flex", gap: 6 }}
              >
                <input
                  name="q"
                  type="text"
                  placeholder="Ask anything..."
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "none",
                    backgroundColor: colors.white,
                    ...typography.caption,
                    fontSize: 11,
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "none",
                    backgroundColor: colors.black,
                    color: colors.white,
                    ...typography.caption,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Ask
                </button>
              </form>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* TESTIMONIALS */}
      <section style={{ padding: "40px 0", backgroundColor: "#FAFAF9", overflow: "hidden" }}>
        <TestimonialSlider />
      </section>

      {/* FAQ */}
      <AnimatedSection style={{ padding: "60px 24px", backgroundColor: "#FAFAF9" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ ...typography.label, color: colors.basis, marginBottom: 12 }}>FAQ</p>
            <h2 style={{ ...typography.h2, color: colors.textDark }} className="mobile-h2">
              Common questions
            </h2>
          </div>
          <FAQ />
        </div>
      </AnimatedSection>

      {/* FINAL CTA */}
      <AnimatedSection style={{ padding: "60px 24px", backgroundColor: colors.tile }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}
            className="grid-2 grid-2-tablet"
          >
            <div>
              <p style={{ ...typography.label, color: colors.basis, marginBottom: 12 }}>Don't miss the deadline</p>
              <h2 style={{ ...typography.h2, color: colors.textDark, marginBottom: 16 }} className="mobile-h2">
                Apply within 3 months of birth
              </h2>
              <p style={{ ...typography.body, color: colors.textDark, marginBottom: 32 }}>
                You can only claim retroactively for 3 months. Start planning now so you're ready when the baby arrives.
              </p>
              <a
                href="/guide"
                style={{
                  padding: "14px 28px",
                  borderRadius: 10,
                  backgroundColor: colors.black,
                  color: colors.white,
                  ...typography.body,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Start the free guide →
              </a>
              <p style={{ ...typography.caption, color: colors.textDark, marginTop: 16 }}>
                Free guide · Pre-filled application available for €39
              </p>
            </div>
            <div style={{ borderRadius: 20, height: 380, overflow: "hidden" }}>
              <img
                src="/cta-image.jpg"
                alt="Parents planning their Elterngeld benefits"
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* TRUST BADGES BAR */}
      <div style={{ padding: "24px 24px", backgroundColor: colors.white }}>
        <div
          className="trust-badges"
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textDark} strokeWidth={1.5}>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span style={{ ...typography.caption, color: colors.textDark, fontSize: 13 }}>SSL Encrypted</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textDark} strokeWidth={1.5}>
              <path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" />
            </svg>
            <span style={{ ...typography.caption, color: colors.textDark, fontSize: 13 }}>GDPR Compliant</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textDark} strokeWidth={1.5}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span style={{ ...typography.caption, color: colors.textDark, fontSize: 13 }}>Hosted in EU</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textDark} strokeWidth={1.5}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span style={{ ...typography.caption, color: colors.textDark, fontSize: 13 }}>Made in Germany</span>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <Footer />

      {/* FLOATING CHAT */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          width: chatExpanded ? "90%" : 200,
          maxWidth: 440,
          backgroundColor: colors.white,
          borderRadius: 999,
          padding: "4px 4px 4px 16px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          zIndex: 1000,
          transition: "width 0.3s ease",
          border: `1px solid ${colors.border}`,
        }}
      >
        <input
          type="text"
          placeholder="Ask anything..."
          aria-label="Ask a question about Elterngeld"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onFocus={() => setChatExpanded(true)}
          onBlur={() => !chatInput && setChatExpanded(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && chatInput.trim())
              window.location.href = `/chat?q=${encodeURIComponent(chatInput.trim())}`;
          }}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            backgroundColor: "transparent",
            ...typography.caption,
            color: colors.textDark,
            minWidth: 0,
          }}
        />
        <a
          href={chatInput.trim() ? `/chat?q=${encodeURIComponent(chatInput.trim())}` : "/chat"}
          aria-label="Submit question"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            backgroundColor: colors.black,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.white}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </a>
      </div>
    </main>
  );
};

export default LandingPage;
