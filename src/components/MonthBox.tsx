import { MonthSelection } from '@/types/elterngeld';
import { ElterngeldCalculation } from '@/types/elterngeld';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { calculateMonthAmount, formatDateRange, getMonthDateRange } from '@/lib/elterngeld';
import { cn } from '@/lib/utils';

interface MonthBoxProps {
  monthIndex: number;
  birthDate: Date;
  selection: MonthSelection;
  calculation: ElterngeldCalculation;
  isSingleParent: boolean;
  onChange: (selection: MonthSelection) => void;
  hasError: boolean;
}

export function MonthBox({
  monthIndex,
  birthDate,
  selection,
  calculation,
  isSingleParent,
  onChange,
  hasError,
}: MonthBoxProps) {
  const { start, end } = getMonthDateRange(birthDate, monthIndex);
  const dateRange = formatDateRange(start, end);
  const monthAmount = calculateMonthAmount(selection, calculation);
  const hasAnySelection = selection.youBasis || selection.youPlus || selection.partnerBasis || selection.partnerPlus;

  const handleChange = (field: keyof MonthSelection, value: boolean) => {
    const newSelection = { ...selection, [field]: value };
    
    // Ensure mutually exclusive: Basis and Plus can't both be selected for same person
    if (field === 'youBasis' && value) {
      newSelection.youPlus = false;
    } else if (field === 'youPlus' && value) {
      newSelection.youBasis = false;
    } else if (field === 'partnerBasis' && value) {
      newSelection.partnerPlus = false;
    } else if (field === 'partnerPlus' && value) {
      newSelection.partnerBasis = false;
    }
    
    onChange(newSelection);
  };

  return (
    <div
      className={cn(
        "flex-shrink-0 w-24 p-2 rounded-xl bg-card border transition-all duration-200",
        hasError ? "ring-2 ring-destructive border-destructive" : "border-border",
        hasAnySelection && !hasError && "border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.1)]"
      )}
    >
      {/* Month Header */}
      <div className="mb-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-semibold text-primary uppercase tracking-wide">
            M{monthIndex + 1}
          </span>
          {hasAnySelection && (
            <span className={cn(
              "text-[9px] font-bold",
              hasError ? "text-destructive" : "text-foreground"
            )}>
              €{monthAmount.toLocaleString('de-DE')}
            </span>
          )}
        </div>
        <div className="text-[9px] text-muted-foreground leading-tight">
          <div>{dateRange.line1}</div>
          <div>{dateRange.line2}</div>
        </div>
      </div>
      
      {/* You Section */}
      <div className="mb-1">
        <span className="text-[9px] font-medium text-foreground block mb-0.5">You</span>
        <div className="flex gap-2">
          <div className="flex items-center gap-1">
            <Checkbox
              id={`you-basis-${monthIndex}`}
              checked={selection.youBasis}
              onCheckedChange={(v) => handleChange('youBasis', v === true)}
              className="h-3 w-3"
            />
            <Label 
              htmlFor={`you-basis-${monthIndex}`} 
              className="text-[9px] cursor-pointer text-muted-foreground"
            >
              B
            </Label>
          </div>
          <div className="flex items-center gap-1">
            <Checkbox
              id={`you-plus-${monthIndex}`}
              checked={selection.youPlus}
              onCheckedChange={(v) => handleChange('youPlus', v === true)}
              className="h-3 w-3"
            />
            <Label 
              htmlFor={`you-plus-${monthIndex}`} 
              className="text-[9px] cursor-pointer text-muted-foreground"
            >
              P
            </Label>
          </div>
        </div>
      </div>
      
      {/* Partner Section */}
      {!isSingleParent && (
        <div className="mb-1">
          <span className="text-[9px] font-medium text-foreground block mb-0.5">Partner</span>
          <div className="flex gap-2">
            <div className="flex items-center gap-1">
              <Checkbox
                id={`partner-basis-${monthIndex}`}
                checked={selection.partnerBasis}
                onCheckedChange={(v) => handleChange('partnerBasis', v === true)}
                className="h-3 w-3"
              />
              <Label 
                htmlFor={`partner-basis-${monthIndex}`} 
                className="text-[9px] cursor-pointer text-muted-foreground"
              >
                B
              </Label>
            </div>
            <div className="flex items-center gap-1">
              <Checkbox
                id={`partner-plus-${monthIndex}`}
                checked={selection.partnerPlus}
                onCheckedChange={(v) => handleChange('partnerPlus', v === true)}
                className="h-3 w-3"
              />
              <Label 
                htmlFor={`partner-plus-${monthIndex}`} 
                className="text-[9px] cursor-pointer text-muted-foreground"
              >
                P
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* Sum */}
      {hasAnySelection && (
        <div className="pt-1 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-medium text-muted-foreground">Sum</span>
            <span className={cn(
              "text-[10px] font-bold",
              hasError ? "text-destructive" : "text-foreground"
            )}>
              €{monthAmount.toLocaleString('de-DE')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}