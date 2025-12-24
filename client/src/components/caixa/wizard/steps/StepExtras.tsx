import { Key, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { FormRow, FormField } from '@/components/ui/form-section';
import { MaskedInput } from '@/components/ui/masked-input';
import { useContaWizard, TipoPix } from '../ContaWizardProvider';

const TIPO_PIX_OPTIONS: { value: TipoPix; label: string; placeholder: string }[] = [
  { value: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
  { value: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0001-00' },
  { value: 'email', label: 'E-mail', placeholder: 'financeiro@instituicao.org' },
  { value: 'telefone', label: 'Telefone', placeholder: '(00) 00000-0000' },
  { value: 'aleatoria', label: 'Chave Aleatória', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
];

export function StepExtras() {
  const { form, updateField, errors, fieldRefs } = useContaWizard();
  
  // Get PIX mask type
  const getPixMaskType = (): 'cpf' | 'cnpj' | 'telefone' | 'uuid' | null => {
    switch (form.pixTipo) {
      case 'cpf': return 'cpf';
      case 'cnpj': return 'cnpj';
      case 'telefone': return 'telefone';
      case 'aleatoria': return 'uuid';
      default: return null;
    }
  };
  
  const handleTipoChange = (value: TipoPix) => {
    updateField('pixTipo', value);
    updateField('pixChave', '');
  };
  
  return (
    <div className="space-y-8">
      {/* Header da etapa */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Informações Extras</h2>
        <p className="text-zinc-500 mt-1">
          Configure a chave PIX para facilitar a identificação de depósitos na conciliação.
        </p>
      </div>
      
      {/* Info box */}
      <div className="rounded-xl bg-violet-50 border border-violet-100 p-5">
        <div className="flex gap-4">
          <div className="shrink-0">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
              <Zap className="h-5 w-5 text-violet-600" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-violet-800">Chave PIX é opcional</h3>
            <p className="mt-1 text-sm text-violet-700">
              Cadastrar a chave PIX facilita a identificação automática de depósitos recebidos 
              durante a conciliação bancária. Se não tiver PIX cadastrado, pode pular esta etapa.
            </p>
          </div>
        </div>
      </div>

      {/* Campos de PIX */}
      <FormRow>
        <FormField className="flex-1">
          <LabelWithHelp
            htmlFor="pixTipo"
            label="Tipo da Chave"
            help="Selecione o tipo de chave PIX cadastrada no banco"
          />
          <Select
            value={form.pixTipo || undefined}
            onValueChange={handleTipoChange}
          >
            <SelectTrigger 
              id="pixTipo" 
              ref={(el) => { fieldRefs.current['pixTipo'] = el; }}
              className="h-12"
            >
              <SelectValue placeholder="Selecione o tipo..." />
            </SelectTrigger>
            <SelectContent>
              {TIPO_PIX_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-zinc-400" />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField error={errors.pixChave} className="flex-1">
          <LabelWithHelp
            htmlFor="pixChave"
            label="Chave PIX"
            help="Valor da chave conforme tipo selecionado"
          />
          {getPixMaskType() ? (
            <MaskedInput
              id="pixChave"
              ref={(el) => { fieldRefs.current['pixChave'] = el; }}
              maskType={getPixMaskType()!}
              value={form.pixChave}
              onChange={(val) => updateField('pixChave', val)}
              showValidation
              className="h-12"
              aria-invalid={!!errors.pixChave}
            />
          ) : (
            <Input
              id="pixChave"
              ref={(el) => { fieldRefs.current['pixChave'] = el; }}
              value={form.pixChave}
              onChange={(e) => updateField('pixChave', e.target.value)}
              placeholder={
                form.pixTipo
                  ? TIPO_PIX_OPTIONS.find((o) => o.value === form.pixTipo)?.placeholder
                  : 'Selecione o tipo primeiro'
              }
              disabled={!form.pixTipo}
              className="h-12"
              aria-invalid={!!errors.pixChave}
            />
          )}
          {errors.pixChave && (
            <p className="text-sm text-red-600 mt-1">{errors.pixChave}</p>
          )}
        </FormField>
      </FormRow>
      
      {/* Preview da chave */}
      {form.pixTipo && form.pixChave && (
        <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Chave PIX configurada</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Key className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {TIPO_PIX_OPTIONS.find((o) => o.value === form.pixTipo)?.label}
              </p>
              <p className="text-sm font-mono text-zinc-600">{form.pixChave}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}









