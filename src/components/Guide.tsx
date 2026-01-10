// ===========================================
// ELTERNGELD GUIDE - LOVABLE VERSION
// ===========================================
// Copy this entire file into Lovable as a new page or component
//
// FOR LOVABLE: Replace DateInput with shadcn Calendar for better UX:
// import { Calendar } from "@/components/ui/calendar";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

interface PlannerMonth {
  you: "none" | "basis" | "plus" | "bonus";
  partner: "none" | "basis" | "plus" | "bonus";
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
// DESIGN TOKENS
// ===========================================
const colors = {
  background: "#F9F8F4",
  tile: "#F0EEE6",
  tileHover: "#EAE6DD",
  text: "#57534E",
  textDark: "#000000",
  userBubble: "#F0EEE6",
  basis: "#C0630B",
  plus: "#FC631B",
  bonus: "#FFBDF0",
  basisBorder: "#F2F53A",
  plusBorder: "#FFBDF0",
  bonusBorder: "#D1B081",
  border: "#E7E5E4",
  borderLight: "#F5F5F4",
  error: "#E07B3C",
  success: "#1AB689",
  white: "#FFFFFF",
  buttonDark: "#3D3D3A",
  stars: "#facc15",
};

// ===========================================
// CONSTANTS
// ===========================================
const ELTERNGELD = {
  MIN_AMOUNT: 300, // Minimum Elterngeld per month
  MAX_AMOUNT: 1800, // Maximum Elterngeld per month
  GESCHWISTER_MIN: 75, // Minimum Geschwisterbonus (§2a Abs. 1)
  TWINS_BONUS: 300, // Extra for twins (§2a Abs. 4)
  TRIPLETS_BONUS: 600, // Extra for triplets
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
  // SPECIAL CASES (show first)
  { id: "uk_pre_brexit", label: "British – arrived before Jan 2021", category: "special", status: "eligible" },
  {
    id: "turkey_insured",
    label: "Turkish/Moroccan/Tunisian/Algerian – socially insured",
    category: "special",
    status: "eligible",
  },

  // WORK PERMITS - Eligible
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

  // STUDY/TRAINING - Conditional
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

  // HUMANITARIAN - Conditional/Eligible
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

  // OTHER - Not Eligible
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
  // INTRO
  { type: "bot", content: "Hi! 👋 Let's figure out your Elterngeld together." },
  {
    type: "bot",
    content:
      "Elterngeld replaces part of your income while you care for your newborn. The rules can get tricky, though.",
  },
  {
    type: "bot",
    content:
      "This **free guide** walks you through everything. And if you'd like, we can **prepare your official application** so you don't have to deal with the 23-page form.",
  },
  { type: "bot", content: "Here's what you'll learn:" },
  { type: "component", component: "introChecklist" },
  {
    type: "bot",
    content: "Let's start by checking your eligibility. It depends on your **citizenship and residence permit**.",
    pause: true,
    pauseLabel: "Am I eligible?",
  },

  // ELIGIBILITY CHECK
  {
    type: "bot",
    content: "Are you a **German or EU/EEA/Swiss** citizen?",
    isQuestion: true,
    input: "buttons",
    field: "citizenship",
    options: [
      { value: "eu", label: "Yes, German or EU/EEA/Swiss", icon: "eu" },
      { value: "other", label: "No, other nationality", icon: "passport" },
    ],
  },
  { type: "user" },
  { type: "dynamic", key: "citizenshipResponse" },

  // INCOME LIMIT CHECK
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

  // YOUR CHILD
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

  // INCOME
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

  // CALCULATION
  { type: "dynamic", key: "calculationIntro" },
  { type: "component", component: "calculation" },
  { type: "dynamic", key: "plannerIntro" },

  // PLANNING
  { type: "component", component: "planner", pause: true, pauseLabel: "Continue to application →" },

  // CTA
  {
    type: "bot",
    content: "Ready to apply? We can pre-fill your official application and guide you through the remaining steps.",
  },
  { type: "component", component: "ctaCard" },

  // END
  { type: "end" },
];

// ===========================================
// ICONS (reusable SVG components)
// ===========================================
const Icons = {
  lightbulb: (className = "w-4 h-4") => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  ),
  warning: (className = "w-4 h-4") => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  check: (className = "w-4 h-4") => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  calendar: (className = "w-4 h-4") => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  user: (className = "w-4 h-4") => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
  users: (className = "w-4 h-4") => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  euro: (className = "w-4 h-4") => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4"
      />
    </svg>
  ),
  pdf: (className = "w-4 h-4") => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  ),
};

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

  // Handle [tip] prefix
  const hasTip = text.startsWith("[tip]");
  const processedText = hasTip ? text.replace("[tip]", "") : text;

  const lines = processedText.split("\n");
  const result: React.ReactNode[] = [];
  let bulletGroup: string[] = [];

  // Add lightbulb icon if tip
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
    // Handle [[link]] or [[link|prefill]] as clickable link
    const linkParts = line.split(/\[\[(.*?)\]\]/g);
    const withLinks = linkParts.map((part, i) => {
      if (i % 2 === 1) {
        // This is the link text - check for prefill with |
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
      // Handle **bold** within non-link parts
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

  // Ersatzrate nach §2 BEEG:
  // - Basis: 67%
  // - Unter €1.000: +0,1% pro €2 unter €1.000 (max 100%)
  // - Über €1.200: -0,1% pro €2 über €1.200 (min 65%)
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

  // Basis OHNE Arbeit (für Plus-Deckel)
  const ersatzrateOhne = getErsatzrate(netIncome);
  let basisWithoutWork = Math.round(netIncome * ersatzrateOhne);
  basisWithoutWork = Math.max(ELTERNGELD.MIN_AMOUNT, Math.min(ELTERNGELD.MAX_AMOUNT, basisWithoutWork));

  // Geschwisterbonus und Mehrlingszuschlag auf Basis ohne Arbeit
  let bonusAmount = 0;
  if (data.siblings === "yes") {
    bonusAmount += Math.max(ELTERNGELD.GESCHWISTER_MIN, Math.round(basisWithoutWork * 0.1));
  }
  if (data.multiples === "twins") bonusAmount += ELTERNGELD.TWINS_BONUS;
  if (data.multiples === "triplets") bonusAmount += ELTERNGELD.TRIPLETS_BONUS;
  basisWithoutWork += bonusAmount;

  // Basis MIT Arbeit (Differenzeinkommen)
  const differenz = Math.max(0, netIncome - partTimeIncome);
  const ersatzrateMit = getErsatzrate(differenz);
  let basis = Math.round(differenz * ersatzrateMit);
  basis = Math.max(ELTERNGELD.MIN_AMOUNT, Math.min(ELTERNGELD.MAX_AMOUNT, basis));
  basis += bonusAmount;

  // Plus MIT Arbeit = MIN(normal berechnet, Deckel)
  // Deckel = Basis ohne Arbeit / 2
  const plusDeckel = Math.round(basisWithoutWork / 2);
  const plusBerechnet = Math.round(basis / 2);
  const plusCapped = partTimeIncome > 0 && plusBerechnet > plusDeckel;
  const plus = partTimeIncome > 0 ? Math.min(plusBerechnet, plusDeckel) : plusBerechnet;

  return {
    basis,
    plus,
    bonus: plus, // Bonus = Plus amount
    basisWithoutWork,
    plusCapped,
  };
};

// ===========================================
// EXTRACTED INPUT COMPONENTS
// ===========================================

// Helper functions for date formatting
const formatDateDisplay = (date: Date) => {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const formatDateISO = (date: Date) => {
  return date.toISOString().split("T")[0];
};

// Date Input Component
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

  // Get initial values from value prop or defaults
  const [selectedDay, setSelectedDay] = React.useState(value?.getDate() || 0);
  const [selectedMonth, setSelectedMonth] = React.useState(value ? value.getMonth() + 1 : 0);
  const [selectedYear, setSelectedYear] = React.useState(value?.getFullYear() || 0);

  // Calculate days in month
  const getDaysInMonth = (month: number, year: number) => {
    if (!month || !year) return 31;
    return new Date(year, month, 0).getDate();
  };
  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear || currentYear);

  // Update parent when all fields selected
  React.useEffect(() => {
    if (selectedDay && selectedMonth && selectedYear) {
      const newDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
      onChange(newDate);
    }
  }, [selectedDay, selectedMonth, selectedYear, onChange]);

  // Adjust day if month changes and day is too high
  React.useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [daysInMonth, selectedDay]);

  const isComplete = selectedDay > 0 && selectedMonth > 0 && selectedYear > 0;

  const selectStyle = {
    backgroundColor: colors.white,
    color: colors.textDark,
    border: `1.5px solid ${colors.border}`,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2378716c'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
    backgroundSize: "16px",
    paddingRight: "32px",
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {/* Day */}
        <select
          value={selectedDay || ""}
          onChange={(e) => setSelectedDay(Number(e.target.value))}
          className="flex-1 px-3 py-3 rounded-xl text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-stone-300 appearance-none cursor-pointer"
          style={selectStyle}
        >
          <option value="">Day</option>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>

        {/* Month */}
        <select
          value={selectedMonth || ""}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="flex-[2] px-3 py-3 rounded-xl text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-stone-300 appearance-none cursor-pointer"
          style={selectStyle}
        >
          <option value="">Month</option>
          {months.map((month, i) => (
            <option key={month} value={i + 1}>
              {month}
            </option>
          ))}
        </select>

        {/* Year */}
        <select
          value={selectedYear || ""}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="flex-1 px-3 py-3 rounded-xl text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-stone-300 appearance-none cursor-pointer"
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
        className="w-full py-2.5 px-4 rounded-xl text-[14px] font-semibold transition-opacity flex items-center justify-between"
        style={{
          backgroundColor: colors.buttonDark,
          color: colors.white,
          opacity: isComplete ? 1 : 0.4,
          cursor: isComplete ? "pointer" : "not-allowed",
        }}
      >
        <span className="w-[18px]" />
        <span>Confirm</span>
        <span className="text-[18px]">→</span>
      </button>
    </div>
  );
};

// Slider Input Component - New Design with orange thumb and tick marks
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
      className="rounded-xl p-4"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.4)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Value Display */}
      <div className="mb-4">
        <span className="text-[12px]" style={{ color: colors.text }}>
          {label || "Monthly net income"}
        </span>
        <div className="mt-1">
          <span className="text-[14px] mr-1" style={{ color: colors.text }}>
            €
          </span>
          <span className="text-2xl font-bold" style={{ color: colors.textDark }}>
            {value.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Slider Track */}
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
        {/* Tick Marks */}
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

        {/* Track Background */}
        <div
          className="absolute top-1/2 left-0 right-0 h-0.5 rounded-full -translate-y-1/2"
          style={{ backgroundColor: colors.textDark }}
        />

        {/* Track Filled */}
        <div
          className="absolute top-1/2 left-0 h-0.5 rounded-full -translate-y-1/2 pointer-events-none"
          style={{ backgroundColor: colors.textDark, width: `${percent}%` }}
        />

        {/* Thumb */}
        <div
          className="absolute top-1/2 w-5 h-5 rounded-full pointer-events-none -translate-y-1/2"
          style={{
            backgroundColor: colors.basis,
            left: `${percent}%`,
            marginLeft: "-10px",
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[11px] mt-1" style={{ color: colors.text }}>
        <span>€0</span>
        <span>€2k</span>
        <span>€4k</span>
        <span>€6k</span>
        <span>€8k</span>
      </div>

      {/* Button */}
      <button
        onClick={() => onConfirm(value, `€${value.toLocaleString()}`)}
        className="w-full mt-6 py-3 px-4 rounded-xl text-[14px] font-semibold flex items-center justify-between"
        style={{ backgroundColor: colors.buttonDark, color: colors.white }}
      >
        <span className="w-[18px]" />
        <span>Continue</span>
        <span className="text-[18px]">→</span>
      </button>
    </div>
  );
};

