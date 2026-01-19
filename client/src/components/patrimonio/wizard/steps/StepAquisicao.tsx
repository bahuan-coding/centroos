import { usePatrimonioWizard } from '../PatrimonioWizardProvider';
import { Input } from '@/components/ui/input';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { cn } from '@/lib/utils';

export function StepAquisicao() {
  const { form, updateField, errors, fieldRefs } = usePatrimonioWizard();
  
  const valorAquisicaoNum = parseFloat(form.valorAquisicao) || 0;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          💰 Aquisição
        </h2>
        <p className="text-sm text-muted-foreground">
          Informe a data e o valor de aquisição do bem.
        </p>
      </div>
      
      <FormSection title="Dados Financeiros" icon="📅">
        <FormRow>
          <FormField error={errors.dataAquisicao}>
            <LabelWithHelp
              label="Data de Aquisição"
              help="Data de entrada do bem no patrimônio. Impacta início da depreciação e relatórios históricos."
              required
            />
            <Input
              ref={(el) => { fieldRefs.current.dataAquisicao = el; }}
              type="date"
              value={form.dataAquisicao}
              onChange={(e) => updateField('dataAquisicao', e.target.value)}
              className={cn(errors.dataAquisicao && 'border-destructive')}
            />
          </FormField>
          
          <FormField error={errors.valorAquisicao}>
            <LabelWithHelp
              label="Valor de Aquisição (R$)"
              help="Custo de aquisição conforme ITG 2002. Inclui impostos não recuperáveis e custos de instalação."
              required
            />
            <Input
              ref={(el) => { fieldRefs.current.valorAquisicao = el; }}
              type="number"
              step="0.01"
              min="0"
              value={form.valorAquisicao}
              onChange={(e) => updateField('valorAquisicao', e.target.value)}
              placeholder="0,00"
              className={cn(errors.valorAquisicao && 'border-destructive')}
            />
          </FormField>
        </FormRow>
      </FormSection>
      
      <FormSection title="Dados Complementares" icon="📄" badge={{ text: 'Opcional', variant: 'secondary' }}>
        <FormRow>
          <FormField>
            <LabelWithHelp
              label="Fornecedor"
              help="Quem vendeu o bem. Útil para garantias e histórico."
            />
            <Input
              value={form.fornecedorId}
              onChange={(e) => updateField('fornecedorId', e.target.value)}
              placeholder="Nome do fornecedor"
            />
          </FormField>
          
          <FormField>
            <LabelWithHelp
              label="Número da Nota Fiscal"
              help="Documento de aquisição para comprovação fiscal."
            />
            <Input
              value={form.numeroNotaFiscal}
              onChange={(e) => updateField('numeroNotaFiscal', e.target.value)}
              placeholder="Ex: 123456"
            />
          </FormField>
        </FormRow>
      </FormSection>
      
      {/* Resumo do valor */}
      {valorAquisicaoNum > 0 && (
        <div className="rounded-xl border-2 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-700">Valor de Aquisição</p>
              <p className="text-2xl font-bold text-emerald-800">
                {formatCurrency(valorAquisicaoNum)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-emerald-600">Data</p>
              <p className="font-medium text-emerald-700">
                {form.dataAquisicao 
                  ? new Date(form.dataAquisicao + 'T00:00:00').toLocaleDateString('pt-BR')
                  : '-'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}













