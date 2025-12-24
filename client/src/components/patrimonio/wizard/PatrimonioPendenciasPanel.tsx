import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { usePatrimonioWizard } from './PatrimonioWizardProvider';
import { cn } from '@/lib/utils';

export function PatrimonioPendenciasPanel() {
  const { warnings, goToStep, focusField, steps } = usePatrimonioWizard();
  
  if (warnings.length === 0) return null;
  
  const getIcon = (tipo: 'info' | 'warning' | 'bloqueio') => {
    switch (tipo) {
      case 'bloqueio': return <XCircle className="h-4 w-4 text-rose-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };
  
  const getStyles = (tipo: 'info' | 'warning' | 'bloqueio') => {
    switch (tipo) {
      case 'bloqueio': return 'bg-rose-50 border-rose-200 hover:bg-rose-100';
      case 'warning': return 'bg-amber-50 border-amber-200 hover:bg-amber-100';
      default: return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
    }
  };
  
  const handleClick = (warning: typeof warnings[0]) => {
    if (warning.step !== undefined) {
      goToStep(warning.step);
      setTimeout(() => focusField(warning.campo), 100);
    }
  };
  
  return (
    <div className="rounded-xl border bg-card p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h3 className="font-medium text-sm">Pendências e Alertas</h3>
        <span className="text-xs text-muted-foreground">({warnings.length})</span>
      </div>
      
      <div className="space-y-2">
        {warnings.map((warning, idx) => {
          const stepLabel = warning.step !== undefined ? steps[warning.step]?.label : null;
          
          return (
            <button
              key={idx}
              onClick={() => handleClick(warning)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                getStyles(warning.tipo)
              )}
            >
              {getIcon(warning.tipo)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{warning.mensagem}</p>
                {stepLabel && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Etapa: {stepLabel} → Campo: {warning.campo}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}












