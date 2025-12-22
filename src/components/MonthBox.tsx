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
        "flex-shrink-0 w-24 p-space-sm rounded-xl bg-card border transition-all duration-200 animate-scale-in",
        hasError ? "border-destructive shadow-[0_0_0_2px_hsl(var(--destructive)/0.2)]" : "border-border",
        hasAnySelection && !hasError && "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.1)]"
      )}
    >
      {/* Month Header */}
      <div className="mb-space-md">
        <h3 className="text-sm font-semibold text-foreground">
          Month {monthIndex + 1}
        </h3>
        <p className="text-[10px] text-muted-foreground whitespace-pre-line leading-tight mt-1">{dateRange}</p>
      </div>
      
      {/* You Section */}
      <div className="mb-space-md">
        <span className="text-[11px] font-medium text-foreground block mb-space-sm">You</span>
        <div className="space-y-space-sm">
          <div className="flex items-center gap-space-sm">
            <Checkbox
              id={`you-basis-${monthIndex}`}
              checked={selection.youBasis}
              onCheckedChange={(v) => handleChange('youBasis', v === true)}
              className="h-3.5 w-3.5"
            />
            <Label 
              htmlFor={`you-basis-${monthIndex}`} 
              className="text-[11px] cursor-pointer text-muted-foreground"
            >
              Basis
            </Label>
          </div>
          <div className="flex items-center gap-space-sm">
            <Checkbox
              id={`you-plus-${monthIndex}`}
              checked={selection.youPlus}
              onCheckedChange={(v) => handleChange('youPlus', v === true)}
              className="h-3.5 w-3.5"
            />
            <Label 
              htmlFor={`you-plus-${monthIndex}`} 
              className="text-[11px] cursor-pointer text-muted-foreground"
            >
              Plus
            </Label>
          </div>
        </div>
      </div>
      
      {/* Partner Section */}
      {!isSingleParent && (
        <div className="mb-space-md">
          <span className="text-[11px] font-medium text-foreground block mb-space-sm">Partner</span>
          <div className="space-y-space-sm">
            <div className="flex items-center gap-space-sm">
              <Checkbox
                id={`partner-basis-${monthIndex}`}
                checked={selection.partnerBasis}
                onCheckedChange={(v) => handleChange('partnerBasis', v === true)}
                className="h-3.5 w-3.5"
              />
              <Label 
                htmlFor={`partner-basis-${monthIndex}`} 
                className="text-[11px] cursor-pointer text-muted-foreground"
              >
                Basis
              </Label>
            </div>
            <div className="flex items-center gap-space-sm">
              <Checkbox
                id={`partner-plus-${monthIndex}`}
                checked={selection.partnerPlus}
                onCheckedChange={(v) => handleChange('partnerPlus', v === true)}
                className="h-3.5 w-3.5"
              />
              <Label 
                htmlFor={`partner-plus-${monthIndex}`} 
                className="text-[11px] cursor-pointer text-muted-foreground"
              >
                Plus
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Amount */}
      {hasAnySelection && (
        <div className="pt-space-sm border-t border-border">
          <span className="text-sm font-bold text-primary">
            €{monthAmount.toLocaleString('de-DE')}
          </span>
        </div>
      )}

    </div>
  );
}