// Stepper for part-time income - full width
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
      <span style={{ color: colors.textDark, fontSize: "13px" }}>{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={decrease}
          className="w-5 h-5 flex items-center justify-center"
          style={{ color: colors.textDark, cursor: "pointer", fontSize: "16px" }}
        >
          −
        </button>
        <span
          style={{ color: colors.textDark, fontSize: "13px", fontWeight: 600, minWidth: "50px", textAlign: "center" }}
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

// Type styles for planner dropdowns - neue Farben wie im Prototyp
const typeStyles = {
  none: { bg: "rgba(0, 0, 0, 0.04)" },
  basis: { bg: "rgba(192, 99, 11, 0.25)" },
  plus: { bg: "rgba(252, 99, 27, 0.25)" },
  bonus: { bg: "rgba(255, 189, 240, 0.35)" },
} as const;

// Type Select Dropdown Component (for Planner) - neues kompaktes Design
const TypeSelectComponent: React.FC<TypeSelectProps> = ({ value, onChange, hasError, isSingleParent }) => (
  <div className="relative w-full">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-6 pl-2.5 pr-5 rounded-full text-[11px] font-medium appearance-none cursor-pointer w-full"
      aria-label="Select benefit type"
      style={{
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

// Visa Selector Component
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

  // Step 1: Show category buttons
  if (!selectedCategory) {
    return (
      <div className="py-4 space-y-2">
        {categoryOptions.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className="w-full p-3.5 rounded-xl text-left transition-all hover:border-stone-400"
            style={{ backgroundColor: colors.white, border: `1.5px solid ${colors.border}` }}
          >
            <span className="text-[14px] font-medium" style={{ color: colors.textDark }}>
              {cat.label}
            </span>
            {cat.sub && (
              <p className="text-[12px] mt-0.5" style={{ color: colors.text }}>
                {cat.sub}
              </p>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Step 2: Show visa buttons for selected category
  const categoryVisas = visaTypes.filter((v) => v.category === selectedCategory);

  return (
    <div className="py-4">
      {/* Back button */}
      <button
        onClick={() => setSelectedCategory(null)}
        className="flex items-center gap-1.5 text-[14px] mb-4 hover:opacity-70"
        style={{ color: colors.text }}
        aria-label="Go back to categories"
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
            className="w-full p-3.5 rounded-xl text-left transition-all hover:border-stone-400"
            style={{ backgroundColor: colors.white, border: `1.5px solid ${colors.border}` }}
          >
            <span className="text-[14px] font-medium" style={{ color: colors.textDark }}>
              {visa.label}
            </span>
            {visa.paragraph && (
              <span className="text-[12px] ml-1.5" style={{ color: colors.text }}>
                ({visa.paragraph})
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// InfoBox Component - Expandable info section (defined outside to prevent re-mount)
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
        {/* Header - always visible, clickable */}
        <button onClick={() => setIsOpen(!isOpen)} className="w-full py-2 flex items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <span style={{ color: colors.text }}>▸</span>
            <span className="text-[14px]" style={{ color: colors.textDark }}>
              {title}
            </span>
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

        {/* Content - expands downward */}
        <div
          className="overflow-hidden transition-all duration-200 ease-out"
          style={{
            maxHeight: isOpen ? "500px" : "0px",
            opacity: isOpen ? 1 : 0,
          }}
        >
          <div className="pb-2 pl-5 leading-relaxed text-[14px]" style={{ color: colors.text }}>
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
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const [chatStreamingIndex, setChatStreamingIndex] = useState(-1);
  const chatStreamingRef = useRef<{ words: string[]; index: number; messageIndex: number }>({
    words: [],
    index: 0,
    messageIndex: -1,
  });
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Planner save email state
  const [showPlannerSaveInput, setShowPlannerSaveInput] = useState(false);
  const [plannerSaveEmail, setPlannerSaveEmail] = useState("");
  const [plannerEmailSaving, setPlannerEmailSaving] = useState(false);
  const [plannerEmailSaved, setPlannerEmailSaved] = useState(false);
  const [plannerEmailError, setPlannerEmailError] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);

  // CTA Card state (lifted up to prevent re-render reset)
  const [ctaStep, setCtaStep] = useState(1);
  const [selectedState, setSelectedState] = useState("");
  const [plannerFullscreen, setPlannerFullscreen] = useState(false);

  // Review rotation state (lifted to prevent re-mount reset)
  const [currentReview, setCurrentReview] = useState(0);
  const [reviewFade, setReviewFade] = useState(true);

  // Review rotation effect - pause when input is showing
  useEffect(() => {
    if (showInput) return; // Don't run interval when input is active
    const reviews = 4; // Number of reviews
    const interval = setInterval(() => {
      setReviewFade(false);
      setTimeout(() => {
        setCurrentReview((prev) => (prev + 1) % reviews);
        setReviewFade(true);
      }, 300);
    }, 8000);
    return () => clearInterval(interval);
  }, [showInput]);

  // Chat streaming function
  const streamChatMessage = useCallback((text: string, messageIndex: number) => {
    const tokens = text.split(/(\s+)/).filter((t) => t.length > 0);
    chatStreamingRef.current = { words: tokens, index: 0, messageIndex };
    setChatStreamingIndex(messageIndex);
    setIsChatStreaming(true);
  }, []);

  // Chat streaming effect
  useEffect(() => {
    if (!isChatStreaming) return;

    const { words: tokens, index, messageIndex } = chatStreamingRef.current;

    if (index >= tokens.length) {
      setIsChatStreaming(false);
      setChatStreamingIndex(-1);
      return;
    }

    const delay = 20 + Math.random() * 15;
    const timer = setTimeout(() => {
      setChatMessages((prev) => {
        const updated = [...prev];
        if (updated[messageIndex]) {
          const currentTokens = tokens.slice(0, chatStreamingRef.current.index + 1);
          updated[messageIndex] = { ...updated[messageIndex], content: currentTokens.join("") };
        }
        return updated;
      });
      chatStreamingRef.current.index++;

      // Auto-scroll during streaming
      setTimeout(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
      }, 10);
    }, delay);

    return () => clearTimeout(timer);
  }, [isChatStreaming, chatMessages]);

  // Helper to open chat with optional prefill
  const openChat = useCallback((prefill?: string) => {
    setChatInput(prefill || "");
    setShowChat(true);
  }, []);
  const [sliderValue, setSliderValue] = useState(0);
  const [partnerSliderValue, setPartnerSliderValue] = useState(0);
  const [data, setData] = useState<UserData>({});

  // Part-time income states
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
  const [selectedScenario, setSelectedScenario] = useState("");
  const [lastEditedCell, setLastEditedCell] = useState<{ month: number; person: "you" | "partner" } | null>(null);

  const [openTooltips, setOpenTooltips] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [showPdfFlow, setShowPdfFlow] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hideScrollbar, setHideScrollbar] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const plannerGridRef = useRef<HTMLDivElement>(null);
  const plannerScrollRef = useRef<HTMLDivElement>(null);
  const [plannerScrollProgress, setPlannerScrollProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);
  const [tipResetKey, setTipResetKey] = useState(0);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const [lastUserMessageIndex, setLastUserMessageIndex] = useState<number>(-1);
  const [shouldScrollToUser, setShouldScrollToUser] = useState(false);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const spacerObserverRef = useRef<MutationObserver | null>(null);
  const isStreamingRef = useRef(false);

  // Track messages length with ref to avoid stale closure issues
  const messagesLengthRef = useRef(0);
  useEffect(() => {
    messagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Save plan to database when user logs in
  useEffect(() => {
    const savePlanToDatabase = async () => {
      if (!user) return;
      
      // Check if we have any plan data to save
      const hasData = plannerData.some(m => m.you !== "none" || m.partner !== "none");
      if (!hasData && Object.keys(data).length === 0) return;

      try {
        // Check if user already has a plan
        const { data: existingPlans, error: fetchError } = await supabase
          .from('user_plans')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (fetchError) {
          console.error('Error fetching existing plans:', fetchError);
          return;
        }

        const planPayload = {
          user_id: user.id,
          plan_data: JSON.parse(JSON.stringify(plannerData)),
          user_data: JSON.parse(JSON.stringify(data)),
          selected_state: selectedState || null,
        };

        if (existingPlans && existingPlans.length > 0) {
          // Update existing plan
          const { error: updateError } = await supabase
            .from('user_plans')
            .update({
              plan_data: planPayload.plan_data,
              user_data: planPayload.user_data,
              selected_state: planPayload.selected_state,
            })
            .eq('id', existingPlans[0].id);

          if (updateError) {
            console.error('Error updating plan:', updateError);
          }
        } else {
          // Insert new plan
          const { error: insertError } = await supabase
            .from('user_plans')
            .insert([planPayload]);

          if (insertError) {
            console.error('Error inserting plan:', insertError);
          }
        }

        // Mark as saved and close modal
        setPlannerEmailSaved(true);
        setShowPlannerSaveInput(false);
      } catch (err) {
        console.error('Error saving plan:', err);
      }
    };

    savePlanToDatabase();
  }, [user, plannerData, data, selectedState]);

  // Go back to previous question
  const goBack = useCallback(() => {
    if (stepHistory.length === 0) return;

    const lastEntry = stepHistory[stepHistory.length - 1];
    setStepHistory((prev) => prev.slice(0, -1));
    setMessages((prev) => prev.slice(0, lastEntry.messagesLength));
    messagesLengthRef.current = lastEntry.messagesLength;
    setStep(lastEntry.step);
    setShowInput(lastEntry.savedShowInput); // Restore input directly
    setIsPaused(false);
  }, [stepHistory]);

  // Cycle planner type - defined at parent level to prevent scroll jump on re-render
  const cycleType = useCallback(
    (monthIndex: number, person: "you" | "partner", e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      setPlannerData((prev) => {
        const newData = [...prev];
        const current = newData[monthIndex][person];
        const cycle: Array<"none" | "basis" | "plus" | "bonus"> =
          data.applicationType === "single" ? ["none", "basis", "plus"] : ["none", "basis", "plus", "bonus"];
        const nextIndex = (cycle.indexOf(current) + 1) % cycle.length;
        const newValue = cycle[nextIndex];

        // Simply set the new value for this cell only
        newData[monthIndex] = { ...newData[monthIndex], [person]: newValue };

        return newData;
      });
      setSelectedScenario("");
      setLastEditedCell({ month: monthIndex, person });
    },
    [data.applicationType],
  );

  // Handle planner scroll for progress indicator
  const handlePlannerScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const maxScroll = scrollHeight - clientHeight;
    const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;
    setPlannerScrollProgress(progress);
  }, []);

  // Tips carousel for planner
  const tipsCount = 5; // Update when adding tips

  const nextTip = useCallback(() => {
    setCurrentTip((prev) => (prev + 1) % tipsCount);
    setTipResetKey((k) => k + 1); // Reset interval
  }, []);

  useEffect(() => {
    if (showInput) return; // Don't run interval when input is active
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tipsCount);
    }, 6000);
    return () => clearInterval(interval);
  }, [tipResetKey, showInput]); // Restart interval when manually clicked or input closes

  // Keep ref in sync with state
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Stream message - tokens include complete markdown blocks
  const streamMessage = (msg: FlowMessage, onComplete?: () => void) => {
    if (!msg.content) {
      setMessages((prev) => [...prev, msg]);
      messagesLengthRef.current++;
      onComplete?.();
      return;
    }

    // Parse into tokens - keep markdown blocks together
    // Match: **bold**, [[links]], or regular words/spaces
    const tokens: string[] = [];
    let remaining = msg.content;

    while (remaining.length > 0) {
      // Check for **bold**
      const boldMatch = remaining.match(/^\*\*[^*]+\*\*/);
      if (boldMatch) {
        tokens.push(boldMatch[0]);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Check for [[link]]
      const linkMatch = remaining.match(/^\[\[[^\]]+\]\]/);
      if (linkMatch) {
        tokens.push(linkMatch[0]);
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Regular word or space
      const wordMatch = remaining.match(/^(\S+|\s+)/);
      if (wordMatch) {
        tokens.push(wordMatch[0]);
        remaining = remaining.slice(wordMatch[0].length);
      } else {
        // Fallback: single character
        tokens.push(remaining[0]);
        remaining = remaining.slice(1);
      }
    }

    // Use ref to get current message count (avoids stale closure)
    const newIndex = messagesLengthRef.current;
    setMessages((prev) => [...prev, { ...msg, content: "" }]);
    messagesLengthRef.current = newIndex + 1;

    streamingRef.current = { words: tokens, index: 0, messageIndex: newIndex, callback: onComplete || null };
    setStreamingMessageIndex(newIndex);
    setIsStreaming(true);
  };

  // Streaming effect - token by token
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
    // Faster for spaces, slightly slower for markdown blocks
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

  // Scroll detection - show button only when last message is not visible
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const container = scrollRef.current;

    if (lastMessageRef.current) {
      // Check if last message is in view for scroll button
      const containerRect = container.getBoundingClientRect();
      const msgRect = lastMessageRef.current.getBoundingClientRect();

      // Last message is visible if its top is above container bottom
      const isLastMessageVisible = msgRect.top < containerRect.bottom;
      setShowScrollButton(!isLastMessageVisible);
    } else {
      // Fallback: hide button if no messages yet
      setShowScrollButton(false);
    }
  }, []);

  // Simple fixed spacer - large enough to scroll user message to top
  const spacerHeight = lastUserMessageIndex >= 0 ? window.innerHeight : 0;

  const scrollToBottom = () => {
    // Stop observer
    spacerObserverRef.current?.disconnect();
    spacerObserverRef.current = null;

    // Hide scrollbar during scroll
    setHideScrollbar(true);

    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      setShowScrollButton(false);

      // Show scrollbar again after scroll
      setTimeout(() => setHideScrollbar(false), 800);
    }
  };

  const handleRestart = () => {
    // Reset all state to initial values
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
    setSelectedScenario("");
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
  };

  // Save data to localStorage for PDF Flow integration
  const saveToPdfFlow = () => {
    try {
      // Save planner data (32 months)
      localStorage.setItem("elterngeld_planner_data", JSON.stringify(plannerData));

      // Save user data for pre-filling PDF flow fields
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

      console.log("Saved Guide data to localStorage for PDF Flow");
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  };

  // Jump directly to planner for testing
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

  // Jump directly to CTA/checkout page for testing
  const jumpToCta = () => {
    // Set some planner data first
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

  // Check scroll position when messages change
  useEffect(() => {
    if (isStreaming) return;

    const timer = setTimeout(() => {
      handleScroll();
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isTyping, isStreaming]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      spacerObserverRef.current?.disconnect();
    };
  }, []);

  const myCalc = calculateElterngeld(sliderValue, data, workPartTime ? partTimeIncome : 0);
  const partnerCalc = calculateElterngeld(partnerSliderValue, data, workPartTime ? partnerPartTimeIncome : 0);

  // Planner calculations (moved to parent level to avoid remounting issues)
  const plannerVisibleData = React.useMemo(() => plannerData.slice(0, plannerMonths), [plannerData, plannerMonths]);

  const plannerMonthCounts = React.useMemo(() => {
    const countMonths = (person: "you" | "partner", type: string) =>
      plannerVisibleData.filter((m) => m[person] === type).length;

    return {
      youBasis: countMonths("you", "basis"),
      youPlus: countMonths("you", "plus"),
      youBonus: countMonths("you", "bonus"),
      partnerBasis: data.applicationType === "couple" ? countMonths("partner", "basis") : 0,
      partnerPlus: data.applicationType === "couple" ? countMonths("partner", "plus") : 0,
      partnerBonus: data.applicationType === "couple" ? countMonths("partner", "bonus") : 0,
    };
  }, [plannerVisibleData, data.applicationType]);

  const plannerValidation = React.useMemo(() => {
    const { youBasis, youPlus, youBonus, partnerBasis, partnerPlus, partnerBonus } = plannerMonthCounts;
    const youBudget = youBasis + youPlus / 2;
    const partnerBudget = partnerBasis + partnerPlus / 2;
    const totalBudget = youBudget + partnerBudget;
    // Extra months for premature births (§4 Abs. 5 BEEG)
    const getPrematureExtra = () => {
      switch (data.premature) {
        case "6weeks":
          return 1;
        case "8weeks":
          return 2;
        case "12weeks":
          return 3;
        case "16weeks":
          return 4;
        default:
          return 0;
      }
    };
    const maxBudget = 14 + getPrematureExtra();
    const totalMoney =
      youBasis * myCalc.basis +
      youPlus * myCalc.plus +
      youBonus * myCalc.bonus +
      partnerBasis * partnerCalc.basis +
      partnerPlus * partnerCalc.plus +
      partnerBonus * partnerCalc.bonus;

    const global: string[] = [];
    const rows: Map<number, string[]> = new Map();
    const isCouple = data.applicationType === "couple";
    const hasMultiples = data.multiples && data.multiples !== "no";

    // Helper to add row error
    const addRowError = (rowIndex: number, error: string) => {
      if (!rows.has(rowIndex)) rows.set(rowIndex, []);
      rows.get(rowIndex)!.push(error);
    };

    // GLOBAL: Budget overflow
    if (totalBudget > maxBudget) {
      global.push(
        `You have exceeded the ${maxBudget}-month limit (currently ${totalBudget}). Both parents share a total budget of ${maxBudget} Basis months.`,
      );
    }

    // GLOBAL: Max Bonus months
    if (youBonus > 4) global.push(`You can only take 4 bonus months (you have ${youBonus})`);
    if (partnerBonus > 4) global.push(`Partner can only take 4 bonus months (they have ${partnerBonus})`);

    // GLOBAL: Single parent must have at least 2 months
    if (!isCouple && youBasis + youPlus + youBonus < 2 && youBasis + youPlus + youBonus > 0) {
      global.push("Single parents must take at least 2 months");
    }

    // GLOBAL: Minimum 2 months per parent (couples)
    if (isCouple) {
      const youTotal = youBasis + youPlus + youBonus;
      const partnerTotal = partnerBasis + partnerPlus + partnerBonus;

      if (youTotal > 0 && youTotal < 2) {
        global.push("You must claim at least 2 months. Single months are not allowed.");
      }
      if (partnerTotal > 0 && partnerTotal < 2) {
        global.push("Your partner must claim at least 2 months. Single months are not allowed.");
      }
    }

    // INLINE: Each parent max 12 Basis months (only for couples without multiples)
    if (isCouple && !hasMultiples) {
      if (youBasis > 12) {
        const firstBasisIndex = plannerVisibleData.findIndex((m) => m.you === "basis");
        if (firstBasisIndex >= 0)
          addRowError(firstBasisIndex, `You have exceeded 12 Basis months (currently ${youBasis}). Max 12 per parent.`);
      }
      if (partnerBasis > 12) {
        const firstBasisIndex = plannerVisibleData.findIndex((m) => m.partner === "basis");
        if (firstBasisIndex >= 0)
          addRowError(
            firstBasisIndex,
            `Partner has exceeded 12 Basis months (currently ${partnerBasis}). Max 12 per parent.`,
          );
      }
    }

    // INLINE: Basiselterngeld only in months 1-14
    plannerVisibleData.forEach((m, i) => {
      if (i >= 14 && (m.you === "basis" || m.partner === "basis")) {
        addRowError(i, "Basis can only be used in months 1–14. Switch to Plus or Bonus.");
      }
    });

    // INLINE: Parallel Basiselterngeld limited (not for multiples)
    if (isCouple && !hasMultiples) {
      const parallelBasisIndices = plannerVisibleData
        .map((m, i) => (m.you === "basis" && m.partner === "basis" ? i : -1))
        .filter((i) => i >= 0);
      if (parallelBasisIndices.length > 1) {
        parallelBasisIndices.slice(1).forEach((i) => {
          addRowError(i, "Both parents can only take Basis simultaneously for 1 month total.");
        });
      }
      // Parallel basis only allowed in months 1-12
      parallelBasisIndices.forEach((i) => {
        if (i >= 12) {
          addRowError(i, "Simultaneous Basis is only allowed in months 1–12.");
        }
      });
    }

    // INLINE: Plus/Bonus after month 14 must be continuous (no gaps)
    if (plannerMonths > 14) {
      let hadActivityAfter14 = false;
      for (let i = 14; i < plannerMonths; i++) {
        const monthHasActivity = plannerVisibleData[i]?.you !== "none" || plannerVisibleData[i]?.partner !== "none";
        if (monthHasActivity) hadActivityAfter14 = true;
        if (hadActivityAfter14 && !monthHasActivity) {
          addRowError(i, "Months after 14 must be continuous. Fill this gap or remove later months.");
          break;
        }
      }
    }

    // INLINE: Bonus rules - must be together, consecutive, at least 2
    if (isCouple) {
      const bonusIndices = plannerVisibleData
        .map((m, i) => (m.you === "bonus" || m.partner === "bonus" ? i : -1))
        .filter((i) => i >= 0);

      if (bonusIndices.length > 0) {
        // Check if not parallel
        const notParallel = plannerVisibleData.some(
          (m) => (m.you === "bonus" && m.partner !== "bonus") || (m.partner === "bonus" && m.you !== "bonus"),
        );

        // Check if not consecutive
        let notConsecutive = false;
        for (let j = 1; j < bonusIndices.length; j++) {
          if (bonusIndices[j] !== bonusIndices[j - 1] + 1) {
            notConsecutive = true;
            break;
          }
        }

        // Check if less than 2
        const lessThan2 = bonusIndices.length < 2;

        if (notParallel || notConsecutive || lessThan2) {
          addRowError(bonusIndices[0], "Bonus must be taken by both parents together for 2–4 consecutive months.");
        }
      }
    }

    // Note: Parallel Basis rule already checked above in "Parallel Basiselterngeld limited"

    return {
      globalErrors: global,
      rowErrors: rows,
      youBudget,
      partnerBudget,
      totalBudget,
      maxBudget,
      totalMoney,
      ...plannerMonthCounts,
    };
  }, [plannerMonthCounts, plannerVisibleData, data, myCalc, partnerCalc, plannerMonths]);

  // Flow Logic
  useEffect(() => {
    // Skip if already showing input (e.g., after goBack)
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
      const delay = 300 + Math.random() * 200; // Short delay before streaming starts

      const timer = setTimeout(() => {
        setIsTyping(false);

        // Stream the message
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
          // Other nationality - show visa selector
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
          // Over income limit - not eligible
          streamMessage(
            {
              type: "bot",
              content:
                "Unfortunately, households with taxable income above **€175,000** are not eligible for Elterngeld.",
              subtext: "This limit applies to your combined income from the last tax year before your child's birth.",
            },
            () => {
              // Show ineligible component
              setShowInput({ type: "component", component: "ineligible" });
            },
          );
          return;
        } else {
          response = { type: "bot", content: "Based on your answers, you **likely qualify** for Elterngeld!" };
        }
        break;

      case "dateResponse":
        // No response needed - tip already shown in question
        response = null;
        break;

      case "prematureQuestion":
        // Only show if baby is already born (date in past)
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
          // Skip to next step (baby not born yet)
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
          // Single parent - skip past user steps to next content
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

  // Scroll to user message with smooth animation - position at TOP
  useEffect(() => {
    if (!shouldScrollToUser || lastUserMessageIndex < 0) return;

    // Hide scrollbar during scroll animation
    setHideScrollbar(true);

    // Scroll on next frame
    requestAnimationFrame(() => {
      const userEl = lastUserMessageRef.current;
      const container = scrollRef.current;

      if (userEl && container) {
        // Get absolute offset of user element within scroll container
        let offsetTop = 0;
        let el: HTMLElement | null = userEl;
        while (el && el !== container) {
          offsetTop += el.offsetTop;
          el = el.offsetParent as HTMLElement;
        }

        // Smooth scroll so user message is at top
        container.scrollTo({
          top: offsetTop - 70,
          behavior: "smooth",
        });
        setShouldScrollToUser(false);

        // Show scrollbar again after scroll completes
        setTimeout(() => setHideScrollbar(false), 800);
      }
    });
  }, [shouldScrollToUser, lastUserMessageIndex, messages.length]);

  const handleInput = (value: string | number, displayValue?: string) => {
    // Save current state to history before making changes
    setStepHistory((prev) => [...prev, { step, messagesLength: messages.length, savedShowInput: showInput }]);

    const currentInput = showInput;
    setShowInput(null);

    const field = currentInput?.field;

    if (displayValue) {
      const newIndex = messagesLengthRef.current;
      setMessages((prev) => [...prev, { type: "user" as const, content: displayValue }]);
      messagesLengthRef.current = newIndex + 1;
      setLastUserMessageIndex(newIndex);
      setHideScrollbar(true); // Hide scrollbar before scroll starts
      setShouldScrollToUser(true);
    }

    if (field) {
      // Update data state
      setData((prev) => {
        const newData = { ...prev, [field]: value };

        // Handle special fields that need dynamic responses
        if (field === "visaType") {
          setTimeout(() => handleDynamicWithData("visaResponse", newData), 400);
        } else if (field === "isEmployed" || field === "humanitarianCondition") {
          setTimeout(() => handleDynamicWithData("conditionalVisaResponse", newData), 400);
        } else if (field === "ineligibleChoice" || field === "continueAfterStelle") {
          setTimeout(() => handleDynamicWithData("ineligibleChoiceResponse", newData), 400);
        }

        return newData;
      });

      // For special fields, don't advance step yet (handleDynamicWithData will do it)
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

  // Version of handleDynamic that accepts data directly (for timing-sensitive cases)
  const handleDynamicWithData = (key: string, currentData: UserData) => {
    let response: FlowMessage | null = null;

    // Helper to show ineligible options
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
          // Open Elterngeldstelle finder in new tab
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
            { type: "bot", content: "No problem! Feel free to come back anytime. Good luck with your application! " },
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
    // Add user message with the button label
    if (label) {
      const newIndex = messagesLengthRef.current;
      setMessages((prev) => [...prev, { type: "user" as const, content: label }]);
      messagesLengthRef.current = newIndex + 1;
      setLastUserMessageIndex(newIndex);
      setHideScrollbar(true); // Hide scrollbar before scroll starts
      setShouldScrollToUser(true);
    }

    setIsPaused(false);
    setShowInput(null);
    setStep((s) => s + 1);
  };

  // ===========================================
  // SUB-COMPONENTS
  // ===========================================

  // Category header icons - static, defined once
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
    "Your Child": (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    ),
    Income: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    Calculation: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
    Planning: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    Summary: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
    "Next Steps": (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    ),
  };

  const CategoryHeader = React.memo(({ label }: { label: string }) => (
    <div className="pt-6 pb-2">
      <span
        className="text-[12px] font-bold uppercase flex items-center gap-2"
        style={{ color: colors.text, letterSpacing: "0.12em" }}
      >
        {categoryIcons[label]}
        {label}
      </span>
    </div>
  ));

  // Memoized calculation card to prevent re-renders
  const calculationCardContent = React.useMemo(() => {
    const isCouple = data.applicationType === "couple";

    // Values without part-time work (for comparison)
    const youWithoutWork = {
      basis: myCalc.basisWithoutWork,
      plus: Math.round(myCalc.basisWithoutWork / 2),
    };
    const partnerWithoutWork = {
      basis: partnerCalc.basisWithoutWork,
      plus: Math.round(partnerCalc.basisWithoutWork / 2),
    };

    // Helper to render amount with strikethrough if different
    const renderAmount = (current: number, original: number, size: string = "13px", bold: boolean = false) => {
      const hasPartTime = workPartTime && current !== original;
      const fontWeight = bold ? 600 : 400;
      if (hasPartTime) {
        return (
          <span style={{ color: colors.textDark, fontSize: size, fontWeight }}>
            <span style={{ textDecoration: "line-through", opacity: 0.5, marginRight: "4px", fontSize: "12px" }}>
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
        bg: "rgba(192, 99, 11, 0.85)",
      },
      {
        label: "PLUS",
        you: myCalc.plus,
        youOrig: youWithoutWork.plus,
        partner: partnerCalc.plus,
        partnerOrig: partnerWithoutWork.plus,
        maxMonths: isCouple ? 28 : 24,
        bg: "rgba(252, 99, 27, 0.85)",
      },
    ];

    // Calculate max possible total for couples (higher earner takes more months)
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

    // Calculate original total (without part-time) for strikethrough
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

    // Bonus amount for hint
    const bonusPerMonth = isCouple ? myCalc.bonus + partnerCalc.bonus : myCalc.bonus;

    return (
      <div className="py-3">
        {/* Cards */}
        <div className="flex gap-3">
          {cards.map((item, i) => {
            const maxTotal = getMaxTotal(item);
            const originalTotal = getOriginalTotal(item);
            const totalChanged = workPartTime && maxTotal !== originalTotal;

            return (
              <div
                key={i}
                className="flex-1 rounded-xl p-4"
                style={{
                  backgroundColor: item.bg,
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                {/* Label with tooltip */}
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="font-bold" style={{ color: colors.textDark, fontSize: "17px" }}>
                    {item.label}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const key = item.label.toLowerCase();
                      setOpenTooltips((prev) => {
                        const newSet = new Set(prev);
                        if (newSet.has(key)) {
                          newSet.delete(key);
                        } else {
                          newSet.add(key);
                        }
                        return newSet;
                      });
                    }}
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.1)" }}
                  >
                    <span style={{ color: colors.textDark, fontSize: "10px", fontWeight: 600 }}>i</span>
                  </button>
                </div>

                {/* Tooltip content */}
                {openTooltips.has(item.label.toLowerCase()) && (
                  <div
                    className="mb-3 p-2 rounded-lg"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.5)",
                      fontSize: "12px",
                      color: colors.textDark,
                      lineHeight: 1.4,
                    }}
                  >
                    {item.label === "BASIS"
                      ? "65-67% of your net income (higher rate for lower incomes). Max 12 months per parent, 14 total."
                      : "Half the amount, twice as long. Ideal when working part-time. 1 Basis = 2 Plus months."}
                  </div>
                )}

                {/* Monthly Amounts */}
                {isCouple ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span style={{ color: colors.textDark, fontSize: "13px" }}>You</span>
                      {renderAmount(item.you, item.youOrig, "13px")}
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: colors.textDark, fontSize: "13px" }}>Partner</span>
                      {renderAmount(item.partner, item.partnerOrig, "13px")}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span style={{ color: colors.textDark, fontSize: "13px" }}>You</span>
                    {renderAmount(item.you, item.youOrig, "13px")}
                  </div>
                )}

                {/* Total */}
                <div
                  className="mt-1 pt-1 flex items-center justify-between"
                  style={{ borderTop: "1px solid rgba(0,0,0,0.1)" }}
                >
                  <span style={{ color: colors.textDark, fontSize: "13px" }}>{item.maxMonths} months</span>
                  <div>
                    {totalChanged && (
                      <span
                        style={{
                          color: colors.textDark,
                          fontSize: "12px",
                          opacity: 0.5,
                          textDecoration: "line-through",
                          marginRight: "4px",
                        }}
                      >
                        €{originalTotal.toLocaleString("de-DE")}
                      </span>
                    )}
                    <span className="font-bold" style={{ color: colors.textDark, fontSize: "13px" }}>
                      €{maxTotal.toLocaleString("de-DE")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Part-time toggle - whole row clickable */}
        <button
          onClick={() => setWorkPartTime(!workPartTime)}
          className="mt-4 w-full flex items-center justify-between cursor-pointer"
        >
          <span style={{ color: colors.textDark, fontSize: "14px" }}>Planning to work part-time?</span>
          <div
            className="relative w-11 h-6 rounded-full transition-colors duration-200"
            style={{
              backgroundColor: workPartTime ? "#c0630b" : colors.border,
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{
                transform: workPartTime ? "translateX(20px)" : "translateX(0)",
              }}
            />
          </div>
        </button>

        {/* Part-time steppers */}
        {workPartTime && (
          <div className="mt-1">
            <p style={{ color: colors.text, fontSize: "12px", marginBottom: "12px" }}>
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

        {/* Partnership Bonus Hint */}
        <div
          className="flex items-start gap-2 mt-4 p-3 rounded-lg"
          style={{ backgroundColor: "rgba(255, 189, 240, 0.5)" }}
        >
          <svg
            className="w-4 h-4 shrink-0 mt-0.5"
            style={{ color: colors.textDark }}
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
          <p style={{ color: colors.textDark, fontSize: "13px", lineHeight: 1.4 }}>
            <strong>Partnership Bonus</strong>: +€{bonusPerMonth.toLocaleString("de-DE")}/month extra for 2-4 months
            {isCouple ? " if both work 24-32h/week simultaneously" : " if you work 24-32h/week"}
          </p>
        </div>
      </div>
    );
  }, [myCalc, partnerCalc, data.applicationType, workPartTime, partTimeIncome, partnerPartTimeIncome, openTooltips]);

  const CalculationCard = () => {
    return <div className="py-3">{calculationCardContent}</div>;
  };

  const PlannerComponent = () => {
    const tips = [
      "Tap a cell to assign Elterngeld. Tap again to cycle through options.",
      "Plus months count as 0.5 toward your budget.",
      "Bonus requires both parents to work 24–32 hours.",
      "You can take months simultaneously or one after another.",
      "Months count from birth date, not calendar months. E.g. born March 15 → month 1 is March 15 – April 14.",
    ];

    // Apply preset scenarios
    const applyPreset = (preset: "12+2" | "7+7" | "12-solo" | "14-solo" | "clear") => {
      setLastEditedCell(null);
      setSelectedScenario("");

      if (preset === "12+2") {
        setPlannerData(
          Array(32)
            .fill(null)
            .map((_, i) => ({
              you: i < 12 ? "basis" : "none",
              partner: i >= 12 && i < 14 ? "basis" : "none",
            })),
        );
      } else if (preset === "7+7") {
        setPlannerData(
          Array(32)
            .fill(null)
            .map((_, i) => ({
              you: i < 7 ? "basis" : "none",
              partner: i >= 7 && i < 14 ? "basis" : "none",
            })),
        );
      } else if (preset === "12-solo") {
        setPlannerData(
          Array(32)
            .fill(null)
            .map((_, i) => ({
              you: i < 12 ? "basis" : "none",
              partner: "none",
            })),
        );
      } else if (preset === "14-solo") {
        setPlannerData(
          Array(32)
            .fill(null)
            .map((_, i) => ({
              you: i < 14 ? "basis" : "none",
              partner: "none",
            })),
        );
      } else {
        setPlannerData(
          Array(32)
            .fill(null)
            .map(() => ({ you: "none", partner: "none" })),
        );
      }
    };

    // Use parent-level calculations (no hooks inside this function)
    const visibleData = plannerVisibleData;
    const {
      youBasis,
      youPlus,
      youBonus,
      partnerBasis,
      partnerPlus,
      partnerBonus,
      youBudget,
      partnerBudget,
      totalBudget,
      maxBudget,
      totalMoney,
      globalErrors,
      rowErrors,
    } = plannerValidation;

    // Get error months array for styling
    const errorMonths = Array.from(rowErrors.keys());

    // Card styling function
    const getCardStyle = (type: "none" | "basis" | "plus" | "bonus", person: "you" | "partner", monthIndex: number) => {
      const hasError =
        errorMonths.includes(monthIndex) && lastEditedCell?.month === monthIndex && lastEditedCell?.person === person;

      const baseStyle = {
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      };

      if (type === "none") {
        return {
          ...baseStyle,
          backgroundColor: hasError ? "rgba(254, 202, 202, 0.5)" : "rgba(255, 255, 255, 0.5)",
          border: hasError ? `1.5px solid ${colors.error}` : `1.5px dashed rgba(0, 0, 0, 0.3)`,
        };
      }
      if (type === "basis") {
        return {
          ...baseStyle,
          backgroundColor: hasError ? "rgba(254, 202, 202, 0.5)" : "rgba(192, 99, 11, 0.85)",
          border: hasError ? `1.5px solid ${colors.error}` : `1px solid ${colors.border}`,
        };
      }
      if (type === "plus") {
        return {
          ...baseStyle,
          backgroundColor: hasError ? "rgba(254, 202, 202, 0.5)" : "rgba(252, 99, 27, 0.85)",
          border: hasError ? `1.5px solid ${colors.error}` : `1px solid ${colors.border}`,
        };
      }
      if (type === "bonus") {
        return {
          ...baseStyle,
          backgroundColor: hasError ? "rgba(254, 202, 202, 0.5)" : "rgba(255, 189, 240, 0.85)",
          border: hasError ? `1.5px solid ${colors.error}` : `1px solid ${colors.border}`,
        };
      }
      return baseStyle;
    };

    const getLabel = (type: "none" | "basis" | "plus" | "bonus") => {
      if (type === "basis") return "BASIS";
      if (type === "plus") return "PLUS";
      if (type === "bonus") return "BONUS";
      return null;
    };

    // Use parent-level scroll progress
    const scrollProgress = plannerScrollProgress;
    const isAtBottom = scrollProgress > 0.95;
    const isAtTop = scrollProgress < 0.05;
    const hasErrors = globalErrors.length > 0 || rowErrors.size > 0;
    const isEmpty = totalBudget === 0;
    const isCouple = data.applicationType === "couple";

    // Layout constants
    const rowHeight = 44;
    const rowGap = 8;
    const visibleRows = 6;
    const listHeight = rowHeight * visibleRows + rowGap * (visibleRows - 1);

    // Colors for status messages
    const plannerColors = {
      tipBg: "#F5F0E8",
      errorBg: "#FEF2F2",
      successBg: "#F0FDF4",
      errorText: "#DC2626",
      successText: "#16A34A",
    };

    return (
      <div className="py-4">
        {/* Status Row: Tips/Error/Success + Budget Counter + Fullscreen */}
        <div className="mb-3 flex items-stretch gap-2" style={{ minHeight: 60 }}>
          {isEmpty ? (
            // Tips carousel
            <button
              onClick={nextTip}
              className="flex-1 p-3 rounded-xl flex items-center gap-2 text-left transition-all active:scale-[0.99] overflow-hidden"
              style={{ backgroundColor: plannerColors.tipBg }}
            >
              <svg
                className="w-4 h-4 shrink-0"
                style={{ color: colors.textDark }}
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
              <span className="flex-1" style={{ color: colors.textDark, fontSize: "13px", lineHeight: 1.4 }}>
                {tips[currentTip]}
              </span>
              <svg
                className="w-4 h-4 shrink-0"
                style={{ color: colors.text }}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : hasErrors ? (
            // Error state
            <div
              className="flex-1 p-3 rounded-xl flex items-center gap-2 overflow-hidden"
              style={{ backgroundColor: plannerColors.errorBg }}
            >
              <svg
                className="w-4 h-4 shrink-0"
                style={{ color: plannerColors.errorText }}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="flex-1" style={{ color: plannerColors.errorText, fontSize: "13px", lineHeight: 1.4 }}>
                {globalErrors[0] || Array.from(rowErrors.values())[0]?.[0]}
              </span>
            </div>
          ) : totalBudget >= maxBudget ? (
            // Complete success state
            <div
              className="flex-1 p-3 rounded-xl flex items-center gap-2 overflow-hidden"
              style={{ backgroundColor: plannerColors.successBg }}
            >
              <svg
                className="w-4 h-4 shrink-0"
                style={{ color: plannerColors.successText }}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span
                className="line-clamp-2"
                style={{ color: plannerColors.successText, fontSize: "13px", lineHeight: 1.4 }}
              >
                Done! Your plan is ready to submit.
              </span>
            </div>
          ) : (
            // In-progress success state
            <div
              className="flex-1 p-3 rounded-xl flex items-center gap-2 overflow-hidden"
              style={{ backgroundColor: plannerColors.successBg }}
            >
              <svg
                className="w-4 h-4 shrink-0"
                style={{ color: plannerColors.successText }}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span
                className="line-clamp-2"
                style={{ color: plannerColors.successText, fontSize: "13px", lineHeight: 1.4 }}
              >
                Plan looks good — continue to use your budget.
              </span>
            </div>
          )}

          {/* Budget Counter */}
          <div
            className="px-3 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: plannerColors.tipBg, minHeight: 60 }}
          >
            <span
              className="text-xs font-bold"
              style={{ color: totalBudget > maxBudget ? plannerColors.errorText : colors.textDark }}
            >
              {totalBudget % 1 === 0 ? totalBudget : totalBudget.toFixed(1)}/{maxBudget}
            </span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={() => setPlannerFullscreen(true)}
            className="px-3 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ backgroundColor: plannerColors.tipBg, minHeight: 60 }}
          >
            <svg
              className="w-4 h-4"
              style={{ color: colors.textDark }}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
              />
            </svg>
          </button>
        </div>

        {/* Column Headers */}
        <div className="flex items-center mb-2" style={{ gap: 8 }}>
          <div style={{ width: 24 }}>
            <span className="text-xs font-medium" style={{ color: colors.text }}>
              #
            </span>
          </div>
          <div className="flex-1">
            <span className="text-xs font-medium" style={{ color: colors.text }}>
              You
            </span>
          </div>
          {isCouple && (
            <div className="flex-1">
              <span className="text-xs font-medium" style={{ color: colors.text }}>
                Partner
              </span>
            </div>
          )}
          <div style={{ width: 72, marginLeft: 12 }}>
            <span className="text-xs font-medium" style={{ color: colors.text }}>
              Sum
            </span>
          </div>
          {/* Spacer for scrollbar */}
          <div style={{ width: 20 }} />
        </div>

        {/* Scrollable List Container */}
        <div className="relative flex" style={{ gap: 8 }}>
          {/* Month Rows */}
          <div className="relative flex-1">
            {/* Top Gradient Fade */}
            <div
              className="absolute top-0 left-0 right-0 pointer-events-none transition-opacity duration-300 z-10"
              style={{
                height: 40,
                background: `linear-gradient(to bottom, ${colors.background} 0%, transparent 100%)`,
                opacity: isAtTop ? 0 : 1,
              }}
            />
            <div
              ref={plannerScrollRef}
              className="overflow-y-auto"
              onScroll={handlePlannerScroll}
              style={{
                height: listHeight,
                scrollbarWidth: "none",
              }}
            >
              <div className="flex flex-col" style={{ gap: rowGap }}>
                {visibleData.map((month, i) => {
                  const youAmount =
                    month.you === "basis"
                      ? myCalc.basis
                      : month.you === "plus"
                        ? myCalc.plus
                        : month.you === "bonus"
                          ? myCalc.bonus
                          : 0;
                  const partnerAmount = isCouple
                    ? month.partner === "basis"
                      ? partnerCalc.basis
                      : month.partner === "plus"
                        ? partnerCalc.plus
                        : month.partner === "bonus"
                          ? partnerCalc.bonus
                          : 0
                    : 0;
                  const monthTotal = youAmount + partnerAmount;

                  // Info tooltip logic
                  const hasBonus = month.you === "bonus" || month.partner === "bonus";
                  const isMonth1or2 = i < 2 && (month.you !== "none" || month.partner !== "none");
                  const infoTooltip = hasBonus
                    ? "Bonus requires both parents to work 24–32 hours/week."
                    : isMonth1or2
                      ? "Maternity pay counts as Basis and is deducted from Elterngeld."
                      : null;

                  return (
                    <div key={i} className="flex items-center" style={{ gap: 8, height: rowHeight }}>
                      {/* Month number */}
                      <div style={{ width: 24 }}>
                        <span className="text-xs font-bold" style={{ color: colors.textDark }}>
                          {i + 1}
                        </span>
                      </div>

                      {/* You card */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => cycleType(i, "you", e)}
                        className="flex-1 rounded-xl transition-all active:scale-95 flex items-center justify-center"
                        style={{
                          height: rowHeight,
                          ...getCardStyle(month.you, "you", i),
                        }}
                      >
                        {(() => {
                          const hasError =
                            errorMonths.includes(i) && lastEditedCell?.month === i && lastEditedCell?.person === "you";
                          const textColor = hasError ? plannerColors.errorText : colors.textDark;

                          if (month.you === "none") {
                            return <span style={{ color: textColor, fontSize: 18, fontWeight: 400 }}>+</span>;
                          }
                          return (
                            <div className="flex items-center justify-between w-full px-2">
                              <span style={{ color: textColor, fontSize: 18 }}>‹</span>
                              <div className="flex items-center gap-1">
                                {hasError && (
                                  <svg
                                    className="w-3 h-3"
                                    style={{ color: plannerColors.errorText }}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                  </svg>
                                )}
                                <span style={{ color: textColor, fontSize: 12, fontWeight: 600 }}>
                                  {getLabel(month.you)}
                                </span>
                              </div>
                              <span style={{ color: textColor, fontSize: 18 }}>›</span>
                            </div>
                          );
                        })()}
                      </button>

                      {/* Partner card (couples only) */}
                      {isCouple && (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => cycleType(i, "partner", e)}
                          className="flex-1 rounded-xl transition-all active:scale-95 flex items-center justify-center"
                          style={{
                            height: rowHeight,
                            ...getCardStyle(month.partner, "partner", i),
                          }}
                        >
                          {(() => {
                            const hasError =
                              errorMonths.includes(i) &&
                              lastEditedCell?.month === i &&
                              lastEditedCell?.person === "partner";
                            const textColor = hasError ? plannerColors.errorText : colors.textDark;

                            if (month.partner === "none") {
                              return <span style={{ color: textColor, fontSize: 18, fontWeight: 400 }}>+</span>;
                            }
                            return (
                              <div className="flex items-center justify-between w-full px-2">
                                <span style={{ color: textColor, fontSize: 18 }}>‹</span>
                                <div className="flex items-center gap-1">
                                  {hasError && (
                                    <svg
                                      className="w-3 h-3"
                                      style={{ color: plannerColors.errorText }}
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                      />
                                    </svg>
                                  )}
                                  <span style={{ color: textColor, fontSize: 12, fontWeight: 600 }}>
                                    {getLabel(month.partner)}
                                  </span>
                                </div>
                                <span style={{ color: textColor, fontSize: 18 }}>›</span>
                              </div>
                            );
                          })()}
                        </button>
                      )}

                      {/* Sum + Info icon */}
                      <div style={{ width: 72, marginLeft: 12 }} className="flex items-center gap-1">
                        {infoTooltip && (
                          <div className="relative group">
                            <svg
                              className="w-3.5 h-3.5 cursor-help"
                              style={{ color: colors.text }}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.5}
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <div
                              className="absolute bottom-full right-0 mb-2 px-3 py-2 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                              style={{
                                backgroundColor: colors.textDark,
                                color: colors.white,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                width: "200px",
                                lineHeight: 1.4,
                              }}
                            >
                              {infoTooltip}
                              <div
                                className="absolute top-full right-2 border-4 border-transparent"
                                style={{ borderTopColor: colors.textDark }}
                              />
                            </div>
                          </div>
                        )}
                        <span className="text-xs font-bold" style={{ color: colors.textDark }}>
                          {monthTotal > 0 ? `€${monthTotal.toLocaleString("de-DE")}` : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Gradient Fade */}
            <div
              className="absolute bottom-0 left-0 right-0 pointer-events-none transition-opacity duration-300"
              style={{
                height: 60,
                background: `linear-gradient(to top, ${colors.background} 0%, transparent 100%)`,
                opacity: isAtBottom ? 0 : 1,
              }}
            />
          </div>

          {/* Scroll Progress Track */}
          <div
            className="relative rounded-full ml-4"
            style={{
              width: 4,
              height: listHeight,
              backgroundColor: colors.border,
            }}
          >
            <div
              className="absolute left-0 right-0 rounded-full transition-all duration-150"
              style={{
                backgroundColor: colors.basis,
                height: "30%",
                top: `${scrollProgress * 70}%`,
              }}
            />
          </div>
        </div>

        {/* Presets */}
        <div style={{ marginTop: 24, marginBottom: 4 }}>
          <span className="text-xs font-medium" style={{ color: colors.text }}>
            {isCouple ? "Try a popular split" : "Try a preset"}
          </span>
        </div>

        <div className="flex justify-between items-center mt-1">
          {/* Left: Presets */}
          <div className="flex gap-2">
            {isCouple ? (
              <>
                <button
                  onClick={() => applyPreset("12+2")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                  style={{
                    backgroundColor: colors.white,
                    color: colors.textDark,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  12 + 2
                </button>
                <button
                  onClick={() => applyPreset("7+7")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                  style={{
                    backgroundColor: colors.white,
                    color: colors.textDark,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  7 + 7
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => applyPreset("12-solo")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                  style={{
                    backgroundColor: colors.white,
                    color: colors.textDark,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  12 Basis
                </button>
                <button
                  onClick={() => applyPreset("14-solo")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                  style={{
                    backgroundColor: colors.white,
                    color: colors.textDark,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  14 Basis
                </button>
              </>
            )}
            <button
              onClick={() => applyPreset("clear")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
              style={{ backgroundColor: colors.background, color: colors.text, border: `1px solid ${colors.border}` }}
            >
              Clear
            </button>
          </div>

          {/* Right: Save Button */}
          {!plannerEmailSaved && (
            <button
              onClick={() => setShowPlannerSaveInput(true)}
              className="px-6 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 flex items-center gap-1.5"
              style={{ backgroundColor: colors.buttonDark, color: colors.white }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                />
              </svg>
              Save plan
            </button>
          )}

          {/* Saved confirmation (inline) */}
          {plannerEmailSaved && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(26, 182, 137, 0.15)" }}
              >
                <svg
                  className="w-2.5 h-2.5"
                  style={{ color: colors.success }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-xs" style={{ color: colors.text }}>
                Saved!
              </span>
            </div>
          )}
        </div>

        {/* Save/Sign Up Popup */}
        {showPlannerSaveInput && !plannerEmailSaved && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            onClick={() => setShowPlannerSaveInput(false)}
          >
            <div
              className="mx-4 w-full max-w-sm rounded-2xl p-6 relative"
              style={{ backgroundColor: colors.white }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close X Button */}
              <button
                onClick={() => setShowPlannerSaveInput(false)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: colors.text }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
                style={{ backgroundColor: colors.tile }}
              >
                <svg
                  className="w-6 h-6"
                  style={{ color: colors.textDark }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                  />
                </svg>
              </div>

              {/* Title */}
              <p className="text-[18px] font-semibold mb-1" style={{ color: colors.textDark }}>
                Save your plan
              </p>
              <p className="text-[14px] mb-5" style={{ color: colors.text }}>
                Create a free account to save your plan and track your progress.
              </p>

              {/* Google Button */}
              <button
                onClick={async () => {
                  setPlannerEmailSaving(true);
                  try {
                    await signInWithGoogle();
                  } catch (error) {
                    console.error('Google sign in error:', error);
                    setPlannerEmailError('Failed to sign in with Google');
                  }
                  setPlannerEmailSaving(false);
                }}
                disabled={plannerEmailSaving}
                className="w-full py-3 rounded-xl text-[14px] font-medium flex items-center justify-center gap-3 mb-4"
                style={{
                  backgroundColor: colors.white,
                  color: colors.textDark,
                  border: `1.5px solid ${colors.text}`,
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
                <span className="text-[12px]" style={{ color: colors.text }}>
                  or
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
              </div>

              {/* Email Input */}
              <input
                type="email"
                value={plannerSaveEmail}
                onChange={(e) => {
                  setPlannerSaveEmail(e.target.value);
                  setPlannerEmailError("");
                }}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl text-[15px] outline-none mb-3"
                style={{
                  backgroundColor: colors.white,
                  color: colors.textDark,
                  border: plannerEmailError ? `1.5px solid ${colors.error}` : `1.5px solid ${colors.border}`,
                }}
              />
              {plannerEmailError && (
                <p className="text-[12px] mb-3 -mt-2" style={{ color: colors.error }}>
                  {plannerEmailError}
                </p>
              )}

              {/* Email Consent Checkbox */}
              <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailConsent}
                  onChange={(e) => setEmailConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded"
                  style={{ accentColor: colors.buttonDark }}
                />
                <span className="text-[12px] leading-snug" style={{ color: colors.text }}>
                  Send me a reminder before my application deadline and helpful tips about Elterngeld.
                </span>
              </label>

              {/* Email Button */}
              <button
                onClick={async () => {
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(plannerSaveEmail)) {
                    setPlannerEmailError("Please enter a valid email");
                    return;
                  }
                  setPlannerEmailSaving(true);
                  const { error } = await signInWithEmail(plannerSaveEmail, emailConsent);
                  if (error) {
                    setPlannerEmailError(error.message);
                    setPlannerEmailSaving(false);
                  } else {
                    setPlannerEmailSaved(true);
                    setPlannerEmailSaving(false);
                    setShowPlannerSaveInput(false);
                  }
                }}
                disabled={plannerEmailSaving}
                className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2"
                style={{
                  backgroundColor: colors.tile,
                  color: colors.textDark,
                  opacity: plannerEmailSaving ? 0.7 : 1,
                }}
              >
                {plannerEmailSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-stone-600 border-t-transparent rounded-full animate-spin" />
                    Sending link...
                  </>
                ) : (
                  "Continue with Email"
                )}
              </button>

              {/* Terms */}
              <p className="text-[12px] text-center mt-4" style={{ color: colors.text }}>
                By signing up, you agree to our{" "}
                <a href="/terms" className="underline">
                  Terms
                </a>{" "}
                and{" "}
                <a href="/privacy" className="underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        )}

        {/* Fullscreen Modal */}
        {plannerFullscreen && (
          <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: colors.background }}>
            {/* Fullscreen Header */}
            <div className="flex-shrink-0" style={{ backgroundColor: colors.background }}>
              <div className="px-5 py-3">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                  {/* Budget Counter */}
                  <div
                    className="px-3 py-2 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: plannerColors.tipBg }}
                  >
                    <span
                      className="text-xs font-bold"
                      style={{ color: totalBudget > maxBudget ? plannerColors.errorText : colors.textDark }}
                    >
                      {totalBudget % 1 === 0 ? totalBudget : totalBudget.toFixed(1)}/{maxBudget}
                    </span>
                  </div>

                  {/* Right Side - Close Button */}
                  <button
                    onClick={() => setPlannerFullscreen(false)}
                    className="w-8 h-8 flex items-center justify-center transition-all hover:opacity-60"
                    title="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke={colors.text} strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Header Divider */}
              <div className="h-px w-full" style={{ backgroundColor: colors.border }}></div>
            </div>

            {/* Fullscreen Content */}
            <div className="flex-1 overflow-auto px-4 py-4">
              {/* Status Row */}
              <div className="mb-3">
                {isEmpty ? (
                  <button
                    onClick={nextTip}
                    className="w-full p-3 rounded-xl flex items-center gap-2 text-left transition-all active:scale-[0.99]"
                    style={{ backgroundColor: plannerColors.tipBg }}
                  >
                    <svg
                      className="w-4 h-4 shrink-0"
                      style={{ color: colors.textDark }}
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
                    <span className="text-xs flex-1" style={{ color: colors.textDark }}>
                      {tips[currentTip]}
                    </span>
                    <svg
                      className="w-4 h-4 shrink-0"
                      style={{ color: colors.text }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : hasErrors ? (
                  <div
                    className="w-full p-3 rounded-xl flex items-center gap-2"
                    style={{ backgroundColor: plannerColors.errorBg }}
                  >
                    <svg
                      className="w-4 h-4 shrink-0"
                      style={{ color: plannerColors.errorText }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span className="text-xs flex-1" style={{ color: plannerColors.errorText }}>
                      {globalErrors[0] || Array.from(rowErrors.values())[0]?.[0]}
                    </span>
                  </div>
                ) : (
                  <div
                    className="w-full p-3 rounded-xl flex items-center gap-2"
                    style={{ backgroundColor: plannerColors.successBg }}
                  >
                    <svg
                      className="w-4 h-4 shrink-0"
                      style={{ color: plannerColors.successText }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs" style={{ color: plannerColors.successText }}>
                      {totalBudget >= maxBudget
                        ? "Done! Your plan is ready to submit."
                        : "Plan looks good — continue to use your budget."}
                    </span>
                  </div>
                )}
              </div>

              {/* Column Headers */}
              <div className="flex items-center mb-2" style={{ gap: 8 }}>
                <div style={{ width: 24 }}>
                  <span className="text-xs font-medium" style={{ color: colors.text }}>
                    #
                  </span>
                </div>
                <div className="flex-1">
                  <span className="text-xs font-medium" style={{ color: colors.text }}>
                    You
                  </span>
                </div>
                {isCouple && (
                  <div className="flex-1">
                    <span className="text-xs font-medium" style={{ color: colors.text }}>
                      Partner
                    </span>
                  </div>
                )}
                <div style={{ width: 72, marginLeft: 12 }}>
                  <span className="text-xs font-medium" style={{ color: colors.text }}>
                    Sum
                  </span>
                </div>
              </div>

              {/* All Rows (no scroll limit in fullscreen) */}
              <div className="space-y-2">
                {visibleData.map((month, i) => {
                  const youAmount =
                    month.you === "basis"
                      ? myCalc.basis
                      : month.you === "plus"
                        ? myCalc.plus
                        : month.you === "bonus"
                          ? myCalc.bonus
                          : 0;
                  const partnerAmount = isCouple
                    ? month.partner === "basis"
                      ? partnerCalc.basis
                      : month.partner === "plus"
                        ? partnerCalc.plus
                        : month.partner === "bonus"
                          ? partnerCalc.bonus
                          : 0
                    : 0;
                  const rowSum = youAmount + partnerAmount;

                  return (
                    <div key={i} className="flex items-center" style={{ gap: 8, height: 44 }}>
                      <div style={{ width: 24 }}>
                        <span className="text-xs font-medium" style={{ color: colors.text }}>
                          {i + 1}
                        </span>
                      </div>

                      {/* You Cell */}
                      <button
                        onClick={(e) => cycleType(i, "you", e)}
                        className="flex-1 h-full rounded-xl flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
                        style={getCardStyle(month.you, "you", i)}
                      >
                        {month.you === "none" ? (
                          <span className="text-sm" style={{ color: colors.text }}>
                            +
                          </span>
                        ) : (
                          <>
                            <svg
                              className="w-3 h-3"
                              style={{ color: colors.textDark }}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="text-xs font-bold" style={{ color: colors.textDark }}>
                              {getLabel(month.you)}
                            </span>
                            <svg
                              className="w-3 h-3"
                              style={{ color: colors.textDark }}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </>
                        )}
                      </button>

                      {/* Partner Cell */}
                      {isCouple && (
                        <button
                          onClick={(e) => cycleType(i, "partner", e)}
                          className="flex-1 h-full rounded-xl flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
                          style={getCardStyle(month.partner, "partner", i)}
                        >
                          {month.partner === "none" ? (
                            <span className="text-sm" style={{ color: colors.text }}>
                              +
                            </span>
                          ) : (
                            <>
                              <svg
                                className="w-3 h-3"
                                style={{ color: colors.textDark }}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                              </svg>
                              <span className="text-xs font-bold" style={{ color: colors.textDark }}>
                                {getLabel(month.partner)}
                              </span>
                              <svg
                                className="w-3 h-3"
                                style={{ color: colors.textDark }}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </>
                          )}
                        </button>
                      )}

                      {/* Sum */}
                      <div style={{ width: 72, marginLeft: 12 }} className="flex items-center gap-1">
                        {rowSum > 0 ? (
                          <>
                            <svg
                              className="w-3 h-3 shrink-0"
                              style={{ color: colors.text }}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.5}
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span className="text-xs font-medium" style={{ color: colors.textDark }}>
                              €{rowSum.toLocaleString("de-DE")}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs" style={{ color: colors.text }}>
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fullscreen Footer - Presets */}
            <div className="px-4 py-3 border-t" style={{ backgroundColor: colors.white, borderColor: colors.border }}>
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {isCouple ? (
                    <>
                      <button
                        onClick={() => applyPreset("12+2")}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                        style={{
                          backgroundColor: colors.white,
                          color: colors.textDark,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        12 + 2
                      </button>
                      <button
                        onClick={() => applyPreset("7+7")}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                        style={{
                          backgroundColor: colors.white,
                          color: colors.textDark,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        7 + 7
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => applyPreset("12-solo")}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                        style={{
                          backgroundColor: colors.white,
                          color: colors.textDark,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        12 Basis
                      </button>
                      <button
                        onClick={() => applyPreset("14-solo")}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                        style={{
                          backgroundColor: colors.white,
                          color: colors.textDark,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        14 Basis
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => applyPreset("clear")}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                    style={{
                      backgroundColor: colors.background,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    Clear
                  </button>
                </div>
                <button
                  onClick={() => setPlannerFullscreen(false)}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 flex items-center gap-2"
                  style={{ backgroundColor: colors.buttonDark, color: colors.white }}
                >
                  <span>Done</span>
                  <span className="text-[14px]">→</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Memoized static components
  const introChecklistContent = React.useMemo(
    () => (
      <div className="pt-2 pb-6">
        <div
          className="rounded-xl p-4 space-y-2.5"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.4)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)",
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
                style={{ color: "#C0630B" }}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-[15px] leading-snug" style={{ color: colors.text }}>
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
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
          {["Eligibility", "Calculation", "Planning"].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span style={{ color: colors.text }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    [],
  );

  const CheckmarksComponent = () => checkmarksContent;

  // Success Page - wie PDF Flow Download Seite
  // Email Capture Inline Component - Compact conversational style
  const CtaCard = () => {
    // Bundesland lists
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

    // Local state (only for waitlist form - doesn't need to persist)
    const [waitlistEmail, setWaitlistEmail] = React.useState("");
    const [waitlistConsent, setWaitlistConsent] = React.useState(false);
    const [waitlistSubmitting, setWaitlistSubmitting] = React.useState(false);
    const [waitlistSubmitted, setWaitlistSubmitted] = React.useState(false);
    const [waitlistError, setWaitlistError] = React.useState("");

    const isSupported = SUPPORTED_STATES.includes(selectedState);

    // Reviews data (state is managed in parent)
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

    // STEP 1: Teaser + Bundesland Selection
    if (ctaStep === 1) {
      return (
        <div className="py-4">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: colors.white,
              boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div className="p-6">
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
                style={{ backgroundColor: colors.tile }}
              >
                <svg
                  className="w-6 h-6"
                  style={{ color: colors.textDark }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
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

              {/* Title & Description */}
              <p className="text-[18px] font-semibold mb-1" style={{ color: colors.textDark }}>
                Get your official application
              </p>
              <p className="text-[14px] mb-5" style={{ color: colors.text, lineHeight: 1.4 }}>
                Pre-filled PDF with your details. Just print, sign, and submit.
              </p>

              {/* Bundesland Dropdown */}
              <div className="mb-4">
                <label className="text-[13px] font-medium mb-1.5 block" style={{ color: colors.textDark }}>
                  Select your state
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-[15px] outline-none appearance-none cursor-pointer"
                  style={{
                    backgroundColor: colors.white,
                    color: selectedState ? colors.textDark : colors.text,
                    border: `1.5px solid ${colors.border}`,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2378716c'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px center",
                    backgroundSize: "20px",
                  }}
                >
                  <option value="">Choose Bundesland...</option>
                  {ALL_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              {/* Button */}
              <button
                onClick={handleContinue}
                disabled={!selectedState}
                className="w-full py-3 px-4 rounded-xl text-[14px] font-semibold flex items-center justify-between transition-opacity"
                style={{
                  backgroundColor: colors.buttonDark,
                  color: colors.white,
                  opacity: selectedState ? 1 : 0.5,
                  cursor: selectedState ? "pointer" : "not-allowed",
                }}
              >
                <span className="w-[18px]" />
                <span>Create my application</span>
                <span className="text-[18px]">→</span>
              </button>
            </div>
          </div>

          {/* Reviews - Below card */}
          <div
            className="mt-4 flex items-center justify-center gap-1.5 transition-opacity duration-300"
            style={{ opacity: reviewFade ? 1 : 0 }}
          >
            <div className="flex items-center shrink-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-[12px]" style={{ color: colors.stars }}>
                  ★
                </span>
              ))}
            </div>
            <p className="text-[13px]" style={{ color: colors.text }}>
              "{reviews[currentReview].text}"
            </p>
          </div>

          {/* Ask a question */}
          <button onClick={() => openChat()} className="w-full mt-2 text-[13px]" style={{ color: colors.text }}>
            Have a question? <span style={{ textDecoration: "underline" }}>Ask here</span>
          </button>
        </div>
      );
    }

    // STEP 2a: Payment (Supported State)
    if (ctaStep === 2 && isSupported) {
      return (
        <div className="py-4">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: colors.white,
              boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div className="p-6">
              {/* Icon + State Badge */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: colors.tile }}
                >
                  <svg
                    className="w-6 h-6"
                    style={{ color: colors.textDark }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
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
                  style={{ backgroundColor: "rgba(26, 182, 137, 0.1)" }}
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
                  <span className="text-[12px] font-medium" style={{ color: colors.success }}>
                    {selectedState}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <p className="text-[18px] font-semibold mb-1" style={{ color: colors.textDark }}>
                Get your official application
              </p>
              <p className="text-[14px] mb-4" style={{ color: colors.text, lineHeight: 1.4 }}>
                We pre-fill your details and generate the official 23-page PDF.
              </p>

              {/* Features */}
              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 shrink-0"
                    style={{ color: colors.success }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[14px]" style={{ color: colors.textDark }}>
                    Official Elterngeld form (pre-filled)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 shrink-0"
                    style={{ color: colors.success }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[14px]" style={{ color: colors.textDark }}>
                    Personalized document checklist
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 shrink-0"
                    style={{ color: colors.success }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[14px]" style={{ color: colors.textDark }}>
                    Instant PDF download
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-[24px] font-bold" style={{ color: colors.textDark }}>
                  €39
                </span>
                <span className="line-through text-[14px]" style={{ color: colors.text }}>
                  €49
                </span>
                <span className="text-[13px]" style={{ color: colors.text }}>
                  one-time
                </span>
              </div>

              {/* Button */}
              <button
                onClick={() => {
                  saveToPdfFlow();
                  setShowPdfFlow(true);
                }}
                className="w-full py-3 px-4 rounded-xl text-[14px] font-semibold flex items-center justify-between"
                style={{ backgroundColor: colors.buttonDark, color: colors.white }}
              >
                <span className="w-[18px]" />
                <span>Continue to application</span>
                <span className="text-[18px]">→</span>
              </button>

              {/* Back Button */}
              <button
                onClick={() => setCtaStep(1)}
                className="w-full mt-3 text-[11px] flex items-center justify-center gap-1"
                style={{ color: colors.text }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Change state
              </button>
            </div>
          </div>

          {/* Reviews - Below card */}
          <div
            className="mt-4 flex items-center justify-center gap-1.5 transition-opacity duration-300"
            style={{ opacity: reviewFade ? 1 : 0 }}
          >
            <div className="flex items-center shrink-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-[12px]" style={{ color: colors.stars }}>
                  ★
                </span>
              ))}
            </div>
            <p className="text-[13px]" style={{ color: colors.text }}>
              "{reviews[currentReview].text}"
            </p>
          </div>

          {/* Ask a question */}
          <button onClick={() => openChat()} className="w-full mt-2 text-[13px]" style={{ color: colors.text }}>
            Have a question? <span style={{ textDecoration: "underline" }}>Ask here</span>
          </button>
        </div>
      );
    }

    // STEP 2b: Waitlist (Unsupported State)
    if (ctaStep === 2 && !isSupported) {
      return (
        <div className="py-4">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: colors.white,
              boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div className="p-6">
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
                style={{ backgroundColor: colors.tile }}
              >
                <svg
                  className="w-6 h-6"
                  style={{ color: colors.textDark }}
                  fill="none"
                  stroke="currentColor"
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

              {/* Title & Description */}
              <p className="text-[18px] font-semibold mb-1" style={{ color: colors.textDark }}>
                Coming soon to {selectedState}!
              </p>
              <p className="text-[14px] mb-5" style={{ color: colors.text, lineHeight: 1.4 }}>
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
                  <span className="text-[14px]" style={{ color: colors.textDark }}>
                    You're on the list! We'll email you when {selectedState} is ready.
                  </span>
                </div>
              ) : (
                <>
                  {/* Google Button */}
                  <button
                    onClick={async () => {
                      setWaitlistSubmitting(true);
                      try {
                        await signInWithGoogle();
                      } catch (error) {
                        console.error('Google sign in error:', error);
                        setWaitlistError('Failed to sign in with Google');
                      }
                      setWaitlistSubmitting(false);
                    }}
                    disabled={waitlistSubmitting}
                    className="w-full py-3 rounded-xl text-[14px] font-medium flex items-center justify-center gap-3 mb-4"
                    style={{
                      backgroundColor: colors.white,
                      color: colors.textDark,
                      border: `1.5px solid ${colors.text}`,
                    }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
                    <span className="text-[12px]" style={{ color: colors.text }}>
                      or
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
                  </div>

                  {/* Email Input */}
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={(e) => {
                      setWaitlistEmail(e.target.value);
                      setWaitlistError("");
                    }}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl text-[15px] outline-none mb-3"
                    style={{
                      backgroundColor: colors.white,
                      color: colors.textDark,
                      border: waitlistError ? `1.5px solid ${colors.error}` : `1.5px solid ${colors.border}`,
                    }}
                  />
                  {waitlistError && (
                    <p className="text-[12px] mb-3 -mt-2" style={{ color: colors.error }}>
                      {waitlistError}
                    </p>
                  )}

                  {/* Consent Checkbox */}
                  <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waitlistConsent}
                      onChange={(e) => setWaitlistConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded"
                      style={{ accentColor: colors.buttonDark }}
                    />
                    <span className="text-[12px] leading-snug" style={{ color: colors.text }}>
                      Send me updates when {selectedState} is available and helpful tips about Elterngeld.
                    </span>
                  </label>

                  {/* Email Button */}
                  <button
                    onClick={handleWaitlistSubmit}
                    disabled={waitlistSubmitting}
                    className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: colors.tile,
                      color: colors.textDark,
                      opacity: waitlistSubmitting ? 0.7 : 1,
                    }}
                  >
                    {waitlistSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-stone-600 border-t-transparent rounded-full animate-spin" />
                        Joining...
                      </>
                    ) : (
                      "Notify me"
                    )}
                  </button>
                </>
              )}

              {/* Back Button */}
              <button
                onClick={() => setCtaStep(1)}
                className="w-full mt-3 text-[11px] flex items-center justify-center gap-1"
                style={{ color: colors.text }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Change state
              </button>
            </div>
          </div>

          {/* Reviews - Below card */}
          <div
            className="mt-4 flex items-center justify-center gap-1.5 transition-opacity duration-300"
            style={{ opacity: reviewFade ? 1 : 0 }}
          >
            <div className="flex items-center shrink-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-[12px]" style={{ color: colors.stars }}>
                  ★
                </span>
              ))}
            </div>
            <p className="text-[13px]" style={{ color: colors.text }}>
              "{reviews[currentReview].text}"
            </p>
          </div>

          {/* Ask a question */}
          <button onClick={() => openChat()} className="w-full mt-2 text-[13px]" style={{ color: colors.text }}>
            Have a question? <span style={{ textDecoration: "underline" }}>Ask here</span>
          </button>
        </div>
      );
    }

    return null;
  };

  // Summary Box - neue Result Card mit Tabellen-Header
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
    const totalIncome = sliderValue + (data.applicationType === "couple" ? partnerSliderValue : 0);

    const isCouple = data.applicationType === "couple";

    // Render model pills for a person
    const renderModelPills = (basis: number, plus: number, bonus: number) => (
      <div className="flex gap-1 flex-wrap">
        {basis > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ backgroundColor: "rgba(192, 99, 11, 0.25)", color: colors.textDark }}
          >
            {basis} Basis
          </span>
        )}
        {plus > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ backgroundColor: "rgba(252, 99, 27, 0.25)", color: colors.textDark }}
          >
            {plus} Plus
          </span>
        )}
        {bonus > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ backgroundColor: "rgba(255, 189, 240, 0.35)", color: colors.textDark }}
          >
            {bonus} Bonus
          </span>
        )}
        {basis === 0 && plus === 0 && bonus === 0 && (
          <span className="text-[12px]" style={{ color: colors.text }}>
            —
          </span>
        )}
      </div>
    );

    return (
      <div className="py-2">
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.4)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)",
          }}
        >
          {/* Header - Dark */}
          <div className="px-4 py-2" style={{ backgroundColor: colors.buttonDark }}>
            <span className="text-[12px] font-semibold" style={{ color: colors.white }}>
              Your Elterngeld Plan
            </span>
          </div>

          {/* Content */}
          <div className="px-4 py-3">
            {/* You Section */}
            <div className="pb-3" style={{ borderBottom: `1px solid rgba(87, 83, 78, 0.3)` }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-medium" style={{ color: colors.textDark }}>
                  You
                </span>
                <span className="text-[12px]" style={{ color: colors.text }}>
                  Income: €{sliderValue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                {renderModelPills(youBasis, youPlus, youBonus)}
                <span className="text-[14px] font-semibold" style={{ color: colors.textDark }}>
                  €{youTotalMoney.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Partner Section (couples only) */}
            {isCouple && (
              <div className="py-3" style={{ borderBottom: `1px solid rgba(87, 83, 78, 0.3)` }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[12px] font-medium" style={{ color: colors.textDark }}>
                    Partner
                  </span>
                  <span className="text-[12px]" style={{ color: colors.text }}>
                    Income: €{partnerSliderValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  {renderModelPills(partnerBasis, partnerPlus, partnerBonus)}
                  <span className="text-[14px] font-semibold" style={{ color: colors.textDark }}>
                    €{partnerTotalMoney.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="pt-3 flex justify-between items-center">
              <div>
                <span className="text-[12px] font-semibold" style={{ color: colors.textDark }}>
                  Total
                </span>
                <span className="text-[12px] ml-2" style={{ color: colors.text }}>
                  {totalMonths} months
                </span>
              </div>
              <span className="text-[16px] font-bold" style={{ color: colors.textDark }}>
                €{totalMoney.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SummaryCard = () => {
    const visibleData = plannerData.slice(0, plannerMonths);
    const countMonths = (person: "you" | "partner", type: string) =>
      visibleData.filter((m) => m[person] === type).length;

    const youBasis = countMonths("you", "basis");
    const youPlus = countMonths("you", "plus");
    const youBonus = countMonths("you", "bonus");
    const partnerBasis = countMonths("partner", "basis");
    const partnerPlus = countMonths("partner", "plus");
    const partnerBonus = countMonths("partner", "bonus");

    const totalMoney =
      youBasis * myCalc.basis +
      youPlus * myCalc.plus +
      youBonus * myCalc.bonus +
      partnerBasis * partnerCalc.basis +
      partnerPlus * partnerCalc.plus +
      partnerBonus * partnerCalc.bonus;

    // Build one-line breakdown: "14 Monate Basis á €1.200, 4 Monate Plus á €600"
    const formatOneLine = (
      basis: number,
      plus: number,
      bonus: number,
      calc: { basis: number; plus: number; bonus: number },
    ) => {
      const parts = [];
      if (basis > 0) parts.push(`${basis} Monate Basis á €${calc.basis.toLocaleString()}`);
      if (plus > 0) parts.push(`${plus} Monate Plus á €${calc.plus.toLocaleString()}`);
      if (bonus > 0) parts.push(`${bonus} Monate Bonus á €${calc.bonus.toLocaleString()}`);
      return parts.length > 0 ? parts.join(", ") : "—";
    };

    return (
      <div className="py-4">
        {/* Main Card */}
        <div className="rounded-xl p-4" style={{ backgroundColor: colors.tile }}>
          {/* Summary rows - one line each */}
          <div className="space-y-2 text-[14px]">
            <div
              className="flex justify-between items-start py-2"
              style={{ borderBottom: `1px solid ${colors.border}` }}
            >
              <span className="font-semibold shrink-0 mr-4" style={{ color: colors.textDark }}>
                You
              </span>
              <span className="text-right" style={{ color: colors.text }}>
                {formatOneLine(youBasis, youPlus, youBonus, myCalc)}
              </span>
            </div>
            {data.applicationType === "couple" && (
              <div
                className="flex justify-between items-start py-2"
                style={{ borderBottom: `1px solid ${colors.border}` }}
              >
                <span className="font-semibold shrink-0 mr-4" style={{ color: colors.textDark }}>
                  Partner
                </span>
                <span className="text-right" style={{ color: colors.text }}>
                  {formatOneLine(partnerBasis, partnerPlus, partnerBonus, partnerCalc)}
                </span>
              </div>
            )}
          </div>

          {/* Total - smaller */}
          <div className="mt-3 pt-3" style={{ borderTop: `2px solid ${colors.text}` }}>
            <div className="flex justify-between items-baseline">
              <span className="text-[14px]" style={{ color: colors.text }}>
                Estimated total
              </span>
              <span className="text-xl font-bold" style={{ color: colors.textDark }}>
                €{totalMoney.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Mutterschaftsgeld Info */}
        <p className="text-[12px] mt-3 px-1" style={{ color: colors.text }}>
          In months 1-2, mothers typically receive maternity pay from their health insurance. This counts as Basis and
          is deducted – you won't get both amounts.
        </p>
      </div>
    );
  };

  // ===========================================
  // INPUT COMPONENTS
  // ===========================================

  // Info Tags component - clickable pills that open chat with prefilled question
  const InfoTagsComponent = ({ tags, description }: { tags: InfoTag[]; description?: string }) => (
    <div className="mt-4">
      {description && (
        <p className="text-[15px] mb-2" style={{ color: colors.text }}>
          {description}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <button
            key={i}
            onClick={() => openChat(tag.prefillQuestion)}
            className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all hover:opacity-70"
            style={{
              backgroundColor: colors.white,
              color: colors.text,
              border: `1px solid ${colors.border}`,
            }}
          >
            {tag.label}
          </button>
        ))}
      </div>
    </div>
  );

  // Memoized ButtonIcon - icons are created once
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

  const ButtonOptions = React.memo(
    ({ options, onSelect }: { options: ButtonOption[]; onSelect: (value: string, label: string) => void }) => (
      <div className="space-y-2">
        {options.map((opt, i) => {
          const hasArrow = opt.label.includes("→");
          const labelText = hasArrow ? opt.label.replace("→", "").trim() : opt.label;
          const shouldCenter = hasArrow && !opt.icon && !opt.note;

          return (
            <button
              key={i}
              onClick={() => onSelect(opt.value, opt.label)}
              className={`w-full px-3.5 py-2.5 rounded-xl transition-all flex items-center hover:border-stone-400 ${shouldCenter ? "justify-between" : "justify-between text-left"}`}
              style={{ backgroundColor: colors.white, border: `1.5px solid ${colors.border}` }}
            >
              {shouldCenter ? (
                <>
                  <span className="w-[18px]" />
                  <span className="text-[14px] font-medium" style={{ color: colors.textDark }}>
                    {labelText}
                  </span>
                  <span className="text-[18px]" style={{ color: colors.textDark }}>
                    →
                  </span>
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
                      <span className="text-[14px] font-medium" style={{ color: colors.textDark }}>
                        {labelText}
                      </span>
                      {opt.sub && (
                        <p className="text-[12px] mt-0.5" style={{ color: colors.text }}>
                          {opt.sub}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {opt.note && (
                      <span
                        className="text-[12px] px-2.5 py-1 rounded-full font-semibold"
                        style={{
                          backgroundColor:
                            opt.accent === "basis"
                              ? "rgba(192, 99, 11, 0.3)"
                              : opt.accent === "bonus"
                                ? colors.bonus
                                : colors.tile,
                          color: opt.accent === "bonus" ? colors.textDark : opt.accent ? colors.textDark : colors.text,
                        }}
                      >
                        {opt.note}
                      </span>
                    )}
                    {hasArrow && (
                      <span className="text-[18px]" style={{ color: colors.textDark }}>
                        →
                      </span>
                    )}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
    ),
  );

  // State for date input (used by extracted DateInputComponent)
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

  // Phase calculation: Check (0-14), Calculate (15-22), Plan (23+)
  const getPhase = () => {
    // Check if we're in planner
    const hasPlanner = messages.some((m) => m.type === "component" && m.component === "planner");
    if (hasPlanner) return "plan";

    // Check if we're in calculation
    const hasCalculation = messages.some((m) => m.type === "component" && m.component === "calculation");
    if (hasCalculation) return "calculate";

    // Check if we have income-related data
    if (data.applicationType) return "calculate";

    return "check";
  };

  const currentPhase = getPhase();
  const phases = ["check", "calculate", "plan"] as const;
  const phaseIndex = phases.indexOf(currentPhase);

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
            <span className="text-[15px]" style={{ color: colors.textDark }}>
              {msg.content}
            </span>
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
              className={isQuestion ? "text-[15px] leading-relaxed font-semibold pl-3" : "text-[15px] leading-relaxed"}
              style={{
                color: colors.textDark,
                borderLeft: isQuestion ? "3px solid #C0630B" : "none",
              }}
            >
              {formatText(msg.content, openChat)}
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
                  <p className={`mt-2 text-[14px] ${isQuestion ? "pl-3" : ""}`} style={{ color: colors.text }}>
                    {formatText(msg.subtext.split("[info:")[0].trim(), openChat)}
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
                        <InfoBox title={title} content={content} onOpenChat={openChat} isLast={isLast} />
                      </div>
                    );
                  });
                })()}
              </>
            ) : msg.subtext.includes("[info]") ? (
              <>
                {msg.subtext.split("[info]")[0].trim() && (
                  <p className={`mt-2 text-[14px] ${isQuestion ? "pl-3" : ""}`} style={{ color: colors.text }}>
                    {formatText(msg.subtext.split("[info]")[0].trim(), openChat)}
                  </p>
                )}
                <p className={`mt-2 text-[14px] ${isQuestion ? "pl-3" : ""}`} style={{ color: colors.text }}>
                  {formatText(msg.subtext.split("[info]")[1].trim(), openChat)}
                </p>
              </>
            ) : (
              <p className={`mt-2 text-[14px] ${isQuestion ? "pl-3" : ""}`} style={{ color: colors.text }}>
                {formatText(msg.subtext, openChat)}
              </p>
            ))}
          {msg.infoTags && msg.infoTags.length > 0 && !isCurrentlyStreaming && (
            <InfoTagsComponent tags={msg.infoTags} description={msg.infoTagsDescription} />
          )}
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
          return <React.Fragment key={i}>{PlannerComponent()}</React.Fragment>;
        case "checkmarks":
          return <CheckmarksComponent key={i} />;
        case "summaryBox":
          return <SummaryBox key={i} />;
        case "ctaCard":
          return <CtaCard key={i} />;
        case "summary":
          return <SummaryCard key={i} />;
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
          className="w-full py-2.5 px-4 rounded-xl text-[14px] font-semibold flex items-center justify-between"
          style={{ backgroundColor: colors.buttonDark, color: colors.white }}
        >
          <span className="w-[18px]" />
          <span>{labelText}</span>
          <span className="text-[18px]">→</span>
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

  // PDF FLOW PREVIEW - Early return
  if (showPdfFlow) {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <div className="flex-shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div className="h-1 w-full" style={{ backgroundColor: colors.tile }}>
            <div className="h-full" style={{ width: "12.5%", backgroundColor: colors.basis }} />
          </div>
          <div className="px-5 py-3">
            <div className="max-w-lg mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPdfFlow(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: colors.tile }}
                >
                  <svg className="w-4 h-4" fill="none" stroke={colors.textDark} strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-sm font-semibold" style={{ color: colors.textDark }}>
                  Your Elterngeld Application
                </h1>
              </div>
              <span className="text-xs" style={{ color: colors.text }}>
                Step 1/8
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-5 py-6">
            <div className="max-w-lg mx-auto">
              <p className="text-[15px] leading-relaxed font-medium mb-6" style={{ color: colors.textDark }}>
                Tell us about your child.
              </p>

              {/* Section: Child Information */}
              <div
                className="rounded-xl overflow-hidden mb-3"
                style={{ backgroundColor: colors.white, border: `1.5px solid #F2F53A` }}
              >
                <div className="px-4 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4" fill="none" stroke={colors.textDark} strokeWidth={1.5} viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z"
                      />
                    </svg>
                    <span className="text-sm font-medium" style={{ color: colors.textDark }}>
                      Child information
                    </span>
                  </div>
                  <svg
                    className="w-4 h-4"
                    style={{ color: colors.text, transform: "rotate(180deg)" }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="px-4 pb-4 pt-3 border-t space-y-4" style={{ borderColor: colors.border }}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text }}>
                        First name(s)
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2.5 rounded-lg text-sm"
                        style={{
                          backgroundColor: colors.white,
                          border: `1.5px solid ${colors.border}`,
                          color: colors.textDark,
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text }}>
                        Last name
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2.5 rounded-lg text-sm"
                        style={{
                          backgroundColor: colors.white,
                          border: `1.5px solid ${colors.border}`,
                          color: colors.textDark,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text }}>
                      Date of birth / Due date
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2.5 rounded-lg text-sm"
                      style={{
                        backgroundColor: colors.white,
                        border: `1.5px solid ${colors.border}`,
                        color: colors.textDark,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Special Circumstances (collapsed) */}
              <div className="rounded-xl overflow-hidden mb-3" style={{ backgroundColor: colors.white }}>
                <div className="px-4 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4" fill="none" stroke={colors.textDark} strokeWidth={1.5} viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                      />
                    </svg>
                    <span className="text-sm font-medium" style={{ color: colors.textDark }}>
                      Special circumstances
                    </span>
                  </div>
                  <svg
                    className="w-4 h-4"
                    style={{ color: colors.text }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Section: Relationship (collapsed) */}
              <div className="rounded-xl overflow-hidden mb-3" style={{ backgroundColor: colors.white }}>
                <div className="px-4 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4" fill="none" stroke={colors.textDark} strokeWidth={1.5} viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                      />
                    </svg>
                    <span className="text-sm font-medium" style={{ color: colors.textDark }}>
                      Relationship to child
                    </span>
                  </div>
                  <svg
                    className="w-4 h-4"
                    style={{ color: colors.text }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer
          className="flex-shrink-0 border-t"
          style={{ backgroundColor: colors.background, borderColor: colors.border }}
        >
          <div className="px-5 py-4">
            <div className="max-w-lg mx-auto flex items-center justify-between">
              <div />
              <button
                className="flex items-center justify-between gap-1.5 px-8 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: colors.buttonDark, color: colors.white, minWidth: 160 }}
              >
                <span className="w-[18px]" />
                <span>Continue</span>
                <span className="text-[18px]">→</span>
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
      <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <div className="flex-shrink-0" style={{ backgroundColor: colors.background }}>
          <div className="px-5 py-3">
            <div className="max-w-lg mx-auto flex items-center justify-between">
              {/* Back Button */}
              <div style={{ width: 32 }}>
                {stepHistory.length > 0 && (
                  <button
                    onClick={goBack}
                    className="w-8 h-8 flex items-center justify-center transition-all hover:opacity-60"
                    title="Back"
                  >
                    <svg className="w-5 h-5" fill="none" stroke={colors.textDark} strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Right Side Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openChat()}
                  className="w-8 h-8 flex items-center justify-center transition-all hover:opacity-60"
                  title="Chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke={colors.text} strokeWidth={1.5} viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleRestart}
                  className="w-8 h-8 flex items-center justify-center shrink-0 transition-all hover:opacity-60"
                  title="Restart"
                >
                  <svg className="w-5 h-5" fill="none" stroke={colors.text} strokeWidth={1.5} viewBox="0 0 24 24">
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

          {/* Header Divider */}
          <div className="h-px w-full" style={{ backgroundColor: colors.border }}></div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div
            className={`h-full overflow-y-auto px-5 pt-6 ${hideScrollbar ? "hide-scrollbar" : ""}`}
            ref={scrollRef}
            onScroll={handleScroll}
          >
            <div className="max-w-lg mx-auto">
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

              {/* Marker for end of actual content */}
              <div ref={lastMessageRef} style={{ height: 1 }} />

              {/* Dynamic spacer - exactly enough to scroll user message to top */}
              {spacerHeight > 0 && <div style={{ height: spacerHeight }} />}
            </div>
          </div>
        </div>

        {/* Input section - hidden when chat is open */}
        {!showChat && (
          <div
            className="flex-shrink-0 px-5 pb-2 pt-3 relative z-10"
            style={{ backgroundColor: colors.background, borderTop: `1px solid ${colors.border}` }}
          >
            {/* Floating scroll to bottom button */}
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
            <div className="max-w-lg mx-auto">{renderInput()}</div>
            <p className="text-[12px] text-center mt-3 mb-1" style={{ color: colors.text, opacity: 0.6 }}>
              Quick estimate only – not legal or tax advice.
            </p>
          </div>
        )}
      </div>

      {/* Chat Overlay */}
      {showChat && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[200]" style={{ backgroundColor: colors.background }}>
          <div className="h-full flex flex-col">
            {/* Chat Header */}
            <div className="flex-shrink-0" style={{ backgroundColor: colors.background }}>
              <div className="px-5 py-3">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                  {/* Empty left side for alignment */}
                  <div style={{ width: 32 }}></div>

                  {/* Right Side Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowChat(false)}
                      className="w-8 h-8 flex items-center justify-center transition-all hover:opacity-60"
                      title="Back to Guide"
                    >
                      <svg className="w-5 h-5" fill="none" stroke={colors.text} strokeWidth={1.5} viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setChatMessages([])}
                      className="w-8 h-8 flex items-center justify-center shrink-0 transition-all hover:opacity-60"
                      title="Restart chat"
                    >
                      <svg className="w-5 h-5" fill="none" stroke={colors.text} strokeWidth={1.5} viewBox="0 0 24 24">
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

              {/* Header Divider */}
              <div className="h-px w-full" style={{ backgroundColor: colors.border }}></div>
            </div>

            {/* Chat Messages */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col px-4 pt-8">
                  <div className="max-w-lg mx-auto w-full">
                    <h2 className="font-semibold mb-5" style={{ fontSize: "24px", color: colors.textDark }}>
                      What can I help with?
                    </h2>

                    <div className="space-y-0">
                      {[
                        { icon: "help", question: "What is Elterngeld?" },
                        { icon: "calculator", question: "How much Elterngeld will I get?" },
                        { icon: "calendar", question: "How long can I receive Elterngeld?" },
                        { icon: "couple", question: "How should we split the months?" },
                        { icon: "briefcase", question: "Can I work while receiving Elterngeld?" },
                        { icon: "globe", question: "Am I eligible as a foreigner?" },
                        { icon: "document", question: "What documents do I need to apply?" },
                        { icon: "clock", question: "When should I submit my application?" },
                      ].map((item, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            const demoResponse =
                              "Thanks for your question! This is a demo response. In the real implementation, this would connect to an AI backend to answer your **Elterngeld** questions with detailed information about eligibility, calculations, and application process.";
                            setChatMessages((prev) => [...prev, { role: "user", content: item.question }]);
                            setTimeout(() => {
                              chatScrollRef.current?.scrollTo({
                                top: chatScrollRef.current.scrollHeight,
                                behavior: "smooth",
                              });
                            }, 50);
                            setTimeout(() => {
                              const newIndex = chatMessages.length + 1;
                              setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);
                              setTimeout(() => {
                                streamChatMessage(demoResponse, newIndex);
                              }, 100);
                            }, 500);
                          }}
                          className="w-full flex items-center gap-3 py-1.5 text-left transition-all hover:opacity-70"
                          style={{ color: colors.textDark }}
                        >
                          <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: colors.tile }}
                          >
                            {item.icon === "help" && (
                              <svg
                                className="w-[18px] h-[18px]"
                                fill="none"
                                stroke={colors.text}
                                strokeWidth={1.5}
                                viewBox="0 0 24 24"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
                              </svg>
                            )}
                            {item.icon === "calculator" && (
                              <svg
                                className="w-[18px] h-[18px]"
                                fill="none"
                                stroke={colors.text}
                                strokeWidth={1.5}
                                viewBox="0 0 24 24"
                              >
                                <rect x="4" y="2" width="16" height="20" rx="2" />
                                <path d="M8 6h8M8 10h2M14 10h2M8 14h2M14 14h2M8 18h2M14 18h2" />
                              </svg>
                            )}
                            {item.icon === "calendar" && (
                              <svg
                                className="w-[18px] h-[18px]"
                                fill="none"
                                stroke={colors.text}
                                strokeWidth={1.5}
                                viewBox="0 0 24 24"
                              >
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <path d="M16 2v4M8 2v4M3 10h18" />
                              </svg>
                            )}
                            {item.icon === "couple" && (
                              <svg
                                className="w-[18px] h-[18px]"
                                fill="none"
                                stroke={colors.text}
                                strokeWidth={1.5}
                                viewBox="0 0 24 24"
                              >
                                <circle cx="9" cy="7" r="4" />
                                <circle cx="17" cy="9" r="3" />
                                <path d="M3 21v-2c0-2.5 3-5 6-5 1.5 0 3 .5 4 1.5M17 21v-2c0-1.5 1-3 3-3" />
                              </svg>
                            )}
                            {item.icon === "briefcase" && (
                              <svg
                                className="w-[18px] h-[18px]"
                                fill="none"
                                stroke={colors.text}
                                strokeWidth={1.5}
                                viewBox="0 0 24 24"
                              >
                                <rect x="2" y="7" width="20" height="14" rx="2" />
                                <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                              </svg>
                            )}
                            {item.icon === "globe" && (
                              <svg
                                className="w-[18px] h-[18px]"
                                fill="none"
                                stroke={colors.text}
                                strokeWidth={1.5}
                                viewBox="0 0 24 24"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                              </svg>
                            )}
                            {item.icon === "document" && (
                              <svg
                                className="w-[18px] h-[18px]"
                                fill="none"
                                stroke={colors.text}
                                strokeWidth={1.5}
                                viewBox="0 0 24 24"
                              >
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                              </svg>
                            )}
                            {item.icon === "clock" && (
                              <svg
                                className="w-[18px] h-[18px]"
                                fill="none"
                                stroke={colors.text}
                                strokeWidth={1.5}
                                viewBox="0 0 24 24"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v6l4 2" />
                              </svg>
                            )}
                          </span>
                          <span style={{ fontSize: "15px" }}>{item.question}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-w-lg mx-auto">
                  {chatMessages.map((msg, i) => {
                    const isCurrentlyStreaming = i === chatStreamingIndex;
                    return (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.role === "user" ? (
                          <div
                            className="max-w-[85%] rounded-2xl px-4 py-2.5"
                            style={{
                              backgroundColor: colors.userBubble,
                              color: colors.textDark,
                            }}
                          >
                            <p style={{ fontSize: "15px", lineHeight: 1.5 }}>{msg.content}</p>
                          </div>
                        ) : (
                          <div className="max-w-[90%]">
                            <p className="text-[15px] leading-relaxed" style={{ color: colors.textDark }}>
                              {formatText(msg.content, openChat)}
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
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="flex-shrink-0 px-4 py-3" style={{ backgroundColor: colors.background }}>
              <div className="max-w-lg mx-auto">
                <div
                  className="rounded-2xl px-4 py-3"
                  style={{ backgroundColor: colors.white, border: `1.5px solid ${colors.border}` }}
                >
                  <textarea
                    value={chatInput}
                    onChange={(e) => {
                      setChatInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && chatInput.trim() && !isChatStreaming) {
                        e.preventDefault();
                        const demoResponse =
                          "Thanks for your question! This is a demo response. In the real implementation, this would connect to an AI backend to answer your **Elterngeld** questions with detailed information about eligibility, calculations, and application process.";
                        const currentLength = chatMessages.length;
                        setChatMessages((prev) => [...prev, { role: "user", content: chatInput.trim() }]);
                        setChatInput("");
                        (e.target as HTMLTextAreaElement).style.height = "auto";
                        setTimeout(() => {
                          chatScrollRef.current?.scrollTo({
                            top: chatScrollRef.current.scrollHeight,
                            behavior: "smooth",
                          });
                        }, 50);
                        setTimeout(() => {
                          const newIndex = currentLength + 1;
                          setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);
                          setTimeout(() => {
                            streamChatMessage(demoResponse, newIndex);
                          }, 100);
                        }, 500);
                      }
                    }}
                    placeholder="Ask anything..."
                    className="w-full outline-none bg-transparent mb-2 resize-none overflow-hidden"
                    style={{ fontSize: "15px", color: colors.textDark, minHeight: "24px", maxHeight: "200px" }}
                    rows={1}
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: colors.tile }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke={colors.text} strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <span style={{ fontSize: "12px", color: colors.text }}>§BEEG</span>
                    </div>
                    <button
                      onClick={() => {
                        if (chatInput.trim() && !isChatStreaming) {
                          const demoResponse =
                            "Thanks for your question! This is a demo response. In the real implementation, this would connect to an AI backend to answer your **Elterngeld** questions with detailed information about eligibility, calculations, and application process.";
                          const currentLength = chatMessages.length;
                          setChatMessages((prev) => [...prev, { role: "user", content: chatInput.trim() }]);
                          setChatInput("");
                          setTimeout(() => {
                            chatScrollRef.current?.scrollTo({
                              top: chatScrollRef.current.scrollHeight,
                              behavior: "smooth",
                            });
                          }, 50);
                          setTimeout(() => {
                            const newIndex = currentLength + 1;
                            setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);
                            setTimeout(() => {
                              streamChatMessage(demoResponse, newIndex);
                            }, 100);
                          }, 500);
                        }
                      }}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: chatInput.trim() && !isChatStreaming ? "#C45C3E" : colors.tile,
                        opacity: isChatStreaming ? 0.5 : 1,
                        cursor: isChatStreaming ? "not-allowed" : "pointer",
                      }}
                      disabled={isChatStreaming}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke={chatInput.trim() && !isChatStreaming ? colors.white : colors.text}
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-center mt-3" style={{ fontSize: "12px", color: colors.text, opacity: 0.6 }}>
                  Elterngeld AI can make mistakes. Please double-check responses.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ElterngeldGuide;
