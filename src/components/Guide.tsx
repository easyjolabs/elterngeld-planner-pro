// ===========================================
// ELTERNGELD GUIDE - LP DESIGN SYSTEM APPLIED
// ===========================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ElterngeldPlanner, { PlannerMonth } from "@/components/ElterngeldPlanner";
import LoginModal from "@/components/LoginModal";
import { HEADER_HEIGHT } from "./Header";
import { useGuide } from "@/components/GuideContext";

// ===========================================
// TYPES
// ===========================================
interface FlowMessage {
  type: "bot" | "user" | "category" | "component" | "dynamic" | "end";
  content?: string;
  subtext?: string;
  input?: "buttons" | "date" | "slider";
  field?: string;
  person?: "you" | "partner";
  options?: ButtonOption[];
  component?:
    | "calculation"
    | "planner"
    | "checkmarks"
    | "summary"
    | "ctaCard"
    | "introChecklist"
    | "continue"
    | "ineligible"
    | "summaryBox";
  pause?: boolean;
  pauseLabel?: string;
  key?: string;
  isQuestion?: boolean;
  infoTags?: InfoTag[];
  infoTagsDescription?: string;
}

interface InfoTag {
  label: string;
  prefillQuestion: string;
}

interface ButtonOption {
  value: string;
  label: string;
  sub?: string;
  note?: string;
  accent?: "basis" | "bonus";
  icon?: string;
}

interface UserData {
  citizenship?: string;
  visaType?: string;
  incomeLimit?: string;
  dueDate?: string;
  premature?: string;
  multiples?: string;
  siblings?: string;
  applicationType?: string;
  employmentType?: string;
  income?: number;
  partnerEmploymentType?: string;
  partnerIncome?: number;
  internationalWorker?: string;
  internationalSituation?: string;
  isEmployed?: string;
  humanitarianCondition?: string;
  ineligibleChoice?: string;
  continueAfterStelle?: string;
}

// ===========================================
// COMPONENT PROPS
// ===========================================
interface DateInputProps {
  value: Date | undefined;
  onChange: (date: Date) => void;
  onConfirm: (isoDate: string, displayDate: string) => void;
}

interface SliderInputProps {
  value: number;
  onChange: (value: number) => void;
  onConfirm: (value: number, display: string) => void;
}

interface VisaSelectorProps {
  onSelect: (visaId: string, label: string) => void;
}

interface TypeSelectProps {
  value: "none" | "basis" | "plus" | "bonus";
  onChange: (value: string) => void;
  hasError: boolean;
  isSingleParent?: boolean;
}

// ===========================================
// DESIGN TOKENS - LP STYLE
// ===========================================
const colors = {
  background: "#FAFAF9",
  tile: "#F0EEE6",
  tileHover: "#E8E6DE",
  white: "#FFFFFF",
  text: "#666666",
  textDark: "#000000",
  userBubble: "#FFFFFF",
  border: "#E7E5E4",
  borderLight: "#F5F5F4",
  orange: "#FF8752",
  tan: "#D1B081",
  yellow: "#FFE44C",
  basis: "#C0630B",
  plus: "#FC631B",
  bonus: "#FFE44C",
  basisBorder: "#F2F53A",
  plusBorder: "#D1B081",
  bonusBorder: "#D1B081",
  buttonDark: "#000000",
  error: "#E07B3C",
  success: "#1AB689",
  stars: "#facc15",
};

const fonts = {
  headline: "'Space Grotesk', -apple-system, sans-serif",
  body: "'Inter', -apple-system, sans-serif",
};

const ui = {
  cardRadius: 20,
  buttonRadius: 10,
  inputRadius: 10,
  buttonHeight: 48,
  cardShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

const fontSize = {
  question: "19px",
  body: "16px",
  subtext: "15px",
  button: "15px",
  small: "13px",
  tiny: "12px",
};

// ===========================================
// CONSTANTS
// ===========================================
const ELTERNGELD = {
  MIN_AMOUNT: 300,
  MAX_AMOUNT: 1800,
  GESCHWISTER_MIN: 75,
  TWINS_BONUS: 300,
  TRIPLETS_BONUS: 600,
} as const;

const SLIDER = {
  MIN: 0,
  MAX: 8000,
  STEP: 100,
} as const;

const PLANNER = {
  MAX_MONTHS: 28,
  MAX_HEIGHT: 280,
  SCROLL_TOP_OFFSET: 15,
} as const;

// ===========================================
// VISA ELIGIBILITY DATA
// ===========================================
interface VisaType {
  id: string;
  label: string;
  labelDe?: string;
  category: "special" | "work" | "study" | "humanitarian" | "other";
  status: "eligible" | "conditional" | "not_eligible";
  condition?: string;
  paragraph?: string;
}

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
  { id: "work", label: "Work" },
  { id: "study", label: "Study & Job Search" },
  { id: "humanitarian", label: "Humanitarian" },
  { id: "other", label: "Other" },
  { id: "special", label: "Special Cases" },
];

// ===========================================
// FLOW DEFINITION
// ===========================================
const flow: FlowMessage[] = [
  // Citizenship question is now on the Start Screen
  // Flow starts with citizenshipResponse (handled dynamically based on Start Screen answer)
  { type: "dynamic", key: "citizenshipResponse" },

  {
    type: "bot",
    content: "Did your household earn **more than €175,000** taxable income last year?",
    isQuestion: true,
    subtext: `This is your "zu versteuerndes Einkommen". You'll find it on your / your partner's tax return.`,
    input: "buttons",
    field: "incomeLimit",
    options: [
      { value: "under", label: "No, under €175,000", icon: "check" },
      { value: "over", label: "Yes, over €175,000", icon: "x" },
    ],
  },
  { type: "user" },
  { type: "dynamic", key: "incomeLimitResponse" },

  {
    type: "bot",
    content: "When is your child **born or expected** to be born?",
    isQuestion: true,
    subtext: "Remember to apply within 3 months after birth. Payments can only be backdated 3 months.",
    input: "date",
    field: "dueDate",
  },
  { type: "user" },
  { type: "dynamic", key: "dateResponse" },
  { type: "dynamic", key: "prematureQuestion" },
  { type: "user" },
  {
    type: "bot",
    content: "Are you having **twins or triplets**?",
    isQuestion: true,
    subtext: "Multiple births qualify for an extra bonus on top of your regular Elterngeld.",
    input: "buttons",
    field: "multiples",
    options: [
      { value: "no", label: "No, single child", icon: "baby" },
      { value: "twins", label: "Twins", icon: "twins", accent: "basis", note: "+€300/month" },
      { value: "triplets", label: "Triplets", icon: "triplets", accent: "basis", note: "+€600/month" },
    ],
  },
  { type: "user" },
  {
    type: "bot",
    content: "Do you have **other young children** at home?",
    isQuestion: true,
    subtext: "Children under 3, or two under 6, qualify for the **Geschwisterbonus**: +10% (at least €75/month).",
    input: "buttons",
    field: "siblings",
    options: [
      { value: "yes", label: "Yes", icon: "check", accent: "bonus", note: "+10%" },
      { value: "none", label: "No", icon: "x" },
    ],
  },
  { type: "user" },

  {
    type: "bot",
    content: "Are you applying as a **couple** or as a **single parent**?",
    isQuestion: true,
    subtext: `You count as a single parent if the other parent neither lives with you nor with the child.`,
    input: "buttons",
    field: "applicationType",
    options: [
      { value: "couple", label: "Applying as a couple", icon: "couple" },
      { value: "single", label: "Applying as a single parent", icon: "single", note: "All 14 months" },
    ],
  },
  { type: "user" },
  { type: "dynamic", key: "incomeQuestion" },
  { type: "user" },
  { type: "dynamic", key: "partnerQuestion" },
  { type: "user" },

  { type: "dynamic", key: "calculationIntro" },
  { type: "component", component: "calculation" },
  { type: "dynamic", key: "plannerIntro" },

  { type: "component", component: "planner", pause: true, pauseLabel: "Continue to application →" },

  {
    type: "bot",
    content: "Ready to apply? We can pre-fill your official application and guide you through the remaining steps.",
  },
  { type: "component", component: "ctaCard" },

  { type: "end" },
];

