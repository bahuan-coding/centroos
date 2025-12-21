import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================================================
// CONSTANTES COM TOOLTIPS CONTÁBEIS
// ============================================================================

const tipoOptions = [
  { value: 'receber', label: 'A Receber', help: 'Direito da entidade. Exemplo: dízimos, doações, eventos.' },
  { value: 'pagar', label: 'A Pagar', help: 'Obrigação da entidade. Exemplo: contas, fornecedores, impostos.' },
];

const naturezasReceber = [
  { value: 'contribuicao', label: 'Contribuição/Mensalidade', help: 'Pagamento regular de associados (dízimo, mensalidade). Conta: 4.1.1', conta: '4.1.1' },
  { value: 'doacao', label: 'Doação', help: 'Valores recebidos sem contrapartida. Para dedução no IR, vincule a pessoa. Conta: 4.1.2', conta: '4.1.2' },
  { value: 'evento', label: 'Evento', help: 'Receita de bazares, festas, encontros, cursos. Conta: 4.2.1', conta: '4.2.1' },
  { value: 'convenio', label: 'Convênio/Subvenção', help: 'Recursos de parceria com governo (MROSC). Conta: 4.3.1', conta: '4.3.1' },
];

const naturezasPagar = [
  { value: 'servico', label: 'Serviço', help: 'Prestadores, manutenção, limpeza, consultoria. Conta: 5.1.1', conta: '5.1.1' },
  { value: 'utilidade', label: 'Utilidade', help: 'Água, luz, telefone, internet, gás. Conta: 5.1.2', conta: '5.1.2' },
  { value: 'taxa', label: 'Taxa/Tarifa', help: 'Tarifas bancárias, cartório, taxas diversas. Conta: 5.1.3', conta: '5.1.3' },
  { value: 'imposto', label: 'Imposto', help: 'IPTU, ISS, taxas municipais/estaduais. Conta: 5.1.4', conta: '5.1.4' },
  { value: 'material', label: 'Material', help: 'Escritório, limpeza, consumo. Conta: 5.2.1', conta: '5.2.1' },
  { value: 'outros', label: 'Outros', help: 'Demais despesas não classificadas. Conta: 5.9.1', conta: '5.9.1' },
];

const statusOptions = [
  { value: 'rascunho', label: 'Rascunho', help: 'Em elaboração. Pode editar livremente.' },
  { value: 'pendente_aprovacao', label: 'Aguardando Aprovação', help: 'Enviado para aprovador revisar.' },
  { value: 'aprovado', label: 'Aprovado', help: 'Liberado para pagamento/cobrança.' },
];

