import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertTriangle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlanoContasWizardProvider, usePlanoContasWizard } from './wizard/PlanoContasWizardProvider';
import { PlanoContasWizardHeader } from './wizard/PlanoContasWizardHeader';
import { PlanoContasWizardFooter } from './wizard/PlanoContasWizardFooter';
import { PlanoContasWizardStepper } from './wizard/PlanoContasWizardStepper';
import { RascunhoBanner } from './wizard/RascunhoBanner';
import { StepIdentificacao } from './wizard/steps/StepIdentificacao';
import { StepClassificacao } from './wizard/steps/StepClassificacao';
import { StepDetalhes } from './wizard/steps/StepDetalhes';
import { StepRevisao } from './wizard/steps/StepRevisao';

interface PlanoContasWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId?: string | null;
  onSuccess?: () => void;
}

function WizardContent({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const { currentStep, steps, isDirty, submit, saveDraft } = usePlanoContasWizard();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    const success = await submit();
    setIsSubmitting(false);
    if (success) {
      onSuccess?.();
      onClose();
    }
  };
  
  const handleSaveAndExit = async () => {
    saveDraft();
    onClose();
  };
  
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
      case 'identificacao': return <StepIdentificacao />;
      case 'classificacao': return <StepClassificacao />;
      case 'detalhes': return <StepDetalhes />;
      case 'revisao': return <StepRevisao />;
      default: return null;
    }
  };
  
  return (
    <>
      <div className="flex flex-col h-full bg-white">
        <PlanoContasWizardHeader onClose={handleClose} />
        
        <div className="flex flex-1 overflow-hidden">
          <PlanoContasWizardStepper />
          
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-6 lg:p-8">
              <RascunhoBanner />
              {renderStep()}
            </div>
          </main>
        </div>
        
        <PlanoContasWizardFooter onSubmit={handleSubmit} />
      </div>
      
      {/* Modal de confirmação de saída */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Alterações não salvas</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Você tem alterações que ainda não foram salvas. O que deseja fazer?
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
                variant="outline"
                onClick={handleSaveAndExit}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar rascunho
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

export function PlanoContasWizard({ open, onOpenChange, contaId, onSuccess }: PlanoContasWizardProps) {
  const handleClose = () => onOpenChange(false);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-none w-screen h-screen p-0 rounded-none sm:rounded-none border-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-label="Cadastro de nova conta contábil"
        role="dialog"
        aria-modal="true"
      >
        <PlanoContasWizardProvider contaId={contaId} onSuccess={onSuccess} onCancel={handleClose}>
          <WizardContent onClose={handleClose} onSuccess={onSuccess} />
        </PlanoContasWizardProvider>
      </DialogContent>
    </Dialog>
  );
}

