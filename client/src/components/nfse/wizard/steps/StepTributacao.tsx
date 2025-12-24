import { Calculator, Hash, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNfseWizard, type TipoTributacao } from '../NfseWizardProvider';

const TIPOS_TRIBUTACAO: { value: TipoTributacao; label: string; description: string; color: string }[] = [
  { value: 'T', label: 'Tributado em SP', description: 'ISS devido em São Paulo', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'F', label: 'Fora de SP', description: 'Serviço prestado fora do município', color: 'bg-blue-100 text-blue-800' },
  { value: 'A', label: 'Isento', description: 'Requer cadastro no GBF', color: 'bg-amber-100 text-amber-800' },
  { value: 'B', label: 'Imune', description: 'Imunidade tributária', color: 'bg-purple-100 text-purple-800' },
  { value: 'M', label: 'Suspenso', description: 'Exigibilidade suspensa', color: 'bg-orange-100 text-orange-800' },
  { value: 'N', label: 'Não Incidente', description: 'Não há incidência de ISS', color: 'bg-gray-100 text-gray-800' },
  { value: 'X', label: 'Exportação', description: 'Serviço exportado', color: 'bg-cyan-100 text-cyan-800' },
];

export function StepTributacao() {
  const { form, updateField, errors, warnings } = useNfseWizard();
  
  const selectedTipo = TIPOS_TRIBUTACAO.find(t => t.value === form.tributacao);
  const valorServicos = parseFloat(form.valorServicos) || 0;
  const valorDeducoes = parseFloat(form.valorDeducoes) || 0;
  const baseCalculo = valorServicos - valorDeducoes;
  const aliquota = parseFloat(form.aliquota) || 0;
  const valorISS = baseCalculo * aliquota;
  
  const showAliquotaWarning = warnings.some(w => w.campo === 'tributacao');
  
  return (
    <div className="space-y-8">
      <div className="text-center pb-4 border-b">
        <h2 className="text-xl font-semibold text-slate-900">Tributação e ISS</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure a tributação e identifique o RPS
        </p>
      </div>
      
      <FormSection title="Identificação do RPS" icon={<Hash className="h-5 w-5" />}>
        <FormRow>
          <FormField>
            <LabelWithHelp
              label="Série do RPS"
              help="Série do Recibo Provisório de Serviços. Padrão: NF"
              required
            />
            <Input
              value={form.serieRPS}
              onChange={(e) => updateField('serieRPS', e.target.value.toUpperCase())}
              placeholder="NF"
              maxLength={5}
              className="font-mono"
            />
          </FormField>
          
          <FormField error={errors.numeroRPS}>
            <LabelWithHelp
              label="Número do RPS"
              help="Número sequencial do RPS. Deve ser único por série."
              required
            />
            <Input
              type="number"
              value={form.numeroRPS}
              onChange={(e) => updateField('numeroRPS', e.target.value)}
              placeholder="1"
              min={1}
              className="font-mono"
            />
          </FormField>
        </FormRow>
        
        <FormField>
          <LabelWithHelp
            label="Data de Emissão"
            help="Data em que o serviço foi prestado"
            required
          />
          <Input
            type="date"
            value={form.dataEmissao}
            onChange={(e) => updateField('dataEmissao', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </FormField>
      </FormSection>
      
      <FormSection title="Tipo de Tributação" icon={<Calculator className="h-5 w-5" />}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {TIPOS_TRIBUTACAO.map((tipo) => (
            <button
              key={tipo.value}
              type="button"
              onClick={() => updateField('tributacao', tipo.value)}
              className={cn(
                'p-3 rounded-lg border-2 text-left transition-all',
                form.tributacao === tipo.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <Badge className={cn('mb-1', tipo.color)}>{tipo.value}</Badge>
              <p className="text-sm font-medium">{tipo.label}</p>
              <p className="text-xs text-muted-foreground">{tipo.description}</p>
            </button>
          ))}
        </div>
        
        {showAliquotaWarning && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Atenção</p>
              <p className="text-xs text-amber-700">
                O tipo de tributação "{selectedTipo?.label}" requer cadastro prévio no Sistema de Gestão de Benefícios Fiscais (GBF) da Prefeitura de São Paulo.
              </p>
            </div>
          </div>
        )}
      </FormSection>
      
      <FormSection title="ISS" icon={<Calculator className="h-5 w-5" />}>
        <FormRow>
          <FormField error={errors.aliquota}>
            <LabelWithHelp
              label="Alíquota ISS (%)"
              help="Alíquota do Imposto Sobre Serviços. Varia de 2% a 5% dependendo do serviço."
              required
            />
            <div className="relative">
              <Input
                type="number"
                value={(parseFloat(form.aliquota) * 100 || 0).toString()}
                onChange={(e) => updateField('aliquota', (parseFloat(e.target.value) / 100).toString())}
                placeholder="5"
                min={0}
                max={5}
                step={0.01}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </FormField>
          
          <FormField>
            <LabelWithHelp
              label="ISS Retido"
              help="Marque se o ISS será retido pelo tomador do serviço"
            />
            <div className="flex items-center gap-3 h-10">
              <Switch
                checked={form.issRetido}
                onCheckedChange={(checked) => updateField('issRetido', checked)}
              />
              <Label className="text-sm">
                {form.issRetido ? 'Retido pelo tomador' : 'Não retido'}
              </Label>
            </div>
          </FormField>
        </FormRow>
        
        <div className="mt-4 p-4 rounded-lg bg-slate-50 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Base de Cálculo</span>
            <span className="font-mono">
              {baseCalculo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Alíquota</span>
            <span className="font-mono">{(aliquota * 100).toFixed(2)}%</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">Valor ISS</span>
            <span className="text-lg font-bold text-indigo-600">
              {valorISS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>
      </FormSection>
      
      <FormSection title="Retenções Federais (Opcional)" description="Preencha apenas se houver retenção">
        <FormRow>
          <FormField>
            <LabelWithHelp label="PIS" help="Contribuição PIS retida" />
            <MaskedInput
              maskType="moeda"
              value={form.valorPIS}
              onChange={(val) => updateField('valorPIS', val)}
            />
          </FormField>
          <FormField>
            <LabelWithHelp label="COFINS" help="Contribuição COFINS retida" />
            <MaskedInput
              maskType="moeda"
              value={form.valorCOFINS}
              onChange={(val) => updateField('valorCOFINS', val)}
            />
          </FormField>
        </FormRow>
        <FormRow>
          <FormField>
            <LabelWithHelp label="INSS" help="Contribuição INSS retida" />
            <MaskedInput
              maskType="moeda"
              value={form.valorINSS}
              onChange={(val) => updateField('valorINSS', val)}
            />
          </FormField>
          <FormField>
            <LabelWithHelp label="IR" help="Imposto de Renda retido" />
            <MaskedInput
              maskType="moeda"
              value={form.valorIR}
              onChange={(val) => updateField('valorIR', val)}
            />
          </FormField>
        </FormRow>
        <FormField>
          <LabelWithHelp label="CSLL" help="Contribuição Social sobre Lucro Líquido retida" />
          <MaskedInput
            maskType="moeda"
            value={form.valorCSLL}
            onChange={(val) => updateField('valorCSLL', val)}
          />
        </FormField>
      </FormSection>
    </div>
  );
}

