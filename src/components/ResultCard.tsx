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
    <div className="flex flex-col h-full gap-3">
      {/* Result box */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-card flex-1 flex flex-col">
        {/* Basiselterngeld */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground text-sm">Basiselterngeld</h3>
            <p className="text-xs text-muted-foreground">Full monthly amount for shorter duration (12-14 months total).</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-foreground">
              €{calculation.totalBasis.toLocaleString('de-DE')}
            </span>
            <p className="text-xs text-muted-foreground">per month</p>
          </div>
        </div>

        {/* ElterngeldPlus */}
        <div className="flex items-center justify-between pt-3">
          <div>
            <h3 className="font-semibold text-foreground text-sm">ElterngeldPlus</h3>
            <p className="text-xs text-muted-foreground">Half amount for longer duration (24-28 months total).</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-foreground">
              €{calculation.totalPlus.toLocaleString('de-DE')}
            </span>
            <p className="text-xs text-muted-foreground">per month</p>
          </div>
        </div>
      </div>

      {/* Disclaimer - outside main box */}
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        This calculator provides estimates based on current Elterngeld regulations. For official calculations, please consult your local Elterngeldstelle.
      </p>

      {/* Max hint - outside below the box */}
      <div className="h-8 flex items-center">
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
