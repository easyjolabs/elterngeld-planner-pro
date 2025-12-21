import { ElterngeldCalculation } from '@/types/elterngeld';
import { AlertCircle, TrendingUp, Clock } from 'lucide-react';

interface ResultCardProps {
  calculation: ElterngeldCalculation;
}

export function ResultCard({ calculation }: ResultCardProps) {
  if (!calculation.isEligible) {
    return (
      <div className="h-full flex items-center">
        <div className="w-full p-6 rounded-xl bg-destructive/10 border border-destructive/20">
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Max hint - fixed height container to prevent layout shift */}
      <div className="h-10 flex items-center">
        {calculation.isMaxReached && (
          <div className="w-full px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent flex-shrink-0" />
            <p className="text-sm font-medium text-accent-foreground">
              Maximum Elterngeld reached!
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {/* Basiselterngeld Card */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-primary">
                <Clock className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Basiselterngeld</h3>
                <p className="text-xs text-muted-foreground">12-14 months</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">
                €{calculation.totalBasis.toLocaleString('de-DE')}
              </span>
              <p className="text-xs text-muted-foreground">per month</p>
            </div>
          </div>
          {(calculation.siblingBonus > 0 || calculation.multipleBonus > 0) && (
            <div className="mt-3 pt-3 border-t border-border flex gap-4 text-xs">
              <span className="text-muted-foreground">Base €{calculation.basisAmount}</span>
              {calculation.siblingBonus > 0 && (
                <span className="text-success">+€{calculation.siblingBonus} sibling</span>
              )}
              {calculation.multipleBonus > 0 && (
                <span className="text-success">+€{calculation.multipleBonus} multiple</span>
              )}
            </div>
          )}
        </div>
        
        {/* ElterngeldPlus Card */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-accent">
                <Clock className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">ElterngeldPlus</h3>
                <p className="text-xs text-muted-foreground">24-28 months</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-accent">
                €{calculation.totalPlus.toLocaleString('de-DE')}
              </span>
              <p className="text-xs text-muted-foreground">per month</p>
            </div>
          </div>
          {(calculation.siblingBonus > 0 || calculation.multipleBonus > 0) && (
            <div className="mt-3 pt-3 border-t border-border flex gap-4 text-xs">
              <span className="text-muted-foreground">Base €{calculation.plusAmount}</span>
              {calculation.siblingBonus > 0 && (
                <span className="text-success">+€{Math.round(calculation.siblingBonus / 2)} sibling</span>
              )}
              {calculation.multipleBonus > 0 && (
                <span className="text-success">+€{Math.round(calculation.multipleBonus / 2)} multiple</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
