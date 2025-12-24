import { usePatrimonioWizard } from '../PatrimonioWizardProvider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { TrendingDown, Calculator, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StepDepreciacao() {
  const { form, updateField, errors, fieldRefs, depreciacaoMensalEstimada, categoriaConfig } = usePatrimonioWizard();
  
  const valorAquisicaoNum = parseFloat(form.valorAquisicao) || 0;
  const valorResidualNum = parseFloat(form.valorResidual) || 0;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  const temDadosParaEstimativa = valorAquisicaoNum > 0 && form.vidaUtilMeses > 0 && form.metodoDepreciacao === 'linear';
  const vidaUtilAnos = Math.floor(form.vidaUtilMeses / 12);
  const vidaUtilMesesRestantes = form.vidaUtilMeses % 12;
  
  const categoriaAtual = categoriaConfig[form.categoria];
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          📉 Depreciação
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure a vida útil e valor residual para cálculo da depreciação.
        </p>
      </div>
      
      <FormSection title="Parâmetros de Depreciação" icon="⚙️">
        <FormField>
          <LabelWithHelp
            label="Método de Depreciação"
            help="Linear: depreciação constante ao longo da vida útil. Nenhum: bem não deprecia (ex: terrenos)."
          />
          <Select value={form.metodoDepreciacao} onValueChange={(v) => updateField('metodoDepreciacao', v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  <span>Linear (mais comum)</span>
                </div>
              </SelectItem>
              <SelectItem value="nenhum">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">—</span>
                  <span>Não deprecia</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        
        {form.metodoDepreciacao === 'linear' && (
          <FormRow>
            <FormField error={errors.vidaUtilMeses}>
              <LabelWithHelp
                label="Vida Útil (meses)"
                help={`Período em meses que o bem será útil. Exemplos: Veículos 60 meses, Imóveis 300 meses, Informática 60 meses. Sugestão para ${categoriaAtual?.label}: ${categoriaAtual?.vidaUtilPadrao} meses.`}
              />
              <Input
                ref={(el) => { fieldRefs.current.vidaUtilMeses = el; }}
                type="number"
                min="1"
                max="600"
                value={form.vidaUtilMeses}
                onChange={(e) => updateField('vidaUtilMeses', parseInt(e.target.value) || 0)}
                className={cn(errors.vidaUtilMeses && 'border-destructive')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {vidaUtilAnos > 0 && `${vidaUtilAnos} ano${vidaUtilAnos > 1 ? 's' : ''}`}
                {vidaUtilAnos > 0 && vidaUtilMesesRestantes > 0 && ' e '}
                {vidaUtilMesesRestantes > 0 && `${vidaUtilMesesRestantes} mes${vidaUtilMesesRestantes > 1 ? 'es' : ''}`}
              </p>
            </FormField>
            
            <FormField error={errors.valorResidual}>
              <LabelWithHelp
                label="Valor Residual (R$)"
                help="Valor estimado de venda ao final da vida útil. Se zero, bem será totalmente depreciado."
              />
              <Input
                ref={(el) => { fieldRefs.current.valorResidual = el; }}
                type="number"
                step="0.01"
                min="0"
                value={form.valorResidual}
                onChange={(e) => updateField('valorResidual', e.target.value)}
                placeholder="0,00"
                className={cn(errors.valorResidual && 'border-destructive')}
              />
            </FormField>
          </FormRow>
        )}
      </FormSection>
      
      {/* Card de Estimativa de Depreciação */}
      <div className={cn(
        "rounded-xl border-2 p-4",
        temDadosParaEstimativa 
          ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200" 
          : "bg-zinc-50 border-zinc-200"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            temDadosParaEstimativa ? "bg-blue-100" : "bg-zinc-200"
          )}>
            <Calculator className={cn(
              "h-5 w-5",
              temDadosParaEstimativa ? "text-blue-600" : "text-zinc-500"
            )} />
          </div>
          
          <div className="flex-1">
            <h3 className={cn(
              "font-semibold",
              temDadosParaEstimativa ? "text-blue-800" : "text-zinc-600"
            )}>
              Resumo de Depreciação (Estimativa)
            </h3>
            
            {temDadosParaEstimativa ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-blue-600">Depreciação Mensal</p>
                    <p className="text-xl font-bold text-blue-800">
                      {formatCurrency(depreciacaoMensalEstimada)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">Depreciação Anual</p>
                    <p className="text-xl font-bold text-blue-800">
                      {formatCurrency(depreciacaoMensalEstimada * 12)}
                    </p>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-blue-200 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-blue-600">Aquisição</p>
                    <p className="text-sm font-medium">{formatCurrency(valorAquisicaoNum)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">Residual</p>
                    <p className="text-sm font-medium">{formatCurrency(valorResidualNum)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">A Depreciar</p>
                    <p className="text-sm font-medium">{formatCurrency(valorAquisicaoNum - valorResidualNum)}</p>
                  </div>
                </div>
                
                {valorResidualNum >= valorAquisicaoNum && valorAquisicaoNum > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-100 text-amber-800 text-sm">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>Valor residual maior ou igual à aquisição impede depreciação.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2">
                {form.metodoDepreciacao === 'nenhum' ? (
                  <p className="text-sm text-zinc-500">
                    Bem configurado para não depreciar.
                  </p>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Preencha valor de aquisição e vida útil para ver a estimativa.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}










