// ===========================================
// ELTERNGELD GUIDE - MIT VISA SELECTOR
// ===========================================

import React, { useState, useRef, useCallback } from "react";

// Design Tokens
const colors = {
  background: "#FAFAF9",
  tile: "#F0EEE6",
  white: "#FFFFFF",
  text: "#666666",
  textDark: "#000000",
  userBubble: "#FFFFEB",
  border: "#E7E5E4",
  orange: "#FF8752",
};

const fonts = {
  headline: "'Space Grotesk', -apple-system, sans-serif",
  body: "'Inter', -apple-system, sans-serif",
};

const ui = { buttonRadius: 10, buttonHeight: 48 };
const fontSize = { question: "19px", body: "16px", subtext: "15px", button: "15px", tiny: "12px", small: "13px" };
const tagColors = ["#FF8752", "#FFE44C", "#D1B081"];

// ===========================================
// TYPES
// ===========================================
interface Message {
  id: string;
  type: "bot" | "user";
  content: string;
  subtext?: string;
  isQuestion?: boolean;
}

interface ButtonOption {
  value: string;
  label: string;
  note?: string;
  icon?: string;
  sub?: string;
}

interface Question {
  id: string;
  content: string;
  subtext?: string;
  options: ButtonOption[];
}

interface UserData {
  citizenship?: string;
  visaType?: string;
  isEmployed?: string;
  humanitarianCondition?: string;
  incomeLimit?: string;
  multiples?: string;
  siblings?: string;
  applicationType?: string;
  singleParentType?: string; // "alone" (14 months) or "together" (12 months)
  dueDate?: string;
  monthlyIncome?: number;
  partnerIncome?: number;
  _conditionalType?: string;
}

interface VisaType {
  id: string;
  label: string;
  category: "special" | "work" | "study" | "humanitarian" | "other";
  status: "eligible" | "conditional" | "not_eligible";
  condition?: string;
  paragraph?: string;
}

// ===========================================
// VISA DATA
// ===========================================
const visaTypes: VisaType[] = [
  { id: "uk_pre_brexit", label: "British – arrived before Jan 2021", category: "special", status: "eligible" },
  {
    id: "turkey_insured",
    label: "Turkish/Moroccan/Tunisian/Algerian – socially insured",
    category: "special",
    status: "eligible",
  },
  {
    id: "niederlassungserlaubnis",
    label: "Niederlassungserlaubnis (Settlement Permit)",
    category: "work",
    status: "eligible",
    paragraph: "§9",
  },
  {
    id: "daueraufenthalt_eu",
    label: "Daueraufenthalt-EU (EU Long-term Residence)",
    category: "work",
    status: "eligible",
    paragraph: "§9a",
  },
  { id: "blue_card", label: "Blue Card EU", category: "work", status: "eligible" },
  { id: "ict_card", label: "ICT-Karte (Intra-Company Transfer)", category: "work", status: "eligible" },
  {
    id: "work_permit",
    label: "Work Permit (Aufenthaltserlaubnis)",
    category: "work",
    status: "eligible",
    paragraph: "§7",
  },
  {
    id: "beschaeftigungsduldung",
    label: "Beschäftigungsduldung (Employment Toleration)",
    category: "work",
    status: "eligible",
    paragraph: "§60d",
  },
  {
    id: "student",
    label: "Student Visa",
    category: "study",
    status: "conditional",
    condition: "Only if currently employed, in Elternzeit, or receiving ALG",
    paragraph: "§16b",
  },
  {
    id: "qualification",
    label: "Qualification Recognition",
    category: "study",
    status: "conditional",
    condition: "Only if currently employed, in Elternzeit, or receiving ALG",
    paragraph: "§16d",
  },
  {
    id: "job_seeker",
    label: "Job Seeker Visa",
    category: "study",
    status: "conditional",
    condition: "Only if currently employed, in Elternzeit, or receiving ALG",
    paragraph: "§20",
  },
  { id: "training", label: "Training Visa (Ausbildung)", category: "study", status: "not_eligible", paragraph: "§16e" },
  { id: "ukraine", label: "Ukraine Residence Permit", category: "humanitarian", status: "eligible", paragraph: "§24" },
  {
    id: "humanitarian_war",
    label: "Humanitarian (War in Home Country)",
    category: "humanitarian",
    status: "conditional",
    condition: "Only if employed OR 15+ months in Germany",
    paragraph: "§23 Abs. 1",
  },
  {
    id: "humanitarian_hardship",
    label: "Humanitarian (Hardship Case)",
    category: "humanitarian",
    status: "conditional",
    condition: "Only if employed OR 15+ months in Germany",
    paragraph: "§23a",
  },
  {
    id: "humanitarian_protection",
    label: "Subsidiary/Humanitarian Protection",
    category: "humanitarian",
    status: "conditional",
    condition: "Only if employed OR 15+ months in Germany",
    paragraph: "§25 Abs. 3-5",
  },
  { id: "au_pair", label: "Au-pair Visa", category: "other", status: "not_eligible", paragraph: "§19c" },
  { id: "seasonal", label: "Seasonal Work Visa", category: "other", status: "not_eligible", paragraph: "§19c" },
  {
    id: "voluntary",
    label: "European Voluntary Service",
    category: "other",
    status: "not_eligible",
    paragraph: "§19e",
  },
  {
    id: "other",
    label: "I don't know / Other",
    category: "other",
    status: "conditional",
    condition: "Check with your local Elterngeldstelle",
  },
];

const visaCategories = [
  { id: "work", label: "Work permit", sub: "Blue Card, Niederlassungserlaubnis..." },
  { id: "study", label: "Student / Job seeker", sub: "Student visa, Job seeker..." },
  { id: "humanitarian", label: "Humanitarian", sub: "Ukraine, Asylum..." },
  { id: "special", label: "Special situation", sub: "UK pre-Brexit, Turkish/Moroccan..." },
  { id: "other", label: "Other / Not sure" },
];

