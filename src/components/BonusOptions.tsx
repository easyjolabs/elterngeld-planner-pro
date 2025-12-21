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
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Bonus Options</h3>
      
      <div className="space-y-4">
        {/* Sibling Bonus */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
          <Checkbox
            id="siblingBonus"
            checked={hasSiblingBonus}
            onCheckedChange={onSiblingBonusChange}
            className="mt-0.5"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <Label htmlFor="siblingBonus" className="font-medium cursor-pointer">
                Sibling Bonus
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
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
            <p className="text-xs text-muted-foreground mt-1">
              +10% or €75 (whichever is higher)
            </p>
          </div>
        </div>
        
        {/* Multiple Birth Bonus */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
          <Baby className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Label className="font-medium">Multiple Birth</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>€300 bonus per additional child (twins, triplets, etc.)</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={multipleChildren.toString()}
              onValueChange={(v) => onMultipleChildrenChange(parseInt(v))}
            >
              <SelectTrigger className="w-full bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Single birth</SelectItem>
                <SelectItem value="1">Twins (+€300)</SelectItem>
                <SelectItem value="2">Triplets (+€600)</SelectItem>
                <SelectItem value="3">Quadruplets (+€900)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
