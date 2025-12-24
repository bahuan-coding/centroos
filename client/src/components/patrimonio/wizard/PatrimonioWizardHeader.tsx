import { X, Check, Clock, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePatrimonioWizard } from './PatrimonioWizardProvider';
import { cn } from '@/lib/utils';

interface PatrimonioWizardHeaderProps {
  onClose: () => void;
}

export function PatrimonioWizardHeader({ onClose }: PatrimonioWizardHeaderProps) {
  const { isDirty, isSaving, lastSaved, currentStep, totalSteps, isEditMode, form } = usePatrimonioWizard();
  
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
        <div className="flex items-center justify-center w-10 h-10 rounded-xl text-white shadow-lg transition-colors bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/20">
          <Boxes className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">
            {isEditMode ? `Editar Bem - ${form.codigo}` : 'Novo Bem (Patrimônio)'}
          </h1>
          <p className="text-xs text-zinc-500">
            Etapa {currentStep + 1} de {totalSteps} — Controle patrimonial e contábil
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