// ===========================================
// HELPER FUNCTIONS
// ===========================================
const LightbulbIcon = () => (
  <svg
    className="w-4 h-4 inline-block mr-1 -mt-0.5"
    style={{ color: colors.text }}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

const formatText = (text: string | undefined, onOpenChat?: (prefill?: string) => void): React.ReactNode => {
  if (!text) return null;

  const hasTip = text.startsWith("[tip]");
  const processedText = hasTip ? text.replace("[tip]", "") : text;

  const lines = processedText.split("\n");
  const result: React.ReactNode[] = [];
  let bulletGroup: string[] = [];

  if (hasTip) {
    result.push(<LightbulbIcon key="tip-icon" />);
  }

  const processBulletGroup = () => {
    if (bulletGroup.length === 0) return;
    result.push(
      <ul key={`ul-${result.length}`} className="space-y-0.5" style={{ paddingLeft: "1rem" }}>
        {bulletGroup.map((item, idx) => {
          const content = item.replace(/^[•]\s*/, "");
          return (
            <li key={idx} className="relative" style={{ listStyle: "none" }}>
              <span className="absolute" style={{ left: "-0.75rem" }}>
                •
              </span>
              {processLine(content, idx)}
            </li>
          );
        })}
      </ul>,
    );
    bulletGroup = [];
  };

  const processLine = (line: string, lineIndex: number): React.ReactNode => {
    const linkParts = line.split(/\[\[(.*?)\]\]/g);
    const withLinks = linkParts.map((part, i) => {
      if (i % 2 === 1) {
        const [linkText, prefillQuestion] = part.split("|");
        return (
          <button
            key={`link-${i}`}
            onClick={() => onOpenChat?.(prefillQuestion || undefined)}
            className="font-semibold underline hover:opacity-70 transition-opacity"
            style={{ color: colors.textDark }}
          >
            {linkText}
          </button>
        );
      }
      const boldParts = part.split(/\*\*(.*?)\*\*/g);
      return boldParts.map((boldPart, j) =>
        j % 2 === 1 ? (
          <strong key={`${i}-${j}`} className="font-semibold" style={{ color: colors.textDark }}>
            {boldPart}
          </strong>
        ) : (
          boldPart
        ),
      );
    });
    return <>{withLinks}</>;
  };

  lines.forEach((line, lineIndex) => {
    const isBullet = line.trim().startsWith("•");
    if (isBullet) {
      bulletGroup.push(line);
    } else {
      processBulletGroup();
      if (line.trim()) {
        result.push(
          <span key={lineIndex}>
            {processLine(line, lineIndex)}
            {lineIndex < lines.length - 1 && !lines[lineIndex + 1]?.trim().startsWith("•") && <br />}
          </span>,
        );
      } else if (lineIndex < lines.length - 1) {
        result.push(<br key={`br-${lineIndex}`} />);
      }
    }
  });

  processBulletGroup();
  return result;
};

const calculateElterngeld = (netIncome: number, data: UserData, partTimeIncome: number = 0) => {
  if (!netIncome || netIncome === 0) {
    return {
      basis: ELTERNGELD.MIN_AMOUNT,
      plus: ELTERNGELD.MIN_AMOUNT / 2,
      bonus: ELTERNGELD.MIN_AMOUNT / 2,
      basisWithoutWork: ELTERNGELD.MIN_AMOUNT,
      plusCapped: false,
    };
  }

  const getErsatzrate = (income: number) => {
    let rate = 0.67;
    if (income < 1000) {
      const diff = 1000 - income;
      rate = Math.min(1.0, 0.67 + (diff / 2) * 0.001);
    } else if (income > 1200) {
      const diff = income - 1200;
      rate = Math.max(0.65, 0.67 - (diff / 2) * 0.001);
    }
    return rate;
  };

  const ersatzrateOhne = getErsatzrate(netIncome);
  let basisWithoutWork = Math.round(netIncome * ersatzrateOhne);
  basisWithoutWork = Math.max(ELTERNGELD.MIN_AMOUNT, Math.min(ELTERNGELD.MAX_AMOUNT, basisWithoutWork));

  let bonusAmount = 0;
  if (data.siblings === "yes") {
    bonusAmount += Math.max(ELTERNGELD.GESCHWISTER_MIN, Math.round(basisWithoutWork * 0.1));
  }
  if (data.multiples === "twins") bonusAmount += ELTERNGELD.TWINS_BONUS;
  if (data.multiples === "triplets") bonusAmount += ELTERNGELD.TRIPLETS_BONUS;
  basisWithoutWork += bonusAmount;

  const differenz = Math.max(0, netIncome - partTimeIncome);
  const ersatzrateMit = getErsatzrate(differenz);
  let basis = Math.round(differenz * ersatzrateMit);
  basis = Math.max(ELTERNGELD.MIN_AMOUNT, Math.min(ELTERNGELD.MAX_AMOUNT, basis));
  basis += bonusAmount;

  const plusDeckel = Math.round(basisWithoutWork / 2);
  const plusBerechnet = Math.round(basis / 2);
  const plusCapped = partTimeIncome > 0 && plusBerechnet > plusDeckel;
  const plus = partTimeIncome > 0 ? Math.min(plusBerechnet, plusDeckel) : plusBerechnet;

  return {
    basis,
    plus,
    bonus: plus,
    basisWithoutWork,
    plusCapped,
  };
};

// ===========================================
// DATE INPUT COMPONENT
// ===========================================
const formatDateDisplay = (date: Date) => {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const formatDateISO = (date: Date) => {
  return date.toISOString().split("T")[0];
};

const DateInputComponent: React.FC<DateInputProps> = ({ value, onChange, onConfirm }) => {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const [selectedDay, setSelectedDay] = React.useState(value?.getDate() || 0);
  const [selectedMonth, setSelectedMonth] = React.useState(value ? value.getMonth() + 1 : 0);
  const [selectedYear, setSelectedYear] = React.useState(value?.getFullYear() || 0);

  const getDaysInMonth = (month: number, year: number) => {
    if (!month || !year) return 31;
    return new Date(year, month, 0).getDate();
  };
  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear || currentYear);

  React.useEffect(() => {
    if (selectedDay && selectedMonth && selectedYear) {
      const newDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
      onChange(newDate);
    }
  }, [selectedDay, selectedMonth, selectedYear, onChange]);

  React.useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [daysInMonth, selectedDay]);

  const isComplete = selectedDay > 0 && selectedMonth > 0 && selectedYear > 0;

  const selectStyle: React.CSSProperties = {
    backgroundColor: colors.white,
    color: colors.textDark,
    border: `1.5px solid ${colors.border}`,
    borderRadius: ui.inputRadius,
    fontSize: fontSize.button,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2378716c'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
    backgroundSize: "16px",
    paddingRight: "32px",
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          value={selectedDay || ""}
          onChange={(e) => setSelectedDay(Number(e.target.value))}
          className="flex-1 px-3 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-stone-300 appearance-none cursor-pointer"
          style={selectStyle}
        >
          <option value="">Day</option>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>

        <select
          value={selectedMonth || ""}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="flex-[2] px-3 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-stone-300 appearance-none cursor-pointer"
          style={selectStyle}
        >
          <option value="">Month</option>
          {months.map((month, i) => (
            <option key={month} value={i + 1}>
              {month}
            </option>
          ))}
        </select>

        <select
          value={selectedYear || ""}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="flex-1 px-3 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-stone-300 appearance-none cursor-pointer"
          style={selectStyle}
        >
          <option value="">Year</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => isComplete && value && onConfirm(formatDateISO(value), formatDateDisplay(value))}
        disabled={!isComplete}
        className="w-full transition-opacity flex items-center justify-between"
        style={{
          backgroundColor: colors.buttonDark,
          color: colors.white,
          height: ui.buttonHeight,
          borderRadius: ui.buttonRadius,
          padding: "0 20px",
          fontFamily: fonts.body,
          fontSize: fontSize.button,
          fontWeight: 600,
          opacity: isComplete ? 1 : 0.4,
          cursor: isComplete ? "pointer" : "not-allowed",
        }}
      >
        <span className="w-[18px]" />
        <span>Confirm</span>
        <span style={{ fontSize: "18px" }}>→</span>
      </button>
    </div>
  );
};

