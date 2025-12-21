import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Euro, Info, Users, Baby } from "lucide-react";

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
    <div className="p-4 rounded-xl bg-card border border-border shadow-card">
      <div className="grid grid-cols-[65%_35%] gap-4">
        {/* Left column - Slider */}
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-1">What was your monthly net income?</h2>
            <p className="text-xs text-muted-foreground">Average of the 12 months before birth.</p>
          </div>

          <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground py-1">
            <Euro className="h-5 w-5" />
            <span>{value.toLocaleString("de-DE")}</span>
          </div>

          <Slider value={[value]} onValueChange={handleChange} min={0} max={7000} step={50} className="w-full" />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>€0</span>
            <span>€7,000</span>
          </div>
        </div>

        {/* Right column - Bonuses stacked */}
        <div className="flex flex-col gap-3">
          {/* Sibling Bonus */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary/50 border border-border">
            <Checkbox id="siblingBonus" checked={hasSiblingBonus} onCheckedChange={onSiblingBonusChange} />
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Label htmlFor="siblingBonus" className="font-medium cursor-pointer text-xs flex-1">
              Sibling Bonus
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>10% bonus or +€75 (whichever is higher). Applies if you have:</p>
                <ul className="list-disc list-inside mt-1 text-xs">
                  <li>1 child under 3 years</li>
                  <li>2 children under 6 years</li>
                  <li>1 disabled child under 14 years</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Multiple Birth Bonus */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary/50 border border-border">
            <Baby className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Select value={multipleChildren.toString()} onValueChange={(v) => onMultipleChildrenChange(parseInt(v))}>
              <SelectTrigger className="h-7 bg-card border-0 shadow-none text-xs flex-1 min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Multiple Birth</SelectItem>
                <SelectItem value="1">Twins +€300</SelectItem>
                <SelectItem value="2">Triplets +€600</SelectItem>
                <SelectItem value="3">Quads +€900</SelectItem>
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent>
                <p>€300 bonus per additional child</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
