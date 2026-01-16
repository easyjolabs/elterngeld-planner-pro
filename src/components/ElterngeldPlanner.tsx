import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ===========================================
// TYPES
// ===========================================
export interface PlannerMonth {
  you: "none" | "basis" | "plus" | "bonus";
  partner: "none" | "basis" | "plus" | "bonus";
}

export interface ElterngeldPlannerProps {
  plannerData: PlannerMonth[];
  setPlannerData: (data: PlannerMonth[]) => void;
  plannerMonths: number;
  applicationType: "couple" | "single";
  premature?: string;
  myCalc: { basis: number; plus: number; bonus: number; basisWithoutWork?: number };
  partnerCalc: { basis: number; plus: number; bonus: number; basisWithoutWork?: number };
  isLoggedIn: boolean;
  onSaveClick: () => void;
  fullscreen?: boolean;
  onFullscreenToggle?: () => void;
}

// ===========================================
// DESIGN TOKENS
// ===========================================
const colors = {
  background: "#FAFAF9",
  tile: "#F0EEE6",
  text: "#57534E",
  textDark: "#000000",
  white: "#FFFFFF",
  border: "#E7E5E4",
  yellow: "#FFE44C",
  yellowLight: "rgba(255, 228, 76, 0.4)",
  orange: "#FF8752",
  basis: "#C0630B",
  basisBg: "rgba(192, 99, 11, 0.25)",
  plus: "#FC631B",
  plusBg: "rgba(252, 99, 27, 0.25)",
  bonus: "#FFBDF0",
  bonusBg: "rgba(255, 189, 240, 0.35)",
  error: "#DC2626",
  errorBg: "#FEF2F2",
  success: "#16A34A",
  successBg: "#F0FDF4",
  buttonDark: "#3D3D3A",
};

// ===========================================
// RULES
// ===========================================
const RULES = {
  TOTAL_BUDGET: 14,
  MAX_PER_PERSON: 12,
  BONUS_MONTHS: 4,
  MUTTERSCHUTZ_MONTHS: 2,
};

// ===========================================
// WIZARD HELPER FUNCTIONS
// ===========================================
interface WizardState {
  youMonths: number;
  mutterschaftsgeld: "yes" | "no" | null;
  youWork: "yes" | "no" | null;
  partnerMonths: number;
  partnerWork: "yes" | "no" | null;
}

interface CalculatedPlan {
  you: { basis: number; plus: number; bonus: number; total: number };
  partner: { basis: number; plus: number; bonus: number; total: number };
  explanation: string;
}

function calculatePlanFromOnboarding(state: WizardState): CalculatedPlan {
  let youBasis = 0,
    youPlus = 0,
    youBonus = 0;
  let partnerBasis = 0,
    partnerPlus = 0,
    partnerBonus = 0;

  const bonusEligible = state.youWork === "yes" && state.partnerWork === "yes";
  let budget = RULES.TOTAL_BUDGET;

  const mutterschutzBasis = state.mutterschaftsgeld === "yes" ? RULES.MUTTERSCHUTZ_MONTHS : 0;

  if (mutterschutzBasis > 0) {
    youBasis = mutterschutzBasis;
    budget -= youBasis;
    const remainingYouMonths = state.youMonths - mutterschutzBasis;
    if (remainingYouMonths > 0) {
      if (state.youWork === "yes") {
        youPlus = Math.min(remainingYouMonths, budget * 2);
        budget -= youPlus / 2;
      } else {
        const additionalBasis = Math.min(remainingYouMonths, Math.min(RULES.MAX_PER_PERSON - youBasis, budget));
        youBasis += additionalBasis;
        budget -= additionalBasis;
        const stillRemaining = remainingYouMonths - additionalBasis;
        if (stillRemaining > 0) {
          youPlus = Math.min(stillRemaining, budget * 2);
          budget -= youPlus / 2;
        }
      }
    }
  } else {
    if (state.youWork === "yes") {
      youPlus = Math.min(state.youMonths, 24);
      budget -= youPlus / 2;
    } else {
      if (state.youMonths <= Math.min(RULES.MAX_PER_PERSON, budget)) {
        youBasis = state.youMonths;
        budget -= youBasis;
      } else {
        youBasis = Math.min(RULES.MAX_PER_PERSON, Math.floor(budget));
        budget -= youBasis;
        const remaining = state.youMonths - youBasis;
        youPlus = Math.min(remaining, budget * 2);
        budget -= youPlus / 2;
      }
    }
  }

  if (state.partnerMonths > 0) {
    if (state.partnerWork === "yes") {
      partnerPlus = Math.min(state.partnerMonths, budget * 2);
      budget -= partnerPlus / 2;
    } else {
      if (state.partnerMonths <= budget) {
        partnerBasis = Math.min(state.partnerMonths, RULES.MAX_PER_PERSON, budget);
        budget -= partnerBasis;
      } else {
        partnerBasis = Math.min(RULES.MAX_PER_PERSON, Math.floor(budget));
        budget -= partnerBasis;
        const remaining = state.partnerMonths - partnerBasis;
        partnerPlus = Math.min(remaining, budget * 2);
        budget -= partnerPlus / 2;
      }
    }
  }

  if (bonusEligible) {
    youBonus = RULES.BONUS_MONTHS;
    partnerBonus = RULES.BONUS_MONTHS;
  }

  const plan: CalculatedPlan = {
    you: { basis: youBasis, plus: youPlus, bonus: youBonus, total: youBasis + youPlus + youBonus },
    partner: {
      basis: partnerBasis,
      plus: partnerPlus,
      bonus: partnerBonus,
      total: partnerBasis + partnerPlus + partnerBonus,
    },
    explanation: "",
  };

  plan.explanation = generateExplanation(state, plan);
  return plan;
}

