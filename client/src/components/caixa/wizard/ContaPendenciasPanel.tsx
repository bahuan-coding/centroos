import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useContaWizard, Warning } from './ContaWizardProvider';
import { cn } from '@/lib/utils';

export function ContaPendenciasPanel() {
  const { warnings, goToStep, focusField, steps } = useContaWizard();
  
  if (warnings.length === 0) return null;
  
  const handlePendenciaClick = (warning: Warning) => {
    const stepIndex = warning.step ?? 0;
    goToStep(stepIndex);
    
    // Focar no campo específico após navegação
    setTimeout(() => {
      if (warning.campo === 'pix') {
        focusField('pixTipo');
      } else if (warning.campo === 'contaContabil') {
        focusField('contaContabil');
      }
    }, 100);
  };
  
  const getStepLabel = (stepIndex: number) => {
    return steps[stepIndex]?.label || 'Etapa desconhecida';
  };
  
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-sm text-amber-800">
            {warnings.length} {warnings.length === 1 ? 'item pendente' : 'itens pendentes'}
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            A conta pode ser criada, mas recomendamos completar estes dados.
          </p>
          
          <div className="mt-3 space-y-1">
            {warnings.map((warning, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handlePendenciaClick(warning)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 p-2 rounded-lg text-left transition-colors",
                  "hover:bg-amber-100/50",
                  warning.tipo === 'warning' ? "text-amber-800" : "text-amber-700"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    warning.tipo === 'warning' ? "bg-amber-500" : "bg-amber-400"
                  )} />
                  <span className="text-sm">{warning.mensagem}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-600 shrink-0">
                  <span className="hidden sm:inline">{getStepLabel(warning.step ?? 0)}</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}









