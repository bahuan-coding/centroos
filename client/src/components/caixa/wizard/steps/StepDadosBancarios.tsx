import { Input } from '@/components/ui/input';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { FormRow, FormField } from '@/components/ui/form-section';
import { MaskedInput } from '@/components/ui/masked-input';
import { BancoSelect, getBancoByCodigo } from '../../BancoSelect';
import { useContaWizard } from '../ContaWizardProvider';

export function StepDadosBancarios() {
  const { form, updateField, errors, fieldRefs } = useContaWizard();
  
  const selectedBanco = getBancoByCodigo(form.bancoCodigo);
  
  return (
    <div className="space-y-8">
      {/* Header da etapa */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Dados Bancários</h2>
        <p className="text-zinc-500 mt-1">
          Informe os dados conforme extrato bancário. Esses dados são usados para identificação na conciliação.
        </p>
      </div>
      
      {/* Banco */}
      <FormField error={errors.bancoCodigo}>
        <LabelWithHelp
          htmlFor="banco"
          label="Banco"
          help="Selecione o banco. Você pode buscar pelo nome, código FEBRABAN ou sigla."
          required
        />
        <p className="text-xs text-zinc-500 mb-2">
          O código FEBRABAN é usado para identificação automática em extratos e conciliações.
        </p>
        <BancoSelect
          value={form.bancoCodigo}
          onChange={(banco) => {
            updateField('bancoCodigo', banco?.codigo || '');
            updateField('bancoNome', banco?.nome || '');
          }}
        />
        {errors.bancoCodigo && (
          <p className="text-sm text-red-600 mt-1">{errors.bancoCodigo}</p>
        )}
      </FormField>

      {/* Agência e Conta */}
      <FormRow>
        <FormField error={errors.agencia} className="flex-1">
          <LabelWithHelp
            htmlFor="agencia"
            label="Agência"
            help="Número da agência com dígito verificador, se houver. Ex: 1234-5"
            required
          />
          <MaskedInput
            id="agencia"
            ref={(el) => { fieldRefs.current['agencia'] = el; }}
            maskType="agencia"
            value={form.agencia}
            onChange={(val) => updateField('agencia', val)}
            showValidation
            className="h-12"
            aria-invalid={!!errors.agencia}
          />
          {errors.agencia && (
            <p className="text-sm text-red-600 mt-1">{errors.agencia}</p>
          )}
        </FormField>

        <div className="flex gap-2 flex-1">
          <FormField error={errors.contaNumero} className="flex-1">
            <LabelWithHelp
              htmlFor="conta"
              label="Conta"
              help="Número da conta sem o dígito verificador"
              required
            />
            <MaskedInput
              id="conta"
              ref={(el) => { fieldRefs.current['contaNumero'] = el; }}
              maskType="conta"
              value={form.contaNumero}
              onChange={(val) => updateField('contaNumero', val)}
              showValidation
              className="h-12"
              aria-invalid={!!errors.contaNumero}
            />
            {errors.contaNumero && (
              <p className="text-sm text-red-600 mt-1">{errors.contaNumero}</p>
            )}
          </FormField>

          <FormField className="w-20">
            <LabelWithHelp htmlFor="digito" label="Dígito" help="Dígito verificador da conta" />
            <Input
              id="digito"
              ref={(el) => { fieldRefs.current['contaDigito'] = el; }}
              value={form.contaDigito}
              onChange={(e) => updateField('contaDigito', e.target.value.slice(0, 2))}
              maxLength={2}
              className="h-12 text-center font-mono text-base"
            />
          </FormField>
        </div>
      </FormRow>
      
      {/* Preview dos dados */}
      {selectedBanco && (
        <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Dados da Conta</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-zinc-500">Banco:</span>{' '}
              <span className="font-mono text-zinc-900">{selectedBanco.codigo}</span>{' '}
              <span className="text-zinc-700">{selectedBanco.nomeReduzido}</span>
            </div>
            {form.agencia && (
              <div>
                <span className="text-zinc-500">Ag:</span>{' '}
                <span className="font-mono text-zinc-900">{form.agencia}</span>
              </div>
            )}
            {form.contaNumero && (
              <div>
                <span className="text-zinc-500">C/C:</span>{' '}
                <span className="font-mono text-zinc-900">
                  {form.contaNumero}{form.contaDigito && `-${form.contaDigito}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}









