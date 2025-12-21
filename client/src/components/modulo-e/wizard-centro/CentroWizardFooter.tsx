import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCentroWizard } from './CentroWizardProvider';
import { cn } from '@/lib/utils';

interface CentroWizardFooterProps {
  onSubmit: () => void;
}

export function CentroWizardFooter({ onSubmit }: CentroWizardFooterProps) {
  const { currentStep, totalSteps, goBack, goNext, isDirty, saveDraft, isSaving, isSubmitting, isEditMode } = useCentroWizard();
  
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  
  return (
    <footer 
      className="flex items-center justify-between gap-4 px-6 py-4 border-t border-zinc-100 bg-white" 
      role="navigation" 
      aria-label="Navegação do wizard"
    >
      <div className="flex items-center gap-3">
        {!isFirstStep && (
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={isSubmitting}
            className="h-10 px-4 border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        )}
        
        {isDirty && (
          <Button
            type="button"
            variant="ghost"
            onClick={saveDraft}
            disabled={isSaving || isSubmitting}
            className="h-10 text-zinc-500 hover:text-zinc-700 hidden sm:flex"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar rascunho
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {isLastStep ? (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className={cn(
              "h-11 px-6 font-medium shadow-lg transition-all",
              "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-slate-500/20",
              isSubmitting && "opacity-70"
            )}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {isEditMode ? 'Salvar Alterações' : 'Criar Centro'}
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={goNext}
            disabled={isSubmitting}
            className={cn(
              "h-11 px-6 font-medium shadow-lg transition-all",
              "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-slate-500/20"
            )}
          >
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </footer>
  );
}

