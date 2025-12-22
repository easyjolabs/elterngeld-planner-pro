import { useState, useMemo } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StepIndicator } from '@/components/StepIndicator';
import { IncomeSlider } from '@/components/IncomeSlider';
import { ResultCard } from '@/components/ResultCard';
import { MonthPlanner } from '@/components/MonthPlanner';
import { CalculatorState } from '@/types/elterngeld';
import { calculateElterngeld } from '@/lib/elterngeld';

const STEP_HEIGHT = 'h-[380px]';

const Index = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [calculatorState, setCalculatorState] = useState<CalculatorState>({
    monthlyIncome: 2500,
    hasSiblingBonus: false,
    multipleChildren: 0,
  });

  const calculation = useMemo(() => {
    return calculateElterngeld(calculatorState);
  }, [calculatorState]);

  return (
    <div className="min-h-screen gradient-surface py-8 px-4">
      <main className="container max-w-4xl mx-auto">
        <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
          {/* Step Indicator inside card */}
          <div className="px-6 py-4 border-b border-border bg-secondary/30">
            <StepIndicator
              currentStep={currentStep}
              totalSteps={2}
              labels={['Calculate', 'Plan Months']}
            />
          </div>

          {/* Step Content */}
          <div className={`p-6 ${STEP_HEIGHT}`}>
            {currentStep === 1 ? (
              <div className="animate-fade-in">
                {/* Income + Results side by side */}
                <div className="grid gap-4 lg:grid-cols-[1fr_35%] items-stretch">
                  <IncomeSlider
                    value={calculatorState.monthlyIncome}
                    onChange={(value) =>
                      setCalculatorState((prev) => ({ ...prev, monthlyIncome: value }))
                    }
                    hasSiblingBonus={calculatorState.hasSiblingBonus}
                    onSiblingBonusChange={(value) =>
                      setCalculatorState((prev) => ({ ...prev, hasSiblingBonus: value }))
                    }
                    multipleChildren={calculatorState.multipleChildren}
                    onMultipleChildrenChange={(value) =>
                      setCalculatorState((prev) => ({ ...prev, multipleChildren: value }))
                    }
                  />
                  <ResultCard calculation={calculation} />
                </div>
              </div>
            ) : (
              <div className="animate-fade-in h-full">
                <MonthPlanner calculation={calculation} />
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-6 py-4 border-t border-border bg-secondary/30 flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="gap-2 w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div className="hidden sm:block" />
            )}

            {currentStep === 1 && calculation.isEligible && (
              <Button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="gap-2 gradient-primary hover:opacity-90 transition-opacity w-full sm:w-auto"
              >
                Continue to Planning
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {currentStep === 2 && (
              <Button 
                className="gap-2 gradient-primary hover:opacity-90 transition-opacity w-full sm:w-auto"
              >
                Start your application
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Disclaimer - outside calculator */}
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          This calculator provides estimates based on current Elterngeld regulations. For official calculations, please consult your local Elterngeldstelle.
        </p>
      </main>
    </div>
  );
};

export default Index;
