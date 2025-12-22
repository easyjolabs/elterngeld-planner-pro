import { ElterngeldCalculation } from '@/types/elterngeld';
import { AlertCircle, TrendingUp } from 'lucide-react';

interface ResultCardProps {
  calculation: ElterngeldCalculation;
}

export function ResultCard({ calculation }: ResultCardProps) {
  if (!calculation.isEligible) {
    return (
      <div className="h-full flex items-center">
        <div className="w-full p-4 rounded-xl bg-destructive/10 border border-destructive/20">
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
    <div className="p-4 rounded-xl bg-card border border-border shadow-card h-full flex flex-col">
      {/* Headline */}
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Your estimated Elterngeld
      </h2>

      {/* Basiselterngeld */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h3 className="font-semibold text-foreground text-sm">Basiselterngeld</h3>
          <p className="text-xs text-muted-foreground">Full monthly amount for shorter duration (12-14 months total).</p>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold text-foreground">
            €{calculation.totalBasis.toLocaleString('de-DE')}
          </span>
          <p className="text-xs text-muted-foreground whitespace-nowrap">per month</p>
        </div>
      </div>

      {/* ElterngeldPlus */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm">ElterngeldPlus</h3>
          <p className="text-xs text-muted-foreground">Half amount for longer duration (24-28 months total).</p>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold text-foreground">
            €{calculation.totalPlus.toLocaleString('de-DE')}
          </span>
          <p className="text-xs text-muted-foreground whitespace-nowrap">per month</p>
        </div>
      </div>

      {/* Max hint - inside box at bottom */}
      <div className="mt-auto pt-4">
        {calculation.isMaxReached && (
          <div className="w-full px-3 py-1.5 rounded-lg bg-muted border border-border flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <p className="text-xs font-medium text-muted-foreground">
              Maximum Elterngeld reached!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
