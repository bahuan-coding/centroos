import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertTriangle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TituloWizardProvider, useTituloWizard } from './wizard/TituloWizardProvider';
import { TituloWizardHeader } from './wizard/TituloWizardHeader';
import { TituloWizardFooter } from './wizard/TituloWizardFooter';
import { TituloWizardStepper } from './wizard/TituloWizardStepper';
import { RascunhoBanner } from './wizard/RascunhoBanner';
import { StepIdentificacao } from './wizard/steps/StepIdentificacao';
import { StepValores } from './wizard/steps/StepValores';
import { StepDatas } from './wizard/steps/StepDatas';
import { StepRevisao } from './wizard/steps/StepRevisao';

interface TituloWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tituloId?: string | null;
  onSuccess?: () => void;
}

function WizardContent({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const { currentStep, steps, isDirty, submit, saveDraft } = useTituloWizard();
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
      case 'valores': return <StepValores />;
      case 'datas': return <StepDatas />;
      case 'revisao': return <StepRevisao />;
      default: return null;
    }
  };
  
  return (
    <>
      <div className="flex flex-col h-full bg-white">
        <TituloWizardHeader onClose={handleClose} />
        
        <div className="flex flex-1 overflow-hidden">
          <TituloWizardStepper />
          
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-6 lg:p-8">
              <RascunhoBanner />
              {renderStep()}
            </div>
          </main>
        </div>
        
        <TituloWizardFooter onSubmit={handleSubmit} />
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

export function TituloWizard({ open, onOpenChange, tituloId, onSuccess }: TituloWizardProps) {
  const handleClose = () => onOpenChange(false);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-none w-screen h-screen p-0 rounded-none sm:rounded-none border-0 gap-0"
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-label="Cadastro de novo título"
        role="dialog"
        aria-modal="true"
      >
        <TituloWizardProvider tituloId={tituloId} onSuccess={onSuccess} onCancel={handleClose}>
          <WizardContent onClose={handleClose} onSuccess={onSuccess} />
        </TituloWizardProvider>
      </DialogContent>
    </Dialog>
  );
}

