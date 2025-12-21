import { X, Check, Clock, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCentroWizard } from './CentroWizardProvider';
import { cn } from '@/lib/utils';
import { TooltipHelp } from '@/components/ui/tooltip-help';

interface CentroWizardHeaderProps {
  onClose: () => void;
}

export function CentroWizardHeader({ onClose }: CentroWizardHeaderProps) {
  const { isDirty, isSaving, lastSaved, currentStep, totalSteps, isEditMode, form } = useCentroWizard();
  
  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const diff = Date.now() - lastSaved.getTime();
    if (diff < 60000) return 'agora';
    if (diff < 3600000) return `há ${Math.floor(diff / 60000)} min`;
    return `há ${Math.floor(diff / 3600000)}h`;
  };
  
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-zinc-100 bg-white">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl text-white shadow-lg transition-colors bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-500/20">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-zinc-900">
              {isEditMode ? `Editar Centro - ${form.codigo}` : 'Novo Centro de Custo'}
            </h1>
            <TooltipHelp 
              content="Centro de Custo é uma unidade organizacional para agrupar despesas e receitas. Permite analisar a performance financeira de cada área, departamento ou atividade da organização. Ex: Administração, Pastoral, Assistência Social."
              side="bottom"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Etapa {currentStep + 1} de {totalSteps} — Organização de despesas por área
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center">
          {isSaving && (
            <span className="flex items-center gap-2 text-xs text-zinc-500">
              <Clock className="h-3.5 w-3.5 animate-spin" />
              Salvando...
            </span>
          )}
          {isDirty && !isSaving && (
            <span className="flex items-center gap-2 text-xs text-amber-600">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Não salvo
            </span>
          )}
          {lastSaved && !isDirty && !isSaving && (
            <span className="flex items-center gap-2 text-xs text-emerald-600">
              <Check className="h-3.5 w-3.5" />
              Salvo {formatLastSaved()}
            </span>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className={cn(
            "h-9 w-9 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100",
            isDirty && "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
          )}
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