// ===========================================
// ICONS
// ===========================================
const icons: Record<string, React.ReactNode> = {
  check: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path d="M6 6l12 12M6 18L18 6" />
    </svg>
  ),
  baby: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="5" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  ),
  twins: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="8" cy="8" r="4" />
      <circle cx="16" cy="8" r="4" />
      <path d="M2 20c0-3 2.5-5 6-5s6 2 6 5M10 20c0-3 2.5-5 6-5s6 2 6 5" />
    </svg>
  ),
  triplets: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="12" cy="5" r="3" />
      <circle cx="6" cy="11" r="3" />
      <circle cx="18" cy="11" r="3" />
      <path d="M12 8v4M6 14v4M18 14v4" />
    </svg>
  ),
  couple: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="9" cy="7" r="4" />
      <circle cx="17" cy="9" r="3" />
      <path d="M3 21v-2c0-2.5 3-5 6-5 1.5 0 3 .5 4 1.5M17 21v-2c0-1.5 1-3 3-3" />
    </svg>
  ),
  single: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="12" cy="7" r="4" />
      <path d="M5 21v-2a7 7 0 0114 0v2" />
    </svg>
  ),
  briefcase: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  ),
  home: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" />
    </svg>
  ),
  eu: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
      <path d="M16 11l2 2 4-4" />
    </svg>
  ),
  globe: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
};

// ===========================================
// QUESTIONS
// ===========================================
const questions: Question[] = [
  {
    id: "incomeLimit",
    content: "Did your household earn **more than €175,000** taxable income last year?",
    subtext: 'This is your "zu versteuerndes Einkommen".',
    options: [
      { value: "under", label: "No, under €175,000", icon: "check" },
      { value: "over", label: "Yes, over €175,000", icon: "x" },
    ],
  },
  {
    id: "multiples",
    content: "Are you having **twins or triplets**?",
    subtext: "Multiple births qualify for an extra bonus.",
    options: [
      { value: "no", label: "No, single child", icon: "baby" },
      { value: "twins", label: "Twins", icon: "twins", note: "+€300/month" },
      { value: "triplets", label: "Triplets", icon: "triplets", note: "+€600/month" },
    ],
  },
  {
    id: "siblings",
    content: "Do you have **other young children** at home?",
    subtext: "Children under 3, or two under 6, qualify for +10%.",
    options: [
      { value: "yes", label: "Yes", icon: "check", note: "+10%" },
      { value: "none", label: "No", icon: "x" },
    ],
  },
  {
    id: "applicationType",
    content: "Are you applying as a **couple** or as a **single parent**?",
    subtext: "Choose 'single parent' if only one parent is applying for Elterngeld.",
    options: [
      { value: "couple", label: "Applying as a couple", icon: "couple" },
      { value: "single", label: "Applying as a single parent", icon: "single" },
    ],
  },
];

// ===========================================
// HELPER FUNCTIONS
// ===========================================
const formatText = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold" style={{ color: colors.textDark }}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
};

