import { cn } from '@/lib/utils';
import { Check, Calculator, CalendarDays } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

const stepIcons = [Calculator, CalendarDays];

export function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-space-sm sm:gap-space-sm">
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        const Icon = stepIcons[index];
        
        return (
          <div key={index} className="flex items-center">
            <div className="flex items-center gap-space-xs sm:gap-space-sm">
              <div
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted && "gradient-primary text-primary-foreground",
                  isActive && "gradient-primary text-primary-foreground shadow-glow",
                  !isCompleted && !isActive && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              </div>
              <span
                className={cn(
                  "text-xs sm:text-sm font-medium transition-colors hidden xs:inline",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {labels[index]}
              </span>
            </div>
            
            {index < totalSteps - 1 && (
              <div
                className={cn(
                  "w-6 sm:w-12 h-0.5 mx-1.5 sm:mx-3 transition-colors",
                  isCompleted ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
