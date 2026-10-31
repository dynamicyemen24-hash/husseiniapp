import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";

interface FormStep {
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;
}

interface FormWizardProps {
  steps: FormStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export function FormWizard({
  steps,
  currentStep,
  onStepChange,
  onSubmit,
  isSubmitting,
}: FormWizardProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => onStepChange(index)}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                index === currentStep
                  ? "bg-brand text-brand-foreground"
                  : index < currentStep
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {index < currentStep ? <Check className="size-4" /> : index + 1}
              <span className="hidden sm:inline">{step.title}</span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-1 w-8 rounded-full",
                  index < currentStep ? "bg-brand" : "bg-muted"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4">{steps[currentStep].content}</div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 border-t pt-4">
        <button
          type="button"
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
        <button
          type="button"
          onClick={isLast ? onSubmit : () => onStepChange(currentStep + 1)}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-deep disabled:opacity-50"
        >
          {isSubmitting ? "جاري المعالجة..." : isLast ? "إتمام" : "التالي"}
          {!isLast && <ChevronRight className="size-4" />}
        </button>
      </div>
    </div>
  );
}
