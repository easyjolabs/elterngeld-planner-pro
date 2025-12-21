import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Plus, AlertCircle, User } from 'lucide-react';
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
    birthDate: null,
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
      // Clear partner selections when switching to single parent
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
      <div className="p-8 rounded-xl bg-muted/50 border border-border text-center">
        <p className="text-muted-foreground">
          Please adjust your income in Step 1 to be eligible for Elterngeld planning.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal min-w-[200px]",
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

        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border">
          <User className="h-4 w-4 text-primary" />
          <Checkbox
            id="singleParent"
            checked={state.isSingleParent}
            onCheckedChange={handleSingleParentChange}
          />
          <Label htmlFor="singleParent" className="cursor-pointer text-sm">
            I am a single parent
          </Label>
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-slide-in"
            >
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Month Boxes */}
      {state.birthDate ? (
        <>
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
                  className="flex-shrink-0 w-48 h-auto min-h-[180px] border-dashed hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Plus className="h-6 w-6" />
                    <span className="text-sm">Add months</span>
                  </div>
                </Button>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
            <span className="font-medium text-foreground">Total Elterngeld</span>
            <span className="text-2xl font-bold text-primary">
              €{totalAmount.toLocaleString('de-DE')}
            </span>
          </div>
        </>
      ) : (
        <div className="p-8 rounded-xl bg-muted/50 border border-border text-center">
          <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">
            Please select your child's birthday to start planning.
          </p>
        </div>
      )}
    </div>
  );
}
