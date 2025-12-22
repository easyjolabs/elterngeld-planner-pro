import { CalculatorState, ElterngeldCalculation, MonthSelection, ValidationError } from '@/types/elterngeld';

const MIN_ELTERNGELD = 300;
const MAX_ELTERNGELD = 1800;
const INCOME_PERCENTAGE = 0.65;
const ANNUAL_INCOME_LIMIT = 175000;
const MAX_INCOME_FOR_CALC = 2770;

export function calculateElterngeld(state: CalculatorState): ElterngeldCalculation {
  const annualIncome = state.monthlyIncome * 12;
  const isEligible = annualIncome <= ANNUAL_INCOME_LIMIT;
  
  if (!isEligible) {
    return {
      basisAmount: 0,
      plusAmount: 0,
      siblingBonus: 0,
      multipleBonus: 0,
      totalBasis: 0,
      totalPlus: 0,
      isMaxReached: false,
      isEligible: false,
    };
  }

  // Calculate base Elterngeld (65% of income)
  let basisAmount = Math.round(state.monthlyIncome * INCOME_PERCENTAGE);
  
  // Apply min/max limits
  basisAmount = Math.max(MIN_ELTERNGELD, Math.min(MAX_ELTERNGELD, basisAmount));
  
  // Check if maximum is reached
  const isMaxReached = state.monthlyIncome >= MAX_INCOME_FOR_CALC;
  
  // ElterngeldPlus is half of Basiselterngeld
  const plusAmount = Math.round(basisAmount / 2);
  
  // Sibling bonus: 10% or €75, whichever is higher
  let siblingBonus = 0;
  if (state.hasSiblingBonus) {
    const tenPercent = Math.round(basisAmount * 0.1);
    siblingBonus = Math.max(tenPercent, 75);
  }
  
  // Multiple birth bonus: €300 per additional child
  const multipleBonus = state.multipleChildren * 300;
  
  // Calculate totals
  const totalBasis = basisAmount + siblingBonus + multipleBonus;
  const totalPlus = plusAmount + Math.round(siblingBonus / 2) + Math.round(multipleBonus / 2);
  
  return {
    basisAmount,
    plusAmount,
    siblingBonus,
    multipleBonus,
    totalBasis,
    totalPlus,
    isMaxReached,
    isEligible,
  };
}

export function validateMonthPlan(
  months: MonthSelection[],
  isSingleParent: boolean
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Count total Basis months for each person
  const youBasisMonths = months.filter(m => m.youBasis).length;
  const partnerBasisMonths = months.filter(m => m.partnerBasis).length;
  const totalBasisMonths = youBasisMonths + partnerBasisMonths;
  
  // Count simultaneous Basis months
  const simultaneousBasisMonths = months.filter((m, index) => 
    m.youBasis && m.partnerBasis && index < 12
  ).length;
  
  const simultaneousBasisAfter12 = months.filter((m, index) => 
    m.youBasis && m.partnerBasis && index >= 12
  ).length;
  
  if (isSingleParent) {
    // Single parent rules
    if (youBasisMonths > 14) {
      errors.push({
        message: 'Maximum 14 Basiselterngeld months allowed for single parents.',
        type: 'error',
      });
    }
    
    if (youBasisMonths > 0 && youBasisMonths < 2) {
      errors.push({
        message: 'Minimum 2 Basiselterngeld months required if taking any.',
        type: 'error',
      });
    }
  } else {
    // Couple rules
    if (totalBasisMonths > 14) {
      errors.push({
        message: `Maximum 14 Basiselterngeld months allowed combined. Currently: ${totalBasisMonths} months.`,
        type: 'error',
      });
    }
    
    if (totalBasisMonths === 14) {
      if (youBasisMonths < 2) {
        errors.push({
          message: 'If taking 14 months total, you must take at least 2 Basiselterngeld months.',
          type: 'error',
        });
      }
      if (partnerBasisMonths < 2) {
        errors.push({
          message: 'If taking 14 months total, partner must take at least 2 Basiselterngeld months.',
          type: 'error',
        });
      }
    }
    
    if (simultaneousBasisMonths > 1) {
      errors.push({
        message: `Maximum 1 month of simultaneous Basiselterngeld allowed. Currently: ${simultaneousBasisMonths} months.`,
        type: 'error',
      });
    }
    
    if (simultaneousBasisAfter12 > 0) {
      errors.push({
        message: 'Simultaneous Basiselterngeld is only allowed in the first 12 months.',
        type: 'error',
      });
    }
  }
  
  return errors;
}

export function getMonthDateRange(birthDate: Date, monthIndex: number): { start: Date; end: Date } {
  const start = new Date(birthDate);
  start.setMonth(start.getMonth() + monthIndex);
  
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);
  
  return { start, end };
}

export function formatDateRange(start: Date, end: Date): { line1: string; line2: string } {
  const formatCompact = (d: Date) => {
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear().toString().slice(-2);
    return `${day}.${month}.${year}`;
  };
  
  return {
    line1: `${formatCompact(start)} –`,
    line2: formatCompact(end),
  };
}

export function calculateMonthAmount(
  month: MonthSelection,
  calculation: ElterngeldCalculation
): number {
  let total = 0;
  
  if (month.youBasis) total += calculation.totalBasis;
  if (month.youPlus) total += calculation.totalPlus;
  if (month.partnerBasis) total += calculation.totalBasis;
  if (month.partnerPlus) total += calculation.totalPlus;
  
  return total;
}
