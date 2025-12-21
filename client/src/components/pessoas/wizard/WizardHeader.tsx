import { X, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWizard } from './WizardProvider';
import { cn } from '@/lib/utils';

interface WizardHeaderProps {
  onClose: () => void;
}

export function WizardHeader({ onClose }: WizardHeaderProps) {
  const { isDirty, isSaving, lastSaved, form, currentStep, totalSteps } = useWizard();
  
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{form.tipo === 'fisica' ? '👤' : '🏢'}</span>
        <div>
          <h1 className="text-lg font-semibold">Nova Pessoa</h1>
          <p className="text-xs text-muted-foreground">
            Etapa {currentStep + 1} de {totalSteps}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Status */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          {isSaving && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 animate-spin" />
              Salvando...
            </span>
          )}
          {isDirty && !isSaving && (
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Alterações não salvas
            </span>
          )}
          {lastSaved && !isDirty && !isSaving && (
            <span className="flex items-center gap-1 text-emerald-600">
              <Check className="h-3 w-3" />
              Salvo
            </span>
          )}
        </div>
        
        <Badge variant="outline" className="hidden sm:flex">Novo cadastro</Badge>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className={cn(
            "rounded-full",
            isDirty && "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          )}
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

