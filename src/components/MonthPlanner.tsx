import { useState, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Plus, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MonthBox } from '@/components/MonthBox';
import { MonthSelection, PlannerState, ElterngeldCalculation } from '@/types/elterngeld';
import { validateMonthPlan, calculateMonthAmount } from '@/lib/elterngeld';
import { cn } from '@/lib/utils';

interface MonthPlannerProps {
  calculation: ElterngeldCalculation;
  onStartApplication?: () => void;
}

const createEmptyMonth = (): MonthSelection => ({
  youBasis: false,
  youPlus: false,
  partnerBasis: false,
  partnerPlus: false,
});

export function MonthPlanner({ calculation, onStartApplication }: MonthPlannerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PlannerState>({
    birthDate: new Date(),
    isSingleParent: false,
    months: Array(14).fill(null).map(() => createEmptyMonth()),
    visibleMonths: 14,
  });
  const [lastEditedMonth, setLastEditedMonth] = useState<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const errors = useMemo(() => {
    return validateMonthPlan(state.months, state.isSingleParent);
  }, [state.months, state.isSingleParent]);

  const totalAmount = useMemo(() => {
    return state.months.reduce((sum, month) => {
      return sum + calculateMonthAmount(month, calculation);
    }, 0);
  }, [state.months, calculation]);

  const handleDateSelect = (date: Date | undefined) => {
    setState(prev => ({ ...prev, birthDate: date || null }));
  };

  const handleSingleParentChange = (checked: boolean) => {
    setState(prev => {
      const updatedMonths = prev.months.map(month => ({
        ...month,
        partnerBasis: checked ? false : month.partnerBasis,
        partnerPlus: checked ? false : month.partnerPlus,
      }));
      return { ...prev, isSingleParent: checked, months: updatedMonths };
    });
  };

  const handleMonthChange = (index: number, selection: MonthSelection) => {
    setLastEditedMonth(index);
    setState(prev => {
      const newMonths = [...prev.months];
      newMonths[index] = selection;
      return { ...prev, months: newMonths };
    });
  };

  const handleAddMonth = () => {
    setState(prev => {
      const newVisibleMonths = Math.min(prev.visibleMonths + 1, 36);
      const newMonths = [...prev.months];
      if (newMonths.length < newVisibleMonths) {
        newMonths.push(createEmptyMonth());
      }
      return { ...prev, visibleMonths: newVisibleMonths, months: newMonths };
    });
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      const boxWidth = 144 + 12; // w-36 (144px) + gap-3 (12px)
      scrollRef.current.scrollBy({ left: -boxWidth, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      const boxWidth = 144 + 12; // w-36 (144px) + gap-3 (12px)
      scrollRef.current.scrollBy({ left: boxWidth, behavior: 'smooth' });
    }
  };

  if (!calculation.isEligible) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="p-space-xl rounded-xl bg-muted/50 border border-border text-center">
          <p className="text-muted-foreground">
            Please adjust your income in Step 1 to be eligible for Elterngeld planning.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-space-sm flex-1">
        {/* Headline */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-0.5">
            Plan your Elterngeld months
          </h2>
          <p className="text-xs text-muted-foreground">
            Select which months you and your partner will receive Elterngeld.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal h-8 text-xs",
                  !state.birthDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {state.birthDate ? (
                  format(state.birthDate, "PPP")
                ) : (
                  <span>Date of Birth</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={state.birthDate || undefined}
                onSelect={handleDateSelect}
                initialFocus
                className="p-space-sm pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg bg-secondary/50 border border-border">
            <Checkbox
              id="singleParent"
              checked={state.isSingleParent}
              onCheckedChange={handleSingleParentChange}
              className="h-3.5 w-3.5"
            />
            <Label htmlFor="singleParent" className="cursor-pointer text-xs">
              Single parent
            </Label>
          </div>

        </div>


        {/* Month Boxes */}
        {state.birthDate ? (
          <div className="space-y-space-sm">
            <div className="relative">
              {/* Left scroll arrow */}
              {canScrollLeft && (
                <button
                  onClick={handleScrollLeft}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              {/* Right scroll arrow */}
              {canScrollRight && (
                <button
                  onClick={handleScrollRight}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}

              <div 
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex gap-space-sm overflow-x-auto pb-space-sm scrollbar-hide"
              >
                {state.months.slice(0, state.visibleMonths).map((month, index) => (
                  <MonthBox
                    key={index}
                    monthIndex={index}
                    birthDate={state.birthDate!}
                    selection={month}
                    calculation={calculation}
                    isSingleParent={state.isSingleParent}
                    onChange={(selection) => handleMonthChange(index, selection)}
                    hasError={errors.length > 0 && lastEditedMonth === index}
                  />
                ))}
                
                {state.visibleMonths < 36 && (
                  <Button
                    variant="outline"
                    onClick={handleAddMonth}
                    className="flex-shrink-0 w-24 h-auto border-dashed hover:border-foreground hover:bg-muted"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Plus className="h-4 w-4" />
                      <span className="text-[10px]">Add month</span>
                    </div>
                  </Button>
                )}
              </div>
            </div>

            {/* Validation Errors - fixed height container to prevent layout shift */}
            <div className="min-h-[28px]">
              {errors.length > 0 && (
                <div className="flex flex-wrap gap-space-sm">
                  {errors.map((error, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-space-sm px-space-sm py-space-2xs rounded-lg bg-destructive/10 border border-destructive/20"
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                      <p className="text-xs text-destructive">{error.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-space-xl">
            <div className="text-center">
              <CalendarIcon className="h-6 w-6 text-muted-foreground mx-auto mb-space-sm" />
              <p className="text-xs text-muted-foreground">
                Select your child's birthday to start planning.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
