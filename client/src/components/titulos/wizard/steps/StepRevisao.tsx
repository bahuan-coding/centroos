import { useMemo } from 'react';
import { useTituloWizard } from '../TituloWizardProvider';
import { TituloPendenciasPanel } from '../TituloPendenciasPanel';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { 
  Receipt, Calendar, Banknote, Edit2, Check, 
  User, Building2, FileText, ChevronDown, ChevronUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const naturezaLabels: Record<string, string> = {
  contribuicao: 'Contribuição',
  doacao: 'Doação',
  evento: 'Evento',
  convenio: 'Convênio',
  servico: 'Serviço',
  utilidade: 'Utilidade',
  taxa: 'Taxa/Tarifa',
  imposto: 'Imposto',
  material: 'Material',
  outros: 'Outros',
};

const statusOptions = [
  { value: 'rascunho', label: 'Rascunho', help: 'Em elaboração. Pode editar livremente.' },
  { value: 'pendente_aprovacao', label: 'Aguardando Aprovação', help: 'Enviado para aprovador revisar.' },
  { value: 'aprovado', label: 'Aprovado', help: 'Liberado para pagamento/cobrança.' },
];

export function StepRevisao() {
  const { form, updateField, goToStep, warnings, valorLiquido } = useTituloWizard();
  const [showVinculos, setShowVinculos] = useState(false);
  const [showParcelamento, setShowParcelamento] = useState(false);
  
  // Queries
  const { data: pessoas } = trpc.pessoas.list.useQuery({ limit: 500 });
  const { data: accounts } = trpc.accounts.list.useQuery();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  };
  
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
        valor: i === 0 ? valorLiquido - (Math.floor(valorParcela * 100) / 100 * (form.parcelas - 1)) : Math.floor(valorParcela * 100) / 100,
        vencimento: venc.toLocaleDateString('pt-BR'),
      });
    }
    return parcelas;
  }, [form.parcelas, form.intervaloParcelas, form.dataVencimento, valorLiquido]);
  
  const pessoaSelecionada = pessoas?.pessoas?.find(p => p.id === form.pessoaId);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          ✅ Revisão
        </h2>
        <p className="text-sm text-muted-foreground">
          Confira os dados e adicione informações opcionais antes de criar o título.
        </p>
      </div>
      
      {/* Pendências */}
      {warnings.length > 0 && <TituloPendenciasPanel />}
      
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Identificação */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Receipt className={cn(
                "h-5 w-5",
                form.tipo === 'receber' ? "text-emerald-600" : "text-rose-600"
              )} />
              <h3 className="font-medium">Identificação</h3>
              <Check className="h-4 w-4 text-emerald-500" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => goToStep(0)}>
              <Edit2 className="h-3 w-3 mr-1" />
              Editar
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <Badge className={cn(
                form.tipo === 'receber' 
                  ? "bg-emerald-100 text-emerald-700" 
                  : "bg-rose-100 text-rose-700"
              )}>
                {form.tipo === 'receber' ? 'A Receber' : 'A Pagar'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Natureza:</span>
              <span className="font-medium">{naturezaLabels[form.natureza] || form.natureza}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Descrição:</span>
              <p className="font-medium mt-0.5 line-clamp-2">{form.descricao}</p>
            </div>
          </div>
        </div>
        
        {/* Card Valores */}
        <div className={cn(
          "rounded-xl border p-4",
          form.tipo === 'receber' ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
        )}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Banknote className={cn(
                "h-5 w-5",
                form.tipo === 'receber' ? "text-emerald-600" : "text-rose-600"
              )} />
              <h3 className="font-medium">Valores</h3>
              <Check className="h-4 w-4 text-emerald-500" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => goToStep(1)}>
              <Edit2 className="h-3 w-3 mr-1" />
              Editar
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original:</span>
              <span>{formatCurrency(parseFloat(form.valorOriginal) || 0)}</span>
            </div>
            {parseFloat(form.valorDesconto) > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Desconto:</span>
                <span>- {formatCurrency(parseFloat(form.valorDesconto))}</span>
              </div>
            )}
            {parseFloat(form.valorAcrescimo) > 0 && (
              <div className="flex justify-between text-blue-700">
                <span>Acréscimo:</span>
                <span>+ {formatCurrency(parseFloat(form.valorAcrescimo))}</span>
              </div>
            )}
            <div className="pt-2 border-t flex justify-between">
              <span className="font-medium">Valor Líquido:</span>
              <span className={cn(
                "text-lg font-bold",
                form.tipo === 'receber' ? "text-emerald-700" : "text-rose-700"
              )}>
                {formatCurrency(valorLiquido)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Card Datas */}
        <div className="rounded-xl border bg-card p-4 md:col-span-2">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-violet-600" />
              <h3 className="font-medium">Datas</h3>
              <Check className="h-4 w-4 text-emerald-500" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => goToStep(2)}>
              <Edit2 className="h-3 w-3 mr-1" />
              Editar
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Emissão</p>
              <p className="font-medium">{formatDate(form.dataEmissao)}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Competência</p>
              <p className="font-medium">{formatDate(form.dataCompetencia)}</p>
            </div>
            <div className={cn(
              "text-center p-3 rounded-lg",
              form.dataVencimento && new Date(form.dataVencimento) < new Date() 
                ? "bg-rose-100" 
                : "bg-muted/50"
            )}>
              <p className="text-xs text-muted-foreground mb-1">Vencimento</p>
              <p className={cn(
                "font-medium",
                form.dataVencimento && new Date(form.dataVencimento) < new Date() && "text-rose-600"
              )}>
                {formatDate(form.dataVencimento)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Seção Vínculos (Expandível) */}
      <div className="border rounded-xl">
        <button
          type="button"
          onClick={() => setShowVinculos(!showVinculos)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium">Vínculos</p>
              <p className="text-xs text-muted-foreground">Pessoa, conta contábil, documento</p>
            </div>
            {pessoaSelecionada && (
              <Badge variant="secondary" className="text-xs">{pessoaSelecionada.nome}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Opcional</Badge>
            {showVinculos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>
        
        {showVinculos && (
          <div className="p-4 pt-0 space-y-4 border-t">
            <FormRow>
              <FormField>
                <LabelWithHelp 
                  label="Pessoa" 
                  help={form.tipo === 'receber' 
                    ? 'Doador ou membro. OBRIGATÓRIO para emitir recibo de doação para IR.' 
                    : 'Fornecedor ou credor do pagamento.'}
                />
                <Select value={form.pessoaId || 'none'} onValueChange={(v) => updateField('pessoaId', v === 'none' ? '' : v)}>
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
                <Select value={form.contaContabilId || 'none'} onValueChange={(v) => updateField('contaContabilId', v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Automático pela natureza" />
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
            
            <FormRow>
              <FormField>
                <LabelWithHelp label="Número do Documento" help="Número da NF, boleto, recibo ou outro documento" />
                <Input
                  value={form.numeroDocumento}
                  onChange={(e) => updateField('numeroDocumento', e.target.value)}
                  placeholder="Ex: 123456"
                />
              </FormField>

              <FormField>
                <LabelWithHelp label="Série" help="Série da nota fiscal, se houver" />
                <Input
                  value={form.serieDocumento}
                  onChange={(e) => updateField('serieDocumento', e.target.value)}
                  placeholder="Ex: 1"
                />
              </FormField>
            </FormRow>

            <FormField>
              <LabelWithHelp label="Observações" help="Anotações internas. Não aparecem em relatórios externos." />
              <Textarea
                value={form.observacoes}
                onChange={(e) => updateField('observacoes', e.target.value)}
                placeholder="Observações internas..."
                rows={2}
              />
            </FormField>
          </div>
        )}
      </div>
      
      {/* Seção Parcelamento (Expandível) */}
      <div className="border rounded-xl">
        <button
          type="button"
          onClick={() => setShowParcelamento(!showParcelamento)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium">Parcelamento</p>
              <p className="text-xs text-muted-foreground">Dividir em várias parcelas</p>
            </div>
            {form.parcelas > 1 && (
              <Badge variant="secondary" className="text-xs">{form.parcelas}x</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Opcional</Badge>
            {showParcelamento ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>
        
        {showParcelamento && (
          <div className="p-4 pt-0 space-y-4 border-t">
            <FormRow>
              <FormField>
                <LabelWithHelp label="Número de Parcelas" help="Quantas parcelas (1 = à vista)" />
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={form.parcelas}
                  onChange={(e) => updateField('parcelas', parseInt(e.target.value) || 1)}
                />
              </FormField>

              <FormField>
                <LabelWithHelp label="Intervalo (meses)" help="Meses entre parcelas. 1 = mensal, 3 = trimestral" />
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={form.intervaloParcelas}
                  onChange={(e) => updateField('intervaloParcelas', parseInt(e.target.value) || 1)}
                  disabled={form.parcelas <= 1}
                />
              </FormField>
            </FormRow>

            {/* Preview das parcelas */}
            {previewParcelas.length > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs font-medium mb-2">Preview das parcelas:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {previewParcelas.slice(0, 6).map((p) => (
                    <div key={p.numero} className="bg-background p-2 rounded border">
                      <span className="font-medium">{p.numero}/{form.parcelas}</span>
                      <span className="text-muted-foreground ml-2">{formatCurrency(p.valor)}</span>
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
          </div>
        )}
      </div>
      
      {/* Status */}
      <FormSection title="Status Inicial" icon="✅">
        <FormField>
          <LabelWithHelp label="Status" help="Rascunho: pode editar. Aprovado: liberado para baixa." />
          <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
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
      
      {/* Confirmação final */}
      <div className={cn(
        "rounded-xl border-2 p-4",
        form.tipo === 'receber' 
          ? "bg-emerald-50 border-emerald-200"
          : "bg-rose-50 border-rose-200"
      )}>
        <div className="flex items-start gap-3">
          <Check className={cn(
            "h-5 w-5 shrink-0 mt-0.5",
            form.tipo === 'receber' ? "text-emerald-600" : "text-rose-600"
          )} />
          <div>
            <p className={cn(
              "font-medium",
              form.tipo === 'receber' ? "text-emerald-800" : "text-rose-800"
            )}>
              Pronto para criar
            </p>
            <p className={cn(
              "text-sm mt-1",
              form.tipo === 'receber' ? "text-emerald-700" : "text-rose-700"
            )}>
              Clique em "Criar Título" para finalizar. 
              {form.parcelas > 1 
                ? ` Serão criados ${form.parcelas} títulos.`
                : ' O título poderá ser editado posteriormente.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

