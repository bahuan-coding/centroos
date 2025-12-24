import { ChevronLeft, ChevronRight, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNfseWizard } from './NfseWizardProvider';

interface NfseWizardFooterProps {
  onSubmit: () => void;
}

export function NfseWizardFooter({ onSubmit }: NfseWizardFooterProps) {
  const { currentStep, totalSteps, goBack, goNext, isSubmitting, validateCurrentStep } = useNfseWizard();
  
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;
  
  const handleNext = () => {
    if (validateCurrentStep()) {
      goNext();
    }
  };
  
  return (
    <footer className="flex items-center justify-between px-6 py-4 border-t bg-slate-50">
      <Button
        variant="outline"
        onClick={goBack}
        disabled={isFirstStep || isSubmitting}
        className="gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar
      </Button>
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Etapa {currentStep + 1} de {totalSteps}</span>
      </div>
      
      {isLastStep ? (
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Emitindo...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Emitir NFS-e
            </>
          )}
        </Button>
      ) : (
        <Button onClick={handleNext} disabled={isSubmitting} className="gap-2">
          Próximo
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </footer>
  );
}