interface TituloFormProps {
  tituloId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TituloForm({ tituloId, onSuccess, onCancel }: TituloFormProps) {
  // Form state
  const [form, setForm] = useState({
    tipo: 'receber' as 'pagar' | 'receber',
    natureza: '',
    descricao: '',
    valorOriginal: '',
    valorDesconto: '0',
    valorAcrescimo: '0',
    dataEmissao: new Date().toISOString().split('T')[0],
    dataCompetencia: new Date().toISOString().split('T')[0].slice(0, 7) + '-01',
    dataVencimento: '',
    numeroDocumento: '',
    serieDocumento: '',
    pessoaId: '',
    contaContabilId: '',
    centroCustoId: '',
    projetoId: '',
    fundoId: '',
    observacoes: '',
    status: 'rascunho',
    // Parcelamento
    parcelas: 1,
    intervaloParcelas: 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Queries
  const { data: titulo } = trpc.titulos.getById.useQuery(tituloId!, { enabled: !!tituloId });
  const { data: pessoas } = trpc.pessoas.list.useQuery({ limit: 500 });
  const { data: accounts } = trpc.accounts.list.useQuery();

  // Mutations
  const createMutation = trpc.titulos.create.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} título(s) criado(s) com sucesso`);
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateMutation = trpc.titulos.update.useMutation({
    onSuccess: () => {
      toast.success('Título atualizado');
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Carregar dados para edição
  useEffect(() => {
    if (titulo) {
      setForm({
        tipo: titulo.tipo,
        natureza: titulo.natureza,
        descricao: titulo.descricao,
        valorOriginal: titulo.valorOriginal,
        valorDesconto: titulo.valorDesconto || '0',
        valorAcrescimo: titulo.valorAcrescimo || '0',
        dataEmissao: titulo.dataEmissao,
        dataCompetencia: titulo.dataCompetencia,
        dataVencimento: titulo.dataVencimento,
        numeroDocumento: titulo.numeroDocumento || '',
        serieDocumento: titulo.serieDocumento || '',
        pessoaId: titulo.pessoaId || '',
        contaContabilId: titulo.contaContabilId || '',
        centroCustoId: titulo.centroCustoId || '',
        projetoId: titulo.projetoId || '',
        fundoId: titulo.fundoId || '',
        observacoes: titulo.observacoes || '',
        status: titulo.status,
        parcelas: 1,
        intervaloParcelas: 1,
      });
    }
  }, [titulo]);

  // Naturezas disponíveis baseado no tipo
  const naturezasDisponiveis = form.tipo === 'receber' ? naturezasReceber : naturezasPagar;

  // Cálculo do valor líquido
  const valorLiquido = useMemo(() => {
    const original = parseFloat(form.valorOriginal) || 0;
    const desconto = parseFloat(form.valorDesconto) || 0;
    const acrescimo = parseFloat(form.valorAcrescimo) || 0;
    return original - desconto + acrescimo;
  }, [form.valorOriginal, form.valorDesconto, form.valorAcrescimo]);

  // Preview parcelas
  const previewParcelas = useMemo(() => {
    if (form.parcelas <= 1 || !form.dataVencimento) return [];
    const parcelas = [];
    const valorParcela = valorLiquido / form.parcelas;
    
    for (let i = 0; i < form.parcelas; i++) {
      const venc = new Date(form.dataVencimento);
      venc.setMonth(venc.getMonth() + i * form.intervaloParcelas);
      parcelas.push({
        numero: i + 1,
        valor: i === 0 ? valorLiquido - (Math.floor(valorParcela) * (form.parcelas - 1)) : Math.floor(valorParcela),
        vencimento: venc.toLocaleDateString('pt-BR'),
      });
    }
    return parcelas;
  }, [form.parcelas, form.intervaloParcelas, form.dataVencimento, valorLiquido]);

  // Validação
  const validate = () => {
    const errs: Record<string, string> = {};
    
    if (!form.natureza) errs.natureza = 'Selecione a natureza';
    if (!form.descricao || form.descricao.length < 3) errs.descricao = 'Mínimo 3 caracteres';
    if (!form.valorOriginal || parseFloat(form.valorOriginal) <= 0) errs.valorOriginal = 'Valor deve ser positivo';
    if (!form.dataVencimento) errs.dataVencimento = 'Informe o vencimento';
    if (valorLiquido <= 0) errs.valorLiquido = 'Valor líquido deve ser positivo';
    
    // Doação requer pessoa para recibo
    if (form.natureza === 'doacao' && form.tipo === 'receber' && !form.pessoaId) {
      // Warning, não erro
    }
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit
  const handleSubmit = () => {
    if (!validate()) {
      // Focus first field with error
      const firstErrorField = document.querySelector('[class*="border-destructive"]') as HTMLElement;
      if (firstErrorField) {
        firstErrorField.focus();
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toast.error('Verifique os campos destacados e corrija os erros');
      return;
    }

    if (tituloId) {
      updateMutation.mutate({
        id: tituloId,
        descricao: form.descricao,
        valorDesconto: parseFloat(form.valorDesconto) || 0,
        valorAcrescimo: parseFloat(form.valorAcrescimo) || 0,
        dataVencimento: form.dataVencimento,
        numeroDocumento: form.numeroDocumento || undefined,
        serieDocumento: form.serieDocumento || undefined,
        pessoaId: form.pessoaId || null,
        contaContabilId: form.contaContabilId || null,
        observacoes: form.observacoes || undefined,
      });
    } else {
      createMutation.mutate({
        tipo: form.tipo,
        natureza: form.natureza as any,
        descricao: form.descricao,
        valorOriginal: parseFloat(form.valorOriginal),
        valorDesconto: parseFloat(form.valorDesconto) || 0,
        valorAcrescimo: parseFloat(form.valorAcrescimo) || 0,
        dataEmissao: form.dataEmissao,
        dataCompetencia: form.dataCompetencia,
        dataVencimento: form.dataVencimento,
        numeroDocumento: form.numeroDocumento || undefined,
        serieDocumento: form.serieDocumento || undefined,
        pessoaId: form.pessoaId || undefined,
        contaContabilId: form.contaContabilId || undefined,
        centroCustoId: form.centroCustoId || undefined,
        projetoId: form.projetoId || undefined,
        fundoId: form.fundoId || undefined,
        observacoes: form.observacoes || undefined,
        status: form.status as any,
        parcelas: form.parcelas > 1 ? form.parcelas : undefined,
        intervaloParcelas: form.intervaloParcelas,
      });
    }
  };

  const isEditing = !!tituloId;
  const isAprovado = titulo?.status === 'aprovado';
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Seção: Identificação */}
      <FormSection title="Identificação" icon="📋" description="Tipo e natureza do título">
        <FormRow>
          <FormField error={errors.tipo}>
            <LabelWithHelp label="Tipo" help="A Pagar: despesas e obrigações. A Receber: receitas e direitos." required />
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as any, natureza: '' })} disabled={isEditing}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tipoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField error={errors.natureza}>
            <LabelWithHelp label="Natureza" help="Classifique o tipo de receita ou despesa. Define a conta contábil sugerida." required />
            <Select value={form.natureza} onValueChange={(v) => setForm({ ...form, natureza: v })} disabled={isEditing}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {naturezasDisponiveis.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span>{opt.label}</span>
                    <Badge variant="outline" className="ml-2 text-[10px]">{opt.conta}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormRow>
      </FormSection>

      {/* Seção: Valores */}
      <FormSection title="Valores" icon="💰" description="Defina o valor do título">
        <FormRow>
          <FormField error={errors.valorOriginal}>
            <LabelWithHelp label="Valor Original (R$)" help="Valor base do título, sem descontos ou acréscimos" required />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valorOriginal}
              onChange={(e) => setForm({ ...form, valorOriginal: e.target.value })}
              placeholder="0,00"
              disabled={isEditing}
            />
          </FormField>

          <FormField>
            <LabelWithHelp label="Desconto (R$)" help="Desconto concedido. Ex: pagamento antecipado" />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valorDesconto}
              onChange={(e) => setForm({ ...form, valorDesconto: e.target.value })}
              placeholder="0,00"
            />
          </FormField>

          <FormField>
            <LabelWithHelp label="Acréscimo (R$)" help="Juros, multa ou ajuste de valor" />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valorAcrescimo}
              onChange={(e) => setForm({ ...form, valorAcrescimo: e.target.value })}
              placeholder="0,00"
            />
          </FormField>
        </FormRow>

        {/* Valor Líquido Calculado */}
        <div className={cn(
          'p-3 rounded-lg border-2 border-dashed',
          valorLiquido > 0 ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'
        )}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Valor Líquido:</span>
            <span className={cn('text-xl font-bold', valorLiquido > 0 ? 'text-emerald-700' : 'text-rose-700')}>
              R$ {valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            = Original ({form.valorOriginal || '0'}) - Desconto ({form.valorDesconto}) + Acréscimo ({form.valorAcrescimo})
          </p>
        </div>
      </FormSection>

      {/* Seção: Datas */}
      <FormSection title="Datas" icon="📅" description="Datas importantes para contabilidade">
        <FormRow>
          <FormField>
            <LabelWithHelp label="Data de Emissão" help="Quando o documento foi gerado ou a obrigação surgiu" required />
            <Input
              type="date"
              value={form.dataEmissao}
              onChange={(e) => setForm({ ...form, dataEmissao: e.target.value })}
              disabled={isEditing}
            />
          </FormField>

          <FormField>
            <LabelWithHelp label="Data de Competência" help="Mês a que pertence a receita/despesa. Define o período contábil (regime de competência)." required />
            <Input
              type="date"
              value={form.dataCompetencia}
              onChange={(e) => setForm({ ...form, dataCompetencia: e.target.value })}
              disabled={isEditing}
            />
          </FormField>

          <FormField error={errors.dataVencimento}>
            <LabelWithHelp label="Data de Vencimento" help="Prazo final para pagamento ou recebimento" required />
            <Input
              type="date"
              value={form.dataVencimento}
              onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })}
            />
          </FormField>
        </FormRow>

        {/* Dica sobre competência */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          💡 <strong>Dica:</strong> Se receber uma conta de luz em fevereiro referente a janeiro, a competência é janeiro.
        </div>
      </FormSection>

      {/* Seção: Documento */}
      <FormSection title="Documento" icon="📄" description="Identificação do documento fiscal">
        <FormRow>
          <FormField>
            <LabelWithHelp label="Número do Documento" help="Número da NF, boleto, recibo ou outro documento" />
            <Input
              value={form.numeroDocumento}
              onChange={(e) => setForm({ ...form, numeroDocumento: e.target.value })}
              placeholder="Ex: 123456"
            />
          </FormField>

          <FormField>
            <LabelWithHelp label="Série" help="Série da nota fiscal, se houver" />
            <Input
              value={form.serieDocumento}
              onChange={(e) => setForm({ ...form, serieDocumento: e.target.value })}
              placeholder="Ex: 1"
            />
          </FormField>
        </FormRow>

        <FormField error={errors.descricao}>
          <LabelWithHelp label="Descrição" help="Descrição detalhada do título para identificação. Ex: 'Conta de energia elétrica - Janeiro/2025'" required />
          <Textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descreva o título..."
            rows={2}
          />
        </FormField>
      </FormSection>

      {/* Seção: Vínculos */}
      <FormSection title="Vínculos" icon="🔗" description="Relacionamentos com outras entidades">
        <FormRow>
          <FormField>
            <LabelWithHelp 
              label="Pessoa" 
              help={form.tipo === 'receber' 
                ? 'Doador ou membro. Obrigatório para emitir recibo de doação para IR.' 
                : 'Fornecedor ou credor do pagamento.'}
            />
            <Select value={form.pessoaId || 'none'} onValueChange={(v) => setForm({ ...form, pessoaId: v === 'none' ? '' : v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (anônimo)</SelectItem>
                {pessoas?.pessoas?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField>
            <LabelWithHelp label="Conta Contábil" help="Conta do plano de contas para classificação automática" />
            <Select value={form.contaContabilId || 'none'} onValueChange={(v) => setForm({ ...form, contaContabilId: v === 'none' ? '' : v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Automático pela natureza</SelectItem>
                {accounts?.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.code} - {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormRow>

        <FormField>
          <LabelWithHelp label="Observações" help="Anotações internas. Não aparecem em relatórios externos." />
          <Textarea
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            placeholder="Observações internas..."
            rows={2}
          />
        </FormField>
      </FormSection>

      {/* Seção: Parcelamento (apenas criação) */}
      {!isEditing && (
        <FormSection title="Parcelamento" icon="📊" description="Divida em várias parcelas" badge={{ text: 'Opcional', variant: 'secondary' }}>
          <FormRow>
            <FormField>
              <LabelWithHelp label="Número de Parcelas" help="Quantas parcelas (1 = à vista)" />
              <Input
                type="number"
                min="1"
                max="60"
                value={form.parcelas}
                onChange={(e) => setForm({ ...form, parcelas: parseInt(e.target.value) || 1 })}
              />
            </FormField>

            <FormField>
              <LabelWithHelp label="Intervalo (meses)" help="Meses entre parcelas. 1 = mensal, 3 = trimestral" />
              <Input
                type="number"
                min="1"
                max="12"
                value={form.intervaloParcelas}
                onChange={(e) => setForm({ ...form, intervaloParcelas: parseInt(e.target.value) || 1 })}
                disabled={form.parcelas <= 1}
              />
            </FormField>
          </FormRow>

          {/* Preview das parcelas */}
          {previewParcelas.length > 0 && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs font-medium mb-2">Preview das parcelas:</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {previewParcelas.slice(0, 6).map((p) => (
                  <div key={p.numero} className="bg-background p-2 rounded border">
                    <span className="font-medium">{p.numero}/{form.parcelas}</span>
                    <span className="text-muted-foreground ml-2">R$ {p.valor.toFixed(2)}</span>
                    <span className="block text-muted-foreground">{p.vencimento}</span>
                  </div>
                ))}
                {previewParcelas.length > 6 && (
                  <div className="bg-background p-2 rounded border text-center text-muted-foreground">
                    +{previewParcelas.length - 6} mais...
                  </div>
                )}
              </div>
            </div>
          )}
        </FormSection>
      )}

      {/* Seção: Status (apenas criação) */}
      {!isEditing && (
        <FormSection title="Status Inicial" icon="✅">
          <FormField>
            <LabelWithHelp label="Status" help="Rascunho: pode editar. Aprovado: liberado para baixa." />
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>
      )}

      {/* Aviso para edição limitada */}
      {isAprovado && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          ⚠️ Título aprovado. Apenas desconto, acréscimo, vencimento e observações podem ser editados.
        </div>
      )}

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar Título'}
        </Button>
      </div>
    </div>
  );
}

