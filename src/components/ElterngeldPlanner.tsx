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
  birthDate?: Date;
  // Error Modal
  showErrorModal?: boolean;
  onErrorModalClose?: () => void;
  onContinueAnyway?: () => void;
}

export interface ValidationResult {
  hasErrors: boolean;
  errors: string[];
  totalBudget: number;
  maxBudget: number;
}

// ===========================================
// DESIGN TOKENS
// ===========================================
const colors = {
  background: "#FAFAF9",
  tile: "#F1EDE5",
  text: "#57534E",
  textDark: "#000000",
  white: "#FFFFFF",
  border: "#E7E5E4",
  yellow: "#FFE44C",
  yellowLight: "rgba(255, 228, 76, 0.4)",
  orange: "#FF8752",
  tan: "#D0B080",
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
// EXPORTED VALIDATION FUNCTION
// ===========================================
export function validatePlannerData(
  plannerData: PlannerMonth[],
  displayedMonths: number,
  applicationType: "couple" | "single",
  premature?: string,
): ValidationResult {
  const plannerVisibleData = plannerData.slice(0, displayedMonths);
  const isCouple = applicationType === "couple";

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

  const errors: string[] = [];
  const hasMultiples = false;

  // Budget overflow
  if (totalBudget > maxBudget) {
    errors.push(`Exceeded ${maxBudget}-month limit (${totalBudget}).`);
  }

  // Max Bonus months
  if (youBonus > 4) errors.push(`Max 4 bonus months (you have ${youBonus})`);
  if (partnerBonus > 4) errors.push(`Partner max 4 bonus months`);

  // Single parent must have at least 2 months
  if (!isCouple && youBasis + youPlus + youBonus < 2 && youBasis + youPlus + youBonus > 0) {
    errors.push("Single parents must take at least 2 months");
  }

  // Minimum 2 months per parent (couples)
  if (isCouple) {
    const youTotal = youBasis + youPlus + youBonus;
    const partnerTotal = partnerBasis + partnerPlus + partnerBonus;
    if (youTotal > 0 && youTotal < 2) errors.push("You must claim at least 2 months.");
    if (partnerTotal > 0 && partnerTotal < 2) errors.push("Partner must claim at least 2 months.");
  }

  // Each parent max 12 Basis months
  if (isCouple && !hasMultiples) {
    if (youBasis > 12) errors.push("Max 12 Basis months per parent.");
    if (partnerBasis > 12) errors.push("Partner max 12 Basis months.");
  }

  // Basiselterngeld only in months 1-14
  const basisAfter14 = plannerVisibleData.some((m, i) => i >= 14 && (m.you === "basis" || m.partner === "basis"));
  if (basisAfter14) errors.push("Basis only allowed in months 1–14.");

  // Parallel Basiselterngeld limited
  if (isCouple && !hasMultiples) {
    const parallelBasisCount = plannerVisibleData.filter((m) => m.you === "basis" && m.partner === "basis").length;
    if (parallelBasisCount > 1) errors.push("Both can only take Basis together for 1 month.");
    const parallelBasisAfter12 = plannerVisibleData.some(
      (m, i) => i >= 12 && m.you === "basis" && m.partner === "basis",
    );
    if (parallelBasisAfter12) errors.push("Simultaneous Basis only in months 1–12.");
  }

  // Plus/Bonus after month 14 must be continuous
  if (displayedMonths > 14) {
    const activityIndicesAfter14: number[] = [];
    for (let i = 14; i < displayedMonths; i++) {
      if (plannerVisibleData[i]?.you !== "none" || plannerVisibleData[i]?.partner !== "none") {
        activityIndicesAfter14.push(i);
      }
    }
    for (let j = 1; j < activityIndicesAfter14.length; j++) {
      if (activityIndicesAfter14[j] !== activityIndicesAfter14[j - 1] + 1) {
        errors.push("Months after 14 must be continuous (no gaps).");
        break;
      }
    }
  }

  // Bonus rules
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

      if (notParallel) errors.push("Bonus months must be taken by both parents together.");
      if (notConsecutive) errors.push("Bonus months must be consecutive.");
      if (lessThan2) errors.push("Minimum 2 bonus months required.");
    }
  }

  return {
    hasErrors: errors.length > 0,
    errors,
    totalBudget,
    maxBudget,
  };
}

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
  const [currentStep, setCurrentStep] = useState<"intro" | number | "result" | "howto">("intro");
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
      setCurrentStep("intro");
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
    if (currentStep === "howto") setCurrentStep("result");
    else if (currentStep === "result") goTo(isCouple ? 5 : 3);
    else if (currentStep === 1) setCurrentStep("intro");
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
  const showHowTo = () => setCurrentStep("howto");
  const usePlan = () => {
    if (calculatedPlan) {
      onComplete(convertPlanToPlannerData(calculatedPlan, applicationType), calculatedPlan);
    }
    onClose();
  };
  const startQuickGuide = () => setCurrentStep(1);
  const startManual = () => onClose();
  const getYouFill = () => ((state.youMonths - 2) / 26) * 100 + "%";
  const getPartnerFill = () => (state.partnerMonths / 28) * 100 + "%";

  if (!isOpen) return null;

  const showProgress = typeof currentStep === "number";
  const progressIndex = typeof currentStep === "number" ? currentStep : totalSteps;
  const showBackButton = currentStep !== "intro";

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-3 shrink-0">
        <button
          onClick={goBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5"
          style={{ opacity: showBackButton ? 1 : 0, pointerEvents: showBackButton ? "auto" : "none" }}
          disabled={!showBackButton}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={colors.textDark} strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {showProgress && (
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: i < progressIndex ? colors.textDark : "rgba(0,0,0,0.15)" }}
              />
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5"
          style={{ opacity: 0.6 }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={colors.textDark} strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content - abbreviated for length, same as original */}
      <div className="flex-1 flex flex-col px-4 pb-4">
        {currentStep === "intro" && (
          <div className="flex flex-col flex-1">
            <div className="flex-1" />
            <div className="mt-6">
              <p className="text-center mb-4" style={{ color: colors.text, fontSize: 14, lineHeight: 1.5 }}>
                Elterngeld rules are complex – let us
                <br />
                suggest a starting plan for you.
              </p>
              <button
                onClick={startQuickGuide}
                className="w-full py-4 rounded-xl font-semibold transition-transform active:scale-[0.98]"
                style={{ background: colors.textDark, color: colors.white }}
              >
                Get recommendation
              </button>
              <button
                onClick={startManual}
                className="w-full text-center mt-3 text-sm transition-colors hover:text-black"
                style={{ color: colors.text }}
              >
                or plan manually
              </button>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="flex flex-col flex-1">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-center mb-8" style={{ fontSize: 20, fontWeight: 600, color: colors.textDark }}>
                How many months would you like to stay home?
              </h2>
              <div className="flex items-center gap-5">
                <div className="flex-1">
                  <div className="relative h-8 flex items-center">
                    <div className="absolute inset-x-0 h-2 rounded-full" style={{ background: "#E0DCD4" }}>
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
                      className="absolute inset-x-0 w-full h-8 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="text-center px-5 py-4 rounded-xl" style={{ background: colors.white }}>
                  <div className="text-3xl font-bold">{state.youMonths}</div>
                  <div className="text-sm" style={{ color: colors.text }}>
                    months
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => goTo(2)}
              className="w-full py-4 rounded-xl font-semibold"
              style={{ background: colors.textDark, color: colors.white }}
            >
              Continue
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="flex flex-col flex-1">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-center mb-2" style={{ fontSize: 20, fontWeight: 600, color: colors.textDark }}>
                Will you receive Mutterschaftsgeld?
              </h2>
              <p className="text-center mb-8 text-sm" style={{ color: colors.text }}>
                Maternity pay from health insurance
              </p>
              <div className="flex gap-3">
                {(["no", "yes"] as const).map((val) => (
                  <button
                    key={val}
                    onClick={() => selectMutterschaftsgeld(val)}
                    className="flex-1 py-4 rounded-xl font-medium border-2"
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

        {currentStep === 3 && (
          <div className="flex flex-col flex-1">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-center mb-8" style={{ fontSize: 20, fontWeight: 600, color: colors.textDark }}>
                Will you work part-time?
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => selectYouWork("no")}
                  className="flex-1 py-4 rounded-xl font-medium border-2"
                  style={{
                    background: colors.white,
                    borderColor: state.youWork === "no" ? colors.textDark : "transparent",
                  }}
                >
                  No, fully at home
                </button>
                <button
                  onClick={() => selectYouWork("yes")}
                  className="flex-1 py-4 rounded-xl font-medium border-2"
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

        {currentStep === 4 && isCouple && (
          <div className="flex flex-col flex-1">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-center mb-8" style={{ fontSize: 20, fontWeight: 600, color: colors.textDark }}>
                How many months for your partner?
              </h2>
              <div className="flex items-center gap-5">
                <div className="flex-1">
                  <div className="relative h-8 flex items-center">
                    <div className="absolute inset-x-0 h-2 rounded-full" style={{ background: "#E0DCD4" }}>
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
                      className="absolute inset-x-0 w-full h-8 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="text-center px-5 py-4 rounded-xl" style={{ background: colors.white }}>
                  <div className="text-3xl font-bold">{state.partnerMonths}</div>
                  <div className="text-sm" style={{ color: colors.text }}>
                    months
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => goTo(5)}
              className="w-full py-4 rounded-xl font-semibold"
              style={{ background: colors.textDark, color: colors.white }}
            >
              Continue
            </button>
          </div>
        )}

        {currentStep === 5 && isCouple && (
          <div className="flex flex-col flex-1">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-center mb-8" style={{ fontSize: 20, fontWeight: 600, color: colors.textDark }}>
                Will partner work part-time?
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => selectPartnerWork("no")}
                  className="flex-1 py-4 rounded-xl font-medium border-2"
                  style={{
                    background: colors.white,
                    borderColor: state.partnerWork === "no" ? colors.textDark : "transparent",
                  }}
                >
                  No, fully at home
                </button>
                <button
                  onClick={() => selectPartnerWork("yes")}
                  className="flex-1 py-4 rounded-xl font-medium border-2"
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

        {currentStep === "result" && calculatedPlan && (
          <div className="flex flex-col flex-1">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-center mb-2" style={{ fontSize: 20, fontWeight: 600, color: colors.textDark }}>
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
                        style={{ background: colors.orange }}
                      >
                        {calculatedPlan.you.basis}× Basis
                      </span>
                    )}
                    {calculatedPlan.you.plus > 0 && (
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: colors.yellow }}
                      >
                        {calculatedPlan.you.plus}× Plus
                      </span>
                    )}
                    {calculatedPlan.you.bonus > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: colors.tan }}>
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
                          style={{ background: colors.orange }}
                        >
                          {calculatedPlan.partner.basis}× Basis
                        </span>
                      )}
                      {calculatedPlan.partner.plus > 0 && (
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: colors.yellow }}
                        >
                          {calculatedPlan.partner.plus}× Plus
                        </span>
                      )}
                      {calculatedPlan.partner.bonus > 0 && (
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: colors.tan }}
                        >
                          {calculatedPlan.partner.bonus}× Bonus
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: colors.white, color: colors.text }}>
                {calculatedPlan.explanation}
              </div>
            </div>
            <button
              onClick={showHowTo}
              className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{ background: colors.textDark, color: colors.white }}
            >
              Continue
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {currentStep === "howto" && (
          <div className="flex flex-col flex-1">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-center mb-6" style={{ fontSize: 20, fontWeight: 600, color: colors.textDark }}>
                Now adjust your plan
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: colors.white }}>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: colors.orange }}
                  >
                    <span className="text-sm font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Tap any cell to assign</p>
                    <p className="text-sm" style={{ color: colors.text }}>
                      Basis, Plus, or Bonus
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: colors.white }}>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: colors.yellow }}
                  >
                    <span className="text-sm font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Tap again to cycle</p>
                    <p className="text-sm" style={{ color: colors.text }}>
                      Basis → Plus → Bonus → None
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: colors.white }}>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: colors.tan }}
                  >
                    <span className="text-sm font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Watch for errors</p>
                    <p className="text-sm" style={{ color: colors.text }}>
                      We'll warn you if something's invalid
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={usePlan}
              className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{ background: colors.textDark, color: colors.white }}
            >
              Start editing
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
// RULES SPOTLIGHT
// ===========================================
interface RulesSpotlightProps {
  isOpen: boolean;
  onClose: () => void;
  isCouple: boolean;
}

