import { X, Check, Clock, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjetoWizard } from './ProjetoWizardProvider';
import { cn } from '@/lib/utils';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { Badge } from '@/components/ui/badge';

interface ProjetoWizardHeaderProps {
  onClose: () => void;
}

export function ProjetoWizardHeader({ onClose }: ProjetoWizardHeaderProps) {
  const { isDirty, isSaving, lastSaved, currentStep, totalSteps, isEditMode, form, statusConfig } = useProjetoWizard();
  
  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const diff = Date.now() - lastSaved.getTime();
    if (diff < 60000) return 'agora';
    if (diff < 3600000) return `há ${Math.floor(diff / 60000)} min`;
    return `há ${Math.floor(diff / 3600000)}h`;
  };
  
  const statusInfo = statusConfig[form.status];
  
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-zinc-100 bg-white">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl text-white shadow-lg transition-colors bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/20">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-zinc-900">
              {isEditMode ? `Editar Projeto - ${form.codigo}` : 'Novo Projeto'}
            </h1>
            {isEditMode && statusInfo && (
              <Badge className={cn(statusInfo.bg, statusInfo.color, 'border-0')}>
                {statusInfo.label}
              </Badge>
            )}
            <TooltipHelp 
              content="Projeto é uma iniciativa temporária com objetivo, cronograma e orçamento definidos. Permite acompanhar custos, prazos e resultados de forma estruturada. Ex: Reforma do telhado, Evento beneficente, Curso de formação."
              side="bottom"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Etapa {currentStep + 1} de {totalSteps} — Gestão de projetos e iniciativas
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

