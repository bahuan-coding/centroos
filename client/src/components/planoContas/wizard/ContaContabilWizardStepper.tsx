import { Check, AlertTriangle } from 'lucide-react';
import { useContaContabilWizard } from './ContaContabilWizardProvider';
import { cn } from '@/lib/utils';

const typeAccentColors: Record<string, { current: string; complete: string }> = {
  ativo: { 
    current: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/25', 
    complete: 'bg-blue-500/20 text-blue-400' 
  },
  passivo: { 
    current: 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-orange-500/25', 
    complete: 'bg-orange-500/20 text-orange-400' 
  },
  patrimonio_social: { 
    current: 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-500/25', 
    complete: 'bg-purple-500/20 text-purple-400' 
  },
  receita: { 
    current: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25', 
    complete: 'bg-emerald-500/20 text-emerald-400' 
  },
  despesa: { 
    current: 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/25', 
    complete: 'bg-rose-500/20 text-rose-400' 
  },
};

export function ContaContabilWizardStepper() {
  const { steps, currentStep, goToStep, warnings, form } = useContaContabilWizard();
  
  const accentColors = typeAccentColors[form.tipo] || typeAccentColors.despesa;
  
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
                    status === 'current' && cn(accentColors.current, "text-white shadow-lg"),
                    status === 'complete' && accentColors.complete,
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
                  status === 'current' && (
                    form.tipo === 'ativo' ? "bg-blue-600" :
                    form.tipo === 'passivo' ? "bg-orange-600" :
                    form.tipo === 'patrimonio_social' ? "bg-purple-600" :
                    form.tipo === 'receita' ? "bg-emerald-600" :
                    "bg-rose-600"
                  ),
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






