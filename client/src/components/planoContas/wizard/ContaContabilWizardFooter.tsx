import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContaContabilWizard } from './ContaContabilWizardProvider';
import { cn } from '@/lib/utils';

const typeButtonColors: Record<string, string> = {
  ativo: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/20',
  passivo: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-500/20',
  patrimonio_social: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-purple-500/20',
  receita: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/20',
  despesa: 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-500/20',
};

interface ContaContabilWizardFooterProps {
  onSubmit: () => void;
}

export function ContaContabilWizardFooter({ onSubmit }: ContaContabilWizardFooterProps) {
  const { currentStep, totalSteps, goBack, goNext, isDirty, saveDraft, isSaving, isSubmitting, form } = useContaContabilWizard();
  
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const buttonClass = typeButtonColors[form.tipo] || typeButtonColors.despesa;
  
  return (
    <footer 
      className="flex items-center justify-between gap-4 px-6 py-4 border-t border-zinc-100 bg-white" 
      role="navigation" 
      aria-label="Navegação do wizard"
    >
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
              "h-11 px-6 font-medium shadow-lg transition-all text-white",
              buttonClass,
              isSubmitting && "opacity-70"
            )}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                Criando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Criar Conta
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={goNext}
            disabled={isSubmitting}
            className={cn(
              "h-11 px-6 font-medium shadow-lg transition-all text-white",
              buttonClass
            )}
          >
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </footer>
  );
}









