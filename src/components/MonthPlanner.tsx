import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Plus, AlertCircle, User, ArrowRight } from 'lucide-react';
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
}

const createEmptyMonth = (): MonthSelection => ({
  youBasis: false,
  youPlus: false,
  partnerBasis: false,
  partnerPlus: false,
});

export function MonthPlanner({ calculation }: MonthPlannerProps) {
  const [state, setState] = useState<PlannerState>({
    birthDate: new Date(), // Default to today so boxes are visible
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

  const handleAddMonths = () => {
    setState(prev => {
      const newVisibleMonths = Math.min(prev.visibleMonths + 6, 36);
      const additionalMonths = newVisibleMonths - prev.months.length;
      const newMonths = [
        ...prev.months,
        ...Array(Math.max(0, additionalMonths)).fill(null).map(() => createEmptyMonth()),
      ];
      return { ...prev, visibleMonths: newVisibleMonths, months: newMonths };
    });
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
    <div className="space-y-4">
      {/* Headline */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Plan your Elterngeld months
        </h2>
        <p className="text-sm text-muted-foreground">
          Select which months you and your partner will receive Elterngeld.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !state.birthDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {state.birthDate ? (
                format(state.birthDate, "PPP")
              ) : (
                <span>Child's birthday</span>
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

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
          <User className="h-4 w-4 text-muted-foreground" />
          <Checkbox
            id="singleParent"
            checked={state.isSingleParent}
            onCheckedChange={handleSingleParentChange}
          />
          <Label htmlFor="singleParent" className="cursor-pointer text-sm">
            Single parent
          </Label>
        </div>

        {/* Summary inline */}
        {state.birthDate && (
          <div className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border">
            <span className="text-sm font-medium text-foreground">Total:</span>
            <span className="text-lg font-bold text-foreground">
              €{totalAmount.toLocaleString('de-DE')}
            </span>
          </div>
        )}
      </div>

      {/* Validation Errors - fixed height container */}
      <div className="min-h-[40px]">
        {errors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {errors.map((error, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20"
              >
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{error.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Month Boxes - always visible with default date */}
      {state.birthDate ? (
        <div className="relative">
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
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
                onClick={handleAddMonths}
                className="flex-shrink-0 w-36 h-auto min-h-[160px] border-dashed hover:border-foreground hover:bg-muted"
              >
                <div className="flex flex-col items-center gap-2">
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">Add months</span>
                </div>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              Select your child's birthday to start planning.
            </p>
          </div>
        </div>
      )}

      {/* Start Application Button */}
      <div className="flex justify-end pt-4">
        <Button 
          className="gap-2 gradient-primary hover:opacity-90 transition-opacity"
          size="lg"
        >
          Start your application
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
