import { Check, Wallet, Building2, PiggyBank, TrendingUp, CreditCard, BookOpen, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { FormField } from '@/components/ui/form-section';
import { useContaWizard, TipoConta } from '../ContaWizardProvider';
import { ContaPendenciasPanel } from '../ContaPendenciasPanel';
import { getBancoByCodigo } from '../../BancoSelect';

const TIPO_CONTA_ICONS: Record<TipoConta, typeof Wallet> = {
  caixa: Wallet,
  conta_corrente: Building2,
  poupanca: PiggyBank,
  aplicacao: TrendingUp,
  cartao: CreditCard,
};

const TIPO_CONTA_LABELS: Record<TipoConta, string> = {
  caixa: 'Caixa',
  conta_corrente: 'Conta Corrente',
  poupanca: 'Poupança',
  aplicacao: 'Aplicação',
  cartao: 'Cartão',
};

export function StepRevisao() {
  const { form, updateField, fieldRefs } = useContaWizard();
  
  const selectedBanco = getBancoByCodigo(form.bancoCodigo);
  const TipoIcon = TIPO_CONTA_ICONS[form.tipo];
  
  const saldoFormatado = parseFloat(form.saldoInicial || '0').toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return (
    <div className="space-y-8">
      {/* Header da etapa */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Revisão e Finalização</h2>
        <p className="text-zinc-500 mt-1">
          Confira os dados e configure o vínculo contábil antes de criar a conta.
        </p>
      </div>
      
      {/* Pendências */}
      <ContaPendenciasPanel />
      
      {/* Card resumo */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-white/70 uppercase tracking-wider">
                {TIPO_CONTA_LABELS[form.tipo]}
              </p>
              <h3 className="text-2xl font-bold mt-1">{form.nome}</h3>
              {selectedBanco && (
                <p className="text-sm text-white/80 mt-0.5">{selectedBanco.nome}</p>
              )}
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <TipoIcon className="h-7 w-7" />
            </div>
          </div>

          {form.tipo !== 'caixa' && (form.agencia || form.contaNumero) && (
            <div className="mt-5 flex gap-6 text-sm">
              {form.agencia && (
                <div>
                  <p className="text-white/60 text-xs">Agência</p>
                  <p className="font-mono text-lg">{form.agencia}</p>
                </div>
              )}
              {form.contaNumero && (
                <div>
                  <p className="text-white/60 text-xs">Conta</p>
                  <p className="font-mono text-lg">
                    {form.contaNumero}{form.contaDigito && `-${form.contaDigito}`}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-white/20 flex justify-between items-end">
            <div>
              <p className="text-white/60 text-xs">Saldo Inicial</p>
              <p className="text-2xl font-bold font-mono">R$ {saldoFormatado}</p>
            </div>
            {form.dataSaldoInicial && (
              <p className="text-xs text-white/60">
                em {new Date(form.dataSaldoInicial + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Vínculo Contábil */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-zinc-900">Vínculo Contábil (Avançado)</h3>
            <p className="text-sm text-zinc-500 mt-1">
              Conecte esta conta ao seu Plano de Contas para gerar lançamentos contábeis automaticamente.
            </p>
          </div>
        </div>
        
        {/* Explicação detalhada */}
        <div className="bg-zinc-50 rounded-lg p-4 text-sm space-y-3">
          <div className="flex items-start gap-2">
            <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-zinc-700">
              <strong className="text-zinc-900">Com vínculo:</strong> Cada movimentação (entrada/saída) 
              gera automaticamente um lançamento de débito e crédito na conta contábil vinculada.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-zinc-700">
              <strong className="text-zinc-900">Sem vínculo:</strong> Você precisará fazer os lançamentos 
              contábeis manualmente para cada movimentação.
            </p>
          </div>
          <p className="text-xs text-zinc-500 pt-2 border-t border-zinc-200">
            Recomendado para instituições que fazem contabilidade formal ou prestação de contas detalhada.
          </p>
        </div>

        <FormField>
          <LabelWithHelp
            htmlFor="contaContabil"
            label="Conta Contábil"
            help="Conta do ativo circulante (grupo 1.1) para lançamentos automáticos de movimentação"
          />
          <Select
            value={form.contaContabilId || 'none'}
            onValueChange={(v) => updateField('contaContabilId', v === 'none' ? '' : v)}
          >
            <SelectTrigger 
              id="contaContabil" 
              ref={(el) => { fieldRefs.current['contaContabil'] = el; }}
              className="h-12"
            >
              <SelectValue placeholder="Selecione a conta contábil..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma (configurar depois)</SelectItem>
              <SelectItem value="1.1.1.01">1.1.1.01 - Caixa</SelectItem>
              <SelectItem value="1.1.1.02">1.1.1.02 - Bancos Conta Movimento</SelectItem>
              <SelectItem value="1.1.1.03">1.1.1.03 - Bancos Conta Poupança</SelectItem>
              <SelectItem value="1.1.2.01">1.1.2.01 - Aplicações Financeiras</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
    </div>
  );
}

