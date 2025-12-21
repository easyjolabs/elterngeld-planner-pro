import { Slider } from '@/components/ui/slider';
import { Euro } from 'lucide-react';

interface IncomeSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function IncomeSlider({ value, onChange }: IncomeSliderProps) {
  const handleChange = (values: number[]) => {
    onChange(values[0]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">
          Monthly Net Income
        </label>
        <div className="flex items-center gap-1 text-2xl font-bold text-foreground">
          <Euro className="h-5 w-5" />
          <span>{value.toLocaleString('de-DE')}</span>
        </div>
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
  );
}
