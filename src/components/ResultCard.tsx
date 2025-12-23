import { ElterngeldCalculation } from '@/types/elterngeld';
import { AlertCircle, TrendingUp } from 'lucide-react';
interface ResultCardProps {
  calculation: ElterngeldCalculation;
}
export function ResultCard({
  calculation
}: ResultCardProps) {
  if (!calculation.isEligible) {
    return <div className="h-full flex items-center">
        <div className="w-full p-space-md rounded-xl bg-destructive/10 border border-destructive/20">
          <div className="flex items-start gap-space-sm">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">Not Eligible</h3>
              <p className="text-sm text-muted-foreground mt-space-2xs">
                Annual income exceeds €175,000. Unfortunately, you are not eligible for Elterngeld.
              </p>
            </div>
          </div>
        </div>
      </div>;
  }
  return <div style={{
    backgroundColor: '#EFEBDE'
  }} className="p-space-md rounded-xl border border-border h-full flex flex-col gap-0 bg-white">
      {/* Headline */}
      <div className="pb-space-md mb-space-md border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Your estimated Elterngeld
        </h2>
        
      </div>

      {/* Basiselterngeld */}
      <div className="flex items-start justify-between pb-space-md border-b border-border gap-space-sm">
        <div className="max-w-[60%] md:max-w-[65%]">
          <h3 className="font-semibold text-foreground text-sm">Basiselterngeld</h3>
          <p className="text-xs text-muted-foreground mt-space-2xs">Full monthly amount for shorter duration (12-14 months total).</p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-lg md:text-xl font-bold text-foreground font-sans">
            €{calculation.totalBasis.toLocaleString('de-DE')}
          </span>
          <p className="text-xs text-muted-foreground whitespace-nowrap mt-space-2xs">per month</p>
        </div>
      </div>

      {/* ElterngeldPlus */}
      <div className="flex items-start justify-between pt-space-md gap-space-sm">
        <div className="max-w-[60%] md:max-w-[65%]">
          <h3 className="font-semibold text-foreground text-sm">ElterngeldPlus</h3>
          <p className="text-xs text-muted-foreground mt-space-2xs">Half amount for longer duration (24-28 months total).</p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-lg md:text-xl font-bold text-foreground">
            €{calculation.totalPlus.toLocaleString('de-DE')}
          </span>
          <p className="text-xs text-muted-foreground whitespace-nowrap mt-space-2xs">per month</p>
        </div>
      </div>

      {/* Max hint - inside box at bottom */}
      <div className="mt-auto pt-space-md">
        <div className={`w-full px-space-sm py-space-xs rounded-lg flex items-center gap-space-sm min-h-[28px] ${calculation.isMaxReached ? 'bg-muted border border-border' : 'bg-transparent border border-transparent'}`}>
          <TrendingUp className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-opacity ${calculation.isMaxReached ? 'opacity-100' : 'opacity-0'}`} />
          <p className={`text-xs font-medium text-muted-foreground whitespace-nowrap transition-opacity ${calculation.isMaxReached ? 'opacity-100' : 'opacity-0'}`}>
            Maximum Elterngeld reached!
          </p>
        </div>
      </div>
    </div>;
}