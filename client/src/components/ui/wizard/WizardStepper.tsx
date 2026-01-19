import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepConfig {
  id: string;
  label: string;
  icon?: string;
  optional?: boolean;
}

interface WizardStepperProps {
  steps: StepConfig[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  completedSteps?: number[];
  className?: string;
  variant?: 'horizontal' | 'vertical';
  accentColor?: string;
}

export function WizardStepper({
  steps,
  currentStep,
  onStepClick,
  completedSteps = [],
  className,
  variant = 'horizontal',
  accentColor = 'primary',
}: WizardStepperProps) {
  const isVertical = variant === 'vertical';

  return (
    <div
      className={cn(
        isVertical ? 'flex flex-col gap-2' : 'flex items-center justify-between gap-2',
        className
      )}
    >
      {steps.map((step, index) => {
        const isActive = currentStep === index;
        const isCompleted = completedSteps.includes(index) || index < currentStep;
        const isClickable = onStepClick && (isCompleted || index <= currentStep);

        return (
          <div
            key={step.id}
            className={cn(
              'flex items-center gap-2',
              isVertical ? 'w-full' : 'flex-1',
              index < steps.length - 1 && !isVertical && 'relative'
            )}
          >
            <button
              type="button"
              onClick={() => isClickable && onStepClick?.(index)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 transition-all rounded-lg px-3 py-2',
                isVertical ? 'w-full justify-start' : 'justify-center flex-col sm:flex-row',
                isActive && `bg-${accentColor}/10 text-${accentColor}`,
                isCompleted && !isActive && 'text-muted-foreground',
                !isActive && !isCompleted && 'text-muted-foreground/50',
                isClickable && 'hover:bg-muted cursor-pointer',
                !isClickable && 'cursor-default'
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium shrink-0',
                  isActive && `bg-${accentColor} text-${accentColor}-foreground`,
                  isCompleted && !isActive && 'bg-muted text-muted-foreground',
                  !isActive && !isCompleted && 'bg-muted/50 text-muted-foreground/50'
                )}
              >
                {isCompleted && !isActive ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : step.icon ? (
                  <span>{step.icon}</span>
                ) : (
                  index + 1
                )}
              </span>
              <span className={cn('text-xs font-medium', isVertical ? '' : 'hidden sm:inline')}>
                {step.label}
              </span>
            </button>

            {/* Connector line */}
            {index < steps.length - 1 && !isVertical && (
              <div
                className={cn(
                  'hidden sm:block flex-1 h-0.5 mx-2',
                  index < currentStep ? 'bg-primary/30' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
