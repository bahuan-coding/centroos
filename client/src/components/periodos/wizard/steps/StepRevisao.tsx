import { usePeriodoWizard } from '../PeriodoWizardProvider';
import { RichPopover } from '@/components/ui/rich-popover';
import { CheckCircle2, Calendar, DollarSign, AlertTriangle, Info, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function StepRevisao() {
  const { form, warnings, goToStep, errors } = usePeriodoWizard();
  
  const saldoNum = parseFloat(form.saldoAbertura.replace(',', '.')) || 0;
  const hasErrors = Object.keys(errors).length > 0;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          Revisão e Confirmação
        </h2>
        <p className="text-sm text-muted-foreground">
          Confira os dados antes de criar o período contábil.
        </p>
      </div>
      
      {/* Resumo principal */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-white shadow-lg border border-emerald-100">
            <Calendar className="h-7 w-7 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-emerald-700">Novo período contábil</p>
            <p className="text-2xl font-bold text-emerald-900">
              {form.mes ? MESES[form.mes - 1] : '—'} de {form.ano}
            </p>
          </div>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Competência */}
          <div className="p-4 rounded-lg bg-white/80 border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-700">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Competência</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => goToStep(0)}
                className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Editar
              </Button>
            </div>
            <p className="text-lg font-semibold">
              {form.mes ? `${String(form.mes).padStart(2, '0')}/${form.ano}` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {form.mes ? MESES[form.mes - 1] : ''} de {form.ano}
            </p>
          </div>
          
          {/* Saldo de Abertura */}
          <div className="p-4 rounded-lg bg-white/80 border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-700">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-medium">Saldo de Abertura</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => goToStep(1)}
                className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Editar
              </Button>
            </div>
            <p className={cn(
              "text-lg font-semibold",
              saldoNum === 0 ? "text-muted-foreground" : "text-foreground"
            )}>
              {formatCurrency(saldoNum)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {saldoNum === 0 ? 'Sem saldo inicial' : 'Valor inicial do período'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Warnings/Pendências */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Avisos
          </h4>
          <div className="space-y-2">
            {warnings.map((warning, i) => (
              <button
                key={i}
                type="button"
                onClick={() => warning.step !== undefined && goToStep(warning.step)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-colors",
                  warning.tipo === 'warning' 
                    ? "bg-amber-50 border-amber-200 hover:bg-amber-100" 
                    : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                )}
              >
                <div className="flex items-start gap-2">
                  {warning.tipo === 'warning' 
                    ? <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    : <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm",
                      warning.tipo === 'warning' ? "text-amber-800" : "text-blue-800"
                    )}>
                      {warning.mensagem}
                    </p>
                    {warning.step !== undefined && (
                      <p className={cn(
                        "text-xs mt-1 underline",
                        warning.tipo === 'warning' ? "text-amber-600" : "text-blue-600"
                      )}>
                        Clique para revisar
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Errors */}
      {hasErrors && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">Pendências obrigatórias</p>
              <ul className="text-sm text-destructive/80 mt-2 space-y-1">
                {Object.entries(errors).map(([key, msg]) => (
                  <li key={key}>• {msg}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* O que acontece ao criar */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">O que acontece ao criar o período?</h4>
          <RichPopover
            title="Fluxo após criação"
            items={[
              'O período será criado com status "Aberto".',
              'Ficará visível na timeline de períodos.',
              'Você poderá criar lançamentos vinculados a ele.',
              'Poderá fechar o período quando os lançamentos estiverem completos.',
              'Ao fechar, o saldo será calculado e transportado para o próximo período.',
            ]}
            footer="Períodos fechados não aceitam novos lançamentos sem reabertura."
          />
        </div>
        <ul className="text-xs text-muted-foreground space-y-2">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            O período aparecerá na timeline e ficará disponível para lançamentos
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Status inicial: <span className="font-medium text-emerald-600">Aberto</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Você poderá fechar o período a qualquer momento após conclusão dos lançamentos
          </li>
        </ul>
      </div>
      
      {/* Tudo OK */}
      {!hasErrors && warnings.length === 0 && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-800">Tudo pronto!</p>
              <p className="text-sm text-emerald-700">
                Clique em "Criar Período" para finalizar.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}












