import { Wallet, Building2, PiggyBank, TrendingUp, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { FormField } from '@/components/ui/form-section';
import { useContaWizard, TipoConta } from '../ContaWizardProvider';
import { cn } from '@/lib/utils';

const TIPO_CONTA_OPTIONS: { value: TipoConta; label: string; icon: typeof Wallet; description: string }[] = [
  { value: 'caixa', label: 'Caixa', icon: Wallet, description: 'Dinheiro em espécie na tesouraria' },
  { value: 'conta_corrente', label: 'Conta Corrente', icon: Building2, description: 'Conta movimento no banco' },
  { value: 'poupanca', label: 'Poupança', icon: PiggyBank, description: 'Conta de poupança bancária' },
  { value: 'aplicacao', label: 'Aplicação', icon: TrendingUp, description: 'CDB, fundos, investimentos' },
  { value: 'cartao', label: 'Cartão', icon: CreditCard, description: 'Conta de cartão de crédito/débito' },
];

const NOME_SUGESTOES: Record<TipoConta, string[]> = {
  caixa: ['Caixa Geral', 'Caixa Eventos', 'Cofre Tesouraria', 'Caixa Pequeno'],
  conta_corrente: ['BB Conta Movimento', 'Caixa Econômica Principal', 'Itaú Conta Corrente', 'Bradesco C/C'],
  poupanca: ['BB Poupança Reserva', 'Caixa Poupança', 'Poupança Emergência'],
  aplicacao: ['CDB BB 90 dias', 'Fundo DI Bradesco', 'Tesouro Direto', 'Renda Fixa'],
  cartao: ['Cartão Corporativo', 'Visa Institucional', 'Mastercard'],
};

export function StepIdentificacao() {
  const { form, updateField, errors, fieldRefs, setCurrentStep } = useContaWizard();
  
  const handleTipoChange = (tipo: TipoConta) => {
    const oldTipo = form.tipo;
    updateField('tipo', tipo);
    updateField('nome', '');
    
    // Se mudar de/para caixa, resetar step para evitar inconsistências
    if ((oldTipo === 'caixa') !== (tipo === 'caixa')) {
      setCurrentStep(0);
    }
  };
  
  return (
    <div className="space-y-8">
      {/* Header da etapa */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Identificação da Conta</h2>
        <p className="text-zinc-500 mt-1">
          Escolha o tipo e dê um nome para identificar esta conta nos relatórios.
        </p>
      </div>
      
      {/* Tipo de conta */}
      <FormField error={errors.tipo}>
        <LabelWithHelp
          htmlFor="tipo"
          label="Tipo de Conta"
          help="Cada tipo tem características específicas. Caixa é para dinheiro físico, não exige dados bancários."
          required
        />
        <div 
          className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3" 
          role="radiogroup" 
          aria-label="Tipo de conta"
        >
          {TIPO_CONTA_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = form.tipo === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleTipoChange(opt.value)}
                className={cn(
                  'flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2',
                  isSelected
                    ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-500/20'
                    : 'border-zinc-200 hover:border-violet-300 hover:bg-zinc-50'
                )}
              >
                <Icon className={cn('h-6 w-6', isSelected ? 'text-violet-600' : 'text-zinc-400')} />
                <div>
                  <p className={cn('font-semibold text-sm', isSelected ? 'text-violet-700' : 'text-zinc-700')}>{opt.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </FormField>

      {/* Nome da conta */}
      <FormField error={errors.nome}>
        <LabelWithHelp
          htmlFor="nome"
          label="Nome da Conta"
          help="Nome para identificar a conta nos relatórios e listas. Ex: 'Caixa Geral', 'BB Conta Movimento'"
          required
        />
        <p className="text-xs text-zinc-500 mb-2">
          Use um nome descritivo que facilite a identificação, como "BB Conta Principal" ou "Caixa Eventos".
        </p>
        <Input
          id="nome"
          ref={(el) => { fieldRefs.current['nome'] = el; }}
          value={form.nome}
          onChange={(e) => updateField('nome', e.target.value)}
          placeholder="Digite o nome da conta..."
          list="nome-sugestoes"
          className="h-12 text-base"
          autoFocus
          aria-invalid={!!errors.nome}
          aria-describedby={errors.nome ? 'nome-error' : undefined}
        />
        <datalist id="nome-sugestoes">
          {NOME_SUGESTOES[form.tipo]?.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {errors.nome && (
          <p id="nome-error" className="text-sm text-red-600 mt-1">{errors.nome}</p>
        )}
      </FormField>
      
      {/* Preview card */}
      {form.nome && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs text-white/70 uppercase tracking-wider">
                {TIPO_CONTA_OPTIONS.find((t) => t.value === form.tipo)?.label || 'Conta'}
              </p>
              <h3 className="text-xl font-bold mt-1">{form.nome}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              {(() => {
                const TipoIcon = TIPO_CONTA_OPTIONS.find((t) => t.value === form.tipo)?.icon || Wallet;
                return <TipoIcon className="h-6 w-6" />;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

