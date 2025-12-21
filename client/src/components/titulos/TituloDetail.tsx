import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Calendar,
  FileText,
  CreditCard,
  Edit2,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wallet,
  X,
  History,
  Info,
  XCircle,
  Ban,
} from 'lucide-react';

// ============================================================================
// CONSTANTES
// ============================================================================

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  rascunho: { label: 'Rascunho', color: 'text-slate-600', bgColor: 'bg-slate-100', icon: FileText },
  pendente_aprovacao: { label: 'Aguardando Aprovação', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: CheckCircle2 },
  parcial: { label: 'Parcialmente Pago', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: CreditCard },
  quitado: { label: 'Quitado', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'text-slate-400', bgColor: 'bg-slate-100', icon: XCircle },
  vencido: { label: 'Vencido', color: 'text-rose-600', bgColor: 'bg-rose-100', icon: AlertTriangle },
};

const naturezaLabels: Record<string, string> = {
  contribuicao: 'Contribuição/Mensalidade',
  doacao: 'Doação',
  evento: 'Evento',
  convenio: 'Convênio/Subvenção',
  servico: 'Serviço',
  utilidade: 'Utilidade',
  taxa: 'Taxa/Tarifa',
  imposto: 'Imposto',
  material: 'Material',
  outros: 'Outros',
};

const formaPagamentoLabels: Record<string, { label: string; icon: string }> = {
  dinheiro: { label: 'Dinheiro', icon: '💵' },
  pix: { label: 'PIX', icon: '📱' },
  ted: { label: 'TED', icon: '🏦' },
  doc: { label: 'DOC', icon: '🏦' },
  boleto: { label: 'Boleto', icon: '📄' },
  debito: { label: 'Cartão Débito', icon: '💳' },
  credito: { label: 'Cartão Crédito', icon: '💳' },
  cheque: { label: 'Cheque', icon: '📝' },
};

