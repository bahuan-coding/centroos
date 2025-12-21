import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertTriangle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WizardProvider, useWizard } from './wizard/WizardProvider';
import { WizardHeader } from './wizard/WizardHeader';
import { WizardFooter } from './wizard/WizardFooter';
import { WizardStepper } from './wizard/WizardStepper';
import { StepIdentificacao } from './wizard/steps/StepIdentificacao';
import { StepContatos } from './wizard/steps/StepContatos';
import { StepEnderecos } from './wizard/steps/StepEnderecos';
import { StepComplementos } from './wizard/steps/StepComplementos';
import { StepMediunidade } from './wizard/steps/StepMediunidade';
import { StepRevisao } from './wizard/steps/StepRevisao';

interface PessoaWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (pessoaId: string) => void;
}

function WizardContent({ onClose, onSuccess }: { onClose: () => void; onSuccess?: (id: string) => void }) {
  const { currentStep, steps, isDirty, submit, saveDraft } = useWizard();
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
    const pessoaId = await submit();
    setIsSubmitting(false);
    if (pessoaId) {
      onSuccess?.(pessoaId);
      onClose();
    }
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
      case 'contatos': return <StepContatos />;
      case 'enderecos': return <StepEnderecos />;
      case 'complementos': return <StepComplementos />;
      case 'mediunidade': return <StepMediunidade />;
      case 'revisao': return <StepRevisao />;
      default: return null;
    }
  };
  
  return (
    <>
      <div className="flex flex-col h-full max-h-[100dvh] bg-zinc-50">
        <WizardHeader onClose={handleClose} />
        
        <div className="flex flex-1 min-h-0">
          <WizardStepper />
          
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto p-8 py-10">
              {renderStep()}
            </div>
          </main>
        </div>
        
        <WizardFooter onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>
      
      {/* Exit Confirmation */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="bg-background rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
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
                className="flex-1"
                onClick={() => {
                  setShowExitConfirm(false);
                  onClose();
                }}
              >
                Sair sem salvar
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={async () => {
                  await saveDraft();
                  setShowExitConfirm(false);
                  onClose();
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar e sair
              </Button>
              <Button 
                className="flex-1"
                onClick={() => setShowExitConfirm(false)}
              >
                Continuar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function PessoaWizard({ open, onOpenChange, onSuccess }: PessoaWizardProps) {
  const handleClose = () => onOpenChange(false);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-none w-screen h-screen p-0 rounded-none sm:rounded-none border-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-label="Cadastro de nova pessoa"
        role="dialog"
        aria-modal="true"
      >
        <WizardProvider onSuccess={onSuccess} onCancel={handleClose}>
          <WizardContent onClose={handleClose} onSuccess={onSuccess} />
        </WizardProvider>
      </DialogContent>
    </Dialog>
  );
}

