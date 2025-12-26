import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Info, ChevronLeft, ChevronRight, CalendarIcon, ArrowLeft, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { calculateElterngeld, validateMonthPlan, calculateMonthAmount, getMonthDateRange } from '@/lib/elterngeld';
import type { CalculatorState, MonthSelection, ElterngeldCalculation } from '@/types/elterngeld';
interface MiniCalculatorProps {
  onClose?: () => void;
}
const createEmptyMonth = (): MonthSelection => ({
  youBasis: false,
  youPlus: false,
  partnerBasis: false,
  partnerPlus: false
});
const MiniCalculator: React.FC<MiniCalculatorProps> = ({
  onClose
}) => {
  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [income, setIncome] = useState(2500);
  const [hasSiblingBonus, setHasSiblingBonus] = useState(false);
  const [isExpectingTwins, setIsExpectingTwins] = useState(false);

  // Step 2 state
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [isSingleParent, setIsSingleParent] = useState(false);
  const [months, setMonths] = useState<MonthSelection[]>(Array.from({
    length: 14
  }, () => createEmptyMonth()));
  const [visibleMonths, setVisibleMonths] = useState(14);

  // Scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Calculator state for calculation
  const calculatorState: CalculatorState = {
    monthlyIncome: income,
    hasSiblingBonus,
    multipleChildren: isExpectingTwins ? 1 : 0
  };

  // Calculate Elterngeld
  const calculation = useMemo(() => calculateElterngeld(calculatorState), [income, hasSiblingBonus, isExpectingTwins]);

  // Validate month plan
  const validationErrors = useMemo(() => validateMonthPlan(months.slice(0, visibleMonths), isSingleParent), [months, visibleMonths, isSingleParent]);

  // Handlers
  const handleMonthChange = (index: number, field: keyof MonthSelection, value: boolean) => {
    setMonths(prev => {
      const updated = [...prev];
      const month = {
        ...updated[index]
      };

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
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setCanScrollLeft(scrollContainerRef.current.scrollLeft > 0);
    }
  }, []);
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  const handleMouseLeave = () => {
    setIsDragging(false);
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  return <TooltipProvider>
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
          {step === 2 ? <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="h-7 px-2 text-xs">
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back
            </Button> : <span className="text-sm font-medium text-foreground">Quick-Calculator</span>}
          {onClose && <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>}
        </div>

        {step === 1 ? (/* Step 1: Calculator */
      <div className="p-4 space-y-5 pt-[5px] pb-[10px]">
            {/* Results Display */}
            <div className="grid grid-cols-2 gap-3 my-px py-[10px]">
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
            <div className="space-y-3 my-[10px]">
              <div className="flex items-center justify-between gap-2 py-[10px] my-0">
                <span className="text-sm text-foreground">What was the average net income in the year before birth?</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>The average net income in the 12 months before the birth of the child.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-3 my-[10px] py-[10px] pt-0">
                <Slider value={[income]} onValueChange={([val]) => setIncome(val)} min={0} max={5000} step={50} className="flex-1" />
                <div className="text-sm font-medium w-20 text-right">
                  {formatCurrency(income)}
                </div>
              </div>
            </div>

            {/* Sibling Bonus */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Checkbox id="sibling-bonus" checked={hasSiblingBonus} onCheckedChange={checked => setHasSiblingBonus(checked === true)} />
                <label htmlFor="sibling-bonus" className="cursor-pointer text-xs">
                  Do you already have 1 child under 3 years, 
or 2 under 6 years?
                </label>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>If you have a child under 3 or two children under 6, you receive a sibling bonus.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Twins Checkbox */}
            <div className="flex items-center justify-between gap-2 pb-[10px]">
              <div className="flex items-center gap-2">
                <Checkbox id="expecting-twins" checked={isExpectingTwins} onCheckedChange={checked => setIsExpectingTwins(checked === true)} />
                <label htmlFor="expecting-twins" className="cursor-pointer text-xs">
                  Are you expecting twins?
                </label>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>For each additional child in a multiple birth, you receive €300 extra per month.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* CTA Button */}
            <Button onClick={() => setStep(2)} variant="outline" className="w-full border-foreground">
              Plan your months
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>) : (/* Step 2: Month Planner */
      <div className="p-4 space-y-4">
            {/* Date & Single Parent Row */}
            <div className="flex items-center gap-4 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-normal">
                    <CalendarIcon className="h-4 w-4" />
                    {birthDate ? format(birthDate, 'dd.MM.yyyy', { locale: de }) : 'Birth date of child'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={birthDate || undefined} onSelect={date => setBirthDate(date || null)} locale={de} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-2">
                <Checkbox id="single-parent" checked={isSingleParent} onCheckedChange={checked => setIsSingleParent(checked === true)} />
                <label htmlFor="single-parent" className="cursor-pointer text-xs font-normal">
                  I am a single parent
                </label>
              </div>

              <Button variant="outline" size="sm" onClick={addMonth} disabled={visibleMonths >= 28} className="ml-auto">
                <Plus className="h-3 w-3 mr-1" />
                Add month
              </Button>
            </div>

            {/* Month Boxes */}
            <div className="relative overflow-hidden">
              {canScrollLeft && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 shadow-sm border border-border" 
                  onClick={() => scroll('left')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}

              <div 
                ref={scrollContainerRef} 
                className={cn(
                  "flex gap-2 overflow-x-scroll py-2",
                  canScrollLeft ? "pl-10" : "pl-0",
                  "pr-10",
                  isDragging ? "cursor-grabbing select-none" : "cursor-grab"
                )} 
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-x'
                }} 
                onScroll={handleScroll} 
                onMouseDown={handleMouseDown} 
                onMouseMove={handleMouseMove} 
                onMouseUp={handleMouseUp} 
                onMouseLeave={handleMouseLeave}
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
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 shadow-sm border border-border" 
                onClick={() => scroll('right')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="text-xs text-destructive space-y-1">
                {validationErrors.slice(0, 2).map((error, i) => <p key={i}>{error.message}</p>)}
              </div>
            )}

            {/* Start Application Button */}
            <div className="flex justify-center">
              <Button variant="outline" className="border-foreground">
                Start your application
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>)}
      </div>
    </TooltipProvider>;
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
  onChange
}) => {
  const hasSelection = month.youBasis || month.youPlus || month.partnerBasis || month.partnerPlus;
  const amount = calculateMonthAmount(month, calculation);
  const dateRange = birthDate ? getMonthDateRange(birthDate, index) : null;

  const formatCurrency = (val: number) => new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(val);

  return (
    <div className={cn(
      'flex-shrink-0 w-24 border rounded-lg p-4 text-xs select-none',
      hasError ? 'border-destructive' : hasSelection ? 'border-primary' : 'border-border',
      'bg-card'
    )}>
      <div className="text-left mb-3">
        <div className="font-medium text-sm">Month {index + 1}</div>
        {dateRange && (
          <div className="text-[10px] text-muted-foreground leading-tight">
            <div>{format(dateRange.start, 'dd.MM.yy', { locale: de })}</div>
            <div>{format(dateRange.end, 'dd.MM.yy', { locale: de })}</div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">You</div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={month.youBasis} onCheckedChange={c => onChange(index, 'youBasis', c === true)} className="h-3 w-3" />
              <span className="text-xs">Basis</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={month.youPlus} onCheckedChange={c => onChange(index, 'youPlus', c === true)} className="h-3 w-3" />
              <span className="text-xs">Plus</span>
            </label>
          </div>
        </div>

        {!isSingleParent && (
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">Partner</div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={month.partnerBasis} onCheckedChange={c => onChange(index, 'partnerBasis', c === true)} className="h-3 w-3" />
                <span className="text-xs">Basis</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={month.partnerPlus} onCheckedChange={c => onChange(index, 'partnerPlus', c === true)} className="h-3 w-3" />
                <span className="text-xs">Plus</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Sum section - always visible */}
      <div className="pt-3 mt-3 border-t border-border text-left">
        {hasSelection ? (
          <span className="text-xs font-medium text-primary">{formatCurrency(amount)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Sum</span>
        )}
      </div>
    </div>
  );
};
export default MiniCalculator;