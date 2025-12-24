import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertTriangle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NfseWizardProvider, useNfseWizard } from './wizard/NfseWizardProvider';
import { NfseWizardHeader } from './wizard/NfseWizardHeader';
import { NfseWizardFooter } from './wizard/NfseWizardFooter';
import { NfseWizardStepper } from './wizard/NfseWizardStepper';
import { StepTomador, StepServico, StepTributacao, StepRevisao } from './wizard/steps';

interface NfseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function WizardContent({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const { currentStep, steps, isDirty, submit, submitResult } = useNfseWizard();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  const handleClose = useCallback(() => {
    if (isDirty && !submitResult?.sucesso) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, submitResult, onClose]);
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    const success = await submit();
    setIsSubmitting(false);
    if (success) {
      // Don't close immediately - show success screen
    }
  };
  
  // Close on success after viewing
  useEffect(() => {
    if (submitResult?.sucesso) {
      // Auto-close after 5 seconds on success
      const timer = setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submitResult, onSuccess, onClose]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);
  
  const currentStepId = steps[currentStep]?.id;
  
  const renderStep = () => {
    switch (currentStepId) {
      case 'tomador': return <StepTomador />;
      case 'servico': return <StepServico />;
      case 'tributacao': return <StepTributacao />;
      case 'revisao': return <StepRevisao />;
      default: return null;
    }
  };
  
  return (
    <>
      <div className="flex flex-col h-full bg-white">
        <NfseWizardHeader onClose={handleClose} />
        
        <div className="flex flex-1 overflow-hidden">
          <NfseWizardStepper />
          
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-6 lg:p-8">
              {renderStep()}
            </div>
          </main>
        </div>
        
        {!submitResult?.sucesso && (
          <NfseWizardFooter onSubmit={handleSubmit} />
        )}
      </div>
      
      {/* Exit confirmation modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Sair sem emitir?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Os dados preenchidos serão perdidos. Deseja realmente sair?
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1"
              >
                Continuar editando
              </Button>
              <Button
                variant="destructive"
                onClick={onClose}
                className="flex-1"
              >
                Sair sem salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function NfseWizard({ open, onOpenChange, onSuccess }: NfseWizardProps) {
  const handleClose = () => onOpenChange(false);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-none w-screen h-screen p-0 rounded-none sm:rounded-none border-0 gap-0"
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-label="Emitir NFS-e"
        role="dialog"
        aria-modal="true"
      >
        <NfseWizardProvider onSuccess={onSuccess} onCancel={handleClose}>
          <WizardContent onClose={handleClose} onSuccess={onSuccess} />
        </NfseWizardProvider>
      </DialogContent>
    </Dialog>
  );
}

