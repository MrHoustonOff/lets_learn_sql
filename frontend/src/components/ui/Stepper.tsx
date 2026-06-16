import React from 'react';

export interface StepItem {
  id: number;
  label: string;
}

interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  onStepClick: (stepId: number) => void;
  maxReachedStep?: number; // Optional. Determines how far the user has clicked/progressed. Defaults to isPassed.
}

export const Stepper: React.FC<StepperProps> = ({ 
  steps, 
  currentStep, 
  onStepClick,
  maxReachedStep
}) => {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
      {steps.map((step, idx) => {
        const isActive = currentStep === step.id;
        const isPassed = currentStep > step.id;
        const isReachable = maxReachedStep !== undefined ? step.id <= maxReachedStep : isPassed;
        
        return (
          <React.Fragment key={step.id}>
            <div 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isActive 
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(var(--primary),0.4)]" 
                  : isReachable
                    ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                    : "bg-glass text-muted-foreground"
              }`}
              onClick={() => isReachable && onStepClick(step.id)}
            >
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isActive ? 'bg-white/20' : isReachable ? 'bg-primary/20' : 'bg-background'}`}>
                {step.id}
              </div>
              {step.label}
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-6 h-px ${isPassed ? 'bg-primary/50' : 'bg-glass-border'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
