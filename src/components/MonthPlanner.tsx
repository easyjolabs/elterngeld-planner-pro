import { useState, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Plus, AlertCircle, User, ChevronRight } from 'lucide-react';
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

  const handleScrollRight = () => {
    if (scrollRef.current) {
      const boxWidth = 96 + 8; // w-24 (96px) + gap-2 (8px)
      scrollRef.current.scrollBy({ left: boxWidth, behavior: 'smooth' });
    }
  };

  if (!calculation.isEligible) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="p-8 rounded-xl bg-muted/50 border border-border text-center">
          <p className="text-muted-foreground">
            Please adjust your income in Step 1 to be eligible for Elterngeld planning.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
      {/* Left - Month Planning */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-card">
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-1">
              Plan your Elterngeld months
            </h2>
            <p className="text-xs text-muted-foreground">
              Select which months you and your partner will receive Elterngeld.
            </p>
          </div>

          {/* Controls - same row as Step 1 inputs */}
          <div className="flex flex-wrap items-center gap-2">
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
                    format(state.birthDate, "dd.MM.yy")
                  ) : (
                    <span>Birthday</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={state.birthDate || undefined}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border">
              <User className="h-3 w-3 text-muted-foreground" />
              <Checkbox
                id="singleParent"
                checked={state.isSingleParent}
                onCheckedChange={handleSingleParentChange}
                className="h-3 w-3"
              />
              <Label htmlFor="singleParent" className="cursor-pointer text-[11px]">
                Single parent
              </Label>
            </div>
          </div>

          {/* Month Boxes */}
          {state.birthDate ? (
            <div className="relative">
              <div 
                ref={scrollRef}
                className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
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
                    hasError={errors.length > 0}
                  />
                ))}
                
                {state.visibleMonths < 36 && (
                  <Button
                    variant="outline"
                    onClick={handleAddMonth}
                    className="flex-shrink-0 w-24 h-auto border-dashed hover:border-foreground hover:bg-muted py-4"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <Plus className="h-3.5 w-3.5" />
                      <span className="text-[9px]">Add</span>
                    </div>
                  </Button>
                )}
              </div>

              {/* Scroll arrow */}
              <button
                onClick={handleScrollRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <CalendarIcon className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-[11px] text-muted-foreground">
                  Select your child's birthday to start planning.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right - Summary */}
      <div className="flex flex-col gap-3 md:w-64">
        {/* Total Box */}
        <div className="p-3 rounded-xl bg-card border border-border shadow-card flex-1">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Total Elterngeld
          </h3>
          <p className="text-[11px] text-muted-foreground mb-2 leading-tight">
            Sum of all selected months based on your plan.
          </p>
          <div className="text-xl font-bold text-foreground">
            €{totalAmount.toLocaleString('de-DE')}
          </div>
        </div>

        {/* Legend Box */}
        <div className="p-3 rounded-xl bg-card border border-border shadow-card flex-1">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Legend
          </h3>
          <div className="space-y-1 text-[11px] text-muted-foreground">
            <div><span className="font-medium text-foreground">B</span> = Basiselterngeld</div>
            <div><span className="font-medium text-foreground">P</span> = ElterngeldPlus</div>
          </div>
        </div>
      </div>

      {/* Hint area - spans full width, same position as Step 1 hint */}
      <div className="md:col-span-2 h-8 flex items-center">
        {errors.length > 0 && (
          <div className="w-full px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">{errors[0].message}</p>
          </div>
        )}
      </div>
    </div>
  );
}