// ===========================================
// SLIDER INPUT COMPONENT
// ===========================================
const SliderInputComponent: React.FC<SliderInputProps & { label?: string }> = ({
  value,
  onChange,
  onConfirm,
  label,
}) => {
  const trackRef = React.useRef<HTMLDivElement>(null);

  const getValueFromPosition = (clientX: number) => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round((percent * SLIDER.MAX) / SLIDER.STEP) * SLIDER.STEP;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    onChange(getValueFromPosition(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    onChange(getValueFromPosition(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const target = e.currentTarget;
    target.releasePointerCapture(e.pointerId);
  };

  const percent = (value / SLIDER.MAX) * 100;
  const tickValues = [0, 2000, 4000, 6000, 8000];

  return (
    <div
      className="p-5"
      style={{
        backgroundColor: colors.white,
        boxShadow: ui.cardShadow,
        borderRadius: ui.cardRadius,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div className="mb-4">
        <span style={{ color: colors.text, fontSize: fontSize.small }}>{label || "Monthly net income"}</span>
        <div className="mt-1">
          <span style={{ color: colors.text, fontSize: fontSize.subtext, marginRight: "4px" }}>€</span>
          <span style={{ color: colors.textDark, fontSize: "28px", fontWeight: 700, fontFamily: fonts.headline }}>
            {value.toLocaleString()}
          </span>
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative h-10 cursor-pointer select-none touch-none"
        role="slider"
        aria-valuemin={SLIDER.MIN}
        aria-valuemax={SLIDER.MAX}
        aria-valuenow={value}
        aria-label="Income slider"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          className="absolute top-1/2 left-0 right-0 flex justify-between px-0"
          style={{ transform: "translateY(-50%)" }}
        >
          {tickValues.map((tick, i) => (
            <div
              key={i}
              className="w-0.5 h-1.5 rounded-full"
              style={{
                backgroundColor: value >= tick ? colors.basis : colors.border,
                opacity: value >= tick ? 0.5 : 0.3,
              }}
            />
          ))}
        </div>

        <div
          className="absolute top-1/2 left-0 right-0 h-0.5 rounded-full -translate-y-1/2"
          style={{ backgroundColor: colors.textDark }}
        />

        <div
          className="absolute top-1/2 left-0 h-0.5 rounded-full -translate-y-1/2 pointer-events-none"
          style={{ backgroundColor: colors.textDark, width: `${percent}%` }}
        />

        <div
          className="absolute top-1/2 w-5 h-5 rounded-full pointer-events-none -translate-y-1/2"
          style={{
            backgroundColor: colors.orange,
            left: `${percent}%`,
            marginLeft: "-10px",
          }}
        />
      </div>

      <div className="flex justify-between mt-1" style={{ color: colors.text, fontSize: "11px" }}>
        <span>€0</span>
        <span>€2k</span>
        <span>€4k</span>
        <span>€6k</span>
        <span>€8k</span>
      </div>

      <button
        onClick={() => onConfirm(value, `€${value.toLocaleString()}`)}
        className="w-full mt-6 flex items-center justify-between"
        style={{
          backgroundColor: colors.buttonDark,
          color: colors.white,
          height: ui.buttonHeight,
          borderRadius: ui.buttonRadius,
          padding: "0 20px",
          fontFamily: fonts.body,
          fontSize: fontSize.button,
          fontWeight: 600,
        }}
      >
        <span className="w-[18px]" />
        <span>Continue</span>
        <span style={{ fontSize: "18px" }}>→</span>
      </button>
    </div>
  );
};

// ===========================================
// INCOME STEPPER COMPONENT
// ===========================================
interface StepperProps {
  value: number;
  label: string;
  onChange: (value: number) => void;
}

const IncomeStepper: React.FC<StepperProps> = ({ value, label, onChange }) => {
  const step = 100;
  const decrease = () => onChange(Math.max(0, value - step));
  const increase = () => onChange(value + step);

  return (
    <div className="flex items-center justify-between flex-1">
      <span style={{ color: colors.textDark, fontSize: fontSize.small }}>{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={decrease}
          className="w-5 h-5 flex items-center justify-center"
          style={{ color: colors.textDark, cursor: "pointer", fontSize: "16px" }}
        >
          −
        </button>
        <span
          style={{
            color: colors.textDark,
            fontSize: fontSize.small,
            fontWeight: 600,
            minWidth: "50px",
            textAlign: "center",
          }}
        >
          €{value.toLocaleString("de-DE")}
        </span>
        <button
          onClick={increase}
          className="w-5 h-5 flex items-center justify-center"
          style={{ color: colors.textDark, cursor: "pointer", fontSize: "16px" }}
        >
          +
        </button>
      </div>
    </div>
  );
};

// ===========================================
// TYPE SELECT COMPONENT (for Planner)
// ===========================================
const typeStyles = {
  none: { bg: "rgba(0, 0, 0, 0.04)" },
  basis: { bg: "rgba(192, 99, 11, 0.25)" },
  plus: { bg: "rgba(252, 99, 27, 0.25)" },
  bonus: { bg: "rgba(255, 228, 76, 0.35)" },
} as const;

const TypeSelectComponent: React.FC<TypeSelectProps> = ({ value, onChange, hasError, isSingleParent }) => (
  <div className="relative w-full">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-6 pl-2.5 pr-5 rounded-full font-medium appearance-none cursor-pointer w-full"
      aria-label="Select benefit type"
      style={{
        fontSize: "11px",
        backgroundColor: hasError ? "rgba(254, 115, 60, 0.15)" : typeStyles[value].bg,
        color: value === "none" ? colors.text : colors.textDark,
        border: "none",
        outline: "none",
      }}
    >
      <option value="none">Select</option>
      <option value="basis">Basis</option>
      <option value="plus">Plus</option>
      {!isSingleParent && <option value="bonus">Bonus</option>}
    </select>
    <svg
      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
      style={{ color: colors.textDark }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

// ===========================================
// BUTTON ICONS
// ===========================================
const buttonIcons: Record<string, React.ReactNode> = {
  eu: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path d="M4 4v16M4 4h12l-2 4 2 4H4" />
    </svg>
  ),
  passport: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M8 17h8" />
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
  child: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="12" cy="7" r="4" />
      <path d="M5 21v-2a7 7 0 0114 0v2" />
    </svg>
  ),
  children: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 21v-2c0-2.5 2-4.5 6-4.5s6 2 6 4.5v2M14 21v-1.5c0-2 1.5-3.5 4.5-3.5" />
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
  heart: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
};

const ButtonIcon = React.memo(({ name }: { name: string }) => buttonIcons[name] || null);

// ===========================================
// BUTTON OPTIONS COMPONENT
// ===========================================
const tagColors = ["#FF8752", "#FFE44C", "#D1B081"];

const ButtonOptions = React.memo(
  ({ options, onSelect }: { options: ButtonOption[]; onSelect: (value: string, label: string) => void }) => {
    // Track note index for color rotation
    let noteIndex = 0;

    return (
      <div className="space-y-2">
        {options.map((opt, i) => {
          const hasArrow = opt.label.includes("→");
          const labelText = hasArrow ? opt.label.replace("→", "").trim() : opt.label;
          const shouldCenter = hasArrow && !opt.icon && !opt.note;
          const currentNoteIndex = opt.note ? noteIndex++ : -1;

          return (
            <button
              key={i}
              onClick={() => onSelect(opt.value, opt.label)}
              className={`w-full transition-all flex items-center hover:border-stone-400 ${shouldCenter ? "justify-between" : "justify-between text-left"}`}
              style={{
                backgroundColor: colors.white,
                border: `1.5px solid ${colors.border}`,
                borderRadius: ui.buttonRadius,
                height: ui.buttonHeight,
                padding: "10px 16px",
              }}
            >
            {shouldCenter ? (
              <>
                <span className="w-[18px]" />
                <span style={{ fontSize: fontSize.button, fontWeight: 500, color: colors.textDark }}>{labelText}</span>
                <span style={{ fontSize: "18px", color: colors.textDark }}>→</span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {opt.icon && (
                    <span style={{ color: colors.textDark }}>
                      <ButtonIcon name={opt.icon} />
                    </span>
                  )}
                  <div>
                    <span style={{ fontSize: fontSize.button, fontWeight: 500, color: colors.textDark }}>
                      {labelText}
                    </span>
                    {opt.sub && (
                      <p style={{ fontSize: fontSize.tiny, marginTop: "2px", color: colors.text }}>{opt.sub}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {opt.note && (
                    <span
                      className="px-2.5 py-1 rounded-full"
                      style={{
                        fontSize: fontSize.tiny,
                        fontWeight: 500,
                        backgroundColor: tagColors[currentNoteIndex % 3],
                        color: "#000",
                      }}
                    >
                      {opt.note}
                    </span>
                  )}
                  {hasArrow && <span style={{ fontSize: "18px", color: colors.textDark }}>→</span>}
                </div>
              </>
            )}
          </button>
        );
      })}
    </div>
    );
  },
);

// ===========================================
// VISA SELECTOR COMPONENT
// ===========================================
const VisaSelectorComponent: React.FC<VisaSelectorProps> = ({ onSelect }) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  const categoryOptions = [
    { id: "work", label: "Work permit", sub: "Blue Card, Niederlassungserlaubnis..." },
    { id: "study", label: "Student / Job seeker", sub: "Student visa, Job seeker..." },
    { id: "humanitarian", label: "Humanitarian", sub: "Ukraine, Asylum..." },
    { id: "special", label: "Special situation", sub: "UK pre-Brexit, Turkish/Moroccan..." },
    { id: "other", label: "Other / Not sure" },
  ];

  const handleSelectVisa = (visaId: string) => {
    const visa = visaTypes.find((v) => v.id === visaId);
    onSelect(visaId, visa?.label || visaId);
  };

  if (!selectedCategory) {
    return (
      <div className="py-4 space-y-2">
        {categoryOptions.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className="w-full p-3.5 text-left transition-all hover:border-stone-400"
            style={{
              backgroundColor: colors.white,
              border: `1.5px solid ${colors.border}`,
              borderRadius: ui.buttonRadius,
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

  return (
    <div className="py-4">
      <button
        onClick={() => setSelectedCategory(null)}
        className="flex items-center gap-1.5 mb-4 hover:opacity-70"
        style={{ color: colors.text, fontSize: fontSize.button }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="space-y-2">
        {categoryVisas.map((visa) => (
          <button
            key={visa.id}
            onClick={() => handleSelectVisa(visa.id)}
            className="w-full p-3.5 text-left transition-all hover:border-stone-400"
            style={{
              backgroundColor: colors.white,
              border: `1.5px solid ${colors.border}`,
              borderRadius: ui.buttonRadius,
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

// ===========================================
// INFO BOX COMPONENT
// ===========================================
interface InfoBoxProps {
  title: string;
  content: string;
  onOpenChat?: (prefill?: string) => void;
  noMargin?: boolean;
  defaultOpen?: boolean;
  isLast?: boolean;
}

const InfoBox: React.FC<InfoBoxProps> = React.memo(
  ({ title, content, onOpenChat, noMargin, defaultOpen = false, isLast = false }) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
      <div
        style={{
          borderTop: `1px solid ${colors.border}`,
          borderBottom: isLast ? `1px solid ${colors.border}` : "none",
        }}
      >
        <button onClick={() => setIsOpen(!isOpen)} className="w-full py-2 flex items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <span style={{ color: colors.text }}>▸</span>
            <span style={{ fontSize: fontSize.button, color: colors.textDark }}>{title}</span>
          </div>
          <svg
            className="w-4 h-4 shrink-0 transition-transform duration-200"
            style={{ color: colors.text, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          className="overflow-hidden transition-all duration-200 ease-out"
          style={{
            maxHeight: isOpen ? "500px" : "0px",
            opacity: isOpen ? 1 : 0,
          }}
        >
          <div className="pb-2 pl-5 leading-relaxed" style={{ fontSize: fontSize.button, color: colors.text }}>
            {formatText(content.trim(), onOpenChat)}
          </div>
        </div>
      </div>
    );
  },
);

// ===========================================
// MAIN COMPONENT
// ===========================================
interface ElterngeldGuideProps {
  onOpenChat?: (prefillQuestion?: string) => void;
}

const ElterngeldGuide: React.FC<ElterngeldGuideProps> = ({ onOpenChat }) => {
  const { user, signInWithGoogle, signInWithEmail } = useAuth();
  const { setCanGoBack, setGoBackHandler, setRestartHandler, setOpenChatHandler } = useGuide();
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [step, setStep] = useState(0);
  const [stepHistory, setStepHistory] = useState<
    Array<{ step: number; messagesLength: number; savedShowInput: FlowMessage | null }>
  >([]);
  const [messages, setMessages] = useState<FlowMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState(-1);
  const streamingRef = useRef<{ words: string[]; index: number; messageIndex: number; callback: (() => void) | null }>({
    words: [],
    index: 0,
    messageIndex: -1,
    callback: null,
  });
  const [showInput, setShowInput] = useState<FlowMessage | null>(null);

  const [showPlannerSaveInput, setShowPlannerSaveInput] = useState(false);
  const [ctaStep, setCtaStep] = useState(1);
  const [selectedState, setSelectedState] = useState("");
  const [plannerFullscreen, setPlannerFullscreen] = useState(false);

  const [currentReview, setCurrentReview] = useState(0);
  const [reviewFade, setReviewFade] = useState(true);

  useEffect(() => {
    if (showInput) return;
    const reviews = 4;
    const interval = setInterval(() => {
      setReviewFade(false);
      setTimeout(() => {
        setCurrentReview((prev) => (prev + 1) % reviews);
        setReviewFade(true);
      }, 300);
    }, 8000);
    return () => clearInterval(interval);
  }, [showInput]);

  const [sliderValue, setSliderValue] = useState(0);
  const [partnerSliderValue, setPartnerSliderValue] = useState(0);
  const [data, setData] = useState<UserData>({});

  const [workPartTime, setWorkPartTime] = useState(false);
  const [partTimeIncome, setPartTimeIncome] = useState(0);
  const [partnerPartTimeIncome, setPartnerPartTimeIncome] = useState(0);
  const [plannerMonths, setPlannerMonths] = useState(32);
  const [plannerData, setPlannerData] = useState<PlannerMonth[]>(
    Array.from({ length: 32 }, () => ({
      you: "none",
      partner: "none",
    })),
  );
  const [openTooltips, setOpenTooltips] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [isRestoredSession, setIsRestoredSession] = useState(false);
  const [showPdfFlow, setShowPdfFlow] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hideScrollbar, setHideScrollbar] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const plannerGridRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const [lastUserMessageIndex, setLastUserMessageIndex] = useState<number>(-1);
  const [shouldScrollToUser, setShouldScrollToUser] = useState(false);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const spacerObserverRef = useRef<MutationObserver | null>(null);
  const isStreamingRef = useRef(false);

  const messagesLengthRef = useRef(0);
  useEffect(() => {
    messagesLengthRef.current = messages.length;
  }, [messages.length]);

  const PENDING_SESSION_STORAGE_KEY = "elterngeld_pending_session";

  const saveSessionToLocalStorage = useCallback(() => {
    const pendingSession = {
      step,
      messages,
      stepHistory,
      showInput,
      isPaused,
      data,
      sliderValue,
      partnerSliderValue,
      plannerData,
      plannerMonths,
      selectedState,
      workPartTime,
      partTimeIncome,
      partnerPartTimeIncome,
      lastUserMessageIndex,
      ctaStep,
      timestamp: Date.now(),
    };
    localStorage.setItem(PENDING_SESSION_STORAGE_KEY, JSON.stringify(pendingSession));
  }, [
    step,
    messages,
    stepHistory,
    showInput,
    isPaused,
    data,
    sliderValue,
    partnerSliderValue,
    plannerData,
    plannerMonths,
    selectedState,
    workPartTime,
    partTimeIncome,
    partnerPartTimeIncome,
    lastUserMessageIndex,
    ctaStep,
  ]);

  const loadAndSavePendingSession = useCallback(async (userId: string) => {
    const stored = localStorage.getItem(PENDING_SESSION_STORAGE_KEY);
    if (!stored) return null;

    try {
      const pendingSession = JSON.parse(stored);

      if (Date.now() - pendingSession.timestamp > 86400000) {
        localStorage.removeItem(PENDING_SESSION_STORAGE_KEY);
        return null;
      }

      await supabase.from("user_plans").upsert(
        {
          user_id: userId,
          plan_data: pendingSession.plannerData,
          user_data: {
            ...pendingSession.data,
            income: pendingSession.sliderValue,
            partnerIncome: pendingSession.partnerSliderValue,
          },
          selected_state: pendingSession.selectedState,
        },
        { onConflict: "user_id" },
      );

      localStorage.removeItem(PENDING_SESSION_STORAGE_KEY);
      return pendingSession;
    } catch (err) {
      console.error("Error loading pending session:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    loadAndSavePendingSession(user.id).then((pendingSession) => {
      if (pendingSession) {
        if (pendingSession.step !== undefined) setStep(pendingSession.step);
        if (pendingSession.messages) {
          setMessages(pendingSession.messages);
          messagesLengthRef.current = pendingSession.messages.length;
        }
        if (pendingSession.stepHistory) setStepHistory(pendingSession.stepHistory);
        if (pendingSession.showInput !== undefined) setShowInput(pendingSession.showInput);
        if (pendingSession.isPaused !== undefined) setIsPaused(pendingSession.isPaused);
        if (pendingSession.data) setData(pendingSession.data);
        if (pendingSession.sliderValue !== undefined) setSliderValue(pendingSession.sliderValue);
        if (pendingSession.partnerSliderValue !== undefined) setPartnerSliderValue(pendingSession.partnerSliderValue);
        if (pendingSession.plannerData) setPlannerData(pendingSession.plannerData);
        if (pendingSession.plannerMonths !== undefined) setPlannerMonths(pendingSession.plannerMonths);
        if (pendingSession.selectedState) setSelectedState(pendingSession.selectedState);
        if (pendingSession.workPartTime !== undefined) setWorkPartTime(pendingSession.workPartTime);
        if (pendingSession.partTimeIncome !== undefined) setPartTimeIncome(pendingSession.partTimeIncome);
        if (pendingSession.partnerPartTimeIncome !== undefined)
          setPartnerPartTimeIncome(pendingSession.partnerPartTimeIncome);
        if (pendingSession.lastUserMessageIndex !== undefined)
          setLastUserMessageIndex(pendingSession.lastUserMessageIndex);
        if (pendingSession.ctaStep !== undefined) setCtaStep(pendingSession.ctaStep);
        if (pendingSession.messages && pendingSession.messages.length > 0) setShowStartScreen(false);
        setIsRestoredSession(true);
        setShowPlannerSaveInput(false);
      }
    });
  }, [user, loadAndSavePendingSession]);

  const goBack = useCallback(() => {
    if (stepHistory.length === 0) return;

    const lastEntry = stepHistory[stepHistory.length - 1];
    setStepHistory((prev) => prev.slice(0, -1));
    setMessages((prev) => prev.slice(0, lastEntry.messagesLength));
    messagesLengthRef.current = lastEntry.messagesLength;
    setStep(lastEntry.step);
    setShowInput(lastEntry.savedShowInput);
    setIsPaused(false);
  }, [stepHistory]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const streamMessage = (msg: FlowMessage, onComplete?: () => void) => {
    if (!msg.content) {
      setMessages((prev) => [...prev, msg]);
      messagesLengthRef.current++;
      onComplete?.();
      return;
    }

    const tokens: string[] = [];
    let remaining = msg.content;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/^\*\*[^*]+\*\*/);
      if (boldMatch) {
        tokens.push(boldMatch[0]);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      const linkMatch = remaining.match(/^\[\[[^\]]+\]\]/);
      if (linkMatch) {
        tokens.push(linkMatch[0]);
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      const wordMatch = remaining.match(/^(\S+|\s+)/);
      if (wordMatch) {
        tokens.push(wordMatch[0]);
        remaining = remaining.slice(wordMatch[0].length);
      } else {
        tokens.push(remaining[0]);
        remaining = remaining.slice(1);
      }
    }

    const newIndex = messagesLengthRef.current;
    setMessages((prev) => [...prev, { ...msg, content: "" }]);
    messagesLengthRef.current = newIndex + 1;

    streamingRef.current = { words: tokens, index: 0, messageIndex: newIndex, callback: onComplete || null };
    setStreamingMessageIndex(newIndex);
    setIsStreaming(true);
  };

  useEffect(() => {
    if (!isStreaming) return;

    const { words: tokens, index, messageIndex, callback } = streamingRef.current;

    if (index >= tokens.length) {
      setIsStreaming(false);
      setStreamingMessageIndex(-1);
      callback?.();
      return;
    }

    const token = tokens[index];
    const isSpace = token.trim() === "";
    const isMarkdown = token.startsWith("**") || token.startsWith("[[");
    const delay = isSpace ? 5 : isMarkdown ? 30 : 20 + Math.random() * 15;

    const timer = setTimeout(() => {
      streamingRef.current.index++;
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[messageIndex]) {
          updated[messageIndex] = {
            ...updated[messageIndex],
            content: (updated[messageIndex].content || "") + token,
          };
        }
        return updated;
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [isStreaming, messages]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const container = scrollRef.current;

    if (lastMessageRef.current) {
      const containerRect = container.getBoundingClientRect();
      const msgRect = lastMessageRef.current.getBoundingClientRect();
      const isLastMessageVisible = msgRect.top < containerRect.bottom;
      setShowScrollButton(!isLastMessageVisible);
    } else {
      setShowScrollButton(false);
    }
  }, []);

  const spacerHeight = lastUserMessageIndex >= 0 ? window.innerHeight : 0;

  const scrollToBottom = () => {
    spacerObserverRef.current?.disconnect();
    spacerObserverRef.current = null;
    setHideScrollbar(true);

    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      setShowScrollButton(false);
      setTimeout(() => setHideScrollbar(false), 800);
    }
  };

  const handleRestart = useCallback(() => {
    setShowStartScreen(true);
    setStep(0);
    setMessages([]);
    messagesLengthRef.current = 0;
    setIsTyping(false);
    setIsStreaming(false);
    setStreamingMessageIndex(-1);
    setShowInput(null);
    setSliderValue(0);
    setPartnerSliderValue(0);
    setData({});
    setPlannerMonths(32);
    setPlannerData(
      Array.from({ length: 32 }, () => ({
        you: "none",
        partner: "none",
      })),
    );
    setIsPaused(false);
    setShowScrollButton(false);
    setLastUserMessageIndex(-1);
    setShouldScrollToUser(false);
    setDateValue(undefined);
    setWorkPartTime(false);
    setPartTimeIncome(0);
    setPartnerPartTimeIncome(0);
    spacerObserverRef.current?.disconnect();
    spacerObserverRef.current = null;
  }, []);

  // Register handlers with GuideContext for Sidebar access
  useEffect(() => {
    setGoBackHandler(goBack);
    setRestartHandler(handleRestart);
    setOpenChatHandler(onOpenChat || (() => {}));
  }, [goBack, handleRestart, onOpenChat, setGoBackHandler, setRestartHandler, setOpenChatHandler]);

  useEffect(() => {
    setCanGoBack(stepHistory.length > 0);
  }, [stepHistory.length, setCanGoBack]);

  // Save data to localStorage for PDF Flow integration
  const saveToPdfFlow = () => {
    try {
      localStorage.setItem("elterngeld_planner_data", JSON.stringify(plannerData));
      const userData = {
        dueDate: data.dueDate,
        multiples: data.multiples,
        premature: data.premature,
        applicationType: data.applicationType,
        employmentType: data.employmentType,
        income: sliderValue,
        partnerEmploymentType: data.partnerEmploymentType,
        partnerIncome: partnerSliderValue,
        siblings: data.siblings,
      };
      localStorage.setItem("elterngeld_guide_data", JSON.stringify(userData));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  };

  const jumpToPlanner = () => {
    setMessages([
      { type: "bot", content: "Now you can plan how to split your Elterngeld months." },
      { type: "component", component: "planner" },
    ]);
    messagesLengthRef.current = 2;
    setData({ applicationType: "couple", dueDate: "2025-06-15" });
    setSliderValue(3500);
    setPartnerSliderValue(2800);
    setPlannerMonths(32);
    setIsPaused(true);
    setShowInput({ type: "bot", pause: true, pauseLabel: "Continue to application →" });
    setStep(99);
  };

  const jumpToCta = () => {
    const presetData = Array(32)
      .fill(null)
      .map((_, i) => ({
        you: i < 12 ? "basis" : "none",
        partner: i >= 12 && i < 14 ? "basis" : "none",
      })) as typeof plannerData;
    setPlannerData(presetData);

    setMessages([
      {
        type: "bot",
        content:
          "The hardest part is done – you've figured out your Elterngeld strategy! Now just add your personal details and we'll generate your official application.",
      },
      { type: "component", component: "ctaCard" },
    ]);
    messagesLengthRef.current = 2;
    setData({ applicationType: "couple", dueDate: "2025-06-15" });
    setSliderValue(3500);
    setPartnerSliderValue(2800);
    setPlannerMonths(32);
    setIsPaused(false);
    setShowInput(null);
    setStep(99);
  };

  useEffect(() => {
    if (isStreaming) return;

    const timer = setTimeout(() => {
      handleScroll();
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isTyping, isStreaming]);

  useEffect(() => {
    return () => {
      spacerObserverRef.current?.disconnect();
    };
  }, []);

  const myCalc = calculateElterngeld(sliderValue, data, workPartTime ? partTimeIncome : 0);
  const partnerCalc = calculateElterngeld(partnerSliderValue, data, workPartTime ? partnerPartTimeIncome : 0);

  useEffect(() => {
    if (showInput) return;
    if (isPaused || step >= flow.length) return;

    const msg = flow[step];

    if (msg.type === "user") return;
    if (msg.type === "dynamic") {
      handleDynamic(msg.key || "");
      return;
    }

    if (msg.type === "end") {
      setShowInput({ type: "end" });
      return;
    }

    if (["bot", "category", "component"].includes(msg.type)) {
      setIsTyping(true);
      const delay = 300 + Math.random() * 200;

      const timer = setTimeout(() => {
        setIsTyping(false);

        streamMessage(msg, () => {
          if (msg.input) {
            setShowInput(msg);
          } else if (msg.pause) {
            setShowInput({ type: "component", component: "continue", pauseLabel: msg.pauseLabel });
            setIsPaused(true);
          } else {
            setStep((s) => s + 1);
          }
        });
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [step, isPaused]);

  const handleDynamic = (key: string) => {
    let response: FlowMessage | null = null;

    switch (key) {
      case "citizenshipResponse":
        if (data.citizenship === "eu") {
          response = { type: "bot", content: "Great! Let's check one more thing." };
        } else {
          streamMessage(
            {
              type: "bot",
              content: "What type of **residence permit** do you have?",
              isQuestion: true,
              subtext: "Select from common types or search for yours.",
            },
            () => {
              setShowInput({ type: "bot", input: "visa" as any, field: "visaType" });
            },
          );
          return;
        }
        break;

      case "incomeLimitResponse":
        if (data.incomeLimit === "over") {
          streamMessage(
            {
              type: "bot",
              content:
                "Unfortunately, households with taxable income above **€175,000** are not eligible for Elterngeld.",
              subtext: "This limit applies to your combined income from the last tax year before your child's birth.",
            },
            () => {
              setShowInput({ type: "component", component: "ineligible" });
            },
          );
          return;
        } else {
          response = { type: "bot", content: "Based on your answers, you **likely qualify** for Elterngeld!" };
        }
        break;

      case "dateResponse":
        response = null;
        break;

      case "prematureQuestion":
        const dueDate = data.dueDate ? new Date(data.dueDate) : null;
        const today = new Date();
        const isBorn = dueDate && dueDate < today;

        if (isBorn) {
          const prematureMsg = {
            type: "bot" as const,
            content: "Was your baby born **prematurely**?",
            isQuestion: true,
            subtext: "Premature births qualify for extra Elterngeld months.",
            input: "buttons" as const,
            field: "premature",
            options: [
              { value: "no", label: "No, born on time", icon: "check" },
              {
                value: "6weeks",
                label: "6+ weeks early",
                icon: "calendar",
                accent: "basis" as const,
                note: "+1 month",
              },
              {
                value: "8weeks",
                label: "8+ weeks early",
                icon: "calendar",
                accent: "basis" as const,
                note: "+2 months",
              },
              {
                value: "12weeks",
                label: "12+ weeks early",
                icon: "calendar",
                accent: "basis" as const,
                note: "+3 months",
              },
              {
                value: "16weeks",
                label: "16+ weeks early",
                icon: "calendar",
                accent: "basis" as const,
                note: "+4 months",
              },
            ] as ButtonOption[],
          };
          streamMessage(prematureMsg, () => {
            setShowInput(prematureMsg);
          });
          return;
        } else {
          let nextStep = step + 1;
          while (nextStep < flow.length && flow[nextStep].type === "user") {
            nextStep++;
          }
          setStep(nextStep);
          return;
        }

      case "incomeQuestion":
        const incomeSubtext = `[info:Employed vs. self-employed?]If you are **employed**, the **12 months before birth** count. If you are **self-employed**, it's your **last tax year**.

[info:Had Elternzeit or pregnancy illness?]You can skip those months and use earlier ones instead. This often results in a **higher Elterngeld** amount.

[info:Just moved to Germany?]Only income earned in **Germany, EU, EEA, or Switzerland** counts. Income from USA, UK, or other non-EU countries is **not included** in the calculation.`;
        streamMessage(
          {
            type: "bot",
            content: "What's your approximate **monthly net income**?",
            isQuestion: true,
            subtext: incomeSubtext,
          },
          () => {
            setShowInput({ type: "bot", input: "slider", field: "income", person: "you" });
          },
        );
        return;

      case "partnerQuestion":
        if (data.applicationType === "couple") {
          streamMessage(
            {
              type: "bot",
              content: "Partner's **monthly net income**?",
              isQuestion: true,
              subtext: `[info:Partner lives abroad?]To receive Elterngeld, your partner must have **residence in Germany** and live with the child.

**Exceptions:**
• Partner lives in EU/EEA/Switzerland but **works in Germany** → Eligible as cross-border commuter
• Partner is **posted abroad** by a German employer → May remain eligible

If your partner can't claim, you may qualify as a **single parent** and use all 14 months yourself.`,
            },
            () => {
              setShowInput({ type: "bot", input: "slider", field: "partnerIncome", person: "partner" });
            },
          );
          return;
        } else {
          let nextStep = step + 1;
          while (nextStep < flow.length && flow[nextStep].type === "user") {
            nextStep++;
          }
          setStep(nextStep);
          return;
        }

      case "calculationIntro":
        response = { type: "bot", content: "Here's your estimated Elterngeld based on your income:" };
        break;

      case "plannerIntro":
        const plannerText =
          data.applicationType === "couple"
            ? "Now let's plan when each of you takes your months."
            : "Now let's plan your months.";
        const plannerMsg = { type: "bot" as const, content: plannerText, pause: true, pauseLabel: "Start planning →" };
        streamMessage(plannerMsg, () => {
          setShowInput({ type: "component", component: "continue", pauseLabel: plannerMsg.pauseLabel });
          setIsPaused(true);
        });
        return;
    }

    if (response) {
      streamMessage(response, () => setStep((s) => s + 1));
    } else {
      setStep((s) => s + 1);
    }
  };

  useEffect(() => {
    if (!shouldScrollToUser || lastUserMessageIndex < 0) return;

    setHideScrollbar(true);

    requestAnimationFrame(() => {
      const userEl = lastUserMessageRef.current;
      const container = scrollRef.current;

      if (userEl && container) {
        let offsetTop = 0;
        let el: HTMLElement | null = userEl;
        while (el && el !== container) {
          offsetTop += el.offsetTop;
          el = el.offsetParent as HTMLElement;
        }

        container.scrollTo({
          top: offsetTop - 70,
          behavior: "smooth",
        });
        setShouldScrollToUser(false);

        setTimeout(() => setHideScrollbar(false), 800);
      }
    });
  }, [shouldScrollToUser, lastUserMessageIndex, messages.length]);

  const handleInput = (value: string | number, displayValue?: string) => {
    setStepHistory((prev) => [...prev, { step, messagesLength: messages.length, savedShowInput: showInput }]);

    const currentInput = showInput;
    setShowInput(null);

    const field = currentInput?.field;

    if (displayValue) {
      const newIndex = messagesLengthRef.current;
      setMessages((prev) => [...prev, { type: "user" as const, content: displayValue }]);
      messagesLengthRef.current = newIndex + 1;
      setLastUserMessageIndex(newIndex);
      setHideScrollbar(true);
      setShouldScrollToUser(true);
    }

    if (field) {
      setData((prev) => {
        const newData = { ...prev, [field]: value };

        if (field === "visaType") {
          setTimeout(() => handleDynamicWithData("visaResponse", newData), 400);
        } else if (field === "isEmployed" || field === "humanitarianCondition") {
          setTimeout(() => handleDynamicWithData("conditionalVisaResponse", newData), 400);
        } else if (field === "ineligibleChoice" || field === "continueAfterStelle") {
          setTimeout(() => handleDynamicWithData("ineligibleChoiceResponse", newData), 400);
        }

        return newData;
      });

      if (
        ["visaType", "isEmployed", "humanitarianCondition", "ineligibleChoice", "continueAfterStelle"].includes(field)
      ) {
        return;
      }
    }

    let nextStep = step + 1;
    while (nextStep < flow.length && flow[nextStep].type === "user") {
      nextStep++;
    }
    setStep(nextStep);
  };

  const handleDynamicWithData = (key: string, currentData: UserData) => {
    let response: FlowMessage | null = null;

    const showIneligibleOptions = (message: string) => {
      streamMessage({ type: "bot", content: message }, () => {
        setTimeout(() => {
          streamMessage({ type: "bot", content: "Would you like to:", isQuestion: true }, () => {
            setShowInput({
              type: "bot",
              input: "buttons",
              field: "ineligibleChoice",
              options: [
                { value: "continue", label: "Continue anyway", sub: "For planning purposes", icon: "check" },
                { value: "find_stelle", label: "Find my Elterngeldstelle", sub: "Get individual advice", icon: "home" },
              ],
            });
          });
        }, 300);
      });
    };

    switch (key) {
      case "visaResponse":
        const visa = visaTypes.find((v) => v.id === currentData.visaType);
        if (!visa) {
          showIneligibleOptions("Please check with your local **Elterngeldstelle** to confirm your eligibility.");
          return;
        } else if (visa.status === "eligible") {
          response = { type: "bot", content: "Based on your visa type, you **likely qualify** for Elterngeld!" };
        } else if (visa.status === "not_eligible") {
          showIneligibleOptions("Unfortunately, this visa type does not qualify for Elterngeld.");
          return;
        } else if (visa.status === "conditional") {
          if (visa.id === "other") {
            showIneligibleOptions(
              "Please check with your local **Elterngeldstelle** to confirm your eligibility based on your specific visa type.",
            );
            return;
          } else if (["student", "qualification", "job_seeker"].includes(visa.id)) {
            streamMessage(
              {
                type: "bot",
                content: "Are you currently **employed** in Germany?",
                isQuestion: true,
                subtext:
                  "With your visa type, you're only eligible if you're working, in Elternzeit, or receiving unemployment benefits (ALG).",
              },
              () => {
                setShowInput({
                  type: "bot",
                  input: "buttons",
                  field: "isEmployed",
                  options: [
                    { value: "employed", label: "Yes, I'm employed", icon: "briefcase" },
                    { value: "elternzeit", label: "I'm in Elternzeit", icon: "baby" },
                    { value: "alg", label: "I receive ALG (unemployment)", icon: "home" },
                    { value: "no", label: "No, none of these", icon: "x" },
                  ],
                });
              },
            );
            return;
          } else if (["humanitarian_war", "humanitarian_hardship", "humanitarian_protection"].includes(visa.id)) {
            streamMessage(
              {
                type: "bot",
                content: "Which applies to you?",
                isQuestion: true,
                subtext:
                  "With your visa type, you're eligible if you're employed OR have been in Germany for 15+ months.",
              },
              () => {
                setShowInput({
                  type: "bot",
                  input: "buttons",
                  field: "humanitarianCondition",
                  options: [
                    { value: "employed", label: "I'm currently employed", icon: "briefcase" },
                    { value: "15months", label: "I've been in Germany 15+ months", icon: "home" },
                    { value: "neither", label: "Neither", icon: "x" },
                  ],
                });
              },
            );
            return;
          }
        }
        break;

      case "conditionalVisaResponse":
        if (["student", "qualification", "job_seeker"].includes(currentData.visaType || "")) {
          if (currentData.isEmployed === "no") {
            showIneligibleOptions(
              "Unfortunately, with your visa type you need to be employed, in Elternzeit, or receiving ALG to be eligible.",
            );
            return;
          } else if (currentData.isEmployed === "employed") {
            response = { type: "bot", content: "Since you're employed, you **likely qualify** for Elterngeld!" };
          } else if (currentData.isEmployed === "elternzeit") {
            response = { type: "bot", content: "Since you're in Elternzeit, you **likely qualify** for Elterngeld!" };
          } else {
            response = { type: "bot", content: "Since you're receiving ALG, you **likely qualify** for Elterngeld!" };
          }
        } else if (
          ["humanitarian_war", "humanitarian_hardship", "humanitarian_protection"].includes(currentData.visaType || "")
        ) {
          if (currentData.humanitarianCondition === "neither") {
            showIneligibleOptions(
              "Unfortunately, with your visa type you'll need to either be employed or have been in Germany for **15+ months** to be eligible.",
            );
            return;
          } else if (currentData.humanitarianCondition === "employed") {
            response = { type: "bot", content: "Since you're employed, you **likely qualify** for Elterngeld!" };
          } else {
            response = {
              type: "bot",
              content: "Since you've been in Germany 15+ months, you **likely qualify** for Elterngeld!",
            };
          }
        }
        break;

      case "ineligibleChoiceResponse":
        if (currentData.ineligibleChoice === "continue" || currentData.continueAfterStelle === "yes") {
          response = {
            type: "bot",
            content:
              "Alright, let's continue – you can still use this tool to **plan** and see what you would receive.",
          };
        } else if (currentData.ineligibleChoice === "find_stelle") {
          window.open("https://familienportal.de/dynamic/action/familienportal/125008/suche", "_blank");
          streamMessage(
            {
              type: "bot",
              content:
                "I've opened the **Elterngeldstelle finder** for you. They can give you personalized advice on your specific situation.",
            },
            () => {
              setTimeout(() => {
                streamMessage(
                  { type: "bot", content: "Want to continue with the planning tool anyway?", isQuestion: true },
                  () => {
                    setShowInput({
                      type: "bot",
                      input: "buttons",
                      field: "continueAfterStelle",
                      options: [
                        { value: "yes", label: "Yes, continue planning", icon: "check" },
                        { value: "no", label: "No, I'll stop here", icon: "x" },
                      ],
                    });
                  },
                );
              }, 300);
            },
          );
          return;
        } else if (currentData.continueAfterStelle === "no") {
          streamMessage(
            { type: "bot", content: "No problem! Feel free to come back anytime. Good luck with your application!" },
            () => {
              setShowInput({ type: "end" } as any);
            },
          );
          return;
        }
        break;
    }

    if (response) {
      streamMessage(response, () => setStep((s) => s + 1));
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleContinue = (label?: string) => {
    if (label) {
      const newIndex = messagesLengthRef.current;
      setMessages((prev) => [...prev, { type: "user" as const, content: label }]);
      messagesLengthRef.current = newIndex + 1;
      setLastUserMessageIndex(newIndex);
      setHideScrollbar(true);
      setShouldScrollToUser(true);
    }

    if (isRestoredSession) {
      setIsRestoredSession(false);
      setIsPaused(false);
      setShowInput(null);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            type: "bot" as const,
            content:
              "Ready to apply? We can pre-fill your official application and guide you through the remaining steps.",
          },
          { type: "component" as const, component: "ctaCard" },
        ]);
        messagesLengthRef.current += 2;
        setShowInput({ type: "end" });
      }, 300);
      return;
    }

    setIsPaused(false);
    setShowInput(null);
    setStep((s) => s + 1);
  };

  // ===========================================
  // SUB-COMPONENTS
  // ===========================================

  const categoryIcons: Record<string, React.ReactNode> = {
    Residence: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  };

  const CategoryHeader = React.memo(({ label }: { label: string }) => (
    <div className="pt-6 pb-2">
      <span
        className="font-bold uppercase flex items-center gap-2"
        style={{ color: colors.text, letterSpacing: "0.12em", fontSize: fontSize.tiny }}
      >
        {categoryIcons[label]}
        {label}
      </span>
    </div>
  ));

  // Calculation Card
  const calculationCardContent = React.useMemo(() => {
    const isCouple = data.applicationType === "couple";

    const youWithoutWork = {
      basis: myCalc.basisWithoutWork,
      plus: Math.round(myCalc.basisWithoutWork / 2),
    };
    const partnerWithoutWork = {
      basis: partnerCalc.basisWithoutWork,
      plus: Math.round(partnerCalc.basisWithoutWork / 2),
    };

    const renderAmount = (current: number, original: number, size: string = fontSize.small, bold: boolean = false) => {
      const hasPartTime = workPartTime && current !== original;
      const fontWeight = bold ? 600 : 400;
      if (hasPartTime) {
        return (
          <span style={{ color: colors.textDark, fontSize: size, fontWeight }}>
            <span style={{ textDecoration: "line-through", opacity: 0.5, marginRight: "4px", fontSize: fontSize.tiny }}>
              €{original.toLocaleString("de-DE")}
            </span>
            €{current.toLocaleString("de-DE")}
          </span>
        );
      }
      return (
        <span style={{ color: colors.textDark, fontSize: size, fontWeight }}>€{current.toLocaleString("de-DE")}</span>
      );
    };

    const cards = [
      {
        label: "BASIS",
        you: myCalc.basis,
        youOrig: youWithoutWork.basis,
        partner: partnerCalc.basis,
        partnerOrig: partnerWithoutWork.basis,
        maxMonths: isCouple ? 14 : 12,
        bg: "#FF8752",
        info: "65-67% of net income. Max 12 months per parent, 14 total.",
      },
      {
        label: "PLUS",
        you: myCalc.plus,
        youOrig: youWithoutWork.plus,
        partner: partnerCalc.plus,
        partnerOrig: partnerWithoutWork.plus,
        maxMonths: isCouple ? 28 : 24,
        bg: "#FFE44C",
        info: "Half the amount, twice as long. 1 Basis = 2 Plus months.",
      },
    ];

    const getMaxTotal = (item: (typeof cards)[0]) => {
      if (!isCouple) {
        return item.you * item.maxMonths;
      }
      const maxPerParent = item.label === "BASIS" ? 12 : 24;
      const minPartnerMonths = item.label === "BASIS" ? 2 : 4;
      const higherAmount = Math.max(item.you, item.partner);
      const lowerAmount = Math.min(item.you, item.partner);
      return higherAmount * maxPerParent + lowerAmount * minPartnerMonths;
    };

    const getOriginalTotal = (item: (typeof cards)[0]) => {
      if (!isCouple) {
        return item.youOrig * item.maxMonths;
      }
      const maxPerParent = item.label === "BASIS" ? 12 : 24;
      const minPartnerMonths = item.label === "BASIS" ? 2 : 4;
      const higherAmount = Math.max(item.youOrig, item.partnerOrig);
      const lowerAmount = Math.min(item.youOrig, item.partnerOrig);
      return higherAmount * maxPerParent + lowerAmount * minPartnerMonths;
    };

    const bonusPerMonth = isCouple ? myCalc.bonus + partnerCalc.bonus : myCalc.bonus;

    return (
      <div className="py-3">
        <div className="flex gap-3">
          {cards.map((item, i) => {
            const maxTotal = getMaxTotal(item);
            const originalTotal = getOriginalTotal(item);
            const totalChanged = workPartTime && maxTotal !== originalTotal;

            return (
              <div
                key={i}
                className="flex-1"
                style={{
                  backgroundColor: item.bg,
                  borderRadius: "16px",
                  padding: "20px",
                }}
              >
                <div style={{ marginBottom: "16px" }}>
                  <span
                    style={{
                      color: "#000",
                      fontSize: "18px",
                      fontWeight: 700,
                      fontFamily: fonts.headline,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {item.label}
                  </span>
                  <div
                    style={{
                      backgroundColor: "rgba(255,255,255,0.5)",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      marginTop: "10px",
                      fontSize: "12px",
                      lineHeight: 1.4,
                      color: "rgba(0,0,0,0.75)",
                    }}
                  >
                    {item.info}
                  </div>
                </div>

                {isCouple ? (
                  <div>
                    <div className="flex items-center justify-between" style={{ padding: "6px 0" }}>
                      <span style={{ color: "rgba(0,0,0,0.7)", fontSize: "14px" }}>You</span>
                      <span style={{ color: "#000", fontSize: "14px", fontWeight: 500 }}>
                        €{item.you.toLocaleString("de-DE")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between" style={{ padding: "6px 0" }}>
                      <span style={{ color: "rgba(0,0,0,0.7)", fontSize: "14px" }}>Partner</span>
                      <span style={{ color: "#000", fontSize: "14px", fontWeight: 500 }}>
                        €{item.partner.toLocaleString("de-DE")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between" style={{ padding: "6px 0" }}>
                    <span style={{ color: "rgba(0,0,0,0.7)", fontSize: "14px" }}>You</span>
                    <span style={{ color: "#000", fontSize: "14px", fontWeight: 500 }}>
                      €{item.you.toLocaleString("de-DE")}
                    </span>
                  </div>
                )}

                <div
                  className="flex items-center justify-between"
                  style={{
                    borderTop: "1px solid rgba(0,0,0,0.15)",
                    marginTop: "8px",
                    paddingTop: "12px",
                  }}
                >
                  <span style={{ color: "rgba(0,0,0,0.7)", fontSize: "14px" }}>{item.maxMonths} months</span>
                  <span
                    style={{
                      color: "#000",
                      fontSize: "20px",
                      fontWeight: 700,
                      fontFamily: fonts.headline,
                    }}
                  >
                    €{maxTotal.toLocaleString("de-DE")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            backgroundColor: "#F0EEE6",
            borderRadius: "12px",
            marginTop: "12px",
            marginBottom: "12px",
          }}
        >
          <button
            onClick={() => setWorkPartTime(!workPartTime)}
            className="w-full flex items-center justify-between cursor-pointer"
            style={{
              padding: "14px 16px",
              background: "none",
              border: "none",
            }}
          >
            <div className="flex items-center" style={{ gap: "10px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={1.5}>
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
              <span style={{ color: "#000", fontSize: "15px", fontWeight: 600 }}>Planning to work part-time?</span>
            </div>
            <div
              className="relative rounded-full transition-colors duration-200"
              style={{
                width: "44px",
                height: "24px",
                backgroundColor: workPartTime ? colors.basis : "#E7E5E4",
              }}
            >
              <span
                className="absolute rounded-full bg-white transition-transform duration-200"
                style={{
                  width: "20px",
                  height: "20px",
                  top: "2px",
                  left: "2px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  transform: workPartTime ? "translateX(20px)" : "translateX(0)",
                }}
              />
            </div>
          </button>

          {workPartTime && (
            <div style={{ padding: "0 16px 16px 16px" }}>
              <p style={{ color: "rgba(0,0,0,0.6)", fontSize: fontSize.tiny, marginBottom: "12px" }}>
                Your expected net income while on Elterngeld
              </p>
              <div className="flex items-center gap-6">
                <IncomeStepper value={partTimeIncome} label="You" onChange={setPartTimeIncome} />
                {isCouple && (
                  <IncomeStepper value={partnerPartTimeIncome} label="Partner" onChange={setPartnerPartTimeIncome} />
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className="flex items-center"
          style={{
            backgroundColor: "#D1B081",
            borderRadius: "12px",
            padding: "14px 16px",
            gap: "10px",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#000"
            strokeWidth={1.5}
            className="shrink-0"
          >
            <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.4-1.2 4.5-3 5.7V17a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-2.3C6.2 13.5 5 11.4 5 9a7 7 0 0 1 7-7z" />
          </svg>
          <p style={{ color: "#000", fontSize: "13px", lineHeight: 1.4 }}>
            <strong style={{ fontWeight: 600 }}>Partnership Bonus</strong>: +€{bonusPerMonth.toLocaleString("de-DE")}
            /month extra for 2-4 months
            {isCouple ? " if both work 24-32h/week" : " if you work 24-32h/week"}
          </p>
        </div>
      </div>
    );
  }, [myCalc, partnerCalc, data.applicationType, workPartTime, partTimeIncome, partnerPartTimeIncome]);

  const CalculationCard = () => {
    return <div className="py-3">{calculationCardContent}</div>;
  };

  // Intro Checklist
  const introChecklistContent = React.useMemo(
    () => (
      <div className="pt-2 pb-6">
        <div
          className="p-5 space-y-3"
          style={{
            backgroundColor: colors.white,
            boxShadow: ui.cardShadow,
            borderRadius: ui.cardRadius,
            border: `1px solid ${colors.border}`,
          }}
        >
          {[
            { text: "Your", bold: "monthly Elterngeld amount", after: "based on your income" },
            { text: "The", bold: "smartest way to split months", after: "with your partner" },
            { text: "What you need to", bold: "complete your application" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <svg
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: colors.orange }}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span style={{ fontSize: fontSize.subtext, lineHeight: 1.4, color: colors.text }}>
                {item.text}{" "}
                <span className="font-medium" style={{ color: colors.textDark }}>
                  {item.bold}
                </span>
                {item.after && ` ${item.after}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    [],
  );

  const IntroChecklist = () => introChecklistContent;

  const checkmarksContent = React.useMemo(
    () => (
      <div className="py-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {["Eligibility", "Calculation", "Planning"].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span style={{ color: colors.text, fontSize: fontSize.subtext }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    [],
  );

  const CheckmarksComponent = () => checkmarksContent;

  // CTA Card
  const CtaCard = () => {
    const SUPPORTED_STATES = [
      "Berlin",
      "Brandenburg",
      "Bremen",
      "Hamburg",
      "Niedersachsen",
      "Rheinland-Pfalz",
      "Saarland",
      "Sachsen",
      "Sachsen-Anhalt",
      "Schleswig-Holstein",
      "Thüringen",
    ];
    const WAITLIST_STATES = ["Baden-Württemberg", "Bayern", "Hessen", "Mecklenburg-Vorpommern", "Nordrhein-Westfalen"];
    const ALL_STATES = [...SUPPORTED_STATES, ...WAITLIST_STATES].sort();

    const [waitlistEmail, setWaitlistEmail] = React.useState("");
    const [waitlistConsent, setWaitlistConsent] = React.useState(false);
    const [waitlistSubmitting, setWaitlistSubmitting] = React.useState(false);
    const [waitlistSubmitted, setWaitlistSubmitted] = React.useState(false);
    const [waitlistError, setWaitlistError] = React.useState("");

    const isSupported = SUPPORTED_STATES.includes(selectedState);

    const reviews = [
      { text: "Saved me hours of confusion!", name: "Sarah M.", context: "US Expat in Berlin" },
      { text: "Finally understood my Elterngeld options", name: "Marco T.", context: "Italian in Munich" },
      { text: "The PDF was perfectly filled out", name: "Anna K.", context: "British in Hamburg" },
      { text: "Worth every cent!", name: "David L.", context: "American in Frankfurt" },
    ];

    const handleContinue = () => {
      if (selectedState) {
        setCtaStep(2);
      }
    };

    const handleWaitlistSubmit = async () => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(waitlistEmail)) {
        setWaitlistError("Please enter a valid email");
        return;
      }
      setWaitlistSubmitting(true);
      const { error } = await signInWithEmail(waitlistEmail, waitlistConsent);
      if (error) {
        setWaitlistError(error.message);
        setWaitlistSubmitting(false);
      } else {
        setWaitlistSubmitted(true);
        setWaitlistSubmitting(false);
      }
    };

    // ===== STEP 1: Select State =====
    if (ctaStep === 1) {
      return (
        <div className="py-4">
          <div
            style={{
              backgroundColor: colors.yellow,
              borderRadius: ui.cardRadius,
            }}
          >
            <div className="p-6">
              <div
                className="w-12 h-12 mb-4 flex items-center justify-center"
                style={{ backgroundColor: "#000", borderRadius: 12 }}
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
              </div>

              <p
                className="font-semibold mb-1"
                style={{ fontSize: "18px", fontFamily: fonts.headline, color: colors.textDark }}
              >
                Get your official application
              </p>
              <p className="mb-5" style={{ fontSize: fontSize.button, color: "rgba(0,0,0,0.7)", lineHeight: 1.4 }}>
                Pre-filled PDF with your details. Just print, sign, and submit.
              </p>

              <div className="mb-4">
                <label
                  className="font-medium mb-1.5 block"
                  style={{ fontSize: fontSize.small, color: colors.textDark }}
                >
                  Select your state
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full outline-none cursor-pointer"
                    style={{
                      backgroundColor: colors.white,
                      color: selectedState ? colors.textDark : colors.text,
                      border: "none",
                      borderRadius: ui.inputRadius,
                      fontSize: fontSize.subtext,
                      padding: "14px 48px 14px 16px",
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                    }}
                  >
                    <option value="">Choose Bundesland...</option>
                    {ALL_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  <svg
                    style={{
                      position: "absolute",
                      right: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#78716c"
                    strokeWidth={2}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!selectedState) {
                    alert("Please select your Bundesland first");
                    return;
                  }
                  handleContinue();
                }}
                className="w-full flex items-center justify-between"
                style={{
                  backgroundColor: "#000",
                  color: "#fff",
                  height: ui.buttonHeight,
                  borderRadius: ui.buttonRadius,
                  padding: "0 20px",
                  fontFamily: fonts.body,
                  fontSize: fontSize.button,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                }}
              >
                <span className="w-[18px]" />
                <span>{selectedState ? "Create my application" : "Choose a state"}</span>
                <span style={{ fontSize: "18px" }}>→</span>
              </button>
            </div>
          </div>

          <div
            className="mt-4 flex items-center justify-center gap-1.5 transition-opacity duration-300"
            style={{ opacity: reviewFade ? 1 : 0 }}
          >
            <div className="flex items-center shrink-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} style={{ fontSize: fontSize.tiny, color: colors.stars }}>
                  ★
                </span>
              ))}
            </div>
            <p style={{ fontSize: fontSize.small, color: colors.text }}>"{reviews[currentReview].text}"</p>
          </div>

          <button
            onClick={() => onOpenChat?.()}
            className="w-full mt-2"
            style={{ fontSize: fontSize.small, color: colors.text }}
          >
            Have a question? <span style={{ textDecoration: "underline" }}>Ask here</span>
          </button>
        </div>
      );
    }

    // ===== STEP 2: Supported State =====
    if (ctaStep === 2 && isSupported) {
      return (
        <div className="py-4">
          <div
            style={{
              backgroundColor: colors.yellow,
              borderRadius: ui.cardRadius,
            }}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 flex items-center justify-center"
                  style={{ backgroundColor: "#000", borderRadius: 12 }}
                >
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                  </svg>
                </div>
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(255,255,255,0.5)" }}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    style={{ color: colors.success }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium" style={{ fontSize: fontSize.tiny, color: colors.textDark }}>
                    {selectedState}
                  </span>
                </div>
              </div>

              <p
                className="font-semibold mb-1"
                style={{ fontSize: "18px", fontFamily: fonts.headline, color: colors.textDark }}
              >
                Get your official application
              </p>
              <p className="mb-4" style={{ fontSize: fontSize.button, color: "rgba(0,0,0,0.7)", lineHeight: 1.4 }}>
                We pre-fill your details and generate the official 23-page PDF.
              </p>

              <div className="space-y-2 mb-5">
                {[
                  "Official Elterngeld form (pre-filled)",
                  "Personalized document checklist",
                  "Instant PDF download",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 shrink-0"
                      style={{ color: colors.textDark }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span style={{ fontSize: fontSize.button, color: colors.textDark }}>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="font-bold" style={{ fontSize: "24px", color: colors.textDark }}>
                  €39
                </span>
                <span className="line-through" style={{ fontSize: fontSize.button, color: "rgba(0,0,0,0.5)" }}>
                  €49
                </span>
                <span style={{ fontSize: fontSize.small, color: "rgba(0,0,0,0.7)" }}>one-time</span>
              </div>

              <button
                onClick={() => {
                  saveToPdfFlow();
                  setShowPdfFlow(true);
                }}
                className="w-full flex items-center justify-between"
                style={{
                  backgroundColor: colors.buttonDark,
                  color: colors.white,
                  height: ui.buttonHeight,
                  borderRadius: ui.buttonRadius,
                  padding: "0 20px",
                  fontFamily: fonts.body,
                  fontSize: fontSize.button,
                  fontWeight: 600,
                }}
              >
                <span className="w-[18px]" />
                <span>Continue to application</span>
                <span style={{ fontSize: "18px" }}>→</span>
              </button>

              <button
                onClick={() => setCtaStep(1)}
                className="w-full mt-3 flex items-center justify-center gap-1"
                style={{ fontSize: "11px", color: "rgba(0,0,0,0.6)" }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Change state
              </button>
            </div>
          </div>

          <div
            className="mt-4 flex items-center justify-center gap-1.5 transition-opacity duration-300"
            style={{ opacity: reviewFade ? 1 : 0 }}
          >
            <div className="flex items-center shrink-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} style={{ fontSize: fontSize.tiny, color: colors.stars }}>
                  ★
                </span>
              ))}
            </div>
            <p style={{ fontSize: fontSize.small, color: colors.text }}>"{reviews[currentReview].text}"</p>
          </div>

          <button
            onClick={() => onOpenChat?.()}
            className="w-full mt-2"
            style={{ fontSize: fontSize.small, color: colors.text }}
          >
            Have a question? <span style={{ textDecoration: "underline" }}>Ask here</span>
          </button>
        </div>
      );
    }

    // ===== STEP 2: Waitlist State =====
    if (ctaStep === 2 && !isSupported) {
      return (
        <div className="py-4">
          <div
            style={{
              backgroundColor: colors.yellow,
              borderRadius: ui.cardRadius,
            }}
          >
            <div className="p-6">
              <div
                className="w-12 h-12 mb-4 flex items-center justify-center"
                style={{ backgroundColor: "#000", borderRadius: 12 }}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <p
                className="font-semibold mb-1"
                style={{ fontSize: "18px", fontFamily: fonts.headline, color: colors.textDark }}
              >
                Coming soon to {selectedState}!
              </p>
              <p className="mb-5" style={{ fontSize: fontSize.button, color: "rgba(0,0,0,0.7)", lineHeight: 1.4 }}>
                {selectedState} uses a different form. We're working on it and will notify you when it's ready.
              </p>

              {waitlistSubmitted ? (
                <div className="flex items-center gap-2 py-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(26, 182, 137, 0.15)" }}
                  >
                    <svg
                      className="w-4 h-4"
                      style={{ color: colors.success }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span style={{ fontSize: fontSize.button, color: colors.textDark }}>
                    You're on the list! We'll email you when {selectedState} is ready.
                  </span>
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={(e) => {
                      setWaitlistEmail(e.target.value);
                      setWaitlistError("");
                    }}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 outline-none mb-3"
                    style={{
                      backgroundColor: colors.white,
                      color: colors.textDark,
                      border: waitlistError ? `1.5px solid ${colors.error}` : "none",
                      borderRadius: ui.inputRadius,
                      fontSize: fontSize.subtext,
                    }}
                  />
                  {waitlistError && (
                    <p className="mb-3 -mt-2" style={{ fontSize: fontSize.tiny, color: colors.error }}>
                      {waitlistError}
                    </p>
                  )}

                  <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waitlistConsent}
                      onChange={(e) => setWaitlistConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded"
                      style={{ accentColor: colors.buttonDark }}
                    />
                    <span className="leading-snug" style={{ fontSize: fontSize.tiny, color: "rgba(0,0,0,0.7)" }}>
                      Send me updates when {selectedState} is available and helpful tips about Elterngeld.
                    </span>
                  </label>

                  <button
                    onClick={handleWaitlistSubmit}
                    disabled={waitlistSubmitting}
                    className="w-full flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: colors.buttonDark,
                      color: colors.white,
                      height: ui.buttonHeight,
                      borderRadius: ui.buttonRadius,
                      fontFamily: fonts.body,
                      fontSize: fontSize.button,
                      fontWeight: 600,
                      opacity: waitlistSubmitting ? 0.7 : 1,
                    }}
                  >
                    {waitlistSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Joining...
                      </>
                    ) : (
                      "Notify me"
                    )}
                  </button>
                </>
              )}

              <button
                onClick={() => setCtaStep(1)}
                className="w-full mt-3 flex items-center justify-center gap-1"
                style={{ fontSize: "11px", color: "rgba(0,0,0,0.6)" }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Change state
              </button>
            </div>
          </div>

          <div
            className="mt-4 flex items-center justify-center gap-1.5 transition-opacity duration-300"
            style={{ opacity: reviewFade ? 1 : 0 }}
          >
            <div className="flex items-center shrink-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} style={{ fontSize: fontSize.tiny, color: colors.stars }}>
                  ★
                </span>
              ))}
            </div>
            <p style={{ fontSize: fontSize.small, color: colors.text }}>"{reviews[currentReview].text}"</p>
          </div>

          <button
            onClick={() => onOpenChat?.()}
            className="w-full mt-2"
            style={{ fontSize: fontSize.small, color: colors.text }}
          >
            Have a question? <span style={{ textDecoration: "underline" }}>Ask here</span>
          </button>
        </div>
      );
    }

    return null;
  };

  // Summary Box
  const SummaryBox = () => {
    const visibleData = plannerData.slice(0, plannerMonths);
    const countMonths = (person: "you" | "partner", type: string) =>
      visibleData.filter((m) => m[person] === type).length;

    const youBasis = countMonths("you", "basis");
    const youPlus = countMonths("you", "plus");
    const youBonus = countMonths("you", "bonus");
    const partnerBasis = countMonths("partner", "basis");
    const partnerPlus = countMonths("partner", "plus");
    const partnerBonus = countMonths("partner", "bonus");

    const youTotalMoney = youBasis * myCalc.basis + youPlus * myCalc.plus + youBonus * myCalc.bonus;
    const partnerTotalMoney =
      partnerBasis * partnerCalc.basis + partnerPlus * partnerCalc.plus + partnerBonus * partnerCalc.bonus;
    const totalMoney = youTotalMoney + partnerTotalMoney;
    const totalMonths = youBasis + youPlus + youBonus + partnerBasis + partnerPlus + partnerBonus;

    const isCouple = data.applicationType === "couple";

    const renderModelPills = (basis: number, plus: number, bonus: number) => (
      <div className="flex gap-1 flex-wrap">
        {basis > 0 && (
          <span
            className="px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: "rgba(192, 99, 11, 0.25)", color: colors.textDark, fontSize: "11px" }}
          >
            {basis} Basis
          </span>
        )}
        {plus > 0 && (
          <span
            className="px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: "rgba(252, 99, 27, 0.25)", color: colors.textDark, fontSize: "11px" }}
          >
            {plus} Plus
          </span>
        )}
        {bonus > 0 && (
          <span
            className="px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: "rgba(255, 228, 76, 0.35)", color: colors.textDark, fontSize: "11px" }}
          >
            {bonus} Bonus
          </span>
        )}
        {basis === 0 && plus === 0 && bonus === 0 && (
          <span style={{ fontSize: fontSize.tiny, color: colors.text }}>—</span>
        )}
      </div>
    );

    return (
      <div className="py-2">
        <div
          className="overflow-hidden"
          style={{
            backgroundColor: colors.tile,
            boxShadow: ui.cardShadow,
            borderRadius: ui.cardRadius,
          }}
        >
          <div className="px-4 py-2" style={{ backgroundColor: colors.buttonDark }}>
            <span className="font-semibold" style={{ fontSize: fontSize.tiny, color: colors.white }}>
              Your Elterngeld Plan
            </span>
          </div>

          <div className="px-4 py-3">
            <div className="pb-3" style={{ borderBottom: `1px solid rgba(87, 83, 78, 0.3)` }}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium" style={{ fontSize: fontSize.tiny, color: colors.textDark }}>
                  You
                </span>
                <span style={{ fontSize: fontSize.tiny, color: colors.text }}>
                  Income: €{sliderValue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                {renderModelPills(youBasis, youPlus, youBonus)}
                <span className="font-semibold" style={{ fontSize: fontSize.button, color: colors.textDark }}>
                  €{youTotalMoney.toLocaleString()}
                </span>
              </div>
            </div>

            {isCouple && (
              <div className="py-3" style={{ borderBottom: `1px solid rgba(87, 83, 78, 0.3)` }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium" style={{ fontSize: fontSize.tiny, color: colors.textDark }}>
                    Partner
                  </span>
                  <span style={{ fontSize: fontSize.tiny, color: colors.text }}>
                    Income: €{partnerSliderValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  {renderModelPills(partnerBasis, partnerPlus, partnerBonus)}
                  <span className="font-semibold" style={{ fontSize: fontSize.button, color: colors.textDark }}>
                    €{partnerTotalMoney.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-between items-center">
              <div>
                <span className="font-semibold" style={{ fontSize: fontSize.tiny, color: colors.textDark }}>
                  Total
                </span>
                <span className="ml-2" style={{ fontSize: fontSize.tiny, color: colors.text }}>
                  {totalMonths} months
                </span>
              </div>
              <span className="font-bold" style={{ fontSize: fontSize.body, color: colors.textDark }}>
                €{totalMoney.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // State for date input
  const [dateValue, setDateValue] = useState<Date | undefined>(undefined);

  const SliderInput = ({ person }: { person: "you" | "partner" }) => {
    const value = person === "partner" ? partnerSliderValue : sliderValue;
    const setValue = person === "partner" ? setPartnerSliderValue : setSliderValue;
    const label = person === "partner" ? "Partner's monthly net income" : "Your monthly net income";
    const displayPrefix = person === "partner" ? "Partner's net income: " : "My net income: ";

    return (
      <SliderInputComponent
        value={value}
        onChange={setValue}
        onConfirm={(val, display) => handleInput(val, `${displayPrefix}${display}`)}
        label={label}
      />
    );
  };

  // ===========================================
  // RENDER
  // ===========================================

  const renderMessage = (msg: FlowMessage, i: number) => {
    if (msg.type === "category") return <CategoryHeader key={i} label={msg.content || ""} />;

    if (msg.type === "user") {
      const isLastUserMessage = i === lastUserMessageIndex;
      return (
        <div key={i} ref={isLastUserMessage ? lastUserMessageRef : null} className="flex justify-end py-2">
          <div
            className="rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%]"
            style={{ backgroundColor: colors.userBubble }}
          >
            <span style={{ fontSize: fontSize.body, color: colors.textDark }}>{msg.content}</span>
          </div>
        </div>
      );
    }

    if (msg.type === "bot") {
      const isCurrentlyStreaming = i === streamingMessageIndex;
      const isQuestion = msg.isQuestion;
      const hasContent = msg.content && msg.content.trim().length > 0;
      const hasOnlyExpander = !hasContent && msg.subtext?.includes("[info:");
      return (
        <div key={i} className={`${isQuestion ? "py-1.5 mt-4" : "py-1"} ${hasOnlyExpander ? "mb-4" : ""}`}>
          {hasContent && (
            <p
              className={isQuestion ? "leading-relaxed font-semibold pl-3" : "leading-relaxed"}
              style={{
                color: colors.textDark,
                borderLeft: isQuestion ? `3px solid ${colors.orange}` : "none",
                fontFamily: isQuestion ? fonts.headline : fonts.body,
                fontSize: isQuestion ? fontSize.question : fontSize.body,
              }}
            >
              {formatText(msg.content, onOpenChat)}
              {isCurrentlyStreaming && (
                <span
                  className="inline-block w-2 h-2 ml-1 rounded-full align-middle"
                  style={{
                    backgroundColor: colors.text,
                    animation: "pulse 1.2s ease-in-out infinite",
                  }}
                />
              )}
            </p>
          )}
          {msg.subtext &&
            !isCurrentlyStreaming &&
            (msg.subtext.includes("[info:") ? (
              <>
                {msg.subtext.split("[info:")[0].trim() && (
                  <p
                    className={`mt-2 ${isQuestion ? "pl-3" : ""}`}
                    style={{ fontSize: fontSize.subtext, color: colors.text }}
                  >
                    {formatText(msg.subtext.split("[info:")[0].trim(), onOpenChat)}
                  </p>
                )}
                {(() => {
                  const blocks = msg.subtext.split("[info:").slice(1);
                  return blocks.map((block, idx) => {
                    const title = block.split("]")[0];
                    const content = block.split("]").slice(1).join("]");
                    const isLast = idx === blocks.length - 1;
                    return (
                      <div key={idx} className={`${idx === 0 ? "mt-3" : ""} ${isQuestion ? "pl-3" : ""}`}>
                        <InfoBox title={title} content={content} onOpenChat={onOpenChat} isLast={isLast} />
                      </div>
                    );
                  });
                })()}
              </>
            ) : msg.subtext.includes("[info]") ? (
              <>
                {msg.subtext.split("[info]")[0].trim() && (
                  <p
                    className={`mt-2 ${isQuestion ? "pl-3" : ""}`}
                    style={{ fontSize: fontSize.subtext, color: colors.text }}
                  >
                    {formatText(msg.subtext.split("[info]")[0].trim(), onOpenChat)}
                  </p>
                )}
                <p
                  className={`mt-2 ${isQuestion ? "pl-3" : ""}`}
                  style={{ fontSize: fontSize.subtext, color: colors.text }}
                >
                  {formatText(msg.subtext.split("[info]")[1].trim(), onOpenChat)}
                </p>
              </>
            ) : (
              <p
                className={`mt-2 ${isQuestion ? "pl-3" : ""}`}
                style={{ fontSize: fontSize.subtext, color: colors.text }}
              >
                {formatText(msg.subtext, onOpenChat)}
              </p>
            ))}
        </div>
      );
    }

    if (msg.type === "component") {
      switch (msg.component) {
        case "introChecklist":
          return <IntroChecklist key={i} />;
        case "calculation":
          return <CalculationCard key={i} />;
        case "planner":
          return (
            <React.Fragment key={i}>
              <ElterngeldPlanner
                plannerData={plannerData}
                setPlannerData={setPlannerData}
                plannerMonths={plannerMonths}
                applicationType={data.applicationType as "couple" | "single"}
                premature={data.premature}
                myCalc={myCalc}
                partnerCalc={partnerCalc}
                isLoggedIn={!!user}
                onSaveClick={() => {
                  saveSessionToLocalStorage();
                  setShowPlannerSaveInput(true);
                }}
                fullscreen={plannerFullscreen}
                onFullscreenToggle={() => setPlannerFullscreen(!plannerFullscreen)}
              />
            </React.Fragment>
          );
        case "checkmarks":
          return <CheckmarksComponent key={i} />;
        case "summaryBox":
          return <SummaryBox key={i} />;
        case "ctaCard":
          return <CtaCard key={i} />;
        default:
          return null;
      }
    }
    return null;
  };

  const renderInput = () => {
    if (!showInput) return null;

    if (showInput.component === "continue") {
      const label = showInput.pauseLabel || "Continue to Summary";
      const hasArrow = label.includes("→");
      const labelText = hasArrow ? label.replace("→", "").trim() : label;
      return (
        <button
          onClick={() => handleContinue(label)}
          className="w-full flex items-center justify-between"
          style={{
            backgroundColor: colors.buttonDark,
            color: colors.white,
            height: ui.buttonHeight,
            borderRadius: ui.buttonRadius,
            padding: "0 20px",
            fontFamily: fonts.body,
            fontSize: fontSize.button,
            fontWeight: 600,
          }}
        >
          <span className="w-[18px]" />
          <span>{labelText}</span>
          <span style={{ fontSize: "18px" }}>→</span>
        </button>
      );
    }

    if (showInput.type === "end") {
      return null;
    }

    if (showInput.input === "buttons" && showInput.options) {
      return <ButtonOptions options={showInput.options} onSelect={handleInput} />;
    }

    if (showInput.input === "date")
      return (
        <DateInputComponent
          value={dateValue}
          onChange={setDateValue}
          onConfirm={(isoDate, displayDate) => handleInput(isoDate, displayDate)}
        />
      );
    if (showInput.input === "slider") return <SliderInput person={showInput.person || "you"} />;
    if ((showInput.input as string) === "visa")
      return <VisaSelectorComponent onSelect={(visaId, label) => handleInput(visaId, label)} />;

    return null;
  };

  // PDF Flow
  if (showPdfFlow) {
    return (
      <div
        className="flex flex-col overflow-hidden"
        style={{
          backgroundColor: colors.background,
          fontFamily: fonts.body,
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
        }}
      >
        <div className="flex-shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div className="h-1 w-full" style={{ backgroundColor: colors.tile }}>
            <div className="h-full" style={{ width: "12.5%", backgroundColor: colors.basis }} />
          </div>
          <div className="px-5 py-3">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPdfFlow(false)}
                  className="w-8 h-8 flex items-center justify-center"
                  style={{ backgroundColor: colors.tile, borderRadius: ui.buttonRadius }}
                >
                  <svg className="w-4 h-4" fill="none" stroke={colors.textDark} strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="font-semibold" style={{ fontSize: fontSize.small, color: colors.textDark }}>
                  Your Elterngeld Application
                </h1>
              </div>
              <span style={{ fontSize: fontSize.tiny, color: colors.text }}>Step 1/8</span>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="px-5 py-6">
            <div className="max-w-2xl mx-auto">
              <p
                className="leading-relaxed font-medium mb-6"
                style={{ fontSize: fontSize.subtext, color: colors.textDark }}
              >
                Tell us about your child.
              </p>
              {/* PDF Flow content would go here */}
            </div>
          </div>
        </main>

        <footer
          className="flex-shrink-0 border-t"
          style={{ backgroundColor: colors.background, borderColor: colors.border }}
        >
          <div className="px-5 py-4">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <div />
              <button
                className="flex items-center justify-between gap-1.5 px-8 py-2.5 font-semibold"
                style={{
                  backgroundColor: colors.buttonDark,
                  color: colors.white,
                  minWidth: 160,
                  borderRadius: ui.buttonRadius,
                  fontSize: fontSize.small,
                }}
              >
                <span className="w-[18px]" />
                <span>Continue</span>
                <span style={{ fontSize: "18px" }}>→</span>
              </button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <LoginModal
        isOpen={showPlannerSaveInput}
        onClose={() => setShowPlannerSaveInput(false)}
        title="Save your plan"
        description="Create a free account to save your plan and track your progress."
      />
      <div
        className="flex flex-col overflow-hidden"
        style={{
          backgroundColor: colors.background,
          fontFamily: fonts.body,
          height: "calc(100vh - 72px)",
        }}
      >
        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div
            className={`h-full overflow-y-auto px-5 pt-6 ${hideScrollbar ? "hide-scrollbar" : ""}`}
            ref={scrollRef}
            onScroll={handleScroll}
          >
            <div className="max-w-2xl mx-auto">
              {showStartScreen ? (
                <div style={{ padding: "60px 0 20px 0" }}>
                  {/* Headline */}
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

                  {/* Subtext */}
                  <p
                    style={{
                      fontSize: "17px",
                      color: "#666",
                      lineHeight: 1.5,
                      marginBottom: "20px",
                    }}
                  >
                    A few quick questions and you'll know exactly what Elterngeld you can get.
                  </p>

                  {/* Progress Bar + Trust Line */}
                  <div style={{ marginBottom: "56px" }}>
                    <div
                      style={{
                        height: "6px",
                        background: "#E7E5E4",
                        borderRadius: "3px",
                        overflow: "hidden",
                        marginBottom: "10px",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: "8%",
                          background: "#000",
                          borderRadius: "3px",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        fontSize: "13px",
                        color: "#666",
                      }}
                    >
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

                  {/* Question with orange accent */}
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

                  {/* Question description */}
                  <p
                    style={{
                      fontSize: "15px",
                      color: "#666",
                      lineHeight: 1.5,
                      marginBottom: "20px",
                      paddingLeft: "16px",
                    }}
                  >
                    Your eligibility depends on your citizenship and residence permit.
                  </p>

                  {/* Answer options */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <button
                      onClick={() => {
                        setShowStartScreen(false);
                        setData((prev) => ({ ...prev, citizenship: "eu" }));
                        setMessages([{ type: "user", content: "Yes, German or EU/EEA/Swiss" }]);
                        messagesLengthRef.current = 1;
                        setLastUserMessageIndex(0);
                        setStepHistory([]);
                        setStep(0); // Start at citizenshipResponse dynamic step
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "16px 20px",
                        background: "#FFFFFF",
                        border: "1px solid #E7E5E4",
                        borderRadius: "12px",
                        fontFamily: fonts.body,
                        fontSize: "15px",
                        fontWeight: 500,
                        color: "#000",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <circle cx="12" cy="8" r="5" />
                        <path d="M20 21a8 8 0 0 0-16 0" />
                        <path d="M16 11l2 2 4-4" />
                      </svg>
                      Yes, German or EU/EEA/Swiss
                    </button>
                    <button
                      onClick={() => {
                        setShowStartScreen(false);
                        setData((prev) => ({ ...prev, citizenship: "other" }));
                        setMessages([{ type: "user", content: "No, other nationality" }]);
                        messagesLengthRef.current = 1;
                        setLastUserMessageIndex(0);
                        setStepHistory([]);
                        setStep(0); // Start at citizenshipResponse dynamic step
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "16px 20px",
                        background: "#FFFFFF",
                        border: "1px solid #E7E5E4",
                        borderRadius: "12px",
                        fontFamily: fonts.body,
                        fontSize: "15px",
                        fontWeight: 500,
                        color: "#000",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      No, other nationality
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => renderMessage(msg, i))}

                  {isTyping && (
                    <div className="py-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: colors.text,
                          animation: "pulse 1.2s ease-in-out infinite",
                        }}
                      />
                    </div>
                  )}

                  <div ref={lastMessageRef} style={{ height: 1 }} />

                  {spacerHeight > 0 && <div style={{ height: spacerHeight }} />}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Input section */}
        {!showStartScreen && (
          <div
            className="flex-shrink-0 px-5 pb-1 pt-3 relative z-10"
            style={{ backgroundColor: colors.background, borderTop: `1px solid ${colors.border}` }}
          >
            {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="absolute z-[100] w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{
                backgroundColor: colors.white,
                top: "-44px",
                left: "50%",
                transform: "translateX(-50%)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke={colors.textDark} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}
          <div className="max-w-2xl mx-auto">{renderInput()}</div>
          <div className="max-w-2xl mx-auto">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {/* Back Button */}
              <button
                onClick={goBack}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 8,
                  background: "none",
                  border: "none",
                  borderRadius: 8,
                  cursor: stepHistory.length > 0 ? "pointer" : "default",
                  opacity: stepHistory.length > 0 ? 1 : 0.3,
                  color: colors.text,
                }}
                disabled={stepHistory.length === 0}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Disclaimer */}
              <span style={{ fontSize: fontSize.tiny, color: colors.text, opacity: 0.6 }}>
                Quick estimate only – not legal or tax advice.
              </span>

              {/* Restart Button */}
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

export default ElterngeldGuide;
