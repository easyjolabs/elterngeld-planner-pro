import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Euro } from 'lucide-react';

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
      {/* Left - Slider */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-card">
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-1">
              Monthly net income
            </h2>
            <p className="text-xs text-muted-foreground">
              Average of the 12 months before birth.
            </p>
          </div>

          <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground py-1">
            <Euro className="h-5 w-5" />
            <span>{value.toLocaleString('de-DE')}</span>
          </div>
          
          <Slider
            value={[value]}
            onValueChange={handleChange}
            min={0}
            max={7000}
            step={50}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>€0</span>
            <span>€7,000</span>
          </div>
        </div>
      </div>

      {/* Right - Bonus boxes */}
      <div className="flex flex-col gap-3 md:w-64">
        {/* Sibling Bonus Box */}
        <div className="p-3 rounded-xl bg-card border border-border shadow-card flex-1">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Do you already have children?
          </h3>
          <p className="text-[11px] text-muted-foreground mb-2 leading-tight">
            10% extra Elterngeld (min. €75/month) if a sibling is under 3, or two siblings are under 6.
          </p>
          <div className="flex items-center gap-2">
            <Checkbox
              id="siblingBonus"
              checked={hasSiblingBonus}
              onCheckedChange={onSiblingBonusChange}
            />
            <Label htmlFor="siblingBonus" className="text-xs cursor-pointer">
              Yes, add sibling bonus
            </Label>
          </div>
        </div>

        {/* Multiple Birth Box */}
        <div className="p-3 rounded-xl bg-card border border-border shadow-card flex-1">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            More than one child at birth?
          </h3>
          <p className="text-[11px] text-muted-foreground mb-2 leading-tight">
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
