import { Calendar, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { FormRow, FormField } from '@/components/ui/form-section';
import { MaskedInput } from '@/components/ui/masked-input';
import { useContaWizard } from '../ContaWizardProvider';

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function StepSaldoInicial() {
  const { form, updateField, errors, fieldRefs } = useContaWizard();
  
  const saldoFormatado = parseFloat(form.saldoInicial || '0').toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return (
    <div className="space-y-8">
      {/* Header da etapa */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Saldo Inicial</h2>
        <p className="text-zinc-500 mt-1">
          Informe o saldo da conta na data em que você começou a usar o sistema.
        </p>
      </div>
      
      {/* Alerta explicativo contador-friendly */}
      <div className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 p-5">
        <div className="flex gap-4">
          <div className="shrink-0">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Info className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-amber-800">Importante para contadores</h3>
            <div className="mt-2 text-sm text-amber-700 space-y-2">
              <p>
                <strong>O que informar:</strong> O saldo real da conta na data em que você começou a usar o Centroos.
              </p>
              <p>
                <strong>Por que:</strong> Este valor será o ponto de partida para calcular o saldo atual. 
                A partir desta data, todos os movimentos (entradas e saídas) serão registrados.
              </p>
              <p>
                <strong>Exemplo prático:</strong> Se a conta tinha R$ 5.000,00 no dia 01/01/2025, 
                informe esse valor e essa data. Movimentos anteriores não precisam ser lançados.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Campos de saldo */}
      <FormRow>
        <FormField error={errors.saldoInicial} className="flex-1">
          <LabelWithHelp
            htmlFor="saldoInicial"
            label="Saldo Inicial (R$)"
            help="Valor do saldo na data de início do controle. Use valores positivos. Se a conta estava zerada, informe 0,00."
            required
          />
          <MaskedInput
            id="saldoInicial"
            ref={(el) => { fieldRefs.current['saldoInicial'] = el; }}
            maskType="moeda"
            value={form.saldoInicial}
            onChange={(val) => updateField('saldoInicial', val)}
            className="h-12 text-lg font-mono"
            aria-invalid={!!errors.saldoInicial}
          />
          {errors.saldoInicial && (
            <p className="text-sm text-red-600 mt-1">{errors.saldoInicial}</p>
          )}
        </FormField>

        <FormField error={errors.dataSaldoInicial} className="flex-1">
          <LabelWithHelp
            htmlFor="dataSaldoInicial"
            label="Data do Saldo"
            help="Data de referência do saldo inicial. Geralmente é o primeiro dia do mês em que você começou a usar o sistema."
            required
          />
          <div className="relative">
            <Input
              id="dataSaldoInicial"
              ref={(el) => { fieldRefs.current['dataSaldoInicial'] = el; }}
              type="date"
              value={form.dataSaldoInicial}
              onChange={(e) => updateField('dataSaldoInicial', e.target.value)}
              max={getTodayDate()}
              className="h-12 text-base"
              aria-invalid={!!errors.dataSaldoInicial}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" />
          </div>
          {errors.dataSaldoInicial && (
            <p className="text-sm text-red-600 mt-1">{errors.dataSaldoInicial}</p>
          )}
        </FormField>
      </FormRow>
      
      {/* Preview do saldo */}
      <div className="rounded-xl bg-zinc-900 text-white p-6">
        <p className="text-xs text-zinc-400 uppercase tracking-wider">Saldo configurado</p>
        <p className="text-3xl font-bold font-mono mt-2">R$ {saldoFormatado}</p>
        {form.dataSaldoInicial && (
          <p className="text-sm text-zinc-400 mt-1">
            em {new Date(form.dataSaldoInicial + 'T12:00:00').toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
      </div>
    </div>
  );
}












