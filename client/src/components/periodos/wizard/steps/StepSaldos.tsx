import { usePeriodoWizard } from '../PeriodoWizardProvider';
import { Input } from '@/components/ui/input';
import { FormSection, FormField } from '@/components/ui/form-section';
import { RichPopover } from '@/components/ui/rich-popover';
import { DollarSign, Info, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function StepSaldos() {
  const { form, updateField, errors, fieldRefs, existingPeriods } = usePeriodoWizard();
  
  // Check previous period for saldo hint
  const prevMonth = form.mes ? (form.mes === 1 ? 12 : form.mes - 1) : null;
  const prevYear = form.mes ? (form.mes === 1 ? form.ano - 1 : form.ano) : null;
  const prevPeriod = prevMonth && prevYear 
    ? existingPeriods.find(p => p.month === prevMonth && p.year === prevYear)
    : null;
  
  const isFirstPeriod = existingPeriods.length === 0;
  
  const formatCurrency = (value: string) => {
    // Remove non-numeric except comma and dot
    let v = value.replace(/[^\d,.-]/g, '');
    // Allow only one comma or dot as decimal separator
    const parts = v.split(/[,.]/)
    if (parts.length > 2) {
      v = parts[0] + ',' + parts.slice(1).join('');
    }
    return v;
  };
  
  const handleSaldoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    updateField('saldoAbertura', formatted);
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          Saldo de Abertura
        </h2>
        <p className="text-sm text-muted-foreground">
          Defina o saldo inicial do período. Campo opcional.
        </p>
      </div>
      
      {/* Resumo do período sendo criado */}
      <div className="p-4 rounded-lg bg-zinc-50 border flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
          <Calendar className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Você está criando</p>
          <p className="font-semibold">
            {form.mes ? MESES[form.mes - 1] : '—'} de {form.ano}
          </p>
        </div>
      </div>
      
      {/* Campo de saldo */}
      <FormSection 
        title="Saldo de Abertura (R$)" 
        description="Valor inicial do período, transportado do fechamento anterior"
      >
        <FormField error={errors.saldoAbertura}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label htmlFor="saldoAbertura" className="text-sm font-medium">
              Valor
            </label>
            <RichPopover
              title="O que é o Saldo de Abertura?"
              items={[
                'É o valor inicial do período, vindo do fechamento do período anterior.',
                'Para o primeiro período: use o saldo do balancete de migração (sistemas anteriores) ou zero se estiver começando do zero.',
                'Para períodos subsequentes: o sistema pode sugerir o saldo de fechamento do mês anterior.',
                'Se deixar zerado: o período iniciará sem saldo inicial — indicado apenas para início de uso ou quando o período anterior fechou zerado.',
              ]}
              footer="O saldo de abertura garante a continuidade dos registros contábeis."
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              R$
            </span>
            <Input
              id="saldoAbertura"
              ref={(el) => { fieldRefs.current['saldoAbertura'] = el; }}
              value={form.saldoAbertura}
              onChange={handleSaldoChange}
              placeholder="0,00"
              className={cn(
                "pl-10 font-mono text-lg",
                errors.saldoAbertura && 'border-destructive'
              )}
            />
          </div>
        </FormField>
        
        {/* Nota técnica sobre saldo zero */}
        {(form.saldoAbertura === '' || form.saldoAbertura === '0' || form.saldoAbertura === '0,00') && (
          <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              {isFirstPeriod 
                ? 'Este será o primeiro período. O saldo zerado é aceitável para início de uso.'
                : 'Saldo zerado. Confirme se o período anterior fechou zerado ou se está migrando de outro sistema.'}
            </p>
          </div>
        )}
      </FormSection>
      
      {/* Orientações contextuais */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Quando preencher o saldo:</h4>
        
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="p-4 rounded-lg border bg-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🆕</span>
              <p className="font-medium text-sm">Primeiro período</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Use o saldo do balancete de abertura (migração) ou zero se iniciando do zero.
            </p>
          </div>
          
          <div className="p-4 rounded-lg border bg-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔄</span>
              <p className="font-medium text-sm">Período subsequente</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Use o saldo de fechamento do período anterior para manter continuidade.
            </p>
          </div>
          
          <div className="p-4 rounded-lg border bg-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📥</span>
              <p className="font-medium text-sm">Migração de sistema</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Insira o saldo final do último período fechado no sistema anterior.
            </p>
          </div>
          
          <div className="p-4 rounded-lg border bg-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚠️</span>
              <p className="font-medium text-sm">Sem dados anteriores</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Deixe zerado. O período começará sem saldo inicial.
            </p>
          </div>
        </div>
      </div>
      
      {/* Hint do período anterior */}
      {prevPeriod && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="text-sm font-medium text-amber-800">Dica</p>
              <p className="text-xs text-amber-700 mt-1">
                O período anterior ({MESES[prevMonth! - 1]}/{prevYear}) existe.
                Se ele já foi fechado, considere usar o saldo de fechamento como saldo de abertura.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}













