import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface IncomeSliderProps {
  value: number;
  onChange: (value: number) => void;
  hasSiblingBonus: boolean;
  onSiblingBonusChange: (value: boolean) => void;
  multipleChildren: number;
  onMultipleChildrenChange: (value: number) => void;
}

export function IncomeSlider({ 
  value, 
  onChange,
  hasSiblingBonus,
  onSiblingBonusChange,
  multipleChildren,
  onMultipleChildrenChange,
}: IncomeSliderProps) {
  const handleChange = (values: number[]) => {
    onChange(values[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = parseInt(e.target.value.replace(/\D/g, '')) || 0;
    const clampedValue = Math.min(7000, Math.max(0, numericValue));
    onChange(clampedValue);
  };

  return (
    <div className="flex flex-col gap-space-md h-full">
      {/* Left - Slider */}
      <div className="p-space-md rounded-xl bg-card border border-border">
        <div className="flex items-start justify-between">
          <div className="max-w-[70%]">
            <h2 className="text-sm font-semibold text-foreground">
              Monthly net income
            </h2>
            <p className="text-xs text-muted-foreground">
              Average of the 12 months before birth.
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <span className="text-xl font-bold text-foreground">€</span>
            <input
              type="text"
              value={value.toLocaleString('de-DE')}
              onChange={handleInputChange}
              className="text-xl font-bold text-foreground bg-transparent text-right w-20 outline-none focus:ring-1 focus:ring-primary rounded px-1"
            />
          </div>
        </div>
        
        <div className="mt-space-xl">
          <Slider
            value={[value]}
            onValueChange={handleChange}
            min={0}
            max={7000}
            step={50}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground mt-space-2xs">
            <span>€0</span>
            <span>€7,000</span>
          </div>
        </div>
      </div>

      {/* Right - Bonus boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm auto-rows-fr">
        {/* Sibling Bonus Box */}
        <div className="p-space-md rounded-xl bg-card border border-border flex flex-col">
          <h3 className="text-sm font-semibold text-foreground mb-space-sm">
            Do you already have children?
          </h3>
          <p className="text-[11px] text-muted-foreground leading-tight flex-1">
            10% extra Elterngeld (min. €75/month) if a sibling is under 3, or two siblings are under 6.
          </p>
          <div className="flex items-center gap-space-sm h-8">
            <Checkbox
              id="siblingBonus"
              checked={hasSiblingBonus}
              onCheckedChange={onSiblingBonusChange}
            />
            <Label htmlFor="siblingBonus" className="text-xs cursor-pointer leading-none">
              Yes, add sibling bonus
            </Label>
          </div>
        </div>

        {/* Multiple Birth Box */}
        <div className="p-space-md rounded-xl bg-card border border-border flex flex-col">
          <h3 className="text-sm font-semibold text-foreground mb-space-sm">
            More than one child at birth?
          </h3>
          <p className="text-[11px] text-muted-foreground leading-tight flex-1">
            €300 per additional child per month.
          </p>
          <Select
            value={multipleChildren.toString()}
            onValueChange={(v) => onMultipleChildrenChange(parseInt(v))}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Single child</SelectItem>
              <SelectItem value="1">Twins</SelectItem>
              <SelectItem value="2">Triplets</SelectItem>
              <SelectItem value="3">3+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