function generateExplanation(state: WizardState, plan: CalculatedPlan): string {
  const hasBonus = plan.you.bonus > 0;
  const hasMutterschutz = state.mutterschaftsgeld === "yes";
  const partnerReduced = plan.partner.total < state.partnerMonths && state.partnerMonths > 0;

  if (partnerReduced)
    return `Your partner wanted ${state.partnerMonths} months, but only ${plan.partner.total} fit within the shared 14-month budget.`;
  if (hasBonus) return `Both working 24-32h/week qualifies you for the Partnerschaftsbonus – 4 extra months each!`;
  if (hasMutterschutz && state.youWork === "yes")
    return `First 2 months are Basiselterngeld (required during Mutterschutz). After that, ElterngeldPlus for part-time work.`;
  if (hasMutterschutz) return `First 2 months are Basiselterngeld – required while receiving Mutterschaftsgeld.`;
  if (state.youWork === "yes" && state.partnerWork === "yes")
    return `Since you're both working part-time, ElterngeldPlus stretches your benefit over more months.`;
  if (state.youWork === "yes" || state.partnerWork === "yes")
    return `ElterngeldPlus for part-time, Basiselterngeld for full-time at home.`;
  return `Basiselterngeld gives you the highest monthly payment. You're using ${plan.you.basis + plan.partner.basis} of your 14-month budget.`;
}

function convertPlanToPlannerData(plan: CalculatedPlan, applicationType: "couple" | "single"): PlannerMonth[] {
  const data: PlannerMonth[] = Array(32)
    .fill(null)
    .map(() => ({ you: "none" as const, partner: "none" as const }));
  let youMonth = 0;
  for (let i = 0; i < plan.you.basis; i++) {
    if (youMonth < 32) {
      data[youMonth].you = "basis";
      youMonth++;
    }
  }
  for (let i = 0; i < plan.you.plus; i++) {
    if (youMonth < 32) {
      data[youMonth].you = "plus";
      youMonth++;
    }
  }

  if (applicationType === "couple") {
    const partnerStart = youMonth;
    let pm = 0;
    for (let i = 0; i < plan.partner.basis; i++) {
      const idx = partnerStart + i;
      if (idx < 32) {
        data[idx].partner = "basis";
        pm++;
      }
    }
    for (let i = 0; i < plan.partner.plus; i++) {
      const idx = partnerStart + plan.partner.basis + i;
      if (idx < 32) {
        data[idx].partner = "plus";
        pm++;
      }
    }
    if (plan.you.bonus > 0 && plan.partner.bonus > 0) {
      const bonusStart = Math.max(youMonth, partnerStart + pm);
      for (let i = 0; i < plan.you.bonus; i++) {
        const idx = bonusStart + i;
        if (idx < 32) {
          data[idx].you = "bonus";
          data[idx].partner = "bonus";
        }
      }
    }
  }
  return data;
}

// ===========================================
// PLANNER ONBOARDING (Wizard)
// ===========================================
interface PlannerOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: PlannerMonth[], plan: CalculatedPlan) => void;
  applicationType: "couple" | "single";
}

