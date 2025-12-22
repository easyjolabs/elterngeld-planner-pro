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
        "flex-shrink-0 w-24 p-2 rounded-xl bg-card border transition-all duration-200 animate-scale-in",
        hasError ? "border-destructive shadow-[0_0_0_2px_hsl(var(--destructive)/0.2)]" : "border-border",
        hasAnySelection && !hasError && "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.1)]"
      )}
    >
      {/* Month Header */}
      <div className="mb-3">
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
          Month {monthIndex + 1}
        </span>
        <p className="text-[9px] text-muted-foreground whitespace-pre-line leading-tight mt-1">{dateRange}</p>
      </div>
      
      {/* You Section */}
      <div className="mb-3">
        <span className="text-[9px] font-medium text-foreground block mb-1.5">You</span>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
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
              Basis
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
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
              Plus
            </Label>
          </div>
        </div>
      </div>
      
      {/* Partner Section */}
      {!isSingleParent && (
        <div>
          <span className="text-[9px] font-medium text-foreground block mb-1.5">Partner</span>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
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
                Basis
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
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
                Plus
              </Label>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
