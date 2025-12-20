import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Building2, CreditCard, Wallet, AlertTriangle } from 'lucide-react';

// ============================================================================
// CONSTANTES
// ============================================================================

const formasPagamento = [
  { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
  { value: 'pix', label: 'PIX', icon: '📱' },
  { value: 'ted', label: 'TED', icon: '🏦' },
  { value: 'doc', label: 'DOC', icon: '🏦' },
  { value: 'boleto', label: 'Boleto', icon: '📄' },
  { value: 'debito', label: 'Cartão Débito', icon: '💳' },
  { value: 'credito', label: 'Cartão Crédito', icon: '💳' },
  { value: 'cheque', label: 'Cheque', icon: '📝' },
];

interface BaixaFormProps {
  tituloId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function BaixaForm({ tituloId, onSuccess, onCancel }: BaixaFormProps) {
  // Form state
  const [form, setForm] = useState({
    contaFinanceiraId: '',
    dataPagamento: new Date().toISOString().split('T')[0],
    valorPago: '',
    valorJuros: '0',
    valorMulta: '0',
    valorDesconto: '0',
    formaPagamento: 'pix',
    documentoReferencia: '',
    gerarLancamento: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Queries
  const { data: titulo, isLoading } = trpc.titulos.getById.useQuery(tituloId);
  const { data: contasFinanceiras } = trpc.contasFinanceiras.list.useQuery();

  // Mutation
  const baixaMutation = trpc.titulos.registrarBaixa.useMutation({
    onSuccess: (data) => {
      toast.success(`Baixa registrada. Título ${data.novoStatus === 'quitado' ? 'quitado' : 'parcialmente pago'}`);
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Preencher valor sugerido
  useEffect(() => {
    if (titulo && !form.valorPago) {
      setForm((f) => ({ ...f, valorPago: String(titulo.saldoPendente) }));
    }
  }, [titulo]);

  // Cálculo do total da baixa
  const totalBaixa = useMemo(() => {
    const base = parseFloat(form.valorPago) || 0;
    const juros = parseFloat(form.valorJuros) || 0;
    const multa = parseFloat(form.valorMulta) || 0;
    const desconto = parseFloat(form.valorDesconto) || 0;
    return base + juros + multa - desconto;
  }, [form.valorPago, form.valorJuros, form.valorMulta, form.valorDesconto]);

  // Validação
  const validate = () => {
    const errs: Record<string, string> = {};

    if (!form.contaFinanceiraId) errs.contaFinanceiraId = 'Selecione a conta';
    if (!form.dataPagamento) errs.dataPagamento = 'Informe a data';
    if (!form.valorPago || parseFloat(form.valorPago) <= 0) errs.valorPago = 'Valor deve ser positivo';
    
    // Validar data não futura
    if (new Date(form.dataPagamento) > new Date()) {
      errs.dataPagamento = 'Data não pode ser futura';
    }

    // Validar valor não excede saldo
    if (titulo && totalBaixa > titulo.saldoPendente + 0.01) {
      errs.valorPago = `Valor excede saldo pendente (R$ ${titulo.saldoPendente.toFixed(2)})`;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit
  const handleSubmit = () => {
    if (!validate()) {
      toast.error('Corrija os erros do formulário');
      return;
    }

    baixaMutation.mutate({
      tituloId,
      contaFinanceiraId: form.contaFinanceiraId,
      dataPagamento: form.dataPagamento,
      valorPago: parseFloat(form.valorPago),
      valorJuros: parseFloat(form.valorJuros) || 0,
      valorMulta: parseFloat(form.valorMulta) || 0,
      valorDesconto: parseFloat(form.valorDesconto) || 0,
      formaPagamento: form.formaPagamento as any,
      documentoReferencia: form.documentoReferencia || undefined,
      gerarLancamento: form.gerarLancamento,
    });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  if (!titulo) {
    return <div className="text-center py-8 text-rose-600">Título não encontrado</div>;
  }

  const isPagar = titulo.tipo === 'pagar';

  return (
    <div className="space-y-6">
      {/* Info do Título */}
      <div className={cn(
        'p-4 rounded-lg border-2',
        isPagar ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isPagar ? (
              <CreditCard className="h-5 w-5 text-rose-600" />
            ) : (
              <Wallet className="h-5 w-5 text-emerald-600" />
            )}
            <span className="font-medium">{isPagar ? 'Pagamento' : 'Recebimento'}</span>
          </div>
          <Badge variant="outline">{titulo.status}</Badge>
        </div>
        
        <p className="text-sm truncate">{titulo.descricao}</p>
        
        {titulo.pessoa && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Building2 className="h-3 w-3" />
            {titulo.pessoa.nome}
          </p>
        )}
        
        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-dashed">
          <div>
            <p className="text-xs text-muted-foreground">Valor do Título</p>
            <p className="font-mono font-bold">R$ {Number(titulo.valorLiquido).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo Pendente</p>
            <p className={cn('font-mono font-bold', titulo.saldoPendente > 0 ? 'text-amber-600' : 'text-emerald-600')}>
              R$ {titulo.saldoPendente.toFixed(2)}
            </p>
          </div>
        </div>

        {titulo.baixas.length > 0 && (
          <div className="mt-3 pt-3 border-t border-dashed">
            <p className="text-xs text-muted-foreground mb-1">Baixas anteriores:</p>
            <div className="space-y-1">
              {titulo.baixas.slice(0, 3).map((b) => (
                <div key={b.id} className="text-xs flex justify-between">
                  <span>{new Date(b.dataPagamento).toLocaleDateString('pt-BR')}</span>
                  <span className={cn('font-mono', b.estorno ? 'text-rose-600' : '')}>
                    {b.estorno ? '-' : ''}R$ {Number(b.valorPago).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Seção: Conta e Data */}
      <FormSection title="Identificação do Pagamento" icon="🏦">
        <FormRow>
          <FormField error={errors.contaFinanceiraId}>
            <LabelWithHelp 
              label="Conta Financeira" 
              help={`Conta bancária ou caixa de ${isPagar ? 'saída' : 'entrada'} do dinheiro`} 
              required 
            />
            <Select value={form.contaFinanceiraId} onValueChange={(v) => setForm({ ...form, contaFinanceiraId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta..." />
              </SelectTrigger>
              <SelectContent>
                {contasFinanceiras?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <span>{c.nome}</span>
                      {c.saldoAtual !== undefined && (
                        <Badge variant="outline" className="text-[10px]">
                          R$ {Number(c.saldoAtual).toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField error={errors.dataPagamento}>
            <LabelWithHelp label="Data do Pagamento" help="Quando efetivamente ocorreu o pagamento/recebimento" required />
            <Input
              type="date"
              value={form.dataPagamento}
              onChange={(e) => setForm({ ...form, dataPagamento: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
            />
          </FormField>
        </FormRow>
      </FormSection>

      {/* Seção: Valores */}
      <FormSection title="Valores" icon="💰">
        <FormRow>
          <FormField error={errors.valorPago}>
            <LabelWithHelp label="Valor Pago (R$)" help="Valor base efetivamente pago ou recebido" required />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valorPago}
              onChange={(e) => setForm({ ...form, valorPago: e.target.value })}
              placeholder="0,00"
            />
          </FormField>

          <FormField>
            <LabelWithHelp label="Juros (R$)" help="Juros cobrados por atraso" />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valorJuros}
              onChange={(e) => setForm({ ...form, valorJuros: e.target.value })}
              placeholder="0,00"
            />
          </FormField>
        </FormRow>

        <FormRow>
          <FormField>
            <LabelWithHelp label="Multa (R$)" help="Multa por atraso no pagamento" />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valorMulta}
              onChange={(e) => setForm({ ...form, valorMulta: e.target.value })}
              placeholder="0,00"
            />
          </FormField>

          <FormField>
            <LabelWithHelp label="Desconto (R$)" help="Desconto obtido no pagamento" />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valorDesconto}
              onChange={(e) => setForm({ ...form, valorDesconto: e.target.value })}
              placeholder="0,00"
            />
          </FormField>
        </FormRow>

        {/* Total da Baixa */}
        <div className={cn(
          'p-3 rounded-lg border-2 border-dashed',
          totalBaixa <= titulo.saldoPendente + 0.01 ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'
        )}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total da Baixa:</span>
            <span className={cn(
              'text-xl font-bold',
              totalBaixa <= titulo.saldoPendente + 0.01 ? 'text-emerald-700' : 'text-rose-700'
            )}>
              R$ {totalBaixa.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            = Valor ({form.valorPago || '0'}) + Juros ({form.valorJuros}) + Multa ({form.valorMulta}) - Desconto ({form.valorDesconto})
          </p>
          
          {totalBaixa > titulo.saldoPendente + 0.01 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-rose-600">
              <AlertTriangle className="h-3 w-3" />
              Valor excede saldo pendente
            </div>
          )}
          
          {totalBaixa < titulo.saldoPendente && totalBaixa > 0 && (
            <div className="mt-2 text-xs text-amber-600">
              ⚠️ Baixa parcial. Restará R$ {(titulo.saldoPendente - totalBaixa).toFixed(2)}
            </div>
          )}
        </div>
      </FormSection>

      {/* Seção: Forma de Pagamento */}
      <FormSection title="Forma de Pagamento" icon="💳">
        <FormField>
          <LabelWithHelp label="Forma" help="Como foi realizado o pagamento" required />
          <div className="grid grid-cols-4 gap-2">
            {formasPagamento.map((fp) => (
              <button
                key={fp.value}
                type="button"
                onClick={() => setForm({ ...form, formaPagamento: fp.value })}
                className={cn(
                  'p-2 rounded-lg border-2 text-center transition-all',
                  form.formaPagamento === fp.value
                    ? 'border-primary bg-primary/10'
                    : 'border-muted hover:border-muted-foreground/30'
                )}
              >
                <span className="text-lg">{fp.icon}</span>
                <p className="text-xs mt-1">{fp.label}</p>
              </button>
            ))}
          </div>
        </FormField>

        <FormField>
          <LabelWithHelp label="Documento/Comprovante" help="Número do comprovante, autenticação bancária, chave PIX, etc." />
          <Input
            value={form.documentoReferencia}
            onChange={(e) => setForm({ ...form, documentoReferencia: e.target.value })}
            placeholder="Ex: Comprovante PIX 123456..."
          />
        </FormField>
      </FormSection>

      {/* Seção: Contabilização */}
      <FormSection title="Contabilização" icon="📊">
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <Checkbox
            id="gerarLancamento"
            checked={form.gerarLancamento}
            onCheckedChange={(v) => setForm({ ...form, gerarLancamento: !!v })}
          />
          <div>
            <label htmlFor="gerarLancamento" className="text-sm font-medium cursor-pointer">
              Gerar Lançamento Contábil Automaticamente
            </label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPagar ? (
                <>D: Despesa (conta do título) · C: Bancos (conta selecionada)</>
              ) : (
                <>D: Bancos (conta selecionada) · C: Receita (conta do título)</>
              )}
            </p>
          </div>
        </div>
      </FormSection>

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={baixaMutation.isPending}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={baixaMutation.isPending}>
          {baixaMutation.isPending ? 'Registrando...' : `Registrar ${isPagar ? 'Pagamento' : 'Recebimento'}`}
        </Button>
      </div>
    </div>
  );
}


