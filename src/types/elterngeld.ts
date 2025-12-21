export interface CalculatorState {
  monthlyIncome: number;
  hasSiblingBonus: boolean;
  multipleChildren: number; // 0 = single, 1+ = number of additional children
}

export interface MonthSelection {
  youBasis: boolean;
  youPlus: boolean;
  partnerBasis: boolean;
  partnerPlus: boolean;
}

export interface PlannerState {
  birthDate: Date | null;
  isSingleParent: boolean;
  months: MonthSelection[];
  visibleMonths: number;
}

export interface ValidationError {
  message: string;
  type: 'error' | 'warning';
}

export interface ElterngeldCalculation {
  basisAmount: number;
  plusAmount: number;
  siblingBonus: number;
  multipleBonus: number;
  totalBasis: number;
  totalPlus: number;
  isMaxReached: boolean;
  isEligible: boolean;
}
