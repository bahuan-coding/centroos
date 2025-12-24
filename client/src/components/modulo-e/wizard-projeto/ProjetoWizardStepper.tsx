import { Check, AlertTriangle } from 'lucide-react';
import { useProjetoWizard } from './ProjetoWizardProvider';
import { cn } from '@/lib/utils';

export function ProjetoWizardStepper() {
  const { steps, currentStep, goToStep, warnings } = useProjetoWizard();
  
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
      {/* Desktop: Sidebar escura elegante */}
      <nav className="hidden lg:flex flex-col w-64 shrink-0 bg-zinc-900 text-zinc-100" aria-label="Progresso do cadastro">
        <div className="p-6 border-b border-zinc-800">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Etapas</div>
        </div>
        <div className="flex-1 p-4 space-y-1">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const isClickable = index <= currentStep;
            const isLast = index === steps.length - 1;
            
            return (
              <div key={step.id} className="relative">
                {!isLast && (
                  <div className={cn(
                    "absolute left-[19px] top-10 w-0.5 h-6",
                    status === 'complete' || status === 'warning' ? 'bg-zinc-600' : 'bg-zinc-800'
                  )} />
                )}
                <button
                  type="button"
                  onClick={() => isClickable && goToStep(index)}
                  disabled={!isClickable}
                  className={cn(
                    "w-full flex items-center gap-4 px-3 py-3 rounded-xl text-left transition-all group",
                    status === 'current' && "bg-white/10",
                    status !== 'current' && isClickable && "hover:bg-white/5 cursor-pointer",
                    status === 'pending' && "opacity-40"
                  )}
                  aria-current={status === 'current' ? 'step' : undefined}
                >
                  <span className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-xl text-sm font-semibold shrink-0 transition-all",
                    status === 'current' && "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25",
                    status === 'complete' && "bg-emerald-500/20 text-emerald-400",
                    status === 'warning' && "bg-amber-500/20 text-amber-400",
                    status === 'pending' && "bg-zinc-800 text-zinc-500"
                  )}>
                    {status === 'complete' && <Check className="h-5 w-5" />}
                    {status === 'warning' && <AlertTriangle className="h-5 w-5" />}
                    {(status === 'current' || status === 'pending') && step.icon}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className={cn(
                      "text-sm font-medium truncate",
                      status === 'current' && "text-white",
                      status === 'complete' && "text-zinc-300",
                      status === 'warning' && "text-amber-300",
                      status === 'pending' && "text-zinc-500"
                    )}>
                      {step.label}
                    </span>
                    {step.optional && (
                      <span className="text-[11px] text-zinc-500">Opcional</span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </nav>
      
      {/* Mobile: Top bar compacta */}
      <div className="lg:hidden px-4 py-3 border-b bg-zinc-50" aria-label="Progresso do cadastro">
        <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemax={steps.length}>
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => index <= currentStep && goToStep(index)}
                disabled={index > currentStep}
                className={cn(
                  "flex-1 h-1 rounded-full transition-all",
                  status === 'current' && "bg-indigo-600",
                  status === 'complete' && "bg-emerald-500",
                  status === 'warning' && "bg-amber-500",
                  status === 'pending' && "bg-zinc-200"
                )}
                aria-label={`${step.label}${status === 'current' ? ' (atual)' : ''}`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-sm font-semibold text-zinc-800">
            {steps[currentStep]?.label}
          </span>
          <span className="text-xs font-medium text-zinc-500">
            {currentStep + 1} / {steps.length}
          </span>
        </div>
      </div>
    </>
  );
}