const rulesContent = [
  {
    title: "Budget",
    text: "You have 14 months to share. Plus months count as 0.5.",
  },
  {
    title: "Per Parent",
    text: "Each parent can take 2–12 Basis months.",
  },
  {
    title: "Bonus",
    text: "Working 24–32h/week? Add up to 4 Bonus months – both parents at the same time.",
  },
  {
    title: "Basis Timing",
    text: "Basis is available in months 1–14. After that, use Plus or Bonus.",
  },
  {
    title: "Parallel",
    text: "Both parents can take Basis in the same month once, within months 1–12.",
  },
];

const RulesSpotlight: React.FC<RulesSpotlightProps> = ({ isOpen, onClose, isCouple }) => {
  const [currentRule, setCurrentRule] = useState(0);

  const rules = isCouple ? rulesContent : rulesContent.filter((r) => r.title !== "Bonus" && r.title !== "Parallel");

  useEffect(() => {
    if (isOpen) setCurrentRule(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const goNext = () => setCurrentRule((prev) => Math.min(prev + 1, rules.length - 1));
  const goPrev = () => setCurrentRule((prev) => Math.max(prev - 1, 0));
  const isLast = currentRule === rules.length - 1;

  return (
    <div className="absolute inset-0 z-50 rounded-2xl overflow-hidden">
      {/* Light blur overlay - echtes Tool scheint durch */}
      <div
        className="absolute inset-0"
        style={{ backdropFilter: "blur(2px)", background: "rgba(255,255,255,0.4)" }}
        onClick={onClose}
      />

      {/* Spotlight cutout - erste Spalte klar sichtbar */}
      <div
        className="absolute rounded-xl"
        style={{
          top: 70,
          left: 60,
          width: 70,
          height: isCouple ? 160 : 90,
          background: "transparent",
          boxShadow: "0 0 0 2000px rgba(255,255,255,0.6)",
          borderRadius: 16,
        }}
      />

      {/* Tooltip card */}
      <div
        className="absolute rounded-2xl p-4"
        style={{
          top: isCouple ? 100 : 80,
          left: 145,
          width: 220,
          background: colors.white,
          boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
        }}
      >
        <div className="mb-2">
          <h3 className="font-semibold text-sm" style={{ color: colors.textDark }}>
            {rules[currentRule].title}
          </h3>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: colors.text }}>
            {rules[currentRule].text}
          </p>
        </div>

        {/* Navigation */}
        <div
          className="flex items-center justify-between mt-3 pt-2"
          style={{ borderTop: `1px solid ${colors.border}` }}
        >
          <div className="flex gap-1">
            {rules.map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{ background: i === currentRule ? colors.orange : colors.border }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {currentRule > 0 && (
              <button
                onClick={goPrev}
                className="px-2 py-1 rounded-lg text-xs"
                style={{ background: colors.tile, color: colors.textDark }}
              >
                ←
              </button>
            )}
            <button
              onClick={isLast ? onClose : goNext}
              className="px-3 py-1 rounded-lg text-xs font-medium"
              style={{ background: colors.textDark, color: colors.white }}
            >
              {isLast ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===========================================
// ERROR MODAL
// ===========================================
interface ErrorModalProps {
  isOpen: boolean;
  errors: string[];
  onClose: () => void;
  onContinueAnyway: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, errors, onClose, onContinueAnyway }) => {
  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-50 rounded-2xl overflow-hidden"
      style={{ background: "rgba(255, 255, 255, 0.95)" }}
    >
      <div
        className="w-full mx-3 rounded-2xl flex flex-col overflow-hidden"
        style={{ maxWidth: 360, background: colors.white, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}
      >
        <div className="flex items-center justify-end p-4 shrink-0">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ opacity: 0.6 }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={colors.textDark} strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-7 pb-7">
          <div className="text-center mb-5">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
              style={{ background: colors.errorBg }}
            >
              <svg
                className="w-6 h-6"
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
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 600, color: colors.textDark }}>Your plan has issues</h2>
          </div>
          <div className="mb-5 p-4 rounded-xl" style={{ background: colors.errorBg }}>
            <ul className="space-y-2">
              {errors.map((error, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: colors.error }}>
                  <span className="shrink-0 mt-0.5">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-center text-sm mb-6" style={{ color: colors.text }}>
            You can continue, but your application may be rejected.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold"
              style={{ background: colors.textDark, color: colors.white }}
            >
              Fix errors
            </button>
            <button
              onClick={onContinueAnyway}
              className="flex-1 py-3 rounded-xl font-semibold"
              style={{ background: colors.tile, color: colors.textDark }}
            >
              Continue anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===========================================
// HORIZONTAL TIMELINE COMPONENT
// ===========================================
interface HorizontalTimelineProps {
  plannerData: PlannerMonth[];
  displayedMonths: number;
  isCouple: boolean;
  myCalc: { basis: number; plus: number; bonus: number };
  partnerCalc: { basis: number; plus: number; bonus: number };
  birthDate: Date;
  onCycleType: (monthIndex: number, person: "you" | "partner") => void;
  errorMonths: number[];
}

const HorizontalTimeline: React.FC<HorizontalTimelineProps> = ({
  plannerData,
  displayedMonths,
  isCouple,
  myCalc,
  partnerCalc,
  birthDate,
  onCycleType,
  errorMonths,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const getMonthInfo = (monthIndex: number) => {
    const date = new Date(birthDate);
    date.setMonth(date.getMonth() + monthIndex);
    const year = date.getFullYear().toString().slice(-2);
    return { name: monthNames[date.getMonth()], date: `${date.getDate()}.${date.getMonth() + 1}.${year}` };
  };

  const getCellStyle = (type: "none" | "basis" | "plus" | "bonus") => {
    if (type === "basis") return { background: colors.orange };
    if (type === "plus") return { background: colors.yellow };
    if (type === "bonus") return { background: colors.tan };
    return { background: colors.white };
  };

  const getCellContent = (type: "none" | "basis" | "plus" | "bonus") => {
    if (type === "none")
      return (
        <span className="text-xl font-light" style={{ color: colors.textDark }}>
          +
        </span>
      );
    const label = type === "basis" ? "B" : type === "plus" ? "P" : "Bo";
    return (
      <span className="text-base font-bold" style={{ color: colors.textDark }}>
        {label}
      </span>
    );
  };

  const plannerVisibleData = plannerData.slice(0, displayedMonths);

  return (
    <div className="relative">
      <div className="flex gap-3">
        {/* Left Labels */}
        <div className="flex flex-col shrink-0 pr-3 items-center" style={{ width: 44 }}>
          <div className="h-5 flex items-center justify-center">
            <svg
              className="w-5 h-5"
              style={{ color: colors.textDark }}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
          </div>
          <div style={{ height: 22 }} />
          <div className="flex items-center justify-center" style={{ width: 52, height: 52 }}>
            <svg
              className="w-5 h-5"
              style={{ color: colors.textDark }}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </div>
          {isCouple && (
            <>
              <div style={{ height: 14 }} />
              <div className="flex items-center justify-center" style={{ width: 52, height: 52 }}>
                <svg
                  className="w-5 h-5"
                  style={{ color: colors.textDark }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
              </div>
            </>
          )}
          <div className="h-6" />
          <div className="h-5 flex items-center justify-center">
            <span className="text-base font-medium" style={{ color: colors.textDark }}>
              €
            </span>
          </div>
        </div>

        {/* Scrollable Timeline */}
        <div className="relative flex-1 min-w-0">
          <div
            className="absolute top-0 right-0 w-8 h-full pointer-events-none z-10"
            style={{ background: `linear-gradient(to left, ${colors.tile} 0%, transparent 100%)` }}
          />
          <div
            ref={scrollRef}
            className="overflow-x-auto pb-2"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#ccc transparent" }}
          >
            <div className="flex" style={{ gap: 14 }}>
              {plannerVisibleData.map((month, i) => {
                const monthInfo = getMonthInfo(i);
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
                const hasError = errorMonths.includes(i);

                return (
                  <div key={i} className="flex flex-col items-center" style={{ minWidth: 54 }}>
                    <span className="text-xs h-5" style={{ color: colors.textDark }}>
                      {monthInfo.date}
                    </span>
                    <div style={{ height: 22 }} />
                    <button
                      onClick={() => onCycleType(i, "you")}
                      className="flex items-center justify-center shadow-sm cursor-pointer transition-transform active:scale-95"
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        ...getCellStyle(month.you),
                        border: hasError ? `2px solid ${colors.error}` : "none",
                      }}
                    >
                      {getCellContent(month.you)}
                    </button>
                    {isCouple && (
                      <>
                        <div style={{ height: 14 }} />
                        <button
                          onClick={() => onCycleType(i, "partner")}
                          className="flex items-center justify-center shadow-sm cursor-pointer transition-transform active:scale-95"
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            ...getCellStyle(month.partner),
                            border: hasError ? `2px solid ${colors.error}` : "none",
                          }}
                        >
                          {getCellContent(month.partner)}
                        </button>
                      </>
                    )}
                    <div className="h-6" />
                    <span className="text-xs h-5" style={{ color: colors.textDark }}>
                      {total > 0 ? total.toLocaleString("de-DE") : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
  birthDate = new Date(2025, 5, 15),
  showErrorModal,
  onErrorModalClose,
  onContinueAnyway,
}) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [tipResetKey, setTipResetKey] = useState(0);
  const [displayedMonths, setDisplayedMonths] = useState(14);
  const [rulesOpen, setRulesOpen] = useState(false);

  const tips = [
    "Tap a cell to cycle through Basis → Plus → Bonus → None",
    "Plus months count as 0.5 toward your 14-month budget.",
    "Bonus requires both parents to work 24–32 hours.",
    "You can take months simultaneously or one after another.",
    "Basis is only allowed in months 1–14.",
  ];

  const isCouple = applicationType === "couple";

  const nextTip = useCallback(() => {
    setCurrentTip((prev) => (prev + 1) % tips.length);
    setTipResetKey((k) => k + 1);
  }, [tips.length]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTip((prev) => (prev + 1) % tips.length), 6000);
    return () => clearInterval(interval);
  }, [tipResetKey, tips.length]);

  const cycleType = useCallback(
    (monthIndex: number, person: "you" | "partner") => {
      const newData = [...plannerData];
      const current = newData[monthIndex][person];
      const cycle: Array<"none" | "basis" | "plus" | "bonus"> =
        applicationType === "single" ? ["none", "basis", "plus"] : ["none", "basis", "plus", "bonus"];
      const nextIndex = (cycle.indexOf(current) + 1) % cycle.length;
      newData[monthIndex] = { ...newData[monthIndex], [person]: cycle[nextIndex] };
      setPlannerData(newData);
    },
    [plannerData, setPlannerData, applicationType],
  );

  const plannerVisibleData = plannerData.slice(0, displayedMonths);

  const plannerValidation = useMemo(() => {
    const countMonths = (person: "you" | "partner", type: string) =>
      plannerVisibleData.filter((m) => m[person] === type).length;
    const youBasis = countMonths("you", "basis"),
      youPlus = countMonths("you", "plus"),
      youBonus = countMonths("you", "bonus");
    const partnerBasis = isCouple ? countMonths("partner", "basis") : 0,
      partnerPlus = isCouple ? countMonths("partner", "plus") : 0,
      partnerBonus = isCouple ? countMonths("partner", "bonus") : 0;
    const totalBudget = youBasis + youPlus / 2 + partnerBasis + partnerPlus / 2;
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
    const globalErrors: string[] = [],
      rowErrors: Map<number, string[]> = new Map();
    const addRowError = (i: number, e: string) => {
      if (!rowErrors.has(i)) rowErrors.set(i, []);
      rowErrors.get(i)!.push(e);
    };

    if (totalBudget > maxBudget) globalErrors.push(`Exceeded ${maxBudget}-month limit (${totalBudget}).`);
    if (youBonus > 4) globalErrors.push(`Max 4 bonus months (you have ${youBonus})`);
    if (partnerBonus > 4) globalErrors.push(`Partner max 4 bonus months`);
    if (!isCouple && youBasis + youPlus + youBonus < 2 && youBasis + youPlus + youBonus > 0)
      globalErrors.push("Single parents must take at least 2 months");
    if (isCouple) {
      const youTotal = youBasis + youPlus + youBonus,
        partnerTotal = partnerBasis + partnerPlus + partnerBonus;
      if (youTotal > 0 && youTotal < 2) globalErrors.push("You must claim at least 2 months.");
      if (partnerTotal > 0 && partnerTotal < 2) globalErrors.push("Partner must claim at least 2 months.");
      if (youBasis > 12) {
        const idx = plannerVisibleData.findIndex((m) => m.you === "basis");
        if (idx >= 0) addRowError(idx, "Max 12 Basis months per parent.");
      }
      if (partnerBasis > 12) {
        const idx = plannerVisibleData.findIndex((m) => m.partner === "basis");
        if (idx >= 0) addRowError(idx, "Partner max 12 Basis months.");
      }
    }
    plannerVisibleData.forEach((m, i) => {
      if (i >= 14 && (m.you === "basis" || m.partner === "basis")) addRowError(i, "Basis only in months 1–14.");
    });
    if (isCouple) {
      const parallelBasisIndices = plannerVisibleData
        .map((m, i) => (m.you === "basis" && m.partner === "basis" ? i : -1))
        .filter((i) => i >= 0);
      if (parallelBasisIndices.length > 1)
        parallelBasisIndices.slice(1).forEach((i) => addRowError(i, "Both can only take Basis together for 1 month."));
      parallelBasisIndices.forEach((i) => {
        if (i >= 12) addRowError(i, "Simultaneous Basis only in months 1–12.");
      });
    }
    if (displayedMonths > 14) {
      const activityAfter14 = [];
      for (let i = 14; i < displayedMonths; i++)
        if (plannerVisibleData[i]?.you !== "none" || plannerVisibleData[i]?.partner !== "none") activityAfter14.push(i);
      for (let j = 1; j < activityAfter14.length; j++)
        if (activityAfter14[j] !== activityAfter14[j - 1] + 1) {
          addRowError(activityAfter14[j - 1] + 1, "Months after 14 must be continuous.");
          break;
        }
    }
    if (isCouple) {
      const bonusIndices = plannerVisibleData
        .map((m, i) => (m.you === "bonus" || m.partner === "bonus" ? i : -1))
        .filter((i) => i >= 0);
      if (bonusIndices.length > 0) {
        const notParallel = plannerVisibleData.some(
          (m) => (m.you === "bonus" && m.partner !== "bonus") || (m.partner === "bonus" && m.you !== "bonus"),
        );
        let notConsec = false;
        for (let j = 1; j < bonusIndices.length; j++)
          if (bonusIndices[j] !== bonusIndices[j - 1] + 1) {
            notConsec = true;
            break;
          }
        if (notParallel || notConsec || bonusIndices.length < 2)
          addRowError(bonusIndices[0], "Bonus: both parents, 2–4 consecutive months.");
      }
    }
    return { globalErrors, rowErrors, totalBudget, maxBudget };
  }, [plannerVisibleData, premature, displayedMonths, isCouple]);

  const { globalErrors, rowErrors, totalBudget, maxBudget } = plannerValidation;
  const errorMonths = Array.from(rowErrors.keys());
  const hasErrors = globalErrors.length > 0 || rowErrors.size > 0;
  const isEmpty = totalBudget === 0;

  return (
    <div className="rounded-2xl p-4 relative" style={{ backgroundColor: colors.tile }}>
      {showErrorModal && onErrorModalClose && onContinueAnyway && (
        <ErrorModal
          isOpen={showErrorModal}
          errors={[...globalErrors, ...Array.from(rowErrors.values()).flat()]}
          onClose={onErrorModalClose}
          onContinueAnyway={onContinueAnyway}
        />
      )}

      <RulesSpotlight isOpen={rulesOpen} onClose={() => setRulesOpen(false)} isCouple={isCouple} />

      {/* Info Bar - Two rows */}
      <div className="pb-4 space-y-1">
        {/* Row 1: Hints or Budget Status */}
        <div className="flex items-center gap-3">
          {totalBudget === 0 ? (
            <button onClick={nextTip} className="flex-1 flex items-center gap-2 text-left">
              <svg
                className="w-5 h-5 shrink-0"
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
              <span className="text-sm" style={{ color: colors.textDark }}>
                {tips[currentTip]}
              </span>
              <svg
                className="w-3 h-3 shrink-0"
                style={{ color: "#999" }}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : totalBudget > maxBudget ? (
            <div className="flex-1 flex items-center gap-2">
              <svg
                className="w-5 h-5 shrink-0"
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
              <span className="text-sm" style={{ color: colors.error }}>
                Over budget by{" "}
                {(totalBudget - maxBudget) % 1 === 0 ? totalBudget - maxBudget : (totalBudget - maxBudget).toFixed(1)}{" "}
                months. Remove some.
              </span>
            </div>
          ) : totalBudget === maxBudget ? (
            <div className="flex-1 flex items-center gap-2">
              <svg
                className="w-5 h-5 shrink-0"
                style={{ color: colors.success }}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm" style={{ color: colors.success }}>
                Your plan is valid!
              </span>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <svg
                className="w-5 h-5 shrink-0"
                style={{ color: colors.orange }}
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
              <span className="text-sm" style={{ color: colors.textDark }}>
                {(maxBudget - totalBudget) % 1 === 0 ? maxBudget - totalBudget : (maxBudget - totalBudget).toFixed(1)}{" "}
                months remaining. Keep going!
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="text-xs font-semibold"
              style={{ color: totalBudget > maxBudget ? colors.error : colors.textDark }}
            >
              {totalBudget % 1 === 0 ? totalBudget : totalBudget.toFixed(1)}/{maxBudget}
            </span>
            {!isLoggedIn && (
              <button onClick={onSaveClick} className="p-1.5 rounded-lg" style={{ backgroundColor: colors.white }}>
                <svg
                  className="w-4 h-4"
                  style={{ color: colors.textDark }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                  />
                </svg>
              </button>
            )}
            {isLoggedIn && (
              <div className="p-1.5">
                <svg className="w-4 h-4" style={{ color: colors.textDark }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Errors (if any) */}
        {hasErrors && (
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 shrink-0"
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
            <span className="text-sm" style={{ color: colors.error }}>
              {globalErrors[0] || Array.from(rowErrors.values())[0]?.[0]}
            </span>
          </div>
        )}
      </div>

      {/* Horizontal Timeline */}
      <HorizontalTimeline
        plannerData={plannerData}
        displayedMonths={displayedMonths}
        isCouple={isCouple}
        myCalc={myCalc}
        partnerCalc={partnerCalc}
        birthDate={birthDate}
        onCycleType={cycleType}
        errorMonths={errorMonths}
      />

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setRulesOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
          style={{ background: colors.white, color: colors.textDark }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Rules
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
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
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
            <span className="text-xs" style={{ color: colors.text }}>
              You
            </span>
          </div>
          {isCouple && (
            <div className="flex items-center gap-1.5">
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
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              <span className="text-xs" style={{ color: colors.text }}>
                Partner
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: colors.orange }} />
            <span className="text-xs" style={{ color: colors.text }}>
              Basis
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: colors.yellow }} />
            <span className="text-xs" style={{ color: colors.text }}>
              Plus
            </span>
          </div>
          {isCouple && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: colors.tan }} />
              <span className="text-xs" style={{ color: colors.text }}>
                Bonus
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElterngeldPlanner;