const PlannerOnboarding: React.FC<PlannerOnboardingProps> = ({ isOpen, onClose, onComplete, applicationType }) => {
  const [currentStep, setCurrentStep] = useState<number | "result">(1);
  const [state, setState] = useState<WizardState>({
    youMonths: 12,
    mutterschaftsgeld: null,
    youWork: null,
    partnerMonths: 2,
    partnerWork: null,
  });
  const [calculatedPlan, setCalculatedPlan] = useState<CalculatedPlan | null>(null);
  const isCouple = applicationType === "couple";
  const totalSteps = isCouple ? 5 : 3;

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setState({
        youMonths: 12,
        mutterschaftsgeld: null,
        youWork: null,
        partnerMonths: isCouple ? 2 : 0,
        partnerWork: null,
      });
      setCalculatedPlan(null);
    }
  }, [isOpen, isCouple]);

  const showResult = useCallback(() => {
    const plan = calculatePlanFromOnboarding(state);
    setCalculatedPlan(plan);
    setCurrentStep("result");
  }, [state]);

  const goTo = (step: number) => setCurrentStep(step);
  const goBack = () => {
    if (currentStep === "result") goTo(isCouple ? 5 : 3);
    else if (typeof currentStep === "number" && currentStep > 1) goTo(currentStep - 1);
  };
  const selectMutterschaftsgeld = (value: "yes" | "no") => {
    setState((s) => ({ ...s, mutterschaftsgeld: value }));
    setTimeout(() => goTo(3), 180);
  };
  const selectYouWork = (value: "yes" | "no") => {
    setState((s) => ({ ...s, youWork: value }));
    if (isCouple) setTimeout(() => goTo(4), 180);
    else setTimeout(() => showResult(), 180);
  };
  const selectPartnerWork = (value: "yes" | "no") => {
    setState((s) => ({ ...s, partnerWork: value }));
    setTimeout(() => showResult(), 180);
  };
  const usePlan = () => {
    if (calculatedPlan) {
      onComplete(convertPlanToPlannerData(calculatedPlan, applicationType), calculatedPlan);
    }
    onClose();
  };
  const getYouFill = () => ((state.youMonths - 2) / 26) * 100 + "%";
  const getPartnerFill = () => (state.partnerMonths / 28) * 100 + "%";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-5"
      style={{ background: "rgba(250, 250, 249, 0.9)" }}
    >
      <div
        className="w-full rounded-3xl flex flex-col overflow-hidden shadow-xl"
        style={{ maxWidth: 400, background: colors.tile, minHeight: currentStep === "result" ? 520 : 360 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 shrink-0">
          <button
            onClick={goBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/50"
            style={{ opacity: currentStep === 1 ? 0.3 : 1 }}
            disabled={currentStep === 1}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={colors.textDark} strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-colors"
                style={{
                  background:
                    currentStep === "result" || (typeof currentStep === "number" && i < currentStep)
                      ? colors.textDark
                      : "rgba(0,0,0,0.15)",
                }}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/50"
            style={{ opacity: 0.6 }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={colors.textDark} strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step 1: Your Duration */}
        {currentStep === 1 && (
          <div className="flex flex-col flex-1 px-7 pb-7">
            <div className="flex-1 flex flex-col justify-center">
              <h2
                className="text-center mb-7"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 19,
                  fontWeight: 600,
                  color: colors.textDark,
                  lineHeight: 1.4,
                }}
              >
                How many months would <span style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>you</span>{" "}
                like to stay home?
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative h-6 flex items-center">
                    <div className="absolute inset-x-0 h-1.5 rounded-full" style={{ background: colors.white }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ background: colors.textDark, width: getYouFill() }}
                      />
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="28"
                      value={state.youMonths}
                      onChange={(e) => setState((s) => ({ ...s, youMonths: parseInt(e.target.value) }))}
                      className="absolute inset-x-0 w-full h-6 opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs" style={{ color: colors.text }}>
                    <span>2</span>
                    <span>28</span>
                  </div>
                </div>
                <div className="text-center px-4 py-3 rounded-xl" style={{ background: colors.white, minWidth: 72 }}>
                  <div className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {state.youMonths}
                  </div>
                  <div className="text-xs" style={{ color: colors.text }}>
                    months
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => goTo(2)}
              className="w-full py-4 rounded-xl font-semibold transition-transform active:scale-[0.98]"
              style={{ background: colors.textDark, color: colors.white }}
            >
              Continue
            </button>
            <button
              onClick={onClose}
              className="w-full text-center mt-3 text-sm transition-colors hover:text-black"
              style={{ color: colors.text }}
            >
              Or plan manually
            </button>
          </div>
        )}

        {/* Step 2: Mutterschaftsgeld */}
        {currentStep === 2 && (
          <div className="flex flex-col flex-1 px-7 pb-7">
            <div className="flex-1 flex flex-col justify-center">
              <h2
                className="text-center mb-2"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 19,
                  fontWeight: 600,
                  color: colors.textDark,
                }}
              >
                Will you receive Mutterschaftsgeld?
              </h2>
              <p className="text-center mb-6 text-sm" style={{ color: colors.text }}>
                Maternity pay from health insurance (usually first 2 months)
              </p>
              <div className="flex gap-3">
                {(["no", "yes"] as const).map((val) => (
                  <button
                    key={val}
                    onClick={() => selectMutterschaftsgeld(val)}
                    className="flex-1 py-4 rounded-xl font-medium border-2 transition-all active:scale-[0.97]"
                    style={{
                      background: colors.white,
                      borderColor: state.mutterschaftsgeld === val ? colors.textDark : "transparent",
                    }}
                  >
                    {val === "yes" ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Your Work */}
        {currentStep === 3 && (
          <div className="flex flex-col flex-1 px-7 pb-7">
            <div className="flex-1 flex flex-col justify-center">
              <h2
                className="text-center mb-7"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 19,
                  fontWeight: 600,
                  color: colors.textDark,
                }}
              >
                Will you <span style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>work part-time</span>{" "}
                during leave?
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => selectYouWork("no")}
                  className="flex-1 py-4 rounded-xl font-medium border-2 transition-all active:scale-[0.97]"
                  style={{
                    background: colors.white,
                    borderColor: state.youWork === "no" ? colors.textDark : "transparent",
                  }}
                >
                  No, fully at home
                </button>
                <button
                  onClick={() => selectYouWork("yes")}
                  className="flex-1 py-4 rounded-xl font-medium border-2 transition-all active:scale-[0.97]"
                  style={{
                    background: colors.white,
                    borderColor: state.youWork === "yes" ? colors.textDark : "transparent",
                  }}
                >
                  Yes, part-time
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Partner Duration */}
        {currentStep === 4 && isCouple && (
          <div className="flex flex-col flex-1 px-7 pb-7">
            <div className="flex-1 flex flex-col justify-center">
              <h2
                className="text-center mb-7"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 19,
                  fontWeight: 600,
                  color: colors.textDark,
                }}
              >
                How many months for your{" "}
                <span style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>partner</span>?
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative h-6 flex items-center">
                    <div className="absolute inset-x-0 h-1.5 rounded-full" style={{ background: colors.white }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ background: colors.textDark, width: getPartnerFill() }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="28"
                      value={state.partnerMonths}
                      onChange={(e) => setState((s) => ({ ...s, partnerMonths: parseInt(e.target.value) }))}
                      className="absolute inset-x-0 w-full h-6 opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs" style={{ color: colors.text }}>
                    <span>0</span>
                    <span>28</span>
                  </div>
                </div>
                <div className="text-center px-4 py-3 rounded-xl" style={{ background: colors.white, minWidth: 72 }}>
                  <div className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {state.partnerMonths}
                  </div>
                  <div className="text-xs" style={{ color: colors.text }}>
                    months
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => goTo(5)}
              className="w-full py-4 rounded-xl font-semibold transition-transform active:scale-[0.98]"
              style={{ background: colors.textDark, color: colors.white }}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 5: Partner Work */}
        {currentStep === 5 && isCouple && (
          <div className="flex flex-col flex-1 px-7 pb-7">
            <div className="flex-1 flex flex-col justify-center">
              <h2
                className="text-center mb-7"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 19,
                  fontWeight: 600,
                  color: colors.textDark,
                }}
              >
                Will <span style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>partner work part-time</span>
                ?
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => selectPartnerWork("no")}
                  className="flex-1 py-4 rounded-xl font-medium border-2 transition-all active:scale-[0.97]"
                  style={{
                    background: colors.white,
                    borderColor: state.partnerWork === "no" ? colors.textDark : "transparent",
                  }}
                >
                  No, fully at home
                </button>
                <button
                  onClick={() => selectPartnerWork("yes")}
                  className="flex-1 py-4 rounded-xl font-medium border-2 transition-all active:scale-[0.97]"
                  style={{
                    background: colors.white,
                    borderColor: state.partnerWork === "yes" ? colors.textDark : "transparent",
                  }}
                >
                  Yes, part-time
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {currentStep === "result" && calculatedPlan && (
          <div className="flex flex-col flex-1 px-7 pb-7">
            <div className="flex-1 flex flex-col justify-center">
              <h2
                className="text-center mb-2"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 19,
                  fontWeight: 600,
                  color: colors.textDark,
                }}
              >
                Here's your starting plan
              </h2>
              <p className="text-center mb-5 text-sm" style={{ color: colors.text }}>
                You can adjust everything next
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: colors.white }}>
                  <span className="font-semibold text-sm">You</span>
                  <div className="flex flex-wrap gap-1.5">
                    {calculatedPlan.you.basis > 0 && (
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: colors.basisBg }}
                      >
                        {calculatedPlan.you.basis}× Basis
                      </span>
                    )}
                    {calculatedPlan.you.plus > 0 && (
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: colors.plusBg }}
                      >
                        {calculatedPlan.you.plus}× Plus
                      </span>
                    )}
                    {calculatedPlan.you.bonus > 0 && (
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: colors.bonusBg }}
                      >
                        {calculatedPlan.you.bonus}× Bonus
                      </span>
                    )}
                  </div>
                </div>
                {isCouple && calculatedPlan.partner.total > 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: colors.white }}>
                    <span className="font-semibold text-sm">Partner</span>
                    <div className="flex flex-wrap gap-1.5">
                      {calculatedPlan.partner.basis > 0 && (
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: colors.basisBg }}
                        >
                          {calculatedPlan.partner.basis}× Basis
                        </span>
                      )}
                      {calculatedPlan.partner.plus > 0 && (
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: colors.plusBg }}
                        >
                          {calculatedPlan.partner.plus}× Plus
                        </span>
                      )}
                      {calculatedPlan.partner.bonus > 0 && (
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: colors.bonusBg }}
                        >
                          {calculatedPlan.partner.bonus}× Bonus
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div
                className="mt-4 p-4 rounded-xl text-sm leading-relaxed"
                style={{ background: colors.white, color: colors.text }}
              >
                {calculatedPlan.explanation}
              </div>
            </div>
            <button
              onClick={usePlan}
              className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
              style={{ background: colors.textDark, color: colors.white }}
            >
              Adjust details manually
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ===========================================
// MAIN PLANNER COMPONENT
// ===========================================
const ElterngeldPlanner: React.FC<ElterngeldPlannerProps> = ({
  plannerData,
  setPlannerData,
  plannerMonths,
  applicationType,
  premature,
  myCalc,
  partnerCalc,
  isLoggedIn,
  onSaveClick,
  fullscreen,
  onFullscreenToggle,
}) => {
  // State
  const [lastEditedCell, setLastEditedCell] = useState<{ month: number; person: "you" | "partner" } | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);
  const [tipResetKey, setTipResetKey] = useState(0);
  const [onboardingOpen, setOnboardingOpen] = useState(true); // Opens automatically
  const [displayedMonths, setDisplayedMonths] = useState(14); // 14 months in scroll

  const scrollRef = useRef<HTMLDivElement>(null);

  const tips = [
    "Tap a cell to assign Elterngeld. Tap again to cycle.",
    "Plus months count as 0.5 toward your budget.",
    "Bonus requires both parents to work 24–32 hours.",
    "You can take months simultaneously or one after another.",
    "Months count from birth date, not calendar months.",
  ];

  // Tips carousel
  const nextTip = useCallback(() => {
    setCurrentTip((prev) => (prev + 1) % tips.length);
    setTipResetKey((k) => k + 1);
  }, [tips.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [tipResetKey, tips.length]);

  // Scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const maxScroll = scrollHeight - clientHeight;
    setScrollProgress(maxScroll > 0 ? scrollTop / maxScroll : 0);
  }, []);

  // Cycle planner type
  const cycleType = useCallback(
    (monthIndex: number, person: "you" | "partner", e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const newData = [...plannerData];
      const current = newData[monthIndex][person];
      const cycle: Array<"none" | "basis" | "plus" | "bonus"> =
        applicationType === "single" ? ["none", "basis", "plus"] : ["none", "basis", "plus", "bonus"];
      const nextIndex = (cycle.indexOf(current) + 1) % cycle.length;
      newData[monthIndex] = { ...newData[monthIndex], [person]: cycle[nextIndex] };
      setPlannerData(newData);
      setLastEditedCell({ month: monthIndex, person });
    },
    [plannerData, setPlannerData, applicationType],
  );

  // Apply preset scenarios
  const applyPreset = (preset: "12+2" | "7+7" | "12-solo" | "14-solo" | "clear") => {
    setLastEditedCell(null);
    const create = (fn: (i: number) => PlannerMonth) =>
      Array(32)
        .fill(null)
        .map((_, i) => fn(i));

    if (preset === "12+2") {
      setPlannerData(
        create((i) => ({ you: i < 12 ? "basis" : "none", partner: i >= 12 && i < 14 ? "basis" : "none" })),
      );
      setDisplayedMonths(Math.max(displayedMonths, 14));
    } else if (preset === "7+7") {
      setPlannerData(create((i) => ({ you: i < 7 ? "basis" : "none", partner: i >= 7 && i < 14 ? "basis" : "none" })));
      setDisplayedMonths(Math.max(displayedMonths, 14));
    } else if (preset === "12-solo") {
      setPlannerData(create((i) => ({ you: i < 12 ? "basis" : "none", partner: "none" })));
    } else if (preset === "14-solo") {
      setPlannerData(create((i) => ({ you: i < 14 ? "basis" : "none", partner: "none" })));
    } else if (preset === "clear") {
      setPlannerData(create(() => ({ you: "none", partner: "none" })));
      setDisplayedMonths(14);
    }
  };

  // Add months
  const addMonths = (count: number) => {
    setDisplayedMonths((prev) => Math.min(prev + count, plannerMonths));
  };

  // Wizard complete handler
  const handleOnboardingComplete = (newData: PlannerMonth[]) => {
    setPlannerData(newData);
    setLastEditedCell(null);
    // Expand displayed months if wizard result needs more
    const lastFilledMonth = newData.findLastIndex((m) => m.you !== "none" || m.partner !== "none");
    if (lastFilledMonth >= displayedMonths) {
      setDisplayedMonths(Math.min(lastFilledMonth + 2, plannerMonths));
    }
  };

  // Computed values
  const plannerVisibleData = plannerData.slice(0, displayedMonths);
  const isCouple = applicationType === "couple";
  const canAddMore = displayedMonths < plannerMonths;

  // Validation
  const plannerValidation = useMemo(() => {
    const countMonths = (person: "you" | "partner", type: string) =>
      plannerVisibleData.filter((m) => m[person] === type).length;

    const youBasis = countMonths("you", "basis");
    const youPlus = countMonths("you", "plus");
    const youBonus = countMonths("you", "bonus");
    const partnerBasis = isCouple ? countMonths("partner", "basis") : 0;
    const partnerPlus = isCouple ? countMonths("partner", "plus") : 0;
    const partnerBonus = isCouple ? countMonths("partner", "bonus") : 0;

    const youBudget = youBasis + youPlus / 2;
    const partnerBudget = partnerBasis + partnerPlus / 2;
    const totalBudget = youBudget + partnerBudget;

    // Premature birth extra months
    const getPrematureExtra = () => {
      switch (premature) {
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

    const globalErrors: string[] = [];
    const rowErrors: Map<number, string[]> = new Map();
    const hasMultiples = false;

    const addRowError = (rowIndex: number, error: string) => {
      if (!rowErrors.has(rowIndex)) rowErrors.set(rowIndex, []);
      rowErrors.get(rowIndex)!.push(error);
    };

    // GLOBAL: Budget overflow
    if (totalBudget > maxBudget) {
      globalErrors.push(`Exceeded ${maxBudget}-month limit (${totalBudget}).`);
    }

    // GLOBAL: Max Bonus months
    if (youBonus > 4) globalErrors.push(`Max 4 bonus months (you have ${youBonus})`);
    if (partnerBonus > 4) globalErrors.push(`Partner max 4 bonus months`);

    // GLOBAL: Single parent must have at least 2 months
    if (!isCouple && youBasis + youPlus + youBonus < 2 && youBasis + youPlus + youBonus > 0) {
      globalErrors.push("Single parents must take at least 2 months");
    }

    // GLOBAL: Minimum 2 months per parent (couples)
    if (isCouple) {
      const youTotal = youBasis + youPlus + youBonus;
      const partnerTotal = partnerBasis + partnerPlus + partnerBonus;
      if (youTotal > 0 && youTotal < 2) globalErrors.push("You must claim at least 2 months.");
      if (partnerTotal > 0 && partnerTotal < 2) globalErrors.push("Partner must claim at least 2 months.");
    }

    // INLINE: Each parent max 12 Basis months
    if (isCouple && !hasMultiples) {
      if (youBasis > 12) {
        const firstBasisIndex = plannerVisibleData.findIndex((m) => m.you === "basis");
        if (firstBasisIndex >= 0) addRowError(firstBasisIndex, `Max 12 Basis months per parent.`);
      }
      if (partnerBasis > 12) {
        const firstBasisIndex = plannerVisibleData.findIndex((m) => m.partner === "basis");
        if (firstBasisIndex >= 0) addRowError(firstBasisIndex, `Partner max 12 Basis months.`);
      }
    }

    // INLINE: Basiselterngeld only in months 1-14
    plannerVisibleData.forEach((m, i) => {
      if (i >= 14 && (m.you === "basis" || m.partner === "basis")) {
        addRowError(i, "Basis only in months 1–14.");
      }
    });

    // INLINE: Parallel Basiselterngeld limited
    if (isCouple && !hasMultiples) {
      const parallelBasisIndices = plannerVisibleData
        .map((m, i) => (m.you === "basis" && m.partner === "basis" ? i : -1))
        .filter((i) => i >= 0);
      if (parallelBasisIndices.length > 1) {
        parallelBasisIndices.slice(1).forEach((i) => {
          addRowError(i, "Both can only take Basis together for 1 month.");
        });
      }
      parallelBasisIndices.forEach((i) => {
        if (i >= 12) addRowError(i, "Simultaneous Basis only in months 1–12.");
      });
    }

    // INLINE: Plus/Bonus after month 14 must be continuous
    if (displayedMonths > 14) {
      let hadActivityAfter14 = false;
      for (let i = 14; i < displayedMonths; i++) {
        const monthHasActivity = plannerVisibleData[i]?.you !== "none" || plannerVisibleData[i]?.partner !== "none";
        if (monthHasActivity) hadActivityAfter14 = true;
        if (hadActivityAfter14 && !monthHasActivity) {
          addRowError(i, "Months after 14 must be continuous.");
          break;
        }
      }
    }

    // INLINE: Bonus rules
    if (isCouple) {
      const bonusIndices = plannerVisibleData
        .map((m, i) => (m.you === "bonus" || m.partner === "bonus" ? i : -1))
        .filter((i) => i >= 0);

      if (bonusIndices.length > 0) {
        const notParallel = plannerVisibleData.some(
          (m) => (m.you === "bonus" && m.partner !== "bonus") || (m.partner === "bonus" && m.you !== "bonus"),
        );
        let notConsecutive = false;
        for (let j = 1; j < bonusIndices.length; j++) {
          if (bonusIndices[j] !== bonusIndices[j - 1] + 1) {
            notConsecutive = true;
            break;
          }
        }
        const lessThan2 = bonusIndices.length < 2;

        if (notParallel || notConsecutive || lessThan2) {
          addRowError(bonusIndices[0], "Bonus: both parents, 2–4 consecutive months.");
        }
      }
    }

    return {
      globalErrors,
      rowErrors,
      totalBudget,
      maxBudget,
      totalMoney,
      youBasis,
      youPlus,
      youBonus,
      partnerBasis,
      partnerPlus,
      partnerBonus,
    };
  }, [plannerVisibleData, premature, myCalc, partnerCalc, displayedMonths, isCouple]);

  const { globalErrors, rowErrors, totalBudget, maxBudget, totalMoney } = plannerValidation;
  const errorMonths = Array.from(rowErrors.keys());
  const hasErrors = globalErrors.length > 0 || rowErrors.size > 0;
  const isEmpty = totalBudget === 0;

  // Layout
  const rowHeight = 40;
  const rowGap = 4;
  const visibleRows = 7;
  const listHeight = rowHeight * visibleRows + rowGap * (visibleRows - 1);
  const isAtBottom = scrollProgress > 0.95;
  const isAtTop = scrollProgress < 0.05;

  // Card styling
  const getCardStyle = (type: "none" | "basis" | "plus" | "bonus", person: "you" | "partner", monthIndex: number) => {
    const hasError =
      errorMonths.includes(monthIndex) && lastEditedCell?.month === monthIndex && lastEditedCell?.person === person;
    const base = { transition: "all 0.15s ease", backdropFilter: "blur(8px)" };

    if (type === "none")
      return {
        ...base,
        backgroundColor: hasError ? "rgba(254, 202, 202, 0.5)" : "rgba(255, 255, 255, 0.5)",
        border: hasError ? `1.5px solid ${colors.error}` : `1.5px dashed ${colors.border}`,
      };
    if (type === "basis")
      return {
        ...base,
        backgroundColor: hasError ? "rgba(254, 202, 202, 0.5)" : "rgba(192, 99, 11, 0.85)",
        border: hasError ? `1.5px solid ${colors.error}` : "none",
      };
    if (type === "plus")
      return {
        ...base,
        backgroundColor: hasError ? "rgba(254, 202, 202, 0.5)" : "rgba(252, 99, 27, 0.85)",
        border: hasError ? `1.5px solid ${colors.error}` : "none",
      };
    if (type === "bonus")
      return {
        ...base,
        backgroundColor: hasError ? "rgba(254, 202, 202, 0.5)" : "rgba(255, 189, 240, 0.85)",
        border: hasError ? `1.5px solid ${colors.error}` : "none",
      };
    return base;
  };

  const getLabel = (type: "none" | "basis" | "plus" | "bonus") => {
    if (type === "basis") return "BASIS";
    if (type === "plus") return "PLUS";
    if (type === "bonus") return "BONUS";
    return null;
  };

  return (
    <>
      <PlannerOnboarding
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
        applicationType={applicationType}
      />

      <div className="py-3">
        {/* Status Bar */}
        <div className="mb-3 flex items-stretch gap-2" style={{ minHeight: 52 }}>
          {isEmpty ? (
            <button
              onClick={nextTip}
              className="flex-1 px-3 py-2 rounded-xl flex items-center gap-2 text-left transition-all active:scale-[0.99]"
              style={{ backgroundColor: colors.tile }}
            >
              <svg
                className="w-4 h-4 shrink-0"
                style={{ color: colors.orange }}
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
              <span className="flex-1 text-xs" style={{ color: colors.textDark }}>
                {tips[currentTip]}
              </span>
              <svg
                className="w-3 h-3"
                style={{ color: colors.text }}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : hasErrors ? (
            <div
              className="flex-1 px-3 py-2 rounded-xl flex items-center gap-2"
              style={{ backgroundColor: colors.errorBg }}
            >
              <svg
                className="w-4 h-4 shrink-0"
                style={{ color: colors.error }}
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
              <span className="flex-1 text-xs" style={{ color: colors.error }}>
                {globalErrors[0] || Array.from(rowErrors.values())[0]?.[0]}
              </span>
            </div>
          ) : totalBudget >= maxBudget ? (
            <div
              className="flex-1 px-3 py-2 rounded-xl flex items-center gap-2"
              style={{ backgroundColor: colors.successBg }}
            >
              <svg
                className="w-4 h-4 shrink-0"
                style={{ color: colors.success }}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs" style={{ color: colors.success }}>
                Done! Your plan is ready.
              </span>
            </div>
          ) : (
            <div
              className="flex-1 px-3 py-2 rounded-xl flex items-center gap-2"
              style={{ backgroundColor: colors.successBg }}
            >
              <svg
                className="w-4 h-4 shrink-0"
                style={{ color: colors.success }}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs" style={{ color: colors.success }}>
                Looking good — keep going!
              </span>
            </div>
          )}

          {/* Budget Counter */}
          <div
            className="px-3 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: colors.tile, minWidth: 60 }}
          >
            <span
              className="font-bold text-sm"
              style={{ color: totalBudget > maxBudget ? colors.error : colors.textDark }}
            >
              {totalBudget % 1 === 0 ? totalBudget : totalBudget.toFixed(1)}/{maxBudget}
            </span>
          </div>

          {/* Fullscreen Button */}
          {onFullscreenToggle && (
            <button
              onClick={onFullscreenToggle}
              className="px-3 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{ backgroundColor: colors.tile }}
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
          )}
        </div>

        {/* Column Headers */}
        <div className="flex items-center mb-1.5 px-0.5" style={{ gap: 6 }}>
          <div style={{ width: 22 }}>
            <span className="text-xs font-semibold" style={{ color: colors.text }}>
              #
            </span>
          </div>
          <div className="flex-1">
            <span className="text-xs font-semibold" style={{ color: colors.text }}>
              You
            </span>
          </div>
          {isCouple && (
            <div className="flex-1">
              <span className="text-xs font-semibold" style={{ color: colors.text }}>
                Partner
              </span>
            </div>
          )}
          <div style={{ width: 62 }}>
            <span className="text-xs font-semibold" style={{ color: colors.text }}>
              Monthly
            </span>
          </div>
          <div style={{ width: 9 }} />
        </div>

        {/* Month Rows - Scrollable */}
        <div className="relative flex" style={{ gap: 6 }}>
          <div className="relative flex-1">
            <div
              className="absolute top-0 left-0 right-0 pointer-events-none z-10"
              style={{
                height: 32,
                background: `linear-gradient(to bottom, ${colors.background} 0%, transparent 100%)`,
                opacity: isAtTop ? 0 : 1,
              }}
            />
            <div
              ref={scrollRef}
              className="overflow-y-auto"
              onScroll={handleScroll}
              style={{ height: listHeight, scrollbarWidth: "none" }}
            >
              <div className="flex flex-col" style={{ gap: rowGap }}>
                {plannerVisibleData.map((month, i) => {
                  const youAmt =
                    month.you === "basis"
                      ? myCalc.basis
                      : month.you === "plus"
                        ? myCalc.plus
                        : month.you === "bonus"
                          ? myCalc.bonus
                          : 0;
                  const partnerAmt = isCouple
                    ? month.partner === "basis"
                      ? partnerCalc.basis
                      : month.partner === "plus"
                        ? partnerCalc.plus
                        : month.partner === "bonus"
                          ? partnerCalc.bonus
                          : 0
                    : 0;
                  const total = youAmt + partnerAmt;

                  return (
                    <div key={i} className="flex items-center px-0.5" style={{ gap: 6, height: rowHeight }}>
                      <div style={{ width: 22 }}>
                        <span className="text-xs font-bold" style={{ color: colors.textDark }}>
                          {i + 1}
                        </span>
                      </div>

                      {/* You Cell */}
                      <button
                        onClick={(e) => cycleType(i, "you", e)}
                        className="flex-1 rounded-lg flex items-center justify-center active:scale-95 cursor-pointer"
                        style={{ height: rowHeight, ...getCardStyle(month.you, "you", i) }}
                      >
                        {month.you === "none" ? (
                          <span className="text-lg" style={{ color: colors.border }}>
                            +
                          </span>
                        ) : (
                          <div className="flex items-center justify-between w-full px-2">
                            <span className="text-base opacity-50">‹</span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: "0.05em",
                                color: month.you === "bonus" ? colors.textDark : colors.white,
                              }}
                            >
                              {getLabel(month.you)}
                            </span>
                            <span className="text-base opacity-50">›</span>
                          </div>
                        )}
                      </button>

                      {/* Partner Cell */}
                      {isCouple && (
                        <button
                          onClick={(e) => cycleType(i, "partner", e)}
                          className="flex-1 rounded-lg flex items-center justify-center active:scale-95 cursor-pointer"
                          style={{ height: rowHeight, ...getCardStyle(month.partner, "partner", i) }}
                        >
                          {month.partner === "none" ? (
                            <span className="text-lg" style={{ color: colors.border }}>
                              +
                            </span>
                          ) : (
                            <div className="flex items-center justify-between w-full px-2">
                              <span className="text-base opacity-50">‹</span>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  letterSpacing: "0.05em",
                                  color: month.partner === "bonus" ? colors.textDark : colors.white,
                                }}
                              >
                                {getLabel(month.partner)}
                              </span>
                              <span className="text-base opacity-50">›</span>
                            </div>
                          )}
                        </button>
                      )}

                      {/* Sum */}
                      <div style={{ width: 62 }}>
                        <span
                          className="text-xs font-semibold"
                          style={{ color: total > 0 ? colors.textDark : colors.border }}
                        >
                          {total > 0 ? `€${total.toLocaleString("de-DE")}` : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Add More Months */}
                {canAddMore && (
                  <div className="flex items-center gap-2 mt-1 px-0.5">
                    <button
                      onClick={() => addMonths(1)}
                      className="flex-1 rounded-lg flex items-center justify-center transition-all active:scale-95"
                      style={{
                        height: rowHeight,
                        backgroundColor: "transparent",
                        border: `1.5px dashed ${colors.border}`,
                      }}
                    >
                      <span className="text-xs font-medium" style={{ color: colors.text }}>
                        + Add month
                      </span>
                    </button>
                    <button
                      onClick={() => addMonths(4)}
                      className="px-4 rounded-lg flex items-center justify-center transition-all active:scale-95"
                      style={{ height: rowHeight, backgroundColor: colors.white, color: colors.textDark }}
                    >
                      <span className="text-xs font-medium">+4</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div
              className="absolute bottom-0 left-0 right-0 pointer-events-none"
              style={{
                height: 40,
                background: `linear-gradient(to top, ${colors.background} 0%, transparent 100%)`,
                opacity: isAtBottom ? 0 : 1,
              }}
            />
          </div>

          {/* Scroll Track */}
          <div
            className="relative rounded-full"
            style={{ width: 3, height: listHeight, backgroundColor: colors.border }}
          >
            <div
              className="absolute left-0 right-0 rounded-full transition-all"
              style={{ backgroundColor: colors.basis, height: "25%", top: `${scrollProgress * 75}%` }}
            />
          </div>
        </div>

        {/* Presets & Actions */}
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
          <div className="flex justify-between items-center">
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setOnboardingOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all active:scale-95"
                style={{ backgroundColor: colors.white, color: colors.textDark }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Wizard
              </button>
              {isCouple ? (
                <>
                  <button
                    onClick={() => applyPreset("12+2")}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                    style={{ backgroundColor: colors.white, color: colors.textDark }}
                  >
                    12 + 2
                  </button>
                  <button
                    onClick={() => applyPreset("7+7")}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                    style={{ backgroundColor: colors.white, color: colors.textDark }}
                  >
                    7 + 7
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => applyPreset("12-solo")}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                    style={{ backgroundColor: colors.white, color: colors.textDark }}
                  >
                    12 Basis
                  </button>
                  <button
                    onClick={() => applyPreset("14-solo")}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                    style={{ backgroundColor: colors.white, color: colors.textDark }}
                  >
                    14 Basis
                  </button>
                </>
              )}
              <button
                onClick={() => applyPreset("clear")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                style={{ backgroundColor: "transparent", color: colors.text, border: `1px solid ${colors.border}` }}
              >
                Clear
              </button>
            </div>

            {!isLoggedIn && (
              <button
                onClick={onSaveClick}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                style={{ backgroundColor: colors.buttonDark, color: colors.white }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                  />
                </svg>
                Save
              </button>
            )}

            {isLoggedIn && (
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
        </div>
      </div>
    </>
  );
};

export default ElterngeldPlanner;
