import { useState, useMemo, useEffect } from 'react';
import { Wallet, Building2, PiggyBank, TrendingUp, CreditCard, Key, Calendar, Check, Loader2 } from 'lucide-react';
import { DraftIndicator, useAutosave } from '@/components/ui/draft-indicator';
import { DraftRecoveryBanner, FieldValidation, VALIDATION_MESSAGES } from '@/components/ui/validation-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { FormRow, FormField } from '@/components/ui/form-section';
import { MaskedInput } from '@/components/ui/masked-input';
import { BancoSelect, getBancoByCodigo } from './BancoSelect';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

// Types
type TipoConta = 'caixa' | 'conta_corrente' | 'poupanca' | 'aplicacao' | 'cartao';
type TipoPix = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';

interface ContaFinanceiraFormData {
  tipo: TipoConta;
  nome: string;
  bancoCodigo: string;
  bancoNome: string;
  agencia: string;
  contaNumero: string;
  contaDigito: string;
  pixTipo: TipoPix | '';
  pixChave: string;
  saldoInicial: string;
  dataSaldoInicial: string;
  contaContabilId: string;
}

interface ContaFinanceiraFormProps {
  contaId?: string;
  initialData?: Partial<ContaFinanceiraFormData>;
  onSuccess?: (contaId: string) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

// Constants
const TIPO_CONTA_OPTIONS: { value: TipoConta; label: string; icon: typeof Wallet; description: string }[] = [
  { value: 'caixa', label: 'Caixa', icon: Wallet, description: 'Dinheiro em espécie na tesouraria' },
  { value: 'conta_corrente', label: 'Conta Corrente', icon: Building2, description: 'Conta movimento no banco' },
  { value: 'poupanca', label: 'Poupança', icon: PiggyBank, description: 'Conta de poupança bancária' },
  { value: 'aplicacao', label: 'Aplicação', icon: TrendingUp, description: 'CDB, fundos, investimentos' },
  { value: 'cartao', label: 'Cartão', icon: CreditCard, description: 'Conta de cartão de crédito/débito' },
];

const TIPO_PIX_OPTIONS: { value: TipoPix; label: string; placeholder: string }[] = [
  { value: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
  { value: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0001-00' },
  { value: 'email', label: 'E-mail', placeholder: 'financeiro@instituicao.org' },
  { value: 'telefone', label: 'Telefone', placeholder: '(00) 00000-0000' },
  { value: 'aleatoria', label: 'Chave Aleatória', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
];

const NOME_SUGESTOES: Record<TipoConta, string[]> = {
  caixa: ['Caixa Geral', 'Caixa Eventos', 'Cofre Tesouraria', 'Caixa Pequeno'],
  conta_corrente: ['BB Conta Movimento', 'Caixa Econômica Principal', 'Itaú Conta Corrente', 'Bradesco C/C'],
  poupanca: ['BB Poupança Reserva', 'Caixa Poupança', 'Poupança Emergência'],
  aplicacao: ['CDB BB 90 dias', 'Fundo DI Bradesco', 'Tesouro Direto', 'Renda Fixa'],
  cartao: ['Cartão Corporativo', 'Visa Institucional', 'Mastercard'],
};

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function ContaFinanceiraForm({
  contaId,
  initialData,
  onSuccess,
  onCancel,
  mode = 'create',
}: ContaFinanceiraFormProps) {
  const [form, setForm] = useState<ContaFinanceiraFormData>({
    tipo: initialData?.tipo || 'conta_corrente',
    nome: initialData?.nome || '',
    bancoCodigo: initialData?.bancoCodigo || '',
    bancoNome: initialData?.bancoNome || '',
    agencia: initialData?.agencia || '',
    contaNumero: initialData?.contaNumero || '',
    contaDigito: initialData?.contaDigito || '',
    pixTipo: initialData?.pixTipo || '',
    pixChave: initialData?.pixChave || '',
    saldoInicial: initialData?.saldoInicial || '0',
    dataSaldoInicial: initialData?.dataSaldoInicial || getTodayDate(),
    contaContabilId: initialData?.contaContabilId || '',
  });

  const [openSections, setOpenSections] = useState<string[]>(['identificacao', 'dados-bancarios', 'saldo-inicial']);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  
  // Autosave functionality
  const draftKey = contaId ? `conta_${contaId}` : 'conta_new';
  const { lastSaved, isSaving, clearDraft, loadDraft, hasDraft } = useAutosave(form, draftKey, 2000);
  
  // Check for existing draft on mount
  useEffect(() => {
    if (mode === 'create' && hasDraft() && !initialData) {
      setShowDraftBanner(true);
    }
  }, [mode, initialData]);
  
  const handleRecoverDraft = () => {
    const draft = loadDraft();
    if (draft) {
      setForm(draft);
      setShowDraftBanner(false);
    }
  };
  
  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftBanner(false);
  };
  
  const utils = trpc.useUtils();
  
  const createMutation = trpc.contasFinanceiras.create.useMutation({
    onSuccess: (data) => {
      clearDraft();
      utils.contasFinanceiras.invalidate();
      toast.success('Conta criada com sucesso!');
      onSuccess?.(data.id);
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao criar conta');
    },
  });
  
  const updateMutation = trpc.contasFinanceiras.update.useMutation({
    onSuccess: () => {
      clearDraft();
      utils.contasFinanceiras.invalidate();
      toast.success('Conta atualizada com sucesso!');
      onSuccess?.(contaId!);
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao atualizar conta');
    },
  });
  
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Derived state
  const isCaixa = form.tipo === 'caixa';
  const needsBankData = !isCaixa;
  const selectedBanco = useMemo(() => getBancoByCodigo(form.bancoCodigo), [form.bancoCodigo]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.nome.trim() || form.nome.length < 2) {
      newErrors.nome = 'Nome deve ter no mínimo 2 caracteres';
    }

    if (needsBankData) {
      if (!form.bancoCodigo) {
        newErrors.bancoCodigo = 'Selecione o banco';
      }
      if (!form.agencia || form.agencia.length < 4) {
        newErrors.agencia = 'Informe a agência';
      }
      if (!form.contaNumero || form.contaNumero.length < 4) {
        newErrors.contaNumero = 'Informe o número da conta';
      }
    }

    if (form.pixTipo && !form.pixChave) {
      newErrors.pixChave = 'Informe a chave PIX';
    }

    if (!form.saldoInicial) {
      newErrors.saldoInicial = 'Informe o saldo inicial';
    }

    if (!form.dataSaldoInicial) {
      newErrors.dataSaldoInicial = 'Informe a data do saldo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      // Focus on first field with error
      const firstErrorField = document.querySelector('[aria-invalid="true"], .text-destructive')?.closest('.space-y-1\\.5')?.querySelector('input, select, textarea') as HTMLElement | null;
      if (firstErrorField) {
        firstErrorField.focus();
      }
      toast.error('Verifique os campos destacados e tente novamente');
      return;
    }

    const payload = {
      tipo: form.tipo,
      nome: form.nome,
      bancoCodigo: form.bancoCodigo || undefined,
      bancoNome: form.bancoNome || undefined,
      agencia: form.agencia || undefined,
      contaNumero: form.contaNumero || undefined,
      contaDigito: form.contaDigito || undefined,
      pixTipo: form.pixTipo || undefined,
      pixChave: form.pixChave || undefined,
      saldoInicial: form.saldoInicial,
      dataSaldoInicial: form.dataSaldoInicial,
      contaContabilId: form.contaContabilId || undefined,
    };

    if (mode === 'edit' && contaId) {
      updateMutation.mutate({
        id: contaId,
        nome: payload.nome,
        pixTipo: payload.pixTipo as any,
        pixChave: payload.pixChave,
        contaContabilId: payload.contaContabilId,
      });
    } else {
      createMutation.mutate(payload as any);
    }
  };

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

  const TipoIcon = TIPO_CONTA_OPTIONS.find((t) => t.value === form.tipo)?.icon || Wallet;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Draft Recovery Banner */}
      {showDraftBanner && (
        <DraftRecoveryBanner
          entityName={form.nome || 'Nova Conta'}
          onRecover={handleRecoverDraft}
          onDiscard={handleDiscardDraft}
        />
      )}
      
      {/* Preview Card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs text-white/70 uppercase tracking-wider">
              {TIPO_CONTA_OPTIONS.find((t) => t.value === form.tipo)?.label || 'Conta'}
            </p>
            <h3 className="text-xl font-bold mt-1">{form.nome || 'Nome da Conta'}</h3>
            {selectedBanco && (
              <p className="text-sm text-white/80 mt-0.5">{selectedBanco.nome}</p>
            )}
          </div>
          <div className="p-2 bg-white/20 rounded-lg">
            <TipoIcon className="h-6 w-6" />
          </div>
        </div>

        {needsBankData && (form.agencia || form.contaNumero) && (
          <div className="mt-4 flex gap-4 text-sm">
            {form.agencia && (
              <div>
                <p className="text-white/60 text-xs">Agência</p>
                <p className="font-mono">{form.agencia}</p>
              </div>
            )}
            {form.contaNumero && (
              <div>
                <p className="text-white/60 text-xs">Conta</p>
                <p className="font-mono">
                  {form.contaNumero}{form.contaDigito && `-${form.contaDigito}`}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-white/20 flex justify-between items-end">
          <div>
            <p className="text-white/60 text-xs">Saldo Inicial</p>
            <p className="text-lg font-bold font-mono">
              R$ {parseFloat(form.saldoInicial || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          {form.dataSaldoInicial && (
            <p className="text-xs text-white/60">
              em {new Date(form.dataSaldoInicial + 'T12:00:00').toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      </div>

      {/* Form Sections */}
      <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-2">
        {/* Identificação */}
        <AccordionItem value="identificacao" className="border rounded-lg px-4">
          <AccordionTrigger icon="🏦">Identificação</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <FormField error={errors.tipo}>
                <LabelWithHelp
                  htmlFor="tipo"
                  label="Tipo de Conta"
                  help="Selecione o tipo da conta financeira. Cada tipo tem características específicas."
                  required
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {TIPO_CONTA_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = form.tipo === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, tipo: opt.value, nome: '' }))}
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left',
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        )}
                      >
                        <Icon className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                        <div>
                          <p className={cn('font-medium text-sm', isSelected && 'text-primary')}>{opt.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {TIPO_CONTA_OPTIONS.find((t) => t.value === form.tipo)?.description}
                </p>
              </FormField>

              <FormField error={errors.nome}>
                <LabelWithHelp
                  htmlFor="nome"
                  label="Nome da Conta"
                  help="Nome para identificar a conta nos relatórios e listas. Ex: 'Caixa Geral', 'BB Conta Movimento'"
                  required
                />
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Digite o nome da conta..."
                  list="nome-sugestoes"
                  autoFocus
                />
                <datalist id="nome-sugestoes">
                  {NOME_SUGESTOES[form.tipo]?.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </FormField>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Dados Bancários */}
        {needsBankData && (
          <AccordionItem value="dados-bancarios" className="border rounded-lg px-4">
            <AccordionTrigger icon="🏛️">Dados Bancários</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  Informe os dados da conta conforme extrato bancário. Esses dados são usados para identificação na conciliação.
                </p>

                <FormField error={errors.bancoCodigo}>
                  <LabelWithHelp
                    htmlFor="banco"
                    label="Banco"
                    help="Selecione o banco. O código FEBRABAN é preenchido automaticamente."
                    required
                  />
                  <BancoSelect
                    value={form.bancoCodigo}
                    onChange={(banco) =>
                      setForm((f) => ({
                        ...f,
                        bancoCodigo: banco?.codigo || '',
                        bancoNome: banco?.nome || '',
                      }))
                    }
                  />
                </FormField>

                <FormRow>
                  <FormField error={errors.agencia}>
                    <LabelWithHelp
                      htmlFor="agencia"
                      label="Agência"
                      help="Número da agência com dígito verificador, se houver. Ex: 1234-5"
                      required
                    />
                    <MaskedInput
                      id="agencia"
                      maskType="agencia"
                      value={form.agencia}
                      onChange={(val) => setForm((f) => ({ ...f, agencia: val }))}
                      showValidation
                    />
                  </FormField>

                  <div className="flex gap-2">
                    <FormField error={errors.contaNumero} className="flex-1">
                      <LabelWithHelp
                        htmlFor="conta"
                        label="Conta"
                        help="Número da conta sem o dígito verificador"
                        required
                      />
                      <MaskedInput
                        id="conta"
                        maskType="conta"
                        value={form.contaNumero}
                        onChange={(val) => setForm((f) => ({ ...f, contaNumero: val }))}
                        showValidation
                      />
                    </FormField>

                    <FormField className="w-16">
                      <LabelWithHelp htmlFor="digito" label="Dígito" help="Dígito verificador da conta" />
                      <Input
                        id="digito"
                        value={form.contaDigito}
                        onChange={(e) => setForm((f) => ({ ...f, contaDigito: e.target.value.slice(0, 2) }))}
                        maxLength={2}
                        className="text-center font-mono"
                      />
                    </FormField>
                  </div>
                </FormRow>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Chave PIX */}
        <AccordionItem value="pix" className="border rounded-lg px-4">
          <AccordionTrigger icon="⚡">Chave PIX (opcional)</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                Cadastrar a chave PIX facilita a identificação automática de depósitos recebidos durante a conciliação.
              </p>

              <FormRow>
                <FormField>
                  <LabelWithHelp
                    htmlFor="pixTipo"
                    label="Tipo da Chave"
                    help="Selecione o tipo de chave PIX cadastrada no banco"
                  />
                  <Select
                    value={form.pixTipo}
                    onValueChange={(v: TipoPix) => setForm((f) => ({ ...f, pixTipo: v, pixChave: '' }))}
                  >
                    <SelectTrigger id="pixTipo">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPO_PIX_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <Key className="h-3.5 w-3.5 text-muted-foreground" />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField error={errors.pixChave}>
                  <LabelWithHelp
                    htmlFor="pixChave"
                    label="Chave PIX"
                    help="Valor da chave conforme tipo selecionado"
                  />
                  {getPixMaskType() ? (
                    <MaskedInput
                      id="pixChave"
                      maskType={getPixMaskType()!}
                      value={form.pixChave}
                      onChange={(val) => setForm((f) => ({ ...f, pixChave: val }))}
                      showValidation
                    />
                  ) : (
                    <Input
                      id="pixChave"
                      value={form.pixChave}
                      onChange={(e) => setForm((f) => ({ ...f, pixChave: e.target.value }))}
                      placeholder={
                        form.pixTipo
                          ? TIPO_PIX_OPTIONS.find((o) => o.value === form.pixTipo)?.placeholder
                          : 'Selecione o tipo primeiro'
                      }
                      disabled={!form.pixTipo}
                    />
                  )}
                </FormField>
              </FormRow>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Saldo Inicial */}
        <AccordionItem value="saldo-inicial" className="border rounded-lg px-4">
          <AccordionTrigger icon="💰">Saldo Inicial</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                <p className="font-medium text-amber-700">Importante</p>
                <p className="text-amber-600 text-xs mt-1">
                  Informe o saldo da conta na data em que começou a usar o sistema. A partir desta data, 
                  todos os movimentos serão registrados para cálculo do saldo atual.
                </p>
              </div>

              <FormRow>
                <FormField error={errors.saldoInicial}>
                  <LabelWithHelp
                    htmlFor="saldoInicial"
                    label="Saldo Inicial (R$)"
                    help="Saldo da conta na data de início do controle. Use valores positivos."
                    required
                  />
                  <MaskedInput
                    id="saldoInicial"
                    maskType="moeda"
                    value={form.saldoInicial}
                    onChange={(val) => setForm((f) => ({ ...f, saldoInicial: val }))}
                  />
                </FormField>

                <FormField error={errors.dataSaldoInicial}>
                  <LabelWithHelp
                    htmlFor="dataSaldoInicial"
                    label="Data do Saldo"
                    help="Data de referência do saldo inicial. Geralmente é o primeiro dia do mês de início."
                    required
                  />
                  <div className="relative">
                    <Input
                      id="dataSaldoInicial"
                      type="date"
                      value={form.dataSaldoInicial}
                      onChange={(e) => setForm((f) => ({ ...f, dataSaldoInicial: e.target.value }))}
                      max={getTodayDate()}
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </FormField>
              </FormRow>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Vínculo Contábil */}
        <AccordionItem value="contabil" className="border rounded-lg px-4">
          <AccordionTrigger icon="📚">Vínculo Contábil (avançado)</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                Vincule esta conta financeira a uma conta do plano de contas para lançamentos contábeis automáticos.
              </p>

              <FormField>
                <LabelWithHelp
                  htmlFor="contaContabil"
                  label="Conta Contábil"
                  help="Conta do ativo circulante (grupo 1.1) para lançamentos automáticos de movimentação"
                />
                <Select
                  value={form.contaContabilId}
                  onValueChange={(v) => setForm((f) => ({ ...f, contaContabilId: v }))}
                >
                  <SelectTrigger id="contaContabil">
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t">
        <DraftIndicator lastSaved={lastSaved} isSaving={isSaving} />
        <div className="flex gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={() => { clearDraft(); onCancel(); }}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isPending} className="bg-violet-600 hover:bg-violet-700">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {mode === 'create' ? 'Criar Conta' : 'Salvar Alterações'}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