function formatCurrency(value: number | string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('pt-BR', { 
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
}

interface TituloDetailProps {
  tituloId: string;
  onClose: () => void;
  onBaixar: () => void;
  onEdit: () => void;
}

export default function TituloDetail({ tituloId, onClose, onBaixar, onEdit }: TituloDetailProps) {
  const [activeTab, setActiveTab] = useState('info');

  const utils = trpc.useUtils();
  const { data: titulo, isLoading, error } = trpc.titulos.getById.useQuery(tituloId);

  const estornarMutation = trpc.titulos.estornarBaixa.useMutation({
    onSuccess: (data) => {
      toast.success(`Baixa estornada. Título agora está ${data.novoStatus}`);
      utils.titulos.getById.invalidate(tituloId);
      utils.titulos.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelarMutation = trpc.titulos.cancelar.useMutation({
    onSuccess: () => {
      toast.success('Título cancelado');
      utils.titulos.getById.invalidate(tituloId);
      utils.titulos.list.invalidate();
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

  const handleCancelar = () => {
    const motivo = prompt('Informe o motivo do cancelamento:');
    if (motivo && motivo.length >= 5) {
      cancelarMutation.mutate({ id: tituloId, motivo });
    } else if (motivo) {
      toast.error('Motivo deve ter no mínimo 5 caracteres');
    }
  };

  // Check if we're in mobile context
  const isMobileOverlay = typeof window !== 'undefined' && window.innerWidth < 1024;

  // Wrapper component based on context
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (isMobileOverlay) {
      return (
        <div className="fixed inset-0 z-50 flex justify-end pt-16 lg:pt-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          {children}
        </div>
      );
    }
    return <>{children}</>;
  };

  if (isLoading) {
    if (isMobileOverlay) {
      return (
        <Wrapper>
          <div className="relative w-full max-w-2xl bg-background shadow-2xl animate-in slide-in-from-right duration-300 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        </Wrapper>
      );
    }
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !titulo) {
    if (isMobileOverlay) {
      return (
        <Wrapper>
          <div className="relative w-full max-w-2xl bg-background shadow-2xl p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-medium">Erro ao carregar título</p>
            <Button onClick={onClose} className="mt-4">Fechar</Button>
          </div>
        </Wrapper>
      );
    }
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Erro ao carregar título</p>
        <Button onClick={onClose} className="mt-4" variant="outline">Voltar</Button>
      </div>
    );
  }

  const isPagar = titulo.tipo === 'pagar';
  const statusInfo = statusConfig[titulo.status] || statusConfig.rascunho;
  const isVencido = new Date(titulo.dataVencimento) < new Date() && !['quitado', 'cancelado'].includes(titulo.status);
  const canBaixar = ['aprovado', 'parcial', 'vencido'].includes(titulo.status) && titulo.saldoPendente > 0;
  const canEdit = !['quitado', 'cancelado'].includes(titulo.status);
  const canCancel = !['quitado', 'cancelado'].includes(titulo.status);

  const headerBg = isPagar 
    ? 'from-rose-500 to-red-600' 
    : 'from-emerald-500 to-teal-600';

  return (
    <Wrapper>
      <div className={cn(
        "bg-background overflow-hidden flex flex-col h-full",
        isMobileOverlay && "relative w-full max-w-2xl shadow-2xl animate-in slide-in-from-right duration-300"
      )}>
        {/* Header */}
        <div className={cn('text-white p-6 shrink-0', `bg-gradient-to-br ${headerBg}`)}>
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
              <p className="text-sm text-white/80">{isPagar ? 'Conta a Pagar' : 'Conta a Receber'}</p>
              <p className="text-2xl font-bold truncate">{formatCurrency(titulo.valorLiquido)}</p>
              
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="border-white/40 text-white text-xs">
                  <statusInfo.icon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
                {isVencido && titulo.status !== 'vencido' && (
                  <Badge className="bg-white/20 text-white text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Vencido
                  </Badge>
                )}
                {titulo.parcelaNumero && (
                  <Badge variant="outline" className="border-white/40 text-white text-xs">
                    Parcela {titulo.parcelaNumero}/{titulo.parcelaTotal}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick Values */}
          {titulo.saldoPendente > 0 && titulo.saldoPendente !== Number(titulo.valorLiquido) && (
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center bg-white/10 rounded-lg p-2">
                <div className="text-lg font-bold">{formatCurrency(titulo.totalBaixado)}</div>
                <div className="text-xs text-white/70">Já Pago</div>
              </div>
              <div className="text-center bg-white/10 rounded-lg p-2">
                <div className="text-lg font-bold">{formatCurrency(titulo.saldoPendente)}</div>
                <div className="text-xs text-white/70">Pendente</div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="px-4 pt-4 border-b sticky top-0 bg-background z-10">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="info" className="text-xs">
                  <Info className="h-3.5 w-3.5 mr-1.5" />Informações
                </TabsTrigger>
                <TabsTrigger value="valores" className="text-xs">
                  <Wallet className="h-3.5 w-3.5 mr-1.5" />Valores
                </TabsTrigger>
                <TabsTrigger value="historico" className="text-xs">
                  <History className="h-3.5 w-3.5 mr-1.5" />Baixas
                  {titulo.baixas.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                      {titulo.baixas.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              {/* Tab: Informações */}
              <TabsContent value="info" className="mt-0 space-y-4">
                {/* Descrição */}
                <Card>
                  <CardContent className="py-4">
                    <p className="font-medium">{titulo.descricao}</p>
                    {titulo.observacoes && (
                      <p className="text-sm text-muted-foreground mt-2">{titulo.observacoes}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Pessoa */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {isPagar ? 'Fornecedor/Credor' : 'Doador/Pagador'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    {titulo.pessoa ? (
                      <p className="font-medium">{titulo.pessoa.nome}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Não informado</p>
                    )}
                  </CardContent>
                </Card>

                {/* Natureza */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Natureza
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="font-medium">{naturezaLabels[titulo.natureza] || titulo.natureza}</p>
                  </CardContent>
                </Card>

                {/* Datas */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Datas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Emissão</p>
                        <p className="font-medium text-sm">{formatDate(titulo.dataEmissao)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Competência</p>
                        <p className="font-medium text-sm">{formatDate(titulo.dataCompetencia)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Vencimento</p>
                        <p className={cn('font-medium text-sm', isVencido && 'text-rose-600')}>
                          {formatDate(titulo.dataVencimento)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Documento */}
                {(titulo.numeroDocumento || titulo.serieDocumento) && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Documento Fiscal
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="font-medium">
                        {titulo.numeroDocumento}
                        {titulo.serieDocumento && <span className="text-muted-foreground"> (Série {titulo.serieDocumento})</span>}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Conta Contábil */}
                {titulo.contaContabil && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Conta Contábil</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="font-mono text-sm">
                        {titulo.contaContabil.codigo} - {titulo.contaContabil.nome}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab: Valores */}
              <TabsContent value="valores" className="mt-0 space-y-4">
                <Card>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Valor Original</span>
                      <span className="font-mono font-medium">{formatCurrency(titulo.valorOriginal)}</span>
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
                    
                    <div className="flex justify-between text-sm font-medium pt-3 border-t">
                      <span>Valor Líquido</span>
                      <span className="font-mono">{formatCurrency(titulo.valorLiquido)}</span>
                    </div>
                    
                    {titulo.totalBaixado > 0 && (
                      <>
                        <div className="flex justify-between text-sm text-emerald-600">
                          <span>(-) Já Pago</span>
                          <span className="font-mono">- {formatCurrency(titulo.totalBaixado)}</span>
                        </div>
                        <div className={cn(
                          'flex justify-between text-sm font-bold pt-3 border-t',
                          titulo.saldoPendente > 0 ? 'text-amber-600' : 'text-emerald-600'
                        )}>
                          <span>Saldo Pendente</span>
                          <span className="font-mono">{formatCurrency(titulo.saldoPendente)}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Histórico de Baixas */}
              <TabsContent value="historico" className="mt-0 space-y-4">
                {titulo.baixas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">Nenhuma baixa registrada</p>
                    <p className="text-sm mt-1">Registre um pagamento para este título</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {titulo.baixas.map((baixa) => {
                      const totalBaixa = Number(baixa.valorPago) + Number(baixa.valorJuros) + Number(baixa.valorMulta) - Number(baixa.valorDesconto);
                      const isEstorno = baixa.estorno;
                      const fp = formaPagamentoLabels[baixa.formaPagamento] || { label: baixa.formaPagamento, icon: '💳' };

                      return (
                        <Card key={baixa.id} className={cn(isEstorno && 'border-rose-200 bg-rose-50/50')}>
                          <CardContent className="py-3">
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg',
                                isEstorno ? 'bg-rose-100' : 'bg-emerald-100'
                              )}>
                                {isEstorno ? <RotateCcw className="h-5 w-5 text-rose-600" /> : fp.icon}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">
                                    {formatDate(baixa.dataPagamento)}
                                  </span>
                                  <Badge variant="outline" className="text-[10px]">{fp.label}</Badge>
                                  {isEstorno && (
                                    <Badge className="bg-rose-100 text-rose-700 text-[10px]">Estornado</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {baixa.contaFinanceira?.nome || 'Conta não especificada'}
                                  {baixa.documentoReferencia && ` · ${baixa.documentoReferencia}`}
                                </p>
                                {baixa.estornoMotivo && (
                                  <p className="text-xs text-rose-600 mt-1">Motivo: {baixa.estornoMotivo}</p>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <p className={cn(
                                  'font-mono font-bold',
                                  isEstorno ? 'text-rose-600' : 'text-emerald-600'
                                )}>
                                  {isEstorno ? '-' : '+'}{formatCurrency(totalBaixa)}
                                </p>
                              </div>
                            </div>

                            {/* Botão estornar */}
                            {!isEstorno && titulo.status !== 'cancelado' && (
                              <div className="flex justify-end mt-3 pt-3 border-t border-dashed">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => handleEstornar(baixa.id)}
                                  disabled={estornarMutation.isPending}
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Estornar
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 border-t bg-background p-4">
          <div className="flex justify-between gap-3">
            <div className="flex gap-2">
              {canEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              {canCancel && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={handleCancelar}
                  disabled={cancelarMutation.isPending}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>

            {canBaixar && (
              <Button onClick={onBaixar} className={cn(
                isPagar ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              )}>
                <CreditCard className="h-4 w-4 mr-2" />
                Registrar {isPagar ? 'Pagamento' : 'Recebimento'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
