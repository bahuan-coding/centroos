import { useState, useMemo } from 'react';
import {
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Plus,
  Search,
  Eye,
  CreditCard,
  Check,
  X,
  Calendar,
  Building2,
  Clock,
  ChevronRight,
  RefreshCw,
  Wallet,
  FileText,
  History,
  Edit2,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader, Pagination } from '@/components/ui/page-header';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import TituloForm from '@/components/titulos/TituloForm';
import BaixaForm from '@/components/titulos/BaixaForm';
import { TituloWizard } from '@/components/titulos/TituloWizard';

// ============================================================================
// CONSTANTES
// ============================================================================

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

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  rascunho: { label: 'Rascunho', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  pendente_aprovacao: { label: 'Aguardando', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  aprovado: { label: 'Aprovado', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  parcial: { label: 'Parcial', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  quitado: { label: 'Quitado', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  cancelado: { label: 'Cancelado', color: 'text-slate-400', bgColor: 'bg-slate-100' },
  vencido: { label: 'Vencido', color: 'text-rose-600', bgColor: 'bg-rose-100' },
};

const formaPagamentoLabels: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  ted: 'TED',
  doc: 'DOC',
  boleto: 'Boleto',
  debito: 'Cartão Débito',
  credito: 'Cartão Crédito',
  cheque: 'Cheque',
};

function formatCurrency(value: number | string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

// ============================================================================
// QUICK STATS - Clickable filter cards
// ============================================================================

type TipoFiltro = 'todos' | 'receber' | 'pagar' | 'vencidos';

function QuickStats({ 
  stats, 
  filtroTipo, 
  setFiltroTipo 
}: { 
  stats: any; 
  filtroTipo: TipoFiltro;
  setFiltroTipo: (v: TipoFiltro) => void;
}) {
  const items = [
    { 
      key: 'receber' as TipoFiltro, 
      label: 'A RECEBER', 
      value: stats?.totalReceber || 0, 
      subtitle: `${stats?.pendentes || 0} pendentes`,
      icon: ArrowUpRight,
      gradient: 'from-emerald-500 to-teal-600',
      bgActive: 'bg-emerald-50 border-emerald-300',
    },
    { 
      key: 'pagar' as TipoFiltro, 
      label: 'A PAGAR', 
      value: stats?.totalPagar || 0, 
      subtitle: `${stats?.quitados || 0} quitados`,
      icon: ArrowDownRight,
      gradient: 'from-rose-500 to-red-600',
      bgActive: 'bg-rose-50 border-rose-300',
    },
    { 
      key: 'todos' as TipoFiltro, 
      label: 'SALDO', 
      value: stats?.saldo || 0, 
      subtitle: 'Receber - Pagar',
      icon: Receipt,
      gradient: (stats?.saldo || 0) >= 0 ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-red-600',
      bgActive: 'bg-slate-100 border-slate-300',
    },
    { 
      key: 'vencidos' as TipoFiltro, 
      label: 'TOTAL TÍTULOS', 
      value: stats?.total || 0, 
      subtitle: undefined,
      icon: Calendar,
      gradient: 'from-slate-500 to-slate-600',
      bgActive: 'bg-amber-50 border-amber-300',
      isCount: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => {
        const isActive = filtroTipo === item.key;
        const Icon = item.icon;
        
        return (
          <button
            key={item.key}
            onClick={() => setFiltroTipo(isActive && item.key !== 'todos' ? 'todos' : item.key)}
            className={cn(
              'relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all',
              'hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              isActive ? cn(item.bgActive, 'ring-2 ring-primary shadow-md') : 'bg-white border-slate-200'
            )}
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-5', item.gradient)} />
            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p className="mt-1 text-xl font-bold">
                  {item.isCount ? item.value : formatCurrencyCompact(item.value)}
                </p>
                {item.subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{item.subtitle}</p>}
              </div>
              <div className={cn('p-2 rounded-lg bg-gradient-to-br', item.gradient)}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// LISTA DE TÍTULOS (Master Panel)
// ============================================================================

function TitulosList({ 
  titulos, 
  selectedId, 
  onSelect,
  isLoading 
}: { 
  titulos: any[]; 
  selectedId: string | null;
  onSelect: (titulo: any) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
              <div className="h-5 w-20 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (titulos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Nenhum título encontrado</p>
        <p className="text-xs mt-1">Tente outros termos de busca ou limpe os filtros</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {titulos.map((titulo) => {
        const statusInfo = statusConfig[titulo.status] || statusConfig.rascunho;
        const isPagar = titulo.tipo === 'pagar';
        const isVencido = new Date(titulo.dataVencimento) < new Date() && !['quitado', 'cancelado'].includes(titulo.status);
        const isSelected = selectedId === titulo.id;
        
        return (
          <button
            key={titulo.id}
            onClick={() => onSelect(titulo)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
              'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
              isSelected && 'bg-violet-100 ring-2 ring-violet-500',
              isVencido && !isSelected && 'bg-rose-50/50',
              titulo.status === 'cancelado' && 'opacity-60'
            )}
          >
            {/* Ícone tipo */}
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
              isPagar ? 'bg-rose-100' : 'bg-emerald-100'
            )}>
              {isPagar ? (
                <ArrowDownRight className="h-5 w-5 text-rose-600" />
              ) : (
                <ArrowUpRight className="h-5 w-5 text-emerald-600" />
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-medium text-sm truncate max-w-[200px]">{titulo.descricao}</p>
                <Badge className={cn('text-[10px] px-1.5 py-0', statusInfo.bgColor, statusInfo.color)}>
                  {statusInfo.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                <span>{naturezaLabels[titulo.natureza] || titulo.natureza}</span>
                <span>·</span>
                <span>Venc: {formatDate(titulo.dataVencimento)}</span>
                {isVencido && titulo.status !== 'vencido' && (
                  <>
                    <span>·</span>
                    <span className="text-rose-600 font-medium flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" /> Vencido
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Valor */}
            <div className="text-right shrink-0">
              <p className={cn(
                'font-mono font-bold text-sm',
                isPagar ? 'text-rose-600' : 'text-emerald-600'
              )}>
                {isPagar ? '-' : '+'}{formatCurrencyCompact(Number(titulo.valorLiquido))}
              </p>
            </div>

            <ChevronRight className={cn(
              'h-4 w-4 text-slate-300 shrink-0 transition-transform',
              isSelected && 'text-violet-500 rotate-90'
            )} />
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// EMPTY SELECTION STATE
// ============================================================================

function EmptySelection({ onNewTitulo }: { onNewTitulo: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-6">
        <Receipt className="h-12 w-12 text-emerald-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Selecione um título</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Clique em um título na lista ao lado para ver seus detalhes, registrar baixas ou editar informações.
      </p>
      <Button onClick={onNewTitulo} className="bg-emerald-600 hover:bg-emerald-700">
        <Plus className="h-4 w-4 mr-2" />
        Novo Título
      </Button>
    </div>
  );
}

// ============================================================================
// TITULO DETAIL PANEL (inline, not dialog)
// ============================================================================

function TituloDetailPanel({ 
  tituloId, 
  onClose, 
  onBaixar,
  onEdit,
  isMobile = false
}: { 
  tituloId: string; 
  onClose: () => void;
  onBaixar: () => void;
  onEdit: () => void;
  isMobile?: boolean;
}) {
  const [activeTab, setActiveTab] = useState('dados');
  const { data: titulo, isLoading } = trpc.titulos.getById.useQuery(tituloId);
  const utils = trpc.useUtils();

  const estornarMutation = trpc.titulos.estornarBaixa.useMutation({
    onSuccess: (data) => {
      toast.success(`Baixa estornada. Título agora está ${data.novoStatus}`);
      utils.titulos.getById.invalidate(tituloId);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleEstornar = (baixaId: string) => {
    const motivo = prompt('Informe o motivo do estorno (mínimo 10 caracteres):');
    if (motivo && motivo.length >= 10) {
      estornarMutation.mutate({ baixaId, motivo });
    } else if (motivo) {
      toast.error('Motivo deve ter no mínimo 10 caracteres');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!titulo) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Título não encontrado</p>
        <Button onClick={onClose} className="mt-4" variant="outline">Voltar</Button>
      </div>
    );
  }

  const isPagar = titulo.tipo === 'pagar';
  const statusInfo = statusConfig[titulo.status] || statusConfig.rascunho;
  const isVencido = new Date(titulo.dataVencimento) < new Date() && !['quitado', 'cancelado'].includes(titulo.status);
  const canBaixar = ['aprovado', 'parcial', 'vencido'].includes(titulo.status) && titulo.saldoPendente > 0;
  const canEdit = !['quitado', 'cancelado'].includes(titulo.status);
  const headerBg = isPagar ? 'from-rose-500 to-red-600' : 'from-emerald-500 to-teal-600';

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (isMobile) {
      return (
        <div className="fixed inset-0 z-50 flex justify-end pt-16 lg:pt-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          {children}
        </div>
      );
    }
    return <>{children}</>;
  };

  return (
    <Wrapper>
      <div className={cn(
        "bg-background overflow-hidden flex flex-col h-full",
        isMobile && "relative w-full max-w-2xl shadow-2xl animate-in slide-in-from-right duration-300"
      )}>
        {/* Header colorido */}
        <div className={cn('text-white p-6 shrink-0 relative', `bg-gradient-to-br ${headerBg}`)}>
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Fechar detalhes"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              {isPagar ? (
                <ArrowDownRight className="h-7 w-7" />
              ) : (
                <ArrowUpRight className="h-7 w-7" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="border-white/40 text-white text-xs">
                  {isPagar ? 'A Pagar' : 'A Receber'}
                </Badge>
                <Badge className={cn('text-xs', statusInfo.bgColor, statusInfo.color)}>
                  {statusInfo.label}
                </Badge>
                {isVencido && titulo.status !== 'vencido' && (
                  <Badge className="bg-amber-500 text-white text-xs">Vencido</Badge>
                )}
              </div>
              <p className="text-2xl font-bold mt-2">{formatCurrency(titulo.valorLiquido)}</p>
              <p className="text-sm text-white/80 truncate mt-1">{titulo.descricao}</p>
            </div>
          </div>

          {/* Quick info row */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-lg font-bold">{formatDate(titulo.dataVencimento)}</div>
              <div className="text-[10px] text-white/70">Vencimento</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{formatDate(titulo.dataCompetencia)}</div>
              <div className="text-[10px] text-white/70">Competência</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{titulo.baixas?.length || 0}</div>
              <div className="text-[10px] text-white/70">Baixas</div>
            </div>
          </div>
        </div>

        {/* Content with Tabs */}
        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="px-4 pt-4 border-b sticky top-0 bg-background z-10">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="dados" className="text-xs">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />Dados
                </TabsTrigger>
                <TabsTrigger value="baixas" className="text-xs">
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" />Baixas
                </TabsTrigger>
                <TabsTrigger value="valores" className="text-xs">
                  <Wallet className="h-3.5 w-3.5 mr-1.5" />Valores
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              {/* Tab: Dados */}
              <TabsContent value="dados" className="mt-0 space-y-4">
                {/* Pessoa */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Building2 className="h-3 w-3" />
                    {isPagar ? 'Fornecedor/Credor' : 'Doador/Pagador'}
                  </div>
                  <p className="font-medium text-sm">
                    {titulo.pessoa?.nome || <span className="text-muted-foreground italic">Não informado</span>}
                  </p>
                </div>

                {/* Natureza */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <FileText className="h-3 w-3" />
                    Natureza
                  </div>
                  <p className="font-medium text-sm">{naturezaLabels[titulo.natureza] || titulo.natureza}</p>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">Emissão</p>
                    <p className="font-medium text-sm">{formatDate(titulo.dataEmissao)}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">Competência</p>
                    <p className="font-medium text-sm">{formatDate(titulo.dataCompetencia)}</p>
                  </div>
                  <div className={cn('p-3 rounded-lg', isVencido ? 'bg-rose-100' : 'bg-muted/50')}>
                    <p className="text-[10px] text-muted-foreground">Vencimento</p>
                    <p className={cn('font-medium text-sm', isVencido && 'text-rose-700')}>
                      {formatDate(titulo.dataVencimento)}
                    </p>
                  </div>
                </div>

                {/* Documento */}
                {(titulo.numeroDocumento || titulo.serieDocumento) && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-[10px] text-muted-foreground mb-1">Documento Fiscal</p>
                    <p className="font-medium text-sm">
                      {titulo.numeroDocumento}
                      {titulo.serieDocumento && <span className="text-muted-foreground"> (Série {titulo.serieDocumento})</span>}
                    </p>
                  </div>
                )}

                {/* Observações */}
                {titulo.observacoes && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-[10px] text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm whitespace-pre-wrap">{titulo.observacoes}</p>
                  </div>
                )}

                {/* Conta Contábil */}
                {titulo.contaContabil && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-[10px] text-muted-foreground mb-1">Conta Contábil</p>
                    <p className="text-sm font-mono">
                      {titulo.contaContabil.codigo} - {titulo.contaContabil.nome}
                    </p>
                  </div>
                )}

                {/* Parcela */}
                {titulo.parcelaNumero && (
                  <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
                    <p className="text-sm font-medium text-violet-700">
                      Parcela {titulo.parcelaNumero} de {titulo.parcelaTotal}
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Tab: Baixas */}
              <TabsContent value="baixas" className="mt-0 space-y-4">
                {!titulo.baixas || titulo.baixas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">Nenhuma baixa registrada</p>
                    {canBaixar && (
                      <Button size="sm" className="mt-4" onClick={onBaixar}>
                        <Plus className="h-4 w-4 mr-2" />
                        Registrar Primeira Baixa
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {titulo.baixas.map((baixa: any) => {
                      const totalBaixa = Number(baixa.valorPago) + Number(baixa.valorJuros) + Number(baixa.valorMulta) - Number(baixa.valorDesconto);
                      const isEstorno = baixa.estorno;

                      return (
                        <div
                          key={baixa.id}
                          className={cn(
                            'p-3 rounded-lg border flex items-center gap-3',
                            isEstorno && 'bg-rose-50/50 border-rose-200'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                            isEstorno ? 'bg-rose-100' : 'bg-emerald-100'
                          )}>
                            {isEstorno ? (
                              <History className="h-4 w-4 text-rose-600" />
                            ) : (
                              <Check className="h-4 w-4 text-emerald-600" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{formatDate(baixa.dataPagamento)}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {formaPagamentoLabels[baixa.formaPagamento] || baixa.formaPagamento}
                              </Badge>
                              {isEstorno && (
                                <Badge className="bg-rose-100 text-rose-700 text-[10px]">Estorno</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {baixa.contaFinanceira?.nome || 'Conta não especificada'}
                            </p>
                            {baixa.estornoMotivo && (
                              <p className="text-xs text-rose-600 mt-1">Motivo: {baixa.estornoMotivo}</p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <p className={cn(
                              'font-mono font-bold text-sm',
                              isEstorno ? 'text-rose-600' : 'text-emerald-600'
                            )}>
                              {isEstorno ? '-' : '+'}{formatCurrency(totalBaixa)}
                            </p>
                          </div>

                          {!isEstorno && titulo.status !== 'cancelado' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-rose-600 hover:bg-rose-50"
                              onClick={() => handleEstornar(baixa.id)}
                              disabled={estornarMutation.isPending}
                            >
                              <History className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Valores */}
              <TabsContent value="valores" className="mt-0 space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 text-sm font-medium flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Composição do Valor
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Valor Original</span>
                      <span className="font-mono">{formatCurrency(titulo.valorOriginal)}</span>
                    </div>
                    {Number(titulo.valorDesconto) > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600">
                        <span>(-) Desconto</span>
                        <span className="font-mono">- {formatCurrency(titulo.valorDesconto)}</span>
                      </div>
                    )}
                    {Number(titulo.valorAcrescimo) > 0 && (
                      <div className="flex justify-between text-sm text-rose-600">
                        <span>(+) Acréscimo</span>
                        <span className="font-mono">+ {formatCurrency(titulo.valorAcrescimo)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-medium pt-2 border-t">
                      <span>Valor Líquido</span>
                      <span className="font-mono">{formatCurrency(titulo.valorLiquido)}</span>
                    </div>
                    
                    {titulo.totalBaixado > 0 && (
                      <>
                        <div className="flex justify-between text-sm text-emerald-600 pt-2">
                          <span>(-) Já Pago</span>
                          <span className="font-mono">- {formatCurrency(titulo.totalBaixado)}</span>
                        </div>
                        <div className={cn(
                          'flex justify-between text-sm font-bold pt-2 border-t',
                          titulo.saldoPendente > 0 ? 'text-amber-600' : 'text-emerald-600'
                        )}>
                          <span>Saldo Pendente</span>
                          <span className="font-mono">{formatCurrency(titulo.saldoPendente)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t shrink-0 flex justify-between gap-3">
          {canEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          {canBaixar && (
            <Button onClick={onBaixar} className={isPagar ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}>
              <CreditCard className="h-4 w-4 mr-2" />
              {isPagar ? 'Registrar Pagamento' : 'Registrar Recebimento'}
            </Button>
          )}
        </div>
      </div>
    </Wrapper>
  );
}

// ============================================================================
// PÁGINA PRINCIPAL - MASTER DETAIL
// ============================================================================

export default function TitulosCrud() {
  // Estados
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTituloId, setSelectedTituloId] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [baixaOpen, setBaixaOpen] = useState(false);
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [editMode, setEditMode] = useState(false);

  const utils = trpc.useUtils();

  // Query de listagem
  const tipoQuery = filtroTipo === 'receber' ? 'receber' : filtroTipo === 'pagar' ? 'pagar' : undefined;
  const statusQuery = filtroTipo === 'vencidos' ? 'vencido' : statusFilter !== 'all' ? statusFilter : undefined;

  const { data, isLoading, refetch } = trpc.titulos.list.useQuery({
    tipo: tipoQuery as any,
    status: statusQuery as any,
    search: searchTerm || undefined,
    page,
    limit: 20,
  });

  const { data: stats } = trpc.titulos.stats.useQuery();

  const cancelarMutation = trpc.titulos.cancelar.useMutation({
    onSuccess: () => {
      toast.success('Título cancelado');
      utils.titulos.list.invalidate();
      utils.titulos.stats.invalidate();
      setSelectedTituloId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const titulos = data?.titulos || [];
  const totalPages = data?.pages || 1;

  // Handlers
  const handleNovoTitulo = () => {
    setWizardOpen(true);
  };

  const handleSelectTitulo = (titulo: any) => {
    setSelectedTituloId(titulo.id);
    if (window.innerWidth < 1024) {
      setShowMobileDetail(true);
    }
  };

  const handleCloseMobileDetail = () => {
    setShowMobileDetail(false);
    setSelectedTituloId(null);
  };

  const handleBaixar = () => {
    if (selectedTituloId) {
      setBaixaOpen(true);
    }
  };

  const handleEdit = () => {
    if (selectedTituloId) {
      setEditMode(true);
      setFormOpen(true);
    }
  };

  const handleConfirmarCancelamento = () => {
    if (motivoCancelamento.length < 10) {
      toast.error('Motivo deve ter no mínimo 10 caracteres');
      return;
    }
    if (selectedTituloId) {
      cancelarMutation.mutate({ id: selectedTituloId, motivo: motivoCancelamento });
      setCancelarOpen(false);
      setMotivoCancelamento('');
    }
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] lg:h-[calc(100vh-theme(spacing.8))] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <PageHeader
          title="Contas a Pagar e Receber"
          description="Gestão de títulos financeiros - Regime de competência"
          icon={<Receipt className="h-8 w-8 text-primary" />}
        />
        <Button onClick={handleNovoTitulo} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Título</span>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="mb-4 shrink-0">
        <QuickStats stats={stats} filtroTipo={filtroTipo} setFiltroTipo={(v) => { setFiltroTipo(v); setPage(1); }} />
      </div>

      {/* Master-Detail Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Lista (Master) */}
        <Card className="lg:col-span-5 xl:col-span-4 flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 shrink-0 border-b">
            <div className="space-y-3">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição ou pessoa..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  className="pl-10 h-9"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filtros inline */}
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    {Object.entries(statusConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => refetch()}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Resumo financeiro */}
              <div className="flex items-center justify-between text-xs text-muted-foreground p-2 bg-slate-50 rounded-lg">
                <span>{data?.total || 0} títulos</span>
                <span>
                  <span className="text-emerald-600 font-medium">Receber: {formatCurrencyCompact(data?.totalReceber || 0)}</span>
                  {' · '}
                  <span className="text-rose-600 font-medium">Pagar: {formatCurrencyCompact(data?.totalPagar || 0)}</span>
                </span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-2">
            <TitulosList 
              titulos={titulos} 
              selectedId={selectedTituloId} 
              onSelect={handleSelectTitulo}
              isLoading={isLoading}
            />
          </CardContent>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="p-3 border-t shrink-0">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={data?.total || 0}
                itemsShown={titulos.length}
                onPageChange={setPage}
                itemLabel="títulos"
              />
            </div>
          )}
        </Card>

        {/* Detalhes (Detail) - Desktop */}
        <Card className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col overflow-hidden">
          {selectedTituloId ? (
            <TituloDetailPanel 
              tituloId={selectedTituloId} 
              onClose={() => setSelectedTituloId(null)}
              onBaixar={handleBaixar}
              onEdit={handleEdit}
            />
          ) : (
            <EmptySelection onNewTitulo={handleNovoTitulo} />
          )}
        </Card>
      </div>

      {/* Detail Mobile Overlay */}
      {showMobileDetail && selectedTituloId && (
        <div className="lg:hidden">
          <TituloDetailPanel 
            tituloId={selectedTituloId} 
            onClose={handleCloseMobileDetail}
            onBaixar={handleBaixar}
            onEdit={handleEdit}
            isMobile
          />
        </div>
      )}

      {/* Wizard: Novo Título */}
      <TituloWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={() => {
          utils.titulos.list.invalidate();
          utils.titulos.stats.invalidate();
        }}
      />

      {/* Dialog: Editar Título */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Título</DialogTitle>
          </DialogHeader>
          <TituloForm
            tituloId={selectedTituloId}
            onSuccess={() => {
              setFormOpen(false);
              utils.titulos.list.invalidate();
              utils.titulos.stats.invalidate();
            }}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Baixa */}
      <Dialog open={baixaOpen} onOpenChange={setBaixaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Baixa</DialogTitle>
          </DialogHeader>
          {selectedTituloId && (
            <BaixaForm
              tituloId={selectedTituloId}
              onSuccess={() => {
                setBaixaOpen(false);
                utils.titulos.list.invalidate();
                utils.titulos.stats.invalidate();
                utils.titulos.getById.invalidate(selectedTituloId);
              }}
              onCancel={() => setBaixaOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Cancelar */}
      <Dialog open={cancelarOpen} onOpenChange={setCancelarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Cancelar Título
            </DialogTitle>
            <DialogDescription>
              Esta ação irá cancelar o título permanentemente. Informe o motivo do cancelamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label htmlFor="motivo-cancelamento">
                Motivo do cancelamento <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="motivo-cancelamento"
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Descreva o motivo do cancelamento (mínimo 10 caracteres)..."
                rows={3}
                className="mt-1.5"
                autoFocus
              />
              {motivoCancelamento.length > 0 && motivoCancelamento.length < 10 && (
                <p className="text-xs text-rose-500 mt-1" role="alert">
                  Faltam {10 - motivoCancelamento.length} caracteres
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelarOpen(false)}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmarCancelamento}
              disabled={motivoCancelamento.length < 10 || cancelarMutation.isPending}
            >
              {cancelarMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
