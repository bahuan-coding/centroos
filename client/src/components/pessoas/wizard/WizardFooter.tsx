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
    <footer className="sticky bottom-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" role="navigation" aria-label="Navegação do wizard">
      <div className="flex items-center gap-2">
        {!isFirstStep && (
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={isSubmitting}
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
            className="text-muted-foreground hidden sm:flex"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar rascunho
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {/* Step indicator mobile */}
        <span className="text-xs text-muted-foreground sm:hidden">
          {currentStep + 1}/{totalSteps}
        </span>
        
        {isLastStep ? (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className={cn(
              "bg-emerald-600 hover:bg-emerald-700 min-w-[140px]",
              isSubmitting && "opacity-70"
            )}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Cadastrando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Cadastrar
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={goNext}
            disabled={isSubmitting}
            className="bg-violet-600 hover:bg-violet-700 min-w-[120px]"
          >
            {currentStepConfig?.optional ? 'Pular' : 'Próximo'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </footer>
  );
}

