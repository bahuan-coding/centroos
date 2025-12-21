import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertTriangle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  ProjetoWizardProvider, 
  useProjetoWizard,
  ProjetoFormData 
} from './wizard-projeto/ProjetoWizardProvider';
import { ProjetoWizardHeader } from './wizard-projeto/ProjetoWizardHeader';
import { ProjetoWizardFooter } from './wizard-projeto/ProjetoWizardFooter';
import { ProjetoWizardStepper } from './wizard-projeto/ProjetoWizardStepper';
import { RascunhoBanner } from './wizard-projeto/RascunhoBanner';
import { 
  StepIdentificacao, 
  StepEscopo, 
  StepCronograma, 
  StepOrcamento, 
  StepVinculos, 
  StepRevisao 
} from './wizard-projeto/steps';

interface ProjetoWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projetoId?: string | null;
  initialData?: Partial<ProjetoFormData>;
  onSuccess?: () => void;
}

function WizardContent({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const { currentStep, steps, isDirty, submit, saveDraft } = useProjetoWizard();
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
      case 'escopo': return <StepEscopo />;
      case 'cronograma': return <StepCronograma />;
      case 'orcamento': return <StepOrcamento />;
      case 'vinculos': return <StepVinculos />;
      case 'revisao': return <StepRevisao />;
      default: return null;
    }
  };
  
  return (
    <>
      <div className="flex flex-col h-full bg-white">
        <ProjetoWizardHeader onClose={handleClose} />
        
        <div className="flex-1 flex min-h-0">
          <ProjetoWizardStepper />
          
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-zinc-50/50">
            <div className="max-w-2xl mx-auto">
              <RascunhoBanner />
              {renderStep()}
            </div>
          </main>
        </div>
        
        <ProjetoWizardFooter onSubmit={handleSubmit} />
      </div>
      
      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-dialog-title"
          aria-describedby="exit-dialog-description"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100" aria-hidden="true">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 id="exit-dialog-title" className="font-semibold text-lg">Alterações não salvas</h3>
                <p id="exit-dialog-description" className="text-sm text-muted-foreground mt-1">
                  Você tem alterações que não foram salvas. Deseja salvar como rascunho?
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button onClick={handleSaveAndExit} className="w-full">
                <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                Salvar rascunho e sair
              </Button>
              <Button 
                variant="outline" 
                onClick={() => { setShowExitConfirm(false); onClose(); }}
                className="w-full"
              >
                Descartar e sair
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setShowExitConfirm(false)}
                className="w-full"
              >
                Continuar editando
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ProjetoWizard({ 
  open, 
  onOpenChange, 
  projetoId,
  initialData,
  onSuccess,
}: ProjetoWizardProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-none w-screen h-screen p-0 gap-0 rounded-none sm:rounded-none"
        hideCloseButton
      >
        <ProjetoWizardProvider
          projetoId={projetoId}
          initialData={initialData}
          onSuccess={onSuccess}
        >
          <WizardContent 
            onClose={() => onOpenChange(false)} 
            onSuccess={onSuccess}
          />
        </ProjetoWizardProvider>
      </DialogContent>
    </Dialog>
  );
}

