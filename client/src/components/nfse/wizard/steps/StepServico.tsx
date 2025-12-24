import { FileText, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MaskedInput } from '@/components/ui/masked-input';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { useNfseWizard } from '../NfseWizardProvider';

export function StepServico() {
  const { form, updateField, errors } = useNfseWizard();
  
  const valorServicos = parseFloat(form.valorServicos) || 0;
  const valorDeducoes = parseFloat(form.valorDeducoes) || 0;
  const baseCalculo = valorServicos - valorDeducoes;
  
  return (
    <div className="space-y-8">
      <div className="text-center pb-4 border-b">
        <h2 className="text-xl font-semibold text-slate-900">Dados do Serviço</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Descreva o serviço prestado e informe os valores
        </p>
      </div>
      
      <FormSection title="Identificação do Serviço" icon={<FileText className="h-5 w-5" />}>
        <FormField error={errors.codigoServico}>
          <LabelWithHelp
            label="Código do Serviço"
            help="Código municipal do serviço conforme tabela da Prefeitura de SP. Ex: 02496 (Consultoria), 01406 (Desenvolvimento de software)"
            required
          />
          <Input
            value={form.codigoServico}
            onChange={(e) => updateField('codigoServico', e.target.value.replace(/\D/g, ''))}
            placeholder="Ex: 02496"
            maxLength={10}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Consulte a lista de códigos em{' '}
            <a 
              href="https://www.prefeitura.sp.gov.br/cidade/secretarias/fazenda/servicos/iss/index.php?p=3952"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              Lista de Serviços ISS SP
            </a>
          </p>
        </FormField>
        
        <FormField error={errors.discriminacao}>
          <LabelWithHelp
            label="Discriminação dos Serviços"
            help="Descrição detalhada dos serviços prestados. Máximo 2000 caracteres."
            required
          />
          <Textarea
            value={form.discriminacao}
            onChange={(e) => updateField('discriminacao', e.target.value)}
            placeholder="Descreva detalhadamente os serviços prestados..."
            rows={5}
            maxLength={2000}
            className="resize-none"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Seja específico para evitar questionamentos fiscais</span>
            <span>{form.discriminacao.length}/2000</span>
          </div>
        </FormField>
      </FormSection>
      
      <FormSection title="Valores" icon={<DollarSign className="h-5 w-5" />}>
        <FormRow>
          <FormField error={errors.valorServicos}>
            <LabelWithHelp
              label="Valor dos Serviços"
              help="Valor total dos serviços prestados"
              required
            />
            <MaskedInput
              maskType="moeda"
              value={form.valorServicos}
              onChange={(val) => updateField('valorServicos', val)}
              showValidation
            />
          </FormField>
          
          <FormField>
            <LabelWithHelp
              label="Valor das Deduções"
              help="Deduções permitidas por lei (materiais, subempreitadas, etc.)"
            />
            <MaskedInput
              maskType="moeda"
              value={form.valorDeducoes}
              onChange={(val) => updateField('valorDeducoes', val)}
            />
          </FormField>
        </FormRow>
        
        <div className="mt-4 p-4 rounded-lg bg-indigo-50 border border-indigo-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-900">Base de Cálculo</span>
            <span className="text-lg font-bold text-indigo-700">
              {baseCalculo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <p className="text-xs text-indigo-600 mt-1">
            Valor dos serviços - deduções = base de cálculo do ISS
          </p>
        </div>
      </FormSection>
    </div>
  );
}

