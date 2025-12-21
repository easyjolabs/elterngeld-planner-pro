import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Baby, Users } from 'lucide-react';

interface BonusOptionsProps {
  hasSiblingBonus: boolean;
  onSiblingBonusChange: (value: boolean) => void;
  multipleChildren: number;
  onMultipleChildrenChange: (value: number) => void;
}

export function BonusOptions({
  hasSiblingBonus,
  onSiblingBonusChange,
  multipleChildren,
  onMultipleChildrenChange,
}: BonusOptionsProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Sibling Bonus */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border flex-1">
          <Checkbox
            id="siblingBonus"
            checked={hasSiblingBonus}
            onCheckedChange={onSiblingBonusChange}
          />
          <Users className="h-4 w-4 text-primary flex-shrink-0" />
          <Label htmlFor="siblingBonus" className="font-medium cursor-pointer text-sm whitespace-nowrap">
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
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border flex-1">
          <Baby className="h-4 w-4 text-primary flex-shrink-0" />
          <Select
            value={multipleChildren.toString()}
            onValueChange={(v) => onMultipleChildrenChange(parseInt(v))}
          >
            <SelectTrigger className="h-8 bg-card border-0 shadow-none text-sm flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Single</SelectItem>
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
  );
}
