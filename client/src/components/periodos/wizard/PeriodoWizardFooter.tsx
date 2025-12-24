import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePeriodoWizard } from './PeriodoWizardProvider';
import { RichPopover } from '@/components/ui/rich-popover';
import { cn } from '@/lib/utils';

interface PeriodoWizardFooterProps {
  onSubmit: () => void;
}

export function PeriodoWizardFooter({ onSubmit }: PeriodoWizardFooterProps) {
  const { currentStep, totalSteps, goBack, goNext, isDirty, saveDraft, isSaving, isSubmitting, lastSaved, errors } = usePeriodoWizard();
  
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const hasErrors = Object.keys(errors).length > 0;
  
  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const diff = Date.now() - lastSaved.getTime();
    if (diff < 60000) return 'agora';
    if (diff < 3600000) return `há ${Math.floor(diff / 60000)} min`;
    return `há ${Math.floor(diff / 3600000)}h`;
  };
  
  return (
    <footer 
      className="flex items-center justify-between gap-4 px-6 py-4 border-t border-zinc-100 bg-white shrink-0" 
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
            aria-label="Voltar para etapa anterior"
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
            aria-label="Salvar rascunho do formulário"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar rascunho
          </Button>
        )}
        
        {lastSaved && !isDirty && (
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
            <Check className="h-3.5 w-3.5" />
            Rascunho salvo {formatLastSaved()}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {isLastStep ? (
          <div className="flex items-center gap-2">
            <RichPopover
              title="O que acontece ao criar o período?"
              items={[
                'O período será criado com status "Aberto" e ficará disponível para lançamentos.',
                'O saldo de abertura será registrado como ponto inicial do período.',
                'Você poderá visualizar o período na timeline e acessar seus lançamentos.',
                'Para fechar o período, acesse os detalhes e clique em "Fechar Período".',
              ]}
              footer="Períodos fechados não aceitam novos lançamentos sem reabertura."
            />
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting || hasErrors}
              className={cn(
                "h-11 px-6 font-medium shadow-lg transition-all",
                "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/20",
                (isSubmitting || hasErrors) && "opacity-70"
              )}
              aria-label="Criar novo período contábil"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                  Criando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Criar Período
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            onClick={goNext}
            disabled={isSubmitting || hasErrors}
            className={cn(
              "h-11 px-6 font-medium shadow-lg transition-all",
              "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/20",
              hasErrors && "opacity-70"
            )}
            aria-label="Avançar para próxima etapa"
          >
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </footer>
  );
}










