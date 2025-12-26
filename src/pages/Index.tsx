import { useState, useMemo } from "react";
import { ArrowRight, ArrowLeft, MessageCircle, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/StepIndicator";
import { IncomeSlider } from "@/components/IncomeSlider";
import { ResultCard } from "@/components/ResultCard";
import { MonthPlanner } from "@/components/MonthPlanner";
import { Navbar } from "@/components/Navbar";
import { ElterngeldChat } from "@/components/ElterngeldChat";
import { CalculatorState } from "@/types/elterngeld";
import { calculateElterngeld } from "@/lib/elterngeld";
import { cn } from "@/lib/utils";
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
  const CalculatorContent = () => <main className="flex-1 flex flex-col min-w-0 min-h-0 @container">
      <div className="flex-1 flex flex-col min-h-0 bg-card rounded-2xl border border-border overflow-hidden">
        {/* Step Indicator inside card - reduced padding */}
        <div className="px-space-lg py-space-sm border-b border-border bg-white shrink-0">
          <StepIndicator currentStep={currentStep} totalSteps={2} labels={["Calculate Elterngeld", "Plan Elterngeld"]} />
        </div>

        {/* Step Content */}
        <div className="flex-1 min-h-0 overflow-auto p-space-lg bg-black/0">
          <div className="grid grid-rows-1 min-h-0">
            {/* Step 1 - always rendered */}
            <div className={cn("col-start-1 row-start-1 w-full min-w-0", currentStep === 1 ? "animate-fade-in" : "invisible")}>
              <div className="grid gap-space-md @2xl:grid-cols-[1fr_minmax(280px,40%)] items-stretch">
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
        <div className="px-space-lg py-space-md border-t border-border flex flex-col @sm:flex-row gap-space-sm @sm:gap-0 justify-between bg-white shrink-0">
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
        This calculator provides estimates based on current Elterngeld regulations. For official calculations,
        please consult your local Elterngeldstelle.
      </p>
    </main>;
  return <div className="h-dvh flex flex-col bg-[#F5F5F5]">
      <Navbar />

      {/* Desktop: Resizable layout (lg+) */}
      <div className="hidden md:flex flex-1 overflow-hidden bg-white p-6 py-[5px] pb-[20px]">
        <ResizablePanelGroup direction="horizontal" className="gap-2">
          <ResizablePanel defaultSize={65} minSize={40}>
            <CalculatorContent />
          </ResizablePanel>
          <ResizableHandle withHandle className="mx-2" />
          <ResizablePanel defaultSize={35} minSize={25} className="min-w-0">
            <ElterngeldChat calculation={calculation} calculatorState={calculatorState} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Tablet & Mobile: Calculator only + FAB drawer */}
      <div className="md:hidden flex-1 flex flex-col min-h-0 p-6 overflow-auto bg-white">
        <CalculatorContent />
      </div>

      {/* Mobile/Tablet Chat FAB + Drawer (visible below lg) */}
      <div className="md:hidden">
        <Drawer>
          <DrawerTrigger asChild>
            <Button size="icon" className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg gradient-primary z-50">
              <MessageCircle className="h-6 w-6" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[85vh]">
            <DrawerHeader className="flex items-center justify-between border-b border-border pb-3">
              <DrawerTitle>Chat Assistant</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <ElterngeldChat calculation={calculation} calculatorState={calculatorState} />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>;
};
export default Index;