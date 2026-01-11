import React, { useState, useEffect, useCallback, useRef } from "react";

// ===========================================
// TYPES
// ===========================================
export interface PlannerMonth {
  you: "none" | "basis" | "plus" | "bonus";
  partner: "none" | "basis" | "plus" | "bonus";
}

export interface ElterngeldPlannerProps {
  // Data
  plannerData: PlannerMonth[];
  setPlannerData: (data: PlannerMonth[]) => void;
  plannerMonths: number;

  // User context
  applicationType: "couple" | "single";
  premature?: string;

  // Calculations (computed by parent)
  myCalc: { basis: number; plus: number; bonus: number; basisWithoutWork: number };
  partnerCalc: { basis: number; plus: number; bonus: number; basisWithoutWork: number };

  // Auth state
  isLoggedIn: boolean;
  onSaveClick: () => void;

  // Optional
  fullscreen?: boolean;
  onFullscreenToggle?: () => void;
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

// Type styles for planner
const typeStyles = {
  none: { bg: "rgba(0, 0, 0, 0.04)" },
  basis: { bg: "rgba(192, 99, 11, 0.25)" },
  plus: { bg: "rgba(252, 99, 27, 0.25)" },
  bonus: { bg: "rgba(255, 189, 240, 0.35)" },
} as const;

// ===========================================
// COMPONENT
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
  // Internal state
  const [selectedScenario, setSelectedScenario] = useState("");
  const [lastEditedCell, setLastEditedCell] = useState<{ month: number; person: "you" | "partner" } | null>(null);
  const [plannerScrollProgress, setPlannerScrollProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);
  const [tipResetKey, setTipResetKey] = useState(0);

  const plannerScrollRef = useRef<HTMLDivElement>(null);

  const tips = [
    "Tap a cell to assign Elterngeld. Tap again to cycle through options.",
    "Plus months count as 0.5 toward your budget.",
    "Bonus requires both parents to work 24–32 hours.",
    "You can take months simultaneously or one after another.",
    "Months count from birth date, not calendar months. E.g. born March 15 → month 1 is March 15 – April 14.",
  ];

  const tipsCount = tips.length;

  // Tips carousel
  const nextTip = useCallback(() => {
    setCurrentTip((prev) => (prev + 1) % tipsCount);
    setTipResetKey((k) => k + 1);
  }, [tipsCount]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tipsCount);
    }, 6000);
    return () => clearInterval(interval);
  }, [tipResetKey, tipsCount]);

  // Handle planner scroll for progress indicator
  const handlePlannerScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const maxScroll = scrollHeight - clientHeight;
    const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;
    setPlannerScrollProgress(progress);
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
      const newValue = cycle[nextIndex];

      newData[monthIndex] = { ...newData[monthIndex], [person]: newValue };

      setPlannerData(newData);
      setSelectedScenario("");
      setLastEditedCell({ month: monthIndex, person });
    },
    [plannerData, setPlannerData, applicationType],
  );

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

  // Computed values
  const plannerVisibleData = plannerData.slice(0, plannerMonths);

  const plannerMonthCounts = React.useMemo(() => {
    const countMonths = (person: "you" | "partner", type: string) =>
      plannerVisibleData.filter((m) => m[person] === type).length;

    return {
      youBasis: countMonths("you", "basis"),
      youPlus: countMonths("you", "plus"),
      youBonus: countMonths("you", "bonus"),
      partnerBasis: applicationType === "couple" ? countMonths("partner", "basis") : 0,
      partnerPlus: applicationType === "couple" ? countMonths("partner", "plus") : 0,
      partnerBonus: applicationType === "couple" ? countMonths("partner", "bonus") : 0,
    };
  }, [plannerVisibleData, applicationType]);

  const plannerValidation = React.useMemo(() => {
    const { youBasis, youPlus, youBonus, partnerBasis, partnerPlus, partnerBonus } = plannerMonthCounts;
    const youBudget = youBasis + youPlus / 2;
    const partnerBudget = partnerBasis + partnerPlus / 2;
    const totalBudget = youBudget + partnerBudget;

    // Extra months for premature births (§4 Abs. 5 BEEG)
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

    const global: string[] = [];
    const rows: Map<number, string[]> = new Map();
    const isCouple = applicationType === "couple";
    const hasMultiples = false; // This could be passed as a prop if needed

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
  }, [plannerMonthCounts, plannerVisibleData, premature, myCalc, partnerCalc, plannerMonths, applicationType]);

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

  const scrollProgress = plannerScrollProgress;
  const isAtBottom = scrollProgress > 0.95;
  const isAtTop = scrollProgress < 0.05;
  const hasErrors = globalErrors.length > 0 || rowErrors.size > 0;
  const isEmpty = totalBudget === 0;
  const isCouple = applicationType === "couple";

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
        {onFullscreenToggle && (
          <button
            onClick={onFullscreenToggle}
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
              {plannerVisibleData.map((month, i) => {
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

        {/* Right: Save Button - only show if NOT logged in */}
        {!isLoggedIn && (
          <button
            onClick={onSaveClick}
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

        {/* Saved confirmation (inline) - show when logged in */}
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
  );
};

export default ElterngeldPlanner;
