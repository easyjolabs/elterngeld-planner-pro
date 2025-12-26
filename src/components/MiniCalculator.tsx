import React, { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, ChevronLeft, ChevronRight, CalendarIcon, ArrowLeft, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { calculateElterngeld, validateMonthPlan, calculateMonthAmount, getMonthDateRange, formatDateRange } from '@/lib/elterngeld';
import type { CalculatorState, MonthSelection, ElterngeldCalculation } from '@/types/elterngeld';

interface MiniCalculatorProps {
  onClose?: () => void;
}

const createEmptyMonth = (): MonthSelection => ({
  youBasis: false,
  youPlus: false,
  partnerBasis: false,
  partnerPlus: false,
});

const MiniCalculator: React.FC<MiniCalculatorProps> = ({ onClose }) => {
  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [income, setIncome] = useState(2500);
  const [hasSiblingBonus, setHasSiblingBonus] = useState(false);
  const [multipleChildren, setMultipleChildren] = useState(0);

  // Step 2 state
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [isSingleParent, setIsSingleParent] = useState(false);
  const [months, setMonths] = useState<MonthSelection[]>(
    Array.from({ length: 14 }, () => createEmptyMonth())
  );
  const [visibleMonths, setVisibleMonths] = useState(14);

  // Scroll container ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculator state for calculation
  const calculatorState: CalculatorState = {
    monthlyIncome: income,
    hasSiblingBonus,
    multipleChildren,
  };

  // Calculate Elterngeld
  const calculation = useMemo(
    () => calculateElterngeld(calculatorState),
    [income, hasSiblingBonus, multipleChildren]
  );

  // Validate month plan
  const validationErrors = useMemo(
    () => validateMonthPlan(months.slice(0, visibleMonths), isSingleParent),
    [months, visibleMonths, isSingleParent]
  );

  // Calculate total
  const totalAmount = useMemo(() => {
    return months.slice(0, visibleMonths).reduce((sum, month) => {
      return sum + calculateMonthAmount(month, calculation);
    }, 0);
  }, [months, visibleMonths, calculation]);

  // Handlers
  const handleMonthChange = (index: number, field: keyof MonthSelection, value: boolean) => {
    setMonths(prev => {
      const updated = [...prev];
      const month = { ...updated[index] };

      // Enforce mutual exclusivity
      if (field === 'youBasis' && value) {
        month.youBasis = true;
        month.youPlus = false;
      } else if (field === 'youPlus' && value) {
        month.youPlus = true;
        month.youBasis = false;
      } else if (field === 'partnerBasis' && value) {
        month.partnerBasis = true;
        month.partnerPlus = false;
      } else if (field === 'partnerPlus' && value) {
        month.partnerPlus = true;
        month.partnerBasis = false;
      } else {
        month[field] = value;
      }

      updated[index] = month;
      return updated;
    });
  };

  const addMonth = () => {
    if (visibleMonths < 28) {
      setVisibleMonths(prev => prev + 1);
      if (months.length < visibleMonths + 1) {
        setMonths(prev => [...prev, createEmptyMonth()]);
      }
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <TooltipProvider>
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
          {step === 2 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(1)}
              className="h-7 px-2 text-xs"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back
            </Button>
          ) : (
            <span className="text-sm font-medium text-foreground">Calculator</span>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {step === 1 ? (
          /* Step 1: Calculator */
          <div className="p-4 space-y-4">
            {/* Results Display */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Basiselterngeld</div>
                <div className="text-xl font-semibold text-foreground">
                  {formatCurrency(calculation.totalBasis)}
                </div>
                <div className="text-xs text-muted-foreground">max. 12-14 Mo.</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">ElterngeldPlus</div>
                <div className="text-xl font-semibold text-foreground">
                  {formatCurrency(calculation.totalPlus)}
                </div>
                <div className="text-xs text-muted-foreground">max. 24-28 Mo.</div>
              </div>
            </div>

            {/* Income Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Average net income</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>The average net income in the 12 months before the birth of the child.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-3">
                <Slider
                  value={[income]}
                  onValueChange={([val]) => setIncome(val)}
                  min={0}
                  max={5000}
                  step={50}
                  className="flex-1"
                />
                <div className="text-sm font-medium w-20 text-right">
                  {formatCurrency(income)}
                </div>
              </div>
            </div>

            {/* Sibling Bonus */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sibling-bonus"
                  checked={hasSiblingBonus}
                  onCheckedChange={(checked) => setHasSiblingBonus(checked === true)}
                />
                <label htmlFor="sibling-bonus" className="text-sm cursor-pointer">
                  Child under 3 or 2 under 6?
                </label>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>If you have a child under 3 or two children under 6, you receive a sibling bonus.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Multiple Children */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Select
                  value={multipleChildren.toString()}
                  onValueChange={(val) => setMultipleChildren(parseInt(val))}
                >
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm">Additional children (twins/triplets)</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>For each additional child in a multiple birth, you receive €300 extra per month.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* CTA Button */}
            <Button onClick={() => setStep(2)} className="w-full">
              Plan your months
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ) : (
          /* Step 2: Month Planner */
          <div className="p-4 space-y-4">
            {/* Date & Single Parent Row */}
            <div className="flex items-center gap-4 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {birthDate ? format(birthDate, 'dd.MM.yyyy', { locale: de }) : 'Birth date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={birthDate || undefined}
                    onSelect={(date) => setBirthDate(date || null)}
                    locale={de}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="single-parent"
                  checked={isSingleParent}
                  onCheckedChange={(checked) => setIsSingleParent(checked === true)}
                />
                <label htmlFor="single-parent" className="text-sm cursor-pointer">
                  Single parent
                </label>
              </div>
            </div>

            {/* Month Boxes */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 shadow-sm"
                onClick={() => scroll('left')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div
                ref={scrollContainerRef}
                className="flex gap-2 overflow-x-auto px-8 py-1 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {months.slice(0, visibleMonths).map((month, index) => (
                  <MiniMonthBox
                    key={index}
                    index={index}
                    month={month}
                    calculation={calculation}
                    isSingleParent={isSingleParent}
                    birthDate={birthDate}
                    hasError={validationErrors.some(e => e.message.includes(`Month ${index + 1}`))}
                    onChange={handleMonthChange}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 shadow-sm"
                onClick={() => scroll('right')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="text-xs text-destructive space-y-1">
                {validationErrors.slice(0, 2).map((error, i) => (
                  <p key={i}>{error.message}</p>
                ))}
              </div>
            )}

            {/* Total & Add Month */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="text-sm">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-semibold text-foreground">{formatCurrency(totalAmount)}</span>
              </div>
              <Button variant="outline" size="sm" onClick={addMonth} disabled={visibleMonths >= 28}>
                <Plus className="h-3 w-3 mr-1" />
                Add month
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

// Compact Month Box Component
interface MiniMonthBoxProps {
  index: number;
  month: MonthSelection;
  calculation: ElterngeldCalculation;
  isSingleParent: boolean;
  birthDate: Date | null;
  hasError: boolean;
  onChange: (index: number, field: keyof MonthSelection, value: boolean) => void;
}

const MiniMonthBox: React.FC<MiniMonthBoxProps> = ({
  index,
  month,
  calculation,
  isSingleParent,
  birthDate,
  hasError,
  onChange,
}) => {
  const hasSelection = month.youBasis || month.youPlus || month.partnerBasis || month.partnerPlus;
  const amount = calculateMonthAmount(month, calculation);

  const dateRange = birthDate ? getMonthDateRange(birthDate, index) : null;

  return (
    <div
      className={cn(
        'flex-shrink-0 w-24 border rounded-lg p-2 text-xs',
        hasError ? 'border-destructive' : hasSelection ? 'border-primary' : 'border-border',
        'bg-card'
      )}
    >
      <div className="text-center mb-2">
        <div className="font-medium">M{index + 1}</div>
        {dateRange && (
          <div className="text-[10px] text-muted-foreground truncate">
            {format(dateRange.start, 'dd.MM', { locale: de })}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-[10px] text-muted-foreground">You</div>
        <div className="flex gap-1">
          <label className="flex items-center gap-1 cursor-pointer">
            <Checkbox
              checked={month.youBasis}
              onCheckedChange={(c) => onChange(index, 'youBasis', c === true)}
              className="h-3 w-3"
            />
            <span className="text-[10px]">B</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <Checkbox
              checked={month.youPlus}
              onCheckedChange={(c) => onChange(index, 'youPlus', c === true)}
              className="h-3 w-3"
            />
            <span className="text-[10px]">P</span>
          </label>
        </div>

        {!isSingleParent && (
          <>
            <div className="text-[10px] text-muted-foreground mt-1">Partner</div>
            <div className="flex gap-1">
              <label className="flex items-center gap-1 cursor-pointer">
                <Checkbox
                  checked={month.partnerBasis}
                  onCheckedChange={(c) => onChange(index, 'partnerBasis', c === true)}
                  className="h-3 w-3"
                />
                <span className="text-[10px]">B</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <Checkbox
                  checked={month.partnerPlus}
                  onCheckedChange={(c) => onChange(index, 'partnerPlus', c === true)}
                  className="h-3 w-3"
                />
                <span className="text-[10px]">P</span>
              </label>
            </div>
          </>
        )}
      </div>

      {hasSelection && (
        <div className="text-center mt-2 text-[10px] font-medium text-primary">
          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)}
        </div>
      )}
    </div>
  );
};

export default MiniCalculator;
