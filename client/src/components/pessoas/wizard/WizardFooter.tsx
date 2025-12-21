import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWizard } from './WizardProvider';
import { cn } from '@/lib/utils';

interface WizardFooterProps {
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export function WizardFooter({ onSubmit, isSubmitting }: WizardFooterProps) {
  const { currentStep, totalSteps, goBack, goNext, isDirty, saveDraft, isSaving, steps } = useWizard();
  
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const currentStepConfig = steps[currentStep];
  
  return (
    <footer className="flex items-center justify-between gap-4 px-6 py-4 border-t border-zinc-100 bg-white" role="navigation" aria-label="Navegação do wizard">
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
              "h-11 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all",
              isSubmitting && "opacity-70"
            )}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                Cadastrando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Cadastrar Pessoa
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={goNext}
            disabled={isSubmitting}
            className="h-11 px-6 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white font-medium shadow-lg shadow-violet-500/20 transition-all"
          >
            {currentStepConfig?.optional ? 'Pular' : 'Próximo'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </footer>
  );
}

