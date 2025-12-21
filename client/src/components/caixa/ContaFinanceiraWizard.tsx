import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertTriangle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContaWizardProvider, useContaWizard, ContaFinanceiraFormData } from './wizard/ContaWizardProvider';
import { ContaWizardHeader } from './wizard/ContaWizardHeader';
import { ContaWizardFooter } from './wizard/ContaWizardFooter';
import { ContaWizardStepper } from './wizard/ContaWizardStepper';
import { StepIdentificacao, StepDadosBancarios, StepSaldoInicial, StepExtras, StepRevisao } from './wizard/steps';

interface ContaFinanceiraWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (contaId: string) => void;
  initialData?: Partial<ContaFinanceiraFormData>;
  contaId?: string;
  mode?: 'create' | 'edit';
}

function WizardContent({ onClose, onSuccess }: { onClose: () => void; onSuccess?: (id: string) => void }) {
  const { currentStep, steps, isDirty, submit, saveDraft, totalSteps } = useContaWizard();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);
  
  const handleSubmit = async () => {
    const contaId = await submit();
    if (contaId) {
      onSuccess?.(contaId);
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
      case 'dados-bancarios': return <StepDadosBancarios />;
      case 'saldo-inicial': return <StepSaldoInicial />;
      case 'extras': return <StepExtras />;
      case 'revisao': return <StepRevisao />;
      default: return null;
    }
  };
  
  return (
    <>
      <div className="flex flex-col h-full max-h-[100dvh] bg-zinc-50">
        <ContaWizardHeader onClose={handleClose} />
        
        {/* Skip link for accessibility */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-20 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-lg"
        >
          Pular para o conteúdo principal
        </a>
        
        <div className="flex flex-1 min-h-0">
          <ContaWizardStepper />
          
          <main id="main-content" className="flex-1 overflow-y-auto" role="main">
            {/* Live region for step announcements */}
            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              Etapa {currentStep + 1} de {steps.length}: {steps[currentStep]?.label}
            </div>
            
            <div className="max-w-2xl mx-auto p-6 sm:p-8 py-8 sm:py-10">
              {renderStep()}
            </div>
          </main>
        </div>
        
        <ContaWizardFooter onSubmit={handleSubmit} />
      </div>
      
      {/* Exit Confirmation */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="bg-background rounded-xl p-6 max-w-md mx-4 shadow-2xl">
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

export function ContaFinanceiraWizard({ 
  open, 
  onOpenChange, 
  onSuccess,
  initialData,
  contaId,
  mode = 'create',
}: ContaFinanceiraWizardProps) {
  const handleClose = () => onOpenChange(false);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-none w-screen h-screen p-0 rounded-none sm:rounded-none border-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-label={mode === 'edit' ? 'Editar conta financeira' : 'Cadastro de nova conta financeira'}
        role="dialog"
        aria-modal="true"
      >
        <ContaWizardProvider 
          onSuccess={onSuccess} 
          onCancel={handleClose}
          initialData={initialData}
          contaId={contaId}
          mode={mode}
        >
          <WizardContent onClose={handleClose} onSuccess={onSuccess} />
        </ContaWizardProvider>
      </DialogContent>
    </Dialog>
  );
}

