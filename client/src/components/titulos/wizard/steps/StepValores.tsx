import { useTituloWizard } from '../TituloWizardProvider';
import { Input } from '@/components/ui/input';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { cn } from '@/lib/utils';

export function StepValores() {
  const { form, updateField, errors, valorLiquido, fieldRefs } = useTituloWizard();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };
  
  const original = parseFloat(form.valorOriginal) || 0;
  const desconto = parseFloat(form.valorDesconto) || 0;
  const acrescimo = parseFloat(form.valorAcrescimo) || 0;
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          💰 Valores
        </h2>
        <p className="text-sm text-muted-foreground">
          Defina os valores do título. O valor líquido será calculado automaticamente.
        </p>
      </div>
      
      {/* Valor Original */}
      <FormSection 
        title="Valor Base" 
        description="O valor principal do título, antes de ajustes"
      >
        <FormField error={errors.valorOriginal}>
          <LabelWithHelp 
            label="Valor Original (R$)" 
            help="É o valor base do título, como consta no documento fiscal ou acordo. Descontos e acréscimos serão aplicados sobre este valor."
            required 
          />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              R$
            </span>
            <Input
              ref={(el) => { fieldRefs.current['valorOriginal'] = el; }}
              type="number"
              step="0.01"
              min="0"
              value={form.valorOriginal}
              onChange={(e) => updateField('valorOriginal', e.target.value)}
              placeholder="0,00"
              className={cn("pl-10 text-lg font-semibold", errors.valorOriginal && 'border-destructive')}
            />
          </div>
        </FormField>
      </FormSection>
      
      {/* Desconto e Acréscimo */}
      <FormSection 
        title="Ajustes" 
        description="Aplique descontos ou acréscimos conforme necessário"
        badge={{ text: 'Opcional', variant: 'secondary' }}
      >
        <FormRow>
          <FormField>
            <LabelWithHelp 
              label="Desconto (R$)" 
              help="Redução concedida sobre o valor original. Exemplos: desconto por pagamento antecipado, bonificação, renegociação. O valor é SUBTRAÍDO do original."
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                −
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.valorDesconto}
                onChange={(e) => updateField('valorDesconto', e.target.value)}
                placeholder="0,00"
                className="pl-8"
              />
            </div>
          </FormField>

          <FormField>
            <LabelWithHelp 
              label="Acréscimo (R$)" 
              help="Adicional sobre o valor original. Exemplos: juros por atraso, multa, correção monetária, taxas. O valor é SOMADO ao original."
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                +
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.valorAcrescimo}
                onChange={(e) => updateField('valorAcrescimo', e.target.value)}
                placeholder="0,00"
                className="pl-8"
              />
            </div>
          </FormField>
        </FormRow>
        
        {/* Dica */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          💡 <strong>Quando usar?</strong>
          <ul className="mt-1 ml-4 list-disc space-y-0.5">
            <li><strong>Desconto:</strong> pagamento antecipado, renegociação, fidelidade</li>
            <li><strong>Acréscimo:</strong> juros de mora, multa, correção, taxas extras</li>
          </ul>
        </div>
      </FormSection>
      
      {/* Card Valor Líquido */}
      <div className={cn(
        'p-6 rounded-xl border-2 border-dashed transition-colors',
        valorLiquido > 0 
          ? form.tipo === 'receber' 
            ? 'border-emerald-300 bg-emerald-50' 
            : 'border-rose-300 bg-rose-50'
          : 'border-destructive bg-destructive/10'
      )}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Valor Líquido</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Valor efetivo a {form.tipo === 'receber' ? 'receber' : 'pagar'}
            </p>
          </div>
          <p className={cn(
            'text-3xl font-bold',
            valorLiquido > 0 
              ? form.tipo === 'receber' ? 'text-emerald-700' : 'text-rose-700'
              : 'text-destructive'
          )}>
            {formatCurrency(valorLiquido)}
          </p>
        </div>
        
        {/* Fórmula visual */}
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="px-3 py-1.5 bg-white rounded-lg border font-medium">
            {formatCurrency(original)}
          </span>
          <span className="text-muted-foreground">−</span>
          <span className="px-3 py-1.5 bg-white rounded-lg border text-amber-700">
            {formatCurrency(desconto)}
          </span>
          <span className="text-muted-foreground">+</span>
          <span className="px-3 py-1.5 bg-white rounded-lg border text-blue-700">
            {formatCurrency(acrescimo)}
          </span>
          <span className="text-muted-foreground">=</span>
          <span className={cn(
            "px-3 py-1.5 rounded-lg border-2 font-bold",
            valorLiquido > 0 
              ? form.tipo === 'receber' 
                ? 'bg-emerald-100 border-emerald-300 text-emerald-700' 
                : 'bg-rose-100 border-rose-300 text-rose-700'
              : 'bg-destructive/20 border-destructive text-destructive'
          )}>
            {formatCurrency(valorLiquido)}
          </span>
        </div>
        
        {/* Legenda */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span>Original</span>
          <span className="text-amber-600">− Desconto</span>
          <span className="text-blue-600">+ Acréscimo</span>
          <span className="font-medium">=  Líquido</span>
        </div>
        
        {/* Erro se valor líquido <= 0 */}
        {errors.valorLiquido && (
          <p className="mt-3 text-sm text-destructive font-medium">
            ⚠️ {errors.valorLiquido}
          </p>
        )}
      </div>
    </div>
  );
}

