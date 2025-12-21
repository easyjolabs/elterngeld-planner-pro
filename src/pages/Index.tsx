import { useState, useMemo } from 'react';
import { Calculator, CalendarDays, ArrowRight, ArrowLeft, Baby } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StepIndicator } from '@/components/StepIndicator';
import { IncomeSlider } from '@/components/IncomeSlider';
import { BonusOptions } from '@/components/BonusOptions';
import { ResultCard } from '@/components/ResultCard';
import { MonthPlanner } from '@/components/MonthPlanner';
import { CalculatorState } from '@/types/elterngeld';
import { calculateElterngeld } from '@/lib/elterngeld';

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
    <div className="min-h-screen gradient-surface">
      {/* Header */}
      <header className="py-8 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 animate-fade-in">
            <Baby className="h-4 w-4" />
            <span>Elterngeld Rechner 2024</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3 animate-fade-in">
            Elterngeld Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Calculate your parental allowance and plan your months with ease.
          </p>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="container max-w-4xl mx-auto px-4 mb-8">
        <StepIndicator
          currentStep={currentStep}
          totalSteps={2}
          labels={['Calculate', 'Plan Months']}
        />
      </div>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 pb-12">
        <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
          {/* Step Header */}
          <div className="px-6 py-5 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-3">
              {currentStep === 1 ? (
                <>
                  <div className="p-2 rounded-lg gradient-primary">
                    <Calculator className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Income Calculator</h2>
                    <p className="text-sm text-muted-foreground">
                      Enter your monthly net income and select bonus options
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2 rounded-lg gradient-accent">
                    <CalendarDays className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Month Planner</h2>
                    <p className="text-sm text-muted-foreground">
                      Plan how you and your partner will take Elterngeld
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Step Content */}
          <div className="p-6">
            {currentStep === 1 ? (
              <div className="space-y-8 animate-fade-in">
                <IncomeSlider
                  value={calculatorState.monthlyIncome}
                  onChange={(value) =>
                    setCalculatorState((prev) => ({ ...prev, monthlyIncome: value }))
                  }
                />

                <BonusOptions
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
            ) : (
              <MonthPlanner calculation={calculation} />
            )}
          </div>

          {/* Navigation */}
          <div className="px-6 py-4 border-t border-border bg-secondary/30 flex justify-between">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 2 && calculation.isEligible && (
              <Button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="gap-2 gradient-primary hover:opacity-90 transition-opacity"
              >
                Continue to Planning
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          This calculator provides estimates based on current Elterngeld regulations. 
          For official calculations, please consult your local Elterngeldstelle.
        </p>
      </main>
    </div>
  );
};

export default Index;
