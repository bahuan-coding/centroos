import { Check, AlertTriangle } from 'lucide-react';
import { useWizard } from './WizardProvider';
import { cn } from '@/lib/utils';

export function WizardStepper() {
  const { steps, currentStep, goToStep, warnings } = useWizard();
  
  const getStepStatus = (index: number) => {
    if (index < currentStep) {
      const stepWarnings = warnings.filter(w => w.step === index);
      return stepWarnings.length > 0 ? 'warning' : 'complete';
    }
    if (index === currentStep) return 'current';
    return 'pending';
  };
  
  return (
    <>
      {/* Desktop: Lateral */}
      <nav className="hidden lg:flex flex-col gap-1 w-56 shrink-0 p-4 border-r bg-muted/30" aria-label="Progresso do cadastro">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const isClickable = index <= currentStep;
          
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => isClickable && goToStep(index)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                status === 'current' && "bg-violet-100 text-violet-900 font-medium",
                status === 'complete' && "text-emerald-700 hover:bg-emerald-50",
                status === 'warning' && "text-amber-700 hover:bg-amber-50",
                status === 'pending' && "text-muted-foreground opacity-60",
                isClickable && status !== 'current' && "cursor-pointer"
              )}
              aria-current={status === 'current' ? 'step' : undefined}
            >
              <span className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full text-sm shrink-0",
                status === 'current' && "bg-violet-600 text-white",
                status === 'complete' && "bg-emerald-100 text-emerald-700",
                status === 'warning' && "bg-amber-100 text-amber-700",
                status === 'pending' && "bg-muted text-muted-foreground"
              )}>
                {status === 'complete' && <Check className="h-4 w-4" />}
                {status === 'warning' && <AlertTriangle className="h-4 w-4" />}
                {(status === 'current' || status === 'pending') && (index + 1)}
              </span>
              <div className="flex flex-col">
                <span className="text-sm">{step.label}</span>
                {step.optional && <span className="text-[10px] text-muted-foreground">Opcional</span>}
              </div>
            </button>
          );
        })}
      </nav>
      
      {/* Mobile: Top bar */}
      <div className="lg:hidden px-4 py-3 border-b bg-muted/30" aria-label="Progresso do cadastro">
        <div className="flex items-center gap-1" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemax={steps.length} aria-label={`Etapa ${currentStep + 1} de ${steps.length}`}>
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => index <= currentStep && goToStep(index)}
                disabled={index > currentStep}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-all",
                  status === 'current' && "bg-violet-600",
                  status === 'complete' && "bg-emerald-500",
                  status === 'warning' && "bg-amber-500",
                  status === 'pending' && "bg-muted"
                )}
                aria-label={`${step.label}${status === 'current' ? ' (atual)' : ''}`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-medium flex items-center gap-2">
            <span>{steps[currentStep]?.icon}</span>
            {steps[currentStep]?.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} de {steps.length}
          </span>
        </div>
      </div>
    </>
  );
}

