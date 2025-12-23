import { useState, useMemo } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StepIndicator } from '@/components/StepIndicator';
import { IncomeSlider } from '@/components/IncomeSlider';
import { ResultCard } from '@/components/ResultCard';
import { MonthPlanner } from '@/components/MonthPlanner';
import { Navbar } from '@/components/Navbar';
import { ElterngeldChat } from '@/components/ElterngeldChat';
import { CalculatorState } from '@/types/elterngeld';
import { calculateElterngeld } from '@/lib/elterngeld';
import { cn } from '@/lib/utils';
const Index = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [calculatorState, setCalculatorState] = useState<CalculatorState>({
    monthlyIncome: 2500,
    hasSiblingBonus: false,
    multipleChildren: 0
  });
  const calculation = useMemo(() => {
    return calculateElterngeld(calculatorState);
  }, [calculatorState]);
  return <div className="h-screen flex flex-col bg-[#F5F5F5]">
      <Navbar />
      
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Calculator Panel */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex flex-col bg-card rounded-2xl border border-border overflow-hidden">
            {/* Step Indicator inside card */}
            <div className="px-space-lg py-space-md border-b border-border bg-white">
              <StepIndicator currentStep={currentStep} totalSteps={2} labels={['Calculate Elterngeld', 'Plan Elterngeld']} />
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-auto p-space-lg bg-black/0">
              <div className="grid grid-rows-1 overflow-hidden">
                {/* Step 1 - always rendered */}
                <div className={cn("col-start-1 row-start-1 w-full min-w-0", currentStep === 1 ? "animate-fade-in" : "invisible")}>
                  <div className="grid gap-space-md sm:grid-cols-[1fr_35%] items-stretch">
                    <IncomeSlider value={calculatorState.monthlyIncome} onChange={value => setCalculatorState(prev => ({
                    ...prev,
                    monthlyIncome: value
                  }))} hasSiblingBonus={calculatorState.hasSiblingBonus} onSiblingBonusChange={value => setCalculatorState(prev => ({
                    ...prev,
                    hasSiblingBonus: value
                  }))} multipleChildren={calculatorState.multipleChildren} onMultipleChildrenChange={value => setCalculatorState(prev => ({
                    ...prev,
                    multipleChildren: value
                  }))} />
                    <ResultCard calculation={calculation} />
                  </div>
                </div>

                {/* Step 2 - always rendered */}
                <div className={cn("col-start-1 row-start-1 h-full w-full min-w-0", currentStep === 2 ? "animate-fade-in" : "invisible")}>
                  <MonthPlanner calculation={calculation} />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="px-space-lg py-space-md border-t border-border bg-secondary/30 flex flex-col sm:flex-row gap-space-sm sm:gap-0 justify-between">
              {currentStep > 1 ? <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)} className="gap-2 w-full sm:w-auto">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button> : <div className="hidden sm:block" />}

              {currentStep === 1 && calculation.isEligible && <Button onClick={() => setCurrentStep(prev => prev + 1)} className="gap-2 gradient-primary hover:opacity-90 transition-opacity w-full sm:w-auto">
                  Continue to Planning
                  <ArrowRight className="h-4 w-4" />
                </Button>}

              {currentStep === 2 && <Button className="gap-2 gradient-primary hover:opacity-90 transition-opacity w-full sm:w-auto">
                  Start your application
                  <ArrowRight className="h-4 w-4" />
                </Button>}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            This calculator provides estimates based on current Elterngeld regulations. For official calculations, please consult your local Elterngeldstelle.
          </p>
        </main>

        {/* Chat Panel */}
        <aside className="hidden lg:flex w-[400px]">
          <ElterngeldChat calculation={calculation} calculatorState={calculatorState} />
        </aside>
      </div>
    </div>;
};
export default Index;