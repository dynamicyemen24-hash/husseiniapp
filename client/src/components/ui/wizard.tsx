import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";

type WizardStep = {
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;
};

interface WizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  className?: string;
}

function Wizard({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  className,
}: WizardProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div data-slot="wizard" className={cn("flex flex-col gap-6", className)}>
      {/* Step indicator */}
      <div
        data-slot="wizard-indicator"
        className="flex items-center justify-between"
      >
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <button
              data-slot="wizard-step-trigger"
              data-state={
                index === currentStep
                  ? "active"
                  : index < currentStep
                    ? "completed"
                    : "inactive"
              }
              onClick={() => onStepChange(index)}
              className={cn(
                "flex flex-col items-center gap-2 transition-all",
                index <= currentStep
                  ? "cursor-pointer"
                  : "cursor-default opacity-50"
              )}
            >
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-full border-2 transition-all",
                  index < currentStep
                    ? "border-brand bg-brand text-brand-foreground"
                    : index === currentStep
                      ? "border-brand bg-background text-brand"
                      : "border-border bg-background text-muted-foreground"
                )}
              >
                {index < currentStep ? <Check className="size-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  index === currentStep
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-12 transition-colors",
                  index < currentStep ? "bg-brand" : "bg-border"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Progress bar */}
      <div
        data-slot="wizard-progress"
        className="h-1 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          data-slot="wizard-progress-fill"
          className="h-full bg-brand transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div data-slot="wizard-content" className="flex-1">
        {steps[currentStep].content}
      </div>

      {/* Navigation */}
      <div
        data-slot="wizard-navigation"
        className="flex items-center justify-between gap-4"
      >
        <button
          data-slot="wizard-previous"
          onClick={() => onStepChange(currentStep - 1)}
          disabled={currentStep === 0}
          className={cn(
            "inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors",
            currentStep === 0
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:bg-accent"
          )}
        >
          <ChevronLeft className="size-4" />
          السابق
        </button>
        <div className="text-sm text-muted-foreground">
          {currentStep + 1} / {steps.length}
        </div>
        <button
          data-slot="wizard-next"
          onClick={
            currentStep === steps.length - 1
              ? onComplete
              : () => onStepChange(currentStep + 1)
          }
          className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-deep"
        >
          {currentStep === steps.length - 1 ? "إتمام" : "التالي"}
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

export { Wizard, type WizardStep };
