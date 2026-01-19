import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WizardFooterProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  canProceed?: boolean;
  backLabel?: string;
  nextLabel?: string;
  submitLabel?: string;
  cancelLabel?: string;
  className?: string;
  accentColor?: 'emerald' | 'rose' | 'blue' | 'violet' | 'amber';
}

export function WizardFooter({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  onCancel,
  isSubmitting,
  canProceed = true,
  backLabel = 'Voltar',
  nextLabel = 'Próximo',
  submitLabel = 'Cadastrar',
  cancelLabel = 'Cancelar',
  className,
  accentColor = 'blue',
}: WizardFooterProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const colorClasses = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    rose: 'bg-rose-600 hover:bg-rose-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
    violet: 'bg-violet-600 hover:bg-violet-700',
    amber: 'bg-amber-600 hover:bg-amber-700',
  };

  return (
    <div className={cn('flex items-center justify-between p-4 border-t bg-background', className)}>
      <div>
        {isFirstStep && onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
        ) : (
          <Button variant="outline" onClick={onBack} disabled={isFirstStep}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {backLabel}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Etapa {currentStep + 1} de {totalSteps}
        </span>
      </div>

      <div>
        {isLastStep ? (
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !canProceed}
            className={colorClasses[accentColor]}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        ) : (
          <Button onClick={onNext} disabled={!canProceed} className={colorClasses[accentColor]}>
            {nextLabel}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
