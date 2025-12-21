import { ArrowLeft, ArrowRight, Check, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContaWizard } from './ContaWizardProvider';
import { cn } from '@/lib/utils';

interface ContaWizardFooterProps {
  onSubmit: () => void;
}

export function ContaWizardFooter({ onSubmit }: ContaWizardFooterProps) {
  const { currentStep, totalSteps, goBack, goNext, isDirty, saveDraft, isSaving, isSubmitting, steps, mode } = useContaWizard();
  
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const currentStepConfig = steps[currentStep];
  
  return (
    <footer 
      className="flex items-center justify-between gap-4 px-6 py-4 border-t border-zinc-100 bg-white shrink-0" 
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
            aria-label="Voltar para etapa anterior"
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
            aria-label="Salvar rascunho do formulário"
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
              "h-11 px-6 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-medium shadow-lg shadow-violet-500/20 transition-all",
              isSubmitting && "opacity-70"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {mode === 'edit' ? 'Salvando...' : 'Criando...'}
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {mode === 'edit' ? 'Salvar Alterações' : 'Criar Conta'}
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={goNext}
            disabled={isSubmitting}
            className="h-11 px-6 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-medium shadow-lg shadow-violet-500/20 transition-all"
          >
            {currentStepConfig?.optional ? 'Pular' : 'Próximo'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </footer>
  );
}

