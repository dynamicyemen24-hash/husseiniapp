/**
 * StepIndicator — Multi-step wizard progress indicator.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Step {
  label: string;
  description?: string;
  completed?: boolean;
  active?: boolean;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({
  steps,
  currentStep,
  className,
}: StepIndicatorProps) {
  return (
    <div className={cn("flex items-center w-full", className)}>
      {steps.map((step, index) => {
        const isCompleted = step.completed ?? index < currentStep;
        const isActive = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={index}>
            <motion.div
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className={cn(
                  "size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  isCompleted &&
                    "bg-green-500 text-white shadow-sm shadow-green-500/30",
                  isActive &&
                    "bg-brand text-brand-foreground shadow-brand shadow-brand/30",
                  !isCompleted && !isActive && "bg-neutral-200 text-neutral-500"
                )}
              >
                {isCompleted ? "✓" : index + 1}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:block",
                  isActive ? "text-brand font-bold" : "text-neutral-500"
                )}
              >
                {step.label}
              </span>
            </motion.div>
            {!isLast && (
              <div className="flex-1 mx-2">
                <div className="h-1 rounded-full bg-neutral-200 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-brand"
                    initial={{ width: 0 }}
                    animate={{
                      width:
                        isCompleted || (isActive && index < currentStep)
                          ? "100%"
                          : "0%",
                    }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  />
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * StepIndicatorWithLabels — Compact step indicator for workflows.
 */
export function StepIndicatorCompact({
  steps,
  currentStep,
  className,
}: {
  steps: string[];
  currentStep: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {steps.map((label, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <React.Fragment key={index}>
            <div
              className={cn(
                "size-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                isCompleted && "bg-brand text-brand-foreground",
                isActive && "bg-neutral-200 text-brand border-2 border-brand",
                !isCompleted && !isActive && "bg-neutral-100 text-neutral-400"
              )}
            >
              {isCompleted ? "✓" : index + 1}
            </div>
            <span
              className={cn(
                "text-xs font-medium hidden md:block",
                isActive ? "text-brand font-bold" : "text-neutral-500"
              )}
            >
              {label}
            </span>
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 bg-neutral-200 rounded-full overflow-hidden min-w-[20px]">
                {isCompleted && (
                  <div className="h-full bg-brand rounded-full" />
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
