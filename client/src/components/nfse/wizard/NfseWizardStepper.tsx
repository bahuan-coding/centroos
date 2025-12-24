import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNfseWizard } from './NfseWizardProvider';

export function NfseWizardStepper() {
  const { steps, currentStep, goToStep, errors, warnings } = useNfseWizard();
  
  const getStepStatus = (index: number) => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'upcoming';
  };
  
  const hasStepErrors = (stepId: string) => {
    return Object.keys(errors).some(key => {
      if (stepId === 'tomador') return key.startsWith('tomador');
      if (stepId === 'servico') return ['codigoServico', 'valorServicos', 'discriminacao'].includes(key);
      if (stepId === 'tributacao') return ['aliquota', 'numeroRPS'].includes(key);
      return false;
    });
  };
  
  const hasStepWarnings = (index: number) => {
    return warnings.some(w => w.step === index);
  };
  
  return (
    <aside className="hidden lg:block w-64 border-r bg-slate-50/50 p-4">
      <nav className="space-y-1">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const hasErrors = hasStepErrors(step.id);
          const hasWarningsForStep = hasStepWarnings(index);
          
          return (
            <button
              key={step.id}
              onClick={() => goToStep(index)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
                status === 'current' && 'bg-indigo-100 text-indigo-900',
                status === 'completed' && 'text-slate-600 hover:bg-slate-100',
                status === 'upcoming' && 'text-slate-400',
                hasErrors && 'ring-2 ring-red-300 bg-red-50'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0',
                  status === 'current' && 'bg-indigo-600 text-white',
                  status === 'completed' && 'bg-emerald-500 text-white',
                  status === 'upcoming' && 'bg-slate-200 text-slate-500',
                  hasErrors && 'bg-red-500 text-white'
                )}
              >
                {status === 'completed' && !hasErrors ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{step.icon}</span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium truncate',
                  status === 'current' && 'text-indigo-900',
                  status === 'completed' && 'text-slate-700',
                  status === 'upcoming' && 'text-slate-400'
                )}>
                  {step.label}
                </p>
                {hasWarningsForStep && (
                  <p className="text-xs text-amber-600">Atenção necessária</p>
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

