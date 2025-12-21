import { ElterngeldCalculation } from '@/types/elterngeld';
import { AlertCircle, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResultCardProps {
  calculation: ElterngeldCalculation;
}

export function ResultCard({ calculation }: ResultCardProps) {
  if (!calculation.isEligible) {
    return (
      <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/20 animate-fade-in">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <h3 className="font-semibold text-destructive">Not Eligible</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Annual income exceeds €175,000. Unfortunately, you are not eligible for Elterngeld.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {calculation.isMaxReached && (
        <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-accent" />
          <p className="text-sm font-medium text-accent-foreground">
            Maximum Elterngeld reached!
          </p>
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* Basiselterngeld Card */}
        <div className="p-6 rounded-xl bg-card border border-border shadow-card hover:shadow-glow transition-shadow duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg gradient-primary">
              <Clock className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Basiselterngeld</h3>
              <p className="text-xs text-muted-foreground">12-14 months</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base amount</span>
              <span className="font-medium">€{calculation.basisAmount.toLocaleString('de-DE')}</span>
            </div>
            {calculation.siblingBonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sibling bonus</span>
                <span className="font-medium text-success">+€{calculation.siblingBonus}</span>
              </div>
            )}
            {calculation.multipleBonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Multiple birth</span>
                <span className="font-medium text-success">+€{calculation.multipleBonus}</span>
              </div>
            )}
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium text-foreground">Total per month</span>
                <span className="text-2xl font-bold text-primary">
                  €{calculation.totalBasis.toLocaleString('de-DE')}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* ElterngeldPlus Card */}
        <div className="p-6 rounded-xl bg-card border border-border shadow-card hover:shadow-glow transition-shadow duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg gradient-accent">
              <Clock className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">ElterngeldPlus</h3>
              <p className="text-xs text-muted-foreground">24-28 months</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base amount</span>
              <span className="font-medium">€{calculation.plusAmount.toLocaleString('de-DE')}</span>
            </div>
            {calculation.siblingBonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sibling bonus</span>
                <span className="font-medium text-success">+€{Math.round(calculation.siblingBonus / 2)}</span>
              </div>
            )}
            {calculation.multipleBonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Multiple birth</span>
                <span className="font-medium text-success">+€{Math.round(calculation.multipleBonus / 2)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium text-foreground">Total per month</span>
                <span className="text-2xl font-bold text-accent">
                  €{calculation.totalPlus.toLocaleString('de-DE')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