// ===========================================
// COMPONENTS
// ===========================================
const ButtonOptions: React.FC<{
  options: ButtonOption[];
  onSelect: (opt: ButtonOption) => void;
  disabled?: boolean;
}> = ({ options, onSelect, disabled }) => {
  let noteIdx = 0;

  // Use 2-column grid for exactly 2 short options without sub/note
  const useGrid = options.length === 2 && options.every((opt) => !opt.sub && !opt.note && opt.label.length < 28);

  return (
    <div className={useGrid ? "grid grid-cols-2 gap-3 mt-4" : "space-y-3 mt-4"}>
      {options.map((opt, i) => {
        const ni = opt.note ? noteIdx++ : -1;
        return (
          <button
            key={i}
            onClick={() => onSelect(opt)}
            disabled={disabled}
            className={`w-full transition-all flex items-center hover:border-stone-400 ${useGrid ? "justify-center" : "justify-between"} text-left`}
            style={{
              backgroundColor: colors.white,
              border: `1.5px solid ${colors.border}`,
              borderRadius: ui.buttonRadius,
              padding: opt.sub ? "14px 20px" : "16px 20px",
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <div className={`flex items-center ${useGrid ? "gap-2" : "gap-3"}`}>
              {opt.icon && <span style={{ color: colors.textDark }}>{icons[opt.icon]}</span>}
              <div>
                <span style={{ fontSize: fontSize.button, fontWeight: 500, color: colors.textDark }}>{opt.label}</span>
                {opt.sub && <p style={{ fontSize: fontSize.tiny, marginTop: "2px", color: colors.text }}>{opt.sub}</p>}
              </div>
            </div>
            {opt.note && (
              <span
                className="px-2.5 py-1 rounded-full"
                style={{ fontSize: fontSize.tiny, fontWeight: 500, backgroundColor: tagColors[ni % 3], color: "#000" }}
              >
                {opt.note}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ===========================================
// DATE PICKER (Compact)
// ===========================================
const DatePicker: React.FC<{
  onSelect: (isoDate: string, displayDate: string) => void;
  disabled?: boolean;
}> = ({ onSelect, disabled }) => {
  const [month, setMonth] = useState<number>(new Date().getMonth());
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);

  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m: number, y: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: (firstDay + 6) % 7 }, () => null);

  const handleDayClick = (day: number) => {
    const date = new Date(year, month, day);
    const isoDate = date.toISOString().split("T")[0];
    const displayDate = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    onSelect(isoDate, displayDate);
  };

  const goToPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <div
      className="mt-4 p-3"
      style={{ backgroundColor: colors.white, border: `1.5px solid ${colors.border}`, borderRadius: ui.buttonRadius }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={goToPrevMonth}
          disabled={disabled}
          className="p-1.5 hover:bg-stone-100 rounded transition-colors"
          style={{ color: colors.textDark }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-1">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            disabled={disabled}
            className="bg-transparent font-medium outline-none cursor-pointer text-sm"
            style={{ color: colors.textDark }}
          >
            {months.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            disabled={disabled}
            className="bg-transparent font-medium outline-none cursor-pointer text-sm"
            style={{ color: colors.textDark }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={goToNextMonth}
          disabled={disabled}
          className="p-1.5 hover:bg-stone-100 rounded transition-colors"
          style={{ color: colors.textDark }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      {/* Weekdays */}
      <div className="grid grid-cols-7 mb-1">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
          <div key={day} className="text-center py-1" style={{ fontSize: "11px", color: colors.text, fontWeight: 500 }}>
            {day}
          </div>
        ))}
      </div>
      {/* Days */}
      <div className="grid grid-cols-7 gap-0.5">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => (
          <button
            key={day}
            onClick={() => handleDayClick(day)}
            disabled={disabled}
            className="aspect-square flex items-center justify-center rounded hover:bg-stone-100 transition-colors"
            style={{
              fontSize: "13px",
              color: colors.textDark,
              fontWeight: 500,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.6 : 1,
            }}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
};

// ===========================================
// INCOME SLIDER (Compact single-line)
// ===========================================
const IncomeSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onConfirm: () => void;
  disabled?: boolean;
  suffix?: string;
}> = ({ label, value, min, max, step, onChange, onConfirm, disabled, suffix = "€" }) => {
  return (
    <div
      className="mt-4 p-4"
      style={{ backgroundColor: colors.white, border: `1.5px solid ${colors.border}`, borderRadius: ui.buttonRadius }}
    >
      <p style={{ fontSize: fontSize.small, color: colors.text, marginBottom: "12px" }}>{label}</p>
      <div className="flex items-center gap-4">
        <span style={{ fontSize: "20px", fontWeight: 600, color: colors.textDark, minWidth: "90px" }}>
          {suffix === "€" ? `€${value.toLocaleString("de-DE")}` : `${value}${suffix}`}
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${colors.orange} 0%, ${colors.orange} ${((value - min) / (max - min)) * 100}%, ${colors.border} ${((value - min) / (max - min)) * 100}%, ${colors.border} 100%)`,
          }}
        />
      </div>
      <button
        onClick={onConfirm}
        disabled={disabled}
        className="w-full mt-4 transition-all hover:opacity-90"
        style={{
          backgroundColor: colors.orange,
          color: "#fff",
          fontWeight: 600,
          fontSize: fontSize.button,
          padding: "14px 20px",
          borderRadius: ui.buttonRadius,
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        Continue
      </button>
    </div>
  );
};

const VisaSelector: React.FC<{
  onSelect: (visaId: string, label: string) => void;
  disabled?: boolean;
}> = ({ onSelect, disabled }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleSelectVisa = (visaId: string) => {
    const visa = visaTypes.find((v) => v.id === visaId);
    onSelect(visaId, visa?.label || visaId);
  };

  if (!selectedCategory) {
    return (
      <div className="space-y-3 mt-4">
        {visaCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            disabled={disabled}
            className="w-full text-left transition-all hover:border-stone-400"
            style={{
              backgroundColor: colors.white,
              border: `1.5px solid ${colors.border}`,
              borderRadius: ui.buttonRadius,
              padding: cat.sub ? "14px 20px" : "16px 20px",
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <span style={{ fontSize: fontSize.button, fontWeight: 500, color: colors.textDark }}>{cat.label}</span>
            {cat.sub && <p style={{ fontSize: fontSize.tiny, marginTop: "2px", color: colors.text }}>{cat.sub}</p>}
          </button>
        ))}
      </div>
    );
  }

  const categoryVisas = visaTypes.filter((v) => v.category === selectedCategory);
  const categoryLabel = visaCategories.find((c) => c.id === selectedCategory)?.label.toLowerCase();

  return (
    <div className="mt-4">
      <button
        onClick={() => setSelectedCategory(null)}
        className="flex items-center gap-1.5 mb-4 hover:opacity-70"
        style={{ color: colors.text, fontSize: fontSize.button, background: "none", border: "none", cursor: "pointer" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <p style={{ fontSize: fontSize.question, fontWeight: 500, color: colors.textDark, marginBottom: "12px" }}>
        Which <strong>{categoryLabel}</strong> do you have?
      </p>

      <div className="space-y-3">
        {categoryVisas.map((visa) => (
          <button
            key={visa.id}
            onClick={() => handleSelectVisa(visa.id)}
            disabled={disabled}
            className="w-full text-left transition-all hover:border-stone-400"
            style={{
              backgroundColor: colors.white,
              border: `1.5px solid ${colors.border}`,
              borderRadius: ui.buttonRadius,
              padding: "16px 20px",
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <span style={{ fontSize: fontSize.button, fontWeight: 500, color: colors.textDark }}>{visa.label}</span>
            {visa.paragraph && (
              <span style={{ fontSize: fontSize.tiny, marginLeft: "6px", color: colors.text }}>({visa.paragraph})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const StartScreen: React.FC<{ onAnswer: (v: string, l: string) => void }> = ({ onAnswer }) => (
  <div style={{ padding: "60px 0 20px 0" }}>
    <h1
      style={{
        fontFamily: fonts.headline,
        fontSize: "32px",
        fontWeight: 700,
        color: "#000",
        lineHeight: 1.2,
        letterSpacing: "-0.02em",
        marginBottom: "12px",
      }}
    >
      Alright, let's do this.
    </h1>
    <p style={{ fontSize: "17px", color: "#666", lineHeight: 1.5, marginBottom: "20px" }}>
      A few quick questions and you'll know exactly what Elterngeld you can get.
    </p>
    <div style={{ marginBottom: "56px" }}>
      <div
        style={{ height: "6px", background: "#E7E5E4", borderRadius: "3px", overflow: "hidden", marginBottom: "10px" }}
      >
        <div style={{ height: "100%", width: "8%", background: "#000", borderRadius: "3px" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "13px", color: "#666" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          5 minutes
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Free
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5 13l4 4L19 7" />
          </svg>
          No signup
        </span>
      </div>
    </div>
    <p
      style={{
        fontFamily: fonts.headline,
        fontSize: "20px",
        fontWeight: 600,
        color: "#000",
        lineHeight: 1.3,
        marginBottom: "8px",
        paddingLeft: "16px",
        borderLeft: "3px solid #FF8752",
      }}
    >
      Are you a German or EU/EEA/Swiss citizen?
    </p>
    <p style={{ fontSize: "15px", color: "#666", lineHeight: 1.5, marginBottom: "20px", paddingLeft: "16px" }}>
      Your eligibility depends on your citizenship and residence permit.
    </p>
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <button
        onClick={() => onAnswer("eu", "Yes, German or EU/EEA/Swiss")}
        className="w-full transition-all hover:border-stone-400"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 20px",
          background: colors.white,
          border: `1.5px solid ${colors.border}`,
          borderRadius: ui.buttonRadius,
          fontFamily: fonts.body,
          fontSize: fontSize.button,
          fontWeight: 500,
          color: "#000",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {icons.eu}Yes, German or EU/EEA/Swiss
      </button>
      <button
        onClick={() => onAnswer("other", "No, other nationality")}
        className="w-full transition-all hover:border-stone-400"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 20px",
          background: colors.white,
          border: `1.5px solid ${colors.border}`,
          borderRadius: ui.buttonRadius,
          fontFamily: fonts.body,
          fontSize: fontSize.button,
          fontWeight: 500,
          color: "#000",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {icons.globe}No, other nationality
      </button>
    </div>
  </div>
);

const BotMessage: React.FC<{ content: string; subtext?: string; isQuestion?: boolean }> = ({
  content,
  subtext,
  isQuestion,
}) => (
  <div className={`${isQuestion ? "py-1.5 mt-4" : "py-1"}`}>
    <p
      className={isQuestion ? "leading-relaxed font-semibold pl-3" : "leading-relaxed"}
      style={{
        color: colors.textDark,
        borderLeft: isQuestion ? `3px solid ${colors.orange}` : "none",
        fontFamily: isQuestion ? fonts.headline : fonts.body,
        fontSize: isQuestion ? fontSize.question : fontSize.body,
      }}
    >
      {formatText(content)}
    </p>
    {subtext && (
      <p className={`mt-2 ${isQuestion ? "pl-3" : ""}`} style={{ fontSize: fontSize.subtext, color: colors.text }}>
        {formatText(subtext)}
      </p>
    )}
  </div>
);

const UserMessage = React.forwardRef<HTMLDivElement, { content: string }>(({ content }, ref) => (
  <div ref={ref} className="flex justify-end py-2">
    <div className="rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%]" style={{ backgroundColor: colors.userBubble }}>
      <span style={{ fontSize: fontSize.body, color: colors.textDark }}>{content}</span>
    </div>
  </div>
));

const TypingIndicator: React.FC = () => (
  <div className="py-2">
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ backgroundColor: colors.text, animation: "pulse 1.2s ease-in-out infinite" }}
    />
  </div>
);

// ===========================================
// MAIN COMPONENT
// ===========================================
type InputType =
  | "buttons"
  | "visa"
  | "conditional"
  | "ineligible"
  | "date"
  | "singleParent"
  | "income"
  | "partnerIncome"
  | null;

const ElterngeldGuideNew: React.FC = () => {
  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const lastUserMessageIndexRef = useRef(-1);

  // State
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputType, setInputType] = useState<InputType>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [spacerHeight, setSpacerHeight] = useState(0);
  const [stepHistory, setStepHistory] = useState<
    Array<{
      questionIndex: number;
      messagesLength: number;
      inputType: InputType;
      userData: UserData;
    }>
  >([]);
  const [userData, setUserData] = useState<UserData>({});
  const [incomeValue, setIncomeValue] = useState(2500);
  const [partnerIncomeValue, setPartnerIncomeValue] = useState(2500);

  // ===========================================
  // SCROLL UTILITIES
  // ===========================================
  const expandSpacerForMessage = useCallback((messageElement: HTMLElement) => {
    if (!scrollContainerRef.current) return;
    const viewportHeight = scrollContainerRef.current.clientHeight;
    const messageHeight = messageElement.offsetHeight;
    const newHeight = Math.max(0, viewportHeight - messageHeight - 32);
    setSpacerHeight(newHeight);
  }, []);

  const smoothScrollTo = useCallback((targetPosition: number, duration = 400): Promise<void> => {
    return new Promise((resolve) => {
      if (!scrollContainerRef.current) {
        resolve();
        return;
      }
      const container = scrollContainerRef.current;
      const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
      const clampedTarget = Math.max(0, Math.min(targetPosition, maxScroll));
      const startPosition = container.scrollTop;
      const distance = clampedTarget - startPosition;

      if (Math.abs(distance) < 1) {
        resolve();
        return;
      }

      const startTime = performance.now();
      function easeOutCubic(t: number) {
        return 1 - Math.pow(1 - t, 3);
      }
      function animateScroll(currentTime: number) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);
        container.scrollTop = startPosition + distance * eased;
        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          container.scrollTop = clampedTarget;
          resolve();
        }
      }
      requestAnimationFrame(animateScroll);
    });
  }, []);

  const scrollElementToTop = useCallback(
    (element: HTMLElement, duration = 500) => {
      const targetScroll = element.offsetTop - 16;
      return smoothScrollTo(targetScroll, duration);
    },
    [smoothScrollTo],
  );

  const adjustSpacerAfterBotResponse = useCallback(() => {
    if (!scrollContainerRef.current || !messagesContainerRef.current) {
      setSpacerHeight(0);
      return;
    }
    const container = scrollContainerRef.current;
    const currentScrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    const neededContentHeight = currentScrollTop + viewportHeight;
    const messagesHeight = messagesContainerRef.current.offsetHeight;
    const newHeight = Math.max(0, neededContentHeight - messagesHeight);
    setSpacerHeight(newHeight);
  }, []);

  // ===========================================
  // ANIMATION SEQUENCE
  // ===========================================
  const runScrollSequence = useCallback(async () => {
    // Wait for render
    await new Promise((r) => setTimeout(r, 50));

    // Expand spacer
    if (lastUserMessageRef.current) {
      expandSpacerForMessage(lastUserMessageRef.current);
    }

    // Wait for spacer transition
    await new Promise((r) => setTimeout(r, 350));

    // Scroll user message to TOP
    if (lastUserMessageRef.current) {
      await scrollElementToTop(lastUserMessageRef.current, 600);
    }

    // Pause at top
    await new Promise((r) => setTimeout(r, 400));
  }, [expandSpacerForMessage, scrollElementToTop]);

  const showTypingThenMessage = useCallback(
    async (message: Message) => {
      setIsTyping(true);
      await new Promise((r) => setTimeout(r, 600));
      setIsTyping(false);
      setMessages((prev) => [...prev, message]);
      await new Promise((r) => setTimeout(r, 100));
      adjustSpacerAfterBotResponse();
    },
    [adjustSpacerAfterBotResponse],
  );

  // ===========================================
  // HANDLERS
  // ===========================================
  const handleStartAnswer = async (value: string, label: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    setShowStartScreen(false);
    setMessages([{ id: "user-citizenship", type: "user", content: label }]);
    lastUserMessageIndexRef.current = 0;
    setUserData({ citizenship: value });

    await runScrollSequence();

    if (value === "eu") {
      // EU citizen - show "Great!" then income question
      await showTypingThenMessage({
        id: "bot-eu-response",
        type: "bot",
        content: "Great! Let's check one more thing.",
      });

      await showTypingThenMessage({
        id: "bot-incomeLimit",
        type: "bot",
        content: questions[0].content,
        subtext: questions[0].subtext,
        isQuestion: true,
      });

      setInputType("buttons");
      setCurrentQuestionIndex(0);
    } else {
      // Non-EU - ask for visa type
      await showTypingThenMessage({
        id: "bot-visa-question",
        type: "bot",
        content: "What type of **residence permit** do you have?",
        subtext: "Select from common types or search for yours.",
        isQuestion: true,
      });

      setInputType("visa");
    }

    setIsProcessing(false);
  };

  const handleVisaSelect = async (visaId: string, label: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Save history
    setStepHistory((prev) => [
      ...prev,
      {
        questionIndex: currentQuestionIndex,
        messagesLength: messages.length,
        inputType,
        userData,
      },
    ]);

    // Hide input, add user message
    setInputType(null);
    setMessages((prev) => {
      lastUserMessageIndexRef.current = prev.length;
      return [...prev, { id: "user-visa", type: "user", content: label }];
    });
    setUserData((prev) => ({ ...prev, visaType: visaId }));

    await runScrollSequence();

    const visa = visaTypes.find((v) => v.id === visaId);

    if (!visa || visa.id === "other") {
      // Unknown - suggest checking with Elterngeldstelle
      await showTypingThenMessage({
        id: "bot-visa-unknown",
        type: "bot",
        content: "Please check with your local **Elterngeldstelle** to confirm your eligibility.",
      });
      setInputType("ineligible");
    } else if (visa.status === "eligible") {
      // Eligible - continue to income question
      await showTypingThenMessage({
        id: "bot-visa-eligible",
        type: "bot",
        content: "Based on your visa type, you **likely qualify** for Elterngeld!",
      });

      await showTypingThenMessage({
        id: "bot-incomeLimit",
        type: "bot",
        content: questions[0].content,
        subtext: questions[0].subtext,
        isQuestion: true,
      });

      setInputType("buttons");
      setCurrentQuestionIndex(0);
    } else if (visa.status === "not_eligible") {
      // Not eligible
      await showTypingThenMessage({
        id: "bot-visa-ineligible",
        type: "bot",
        content: "Unfortunately, this visa type does not qualify for Elterngeld.",
      });
      setInputType("ineligible");
    } else {
      // Conditional - ask follow-up
      if (["student", "qualification", "job_seeker"].includes(visa.id)) {
        await showTypingThenMessage({
          id: "bot-conditional-employed",
          type: "bot",
          content: "Are you currently **employed** in Germany?",
          subtext:
            "With your visa type, you're only eligible if you're working, in Elternzeit, or receiving unemployment benefits (ALG).",
          isQuestion: true,
        });
        setInputType("conditional");
        setUserData((prev) => ({ ...prev, _conditionalType: "employment" }));
      } else if (["humanitarian_war", "humanitarian_hardship", "humanitarian_protection"].includes(visa.id)) {
        await showTypingThenMessage({
          id: "bot-conditional-humanitarian",
          type: "bot",
          content: "Which applies to you?",
          subtext: "With your visa type, you're eligible if you're employed OR have been in Germany for 15+ months.",
          isQuestion: true,
        });
        setInputType("conditional");
        setUserData((prev) => ({ ...prev, _conditionalType: "humanitarian" }));
      }
    }

    setIsProcessing(false);
  };

  const handleConditionalAnswer = async (option: ButtonOption) => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Save history
    setStepHistory((prev) => [
      ...prev,
      {
        questionIndex: currentQuestionIndex,
        messagesLength: messages.length,
        inputType,
        userData,
      },
    ]);

    setInputType(null);
    setMessages((prev) => {
      lastUserMessageIndexRef.current = prev.length;
      return [...prev, { id: "user-conditional", type: "user", content: option.label }];
    });

    await runScrollSequence();

    const conditionalType = userData._conditionalType;

    if (conditionalType === "employment") {
      if (option.value === "no") {
        await showTypingThenMessage({
          id: "bot-conditional-fail",
          type: "bot",
          content:
            "Unfortunately, with your visa type you need to be employed, in Elternzeit, or receiving ALG to be eligible.",
        });
        setInputType("ineligible");
      } else {
        const responseText =
          option.value === "employed"
            ? "Since you're employed, you **likely qualify** for Elterngeld!"
            : option.value === "elternzeit"
              ? "Since you're in Elternzeit, you **likely qualify** for Elterngeld!"
              : "Since you're receiving ALG, you **likely qualify** for Elterngeld!";

        await showTypingThenMessage({
          id: "bot-conditional-pass",
          type: "bot",
          content: responseText,
        });

        await showTypingThenMessage({
          id: "bot-incomeLimit",
          type: "bot",
          content: questions[0].content,
          subtext: questions[0].subtext,
          isQuestion: true,
        });

        setInputType("buttons");
        setCurrentQuestionIndex(0);
      }
    } else if (conditionalType === "humanitarian") {
      if (option.value === "neither") {
        await showTypingThenMessage({
          id: "bot-conditional-fail",
          type: "bot",
          content:
            "Unfortunately, with your visa type you'll need to either be employed or have been in Germany for **15+ months** to be eligible.",
        });
        setInputType("ineligible");
      } else {
        const responseText =
          option.value === "employed"
            ? "Since you're employed, you **likely qualify** for Elterngeld!"
            : "Since you've been in Germany 15+ months, you **likely qualify** for Elterngeld!";

        await showTypingThenMessage({
          id: "bot-conditional-pass",
          type: "bot",
          content: responseText,
        });

        await showTypingThenMessage({
          id: "bot-incomeLimit",
          type: "bot",
          content: questions[0].content,
          subtext: questions[0].subtext,
          isQuestion: true,
        });

        setInputType("buttons");
        setCurrentQuestionIndex(0);
      }
    }

    setIsProcessing(false);
  };

  const handleIneligibleChoice = async (option: ButtonOption) => {
    if (isProcessing) return;
    setIsProcessing(true);

    setStepHistory((prev) => [
      ...prev,
      {
        questionIndex: currentQuestionIndex,
        messagesLength: messages.length,
        inputType,
        userData,
      },
    ]);

    setInputType(null);
    setMessages((prev) => {
      lastUserMessageIndexRef.current = prev.length;
      return [...prev, { id: "user-ineligible", type: "user", content: option.label }];
    });

    await runScrollSequence();

    if (option.value === "continue") {
      await showTypingThenMessage({
        id: "bot-continue-anyway",
        type: "bot",
        content: "Alright, let's continue – you can still use this tool to **plan** and see what you would receive.",
      });

      await showTypingThenMessage({
        id: "bot-incomeLimit",
        type: "bot",
        content: questions[0].content,
        subtext: questions[0].subtext,
        isQuestion: true,
      });

      setInputType("buttons");
      setCurrentQuestionIndex(0);
    } else {
      window.open("https://familienportal.de/dynamic/action/familienportal/125008/suche", "_blank");
      await showTypingThenMessage({
        id: "bot-stelle-opened",
        type: "bot",
        content:
          "I've opened the **Elterngeldstelle finder** for you. They can give you personalized advice on your specific situation.",
      });
      setIsComplete(true);
    }

    setIsProcessing(false);
  };

  const handleDateSelect = async (isoDate: string, displayDate: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Save history
    setStepHistory((prev) => [
      ...prev,
      {
        questionIndex: currentQuestionIndex,
        messagesLength: messages.length,
        inputType,
        userData,
      },
    ]);

    setInputType(null);
    setMessages((prev) => {
      lastUserMessageIndexRef.current = prev.length;
      return [...prev, { id: "user-dueDate", type: "user", content: displayDate }];
    });
    setUserData((prev) => ({ ...prev, dueDate: isoDate }));

    await runScrollSequence();

    // Ask for income
    await showTypingThenMessage({
      id: "bot-income",
      type: "bot",
      content: "What's your **average monthly net income**?",
      subtext:
        "This is your take-home pay after taxes and social contributions. We'll use this to calculate your Elterngeld.",
      isQuestion: true,
    });

    setInputType("income");
    setIsProcessing(false);
  };

  const handleIncomeConfirm = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Save history
    setStepHistory((prev) => [
      ...prev,
      {
        questionIndex: currentQuestionIndex,
        messagesLength: messages.length,
        inputType,
        userData,
      },
    ]);

    setInputType(null);
    const formattedIncome = `€${incomeValue.toLocaleString("de-DE")}/month`;
    setMessages((prev) => {
      lastUserMessageIndexRef.current = prev.length;
      return [...prev, { id: "user-income", type: "user", content: formattedIncome }];
    });
    setUserData((prev) => ({ ...prev, monthlyIncome: incomeValue }));

    await runScrollSequence();

    // If couple, ask for partner's income
    if (userData.applicationType === "couple") {
      await showTypingThenMessage({
        id: "bot-partnerIncome",
        type: "bot",
        content: "What's your **partner's average monthly net income**?",
        subtext: "Same as before – their take-home pay after taxes.",
        isQuestion: true,
      });
      setInputType("partnerIncome");
    } else {
      // Single parent - complete
      setIsComplete(true);
      await showTypingThenMessage({
        id: "bot-complete",
        type: "bot",
        content: "Great, I have everything I need to calculate your Elterngeld!",
      });
    }

    setIsProcessing(false);
  };

  const handlePartnerIncomeConfirm = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Save history
    setStepHistory((prev) => [
      ...prev,
      {
        questionIndex: currentQuestionIndex,
        messagesLength: messages.length,
        inputType,
        userData,
      },
    ]);

    setInputType(null);
    const formattedIncome = `€${partnerIncomeValue.toLocaleString("de-DE")}/month`;
    setMessages((prev) => {
      lastUserMessageIndexRef.current = prev.length;
      return [...prev, { id: "user-partnerIncome", type: "user", content: formattedIncome }];
    });
    setUserData((prev) => ({ ...prev, partnerIncome: partnerIncomeValue }));

    await runScrollSequence();

    // Complete the flow
    setIsComplete(true);
    await showTypingThenMessage({
      id: "bot-complete",
      type: "bot",
      content: "Great, I have everything I need to calculate your Elterngeld!",
    });

    setIsProcessing(false);
  };

  const handleSingleParentChoice = async (option: ButtonOption) => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Save history
    setStepHistory((prev) => [
      ...prev,
      {
        questionIndex: currentQuestionIndex,
        messagesLength: messages.length,
        inputType,
        userData,
      },
    ]);

    setInputType(null);
    setMessages((prev) => {
      lastUserMessageIndexRef.current = prev.length;
      return [...prev, { id: "user-singleParent", type: "user", content: option.label }];
    });
    setUserData((prev) => ({ ...prev, singleParentType: option.value }));

    await runScrollSequence();

    // Show confirmation based on choice
    const months = option.value === "alone" ? "14" : "12";
    await showTypingThenMessage({
      id: "bot-singleParent-confirm",
      type: "bot",
      content: `Got it! You can claim up to **${months} months** of Elterngeld.`,
    });

    // Continue to due date
    await showTypingThenMessage({
      id: "bot-dueDate",
      type: "bot",
      content: "When is your child **born or expected** to be born?",
      subtext: "Remember to apply within 3 months after birth. Payments can only be backdated 3 months.",
      isQuestion: true,
    });

    setInputType("date");
    setIsProcessing(false);
  };

  const handleAnswer = useCallback(
    async (option: ButtonOption) => {
      if (isProcessing) return;
      setIsProcessing(true);

      const q = questions[currentQuestionIndex];

      // Save history
      setStepHistory((prev) => [
        ...prev,
        {
          questionIndex: currentQuestionIndex,
          messagesLength: messages.length,
          inputType,
          userData,
        },
      ]);

      // Hide buttons, add user message
      setInputType(null);
      setMessages((prev) => {
        lastUserMessageIndexRef.current = prev.length;
        return [...prev, { id: `user-${q.id}`, type: "user", content: option.label }];
      });
      setUserData((prev) => ({ ...prev, [q.id]: option.value }));

      await runScrollSequence();

      // Handle income limit "over" case
      if (q.id === "incomeLimit" && option.value === "over") {
        await showTypingThenMessage({
          id: "bot-income-over",
          type: "bot",
          content: "Unfortunately, households with taxable income above **€175,000** are not eligible for Elterngeld.",
          subtext: "This limit applies to your combined income from the last tax year before your child's birth.",
        });
        setInputType("ineligible");
        setIsProcessing(false);
        return;
      }

      // Handle income limit "under" case - show eligibility confirmation (only for EU, non-EU got it after visa)
      if (q.id === "incomeLimit" && option.value === "under" && userData.citizenship === "eu") {
        await showTypingThenMessage({
          id: "bot-income-eligible",
          type: "bot",
          content: "Based on your answers, you **likely qualify** for Elterngeld!",
        });
      }

      const nextIdx = currentQuestionIndex + 1;

      // After applicationType, check if single parent needs follow-up
      if (q.id === "applicationType") {
        if (option.value === "single") {
          // Ask follow-up question for single parents
          await showTypingThenMessage({
            id: "bot-singleParent",
            type: "bot",
            content: "Do you **live with the other parent**?",
            subtext: "This affects how many months you can claim.",
            isQuestion: true,
          });
          setInputType("singleParent");
          setIsProcessing(false);
          return;
        } else {
          // Couple - continue to due date
          await showTypingThenMessage({
            id: "bot-dueDate",
            type: "bot",
            content: "When is your child **born or expected** to be born?",
            subtext: "Remember to apply within 3 months after birth. Payments can only be backdated 3 months.",
            isQuestion: true,
          });
          setInputType("date");
          setIsProcessing(false);
          return;
        }
      }

      if (nextIdx >= questions.length) {
        setIsComplete(true);
        await showTypingThenMessage({
          id: "bot-complete",
          type: "bot",
          content: "Great, I have everything I need to calculate your Elterngeld!",
        });
        setIsProcessing(false);
        return;
      }

      // Show next question
      const nq = questions[nextIdx];
      await showTypingThenMessage({
        id: `bot-${nq.id}`,
        type: "bot",
        content: nq.content,
        subtext: nq.subtext,
        isQuestion: true,
      });

      setCurrentQuestionIndex(nextIdx);
      setInputType("buttons");
      setIsProcessing(false);
    },
    [
      currentQuestionIndex,
      isProcessing,
      messages.length,
      inputType,
      userData,
      runScrollSequence,
      showTypingThenMessage,
    ],
  );

  const handleGoBack = useCallback(() => {
    if (stepHistory.length === 0) {
      setShowStartScreen(true);
      setMessages([]);
      setCurrentQuestionIndex(0);
      setInputType(null);
      setSpacerHeight(0);
      setUserData({});
      setIsComplete(false);
      return;
    }

    const lastEntry = stepHistory[stepHistory.length - 1];
    setStepHistory((prev) => prev.slice(0, -1));
    setMessages((prev) => prev.slice(0, lastEntry.messagesLength));
    setCurrentQuestionIndex(lastEntry.questionIndex);
    setInputType(lastEntry.inputType);
    setUserData(lastEntry.userData);
    setIsComplete(false);
    setSpacerHeight(0);
  }, [stepHistory]);

  const handleRestart = useCallback(() => {
    setShowStartScreen(true);
    setMessages([]);
    setCurrentQuestionIndex(0);
    setInputType(null);
    setIsTyping(false);
    setIsComplete(false);
    setStepHistory([]);
    setSpacerHeight(0);
    setIsProcessing(false);
    setUserData({});
    setIncomeValue(2500);
    setPartnerIncomeValue(2500);
  }, []);

  // ===========================================
  // RENDER INPUT
  // ===========================================
  const renderInput = () => {
    if (isComplete || !inputType) return null;

    if (inputType === "buttons") {
      const currentQuestion = questions[currentQuestionIndex];
      return <ButtonOptions options={currentQuestion.options} onSelect={handleAnswer} disabled={isProcessing} />;
    }

    if (inputType === "visa") {
      return <VisaSelector onSelect={handleVisaSelect} disabled={isProcessing} />;
    }

    if (inputType === "date") {
      return <DatePicker onSelect={handleDateSelect} disabled={isProcessing} />;
    }

    if (inputType === "income") {
      return (
        <IncomeSlider
          label="Drag to set your monthly net income"
          value={incomeValue}
          min={0}
          max={7500}
          step={100}
          onChange={setIncomeValue}
          onConfirm={handleIncomeConfirm}
          disabled={isProcessing}
        />
      );
    }

    if (inputType === "partnerIncome") {
      return (
        <IncomeSlider
          label="Drag to set your partner's monthly net income"
          value={partnerIncomeValue}
          min={0}
          max={7500}
          step={100}
          onChange={setPartnerIncomeValue}
          onConfirm={handlePartnerIncomeConfirm}
          disabled={isProcessing}
        />
      );
    }

    if (inputType === "singleParent") {
      return (
        <ButtonOptions
          options={[
            { value: "alone", label: "No, I'm raising the child alone", icon: "single", note: "14 months" },
            { value: "together", label: "Yes, but only I'm applying", icon: "couple", note: "12 months" },
          ]}
          onSelect={handleSingleParentChoice}
          disabled={isProcessing}
        />
      );
    }

    if (inputType === "conditional") {
      const conditionalType = userData._conditionalType;
      const options: ButtonOption[] =
        conditionalType === "employment"
          ? [
              { value: "employed", label: "Yes, I'm employed", icon: "briefcase" },
              { value: "elternzeit", label: "I'm in Elternzeit", icon: "baby" },
              { value: "alg", label: "I receive ALG (unemployment)", icon: "home" },
              { value: "no", label: "No, none of these", icon: "x" },
            ]
          : [
              { value: "employed", label: "I'm currently employed", icon: "briefcase" },
              { value: "15months", label: "I've been in Germany 15+ months", icon: "home" },
              { value: "neither", label: "Neither", icon: "x" },
            ];

      return <ButtonOptions options={options} onSelect={handleConditionalAnswer} disabled={isProcessing} />;
    }

    if (inputType === "ineligible") {
      return (
        <ButtonOptions
          options={[
            { value: "continue", label: "Continue anyway", sub: "For planning purposes", icon: "check" },
            { value: "find_stelle", label: "Find my Elterngeldstelle", sub: "Get individual advice", icon: "home" },
          ]}
          onSelect={handleIneligibleChoice}
          disabled={isProcessing}
        />
      );
    }

    return null;
  };

  const canGoBack = stepHistory.length > 0 || !showStartScreen;

  // ===========================================
  // RENDER
  // ===========================================
  return (
    <>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1); } }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          background: #FF8752;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #FF8752;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
      `}</style>
      <div
        className="flex flex-col overflow-hidden"
        style={{ backgroundColor: colors.background, fontFamily: fonts.body, height: "calc(100vh - 72px)" }}
      >
        <div className="flex-1 min-h-0 overflow-hidden">
          <div ref={scrollContainerRef} className="h-full overflow-y-auto px-5 pt-6" style={{ overflowAnchor: "none" }}>
            <div className="max-w-2xl mx-auto">
              {showStartScreen ? (
                <StartScreen onAnswer={handleStartAnswer} />
              ) : (
                <>
                  {/* MESSAGES CONTAINER */}
                  <div ref={messagesContainerRef}>
                    {messages.map((msg, i) =>
                      msg.type === "user" ? (
                        <UserMessage
                          key={msg.id}
                          ref={i === lastUserMessageIndexRef.current ? lastUserMessageRef : null}
                          content={msg.content}
                        />
                      ) : (
                        <BotMessage
                          key={msg.id}
                          content={msg.content}
                          subtext={msg.subtext}
                          isQuestion={msg.isQuestion}
                        />
                      ),
                    )}

                    {isTyping && <TypingIndicator />}

                    {/* INLINE INPUT */}
                    {renderInput()}
                  </div>

                  {/* SPACER */}
                  <div
                    ref={spacerRef}
                    style={{
                      height: spacerHeight,
                      transition: "height 0.3s ease",
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {!showStartScreen && (
          <div
            className="flex-shrink-0 px-5 py-2"
            style={{ backgroundColor: colors.background, borderTop: `1px solid ${colors.border}` }}
          >
            <div className="max-w-2xl mx-auto">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button
                  onClick={handleGoBack}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                    background: "none",
                    border: "none",
                    borderRadius: 8,
                    cursor: canGoBack ? "pointer" : "default",
                    opacity: canGoBack ? 1 : 0.3,
                    color: colors.text,
                  }}
                  disabled={!canGoBack}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span style={{ fontSize: fontSize.tiny, color: colors.text, opacity: 0.6 }}>
                  Quick estimate only – not legal or tax advice.
                </span>
                <button
                  onClick={handleRestart}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                    background: "none",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    color: colors.text,
                  }}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ElterngeldGuideNew;
