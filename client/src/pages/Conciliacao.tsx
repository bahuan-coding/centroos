import { useState } from 'react';
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  CreditCard, 
  Receipt, 
  BookOpen,
  Users,
  AlertTriangle,
  X,
  Link2,
  ChevronRight,
  Search,
  Ban,
  Copy,
  Sparkles,
  TrendingUp,
  Building2,
  Wallet,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ResponsiveTable, TableCardView } from '@/components/ui/table';
import { PageHeader, FilterBar, StatsGrid } from '@/components/ui/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/glass-card';
import { StatCard, StatCardSkeleton } from '@/components/ui/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  conciliado: { label: 'Conciliado', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  ignorado: { label: 'Ignorado', color: 'bg-slate-100 text-slate-700', icon: XCircle },
  duplicado: { label: 'Duplicado', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

const severidadeConfig: Record<string, { color: string; bg: string }> = {
  erro: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  aviso: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  info: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
};

// ==================== DRAWER DE CONCILIAÇÃO ====================
function ConciliacaoDrawer({ linha, onClose }: { linha: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [motivoIgnorar, setMotivoIgnorar] = useState('');
  
  const { data: sugestoes, isLoading } = trpc.extratos.sugestoesConciliacao.useQuery(
    { linhaId: linha.id },
    { enabled: !!linha.id }
  );
  
  const conciliarMutation = trpc.extratos.conciliar.useMutation({
    onSuccess: () => {
      utils.extratos.linhas.invalidate();
      utils.extratos.stats.invalidate();
      utils.extratos.inconsistencias.invalidate();
      onClose();
    },
  });
  
  const ignorarMutation = trpc.extratos.ignorar.useMutation({
    onSuccess: () => {
      utils.extratos.linhas.invalidate();
      utils.extratos.stats.invalidate();
      utils.extratos.inconsistencias.invalidate();
      onClose();
    },
  });
  
  const duplicadoMutation = trpc.extratos.marcarDuplicado.useMutation({
    onSuccess: () => {
      utils.extratos.linhas.invalidate();
      utils.extratos.stats.invalidate();
      onClose();
    },
  });

  const handleConciliar = (tituloId: string, metodo: 'manual' | 'sugerido') => {
    conciliarMutation.mutate({
      linhaId: linha.id,
      tituloId,
      tipoVinculo: 'titulo',
      metodo,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end pt-16">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-xl bg-background shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto sm:rounded-tl-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-cyan-500 to-blue-600 text-white p-4 sm:p-6 z-10 sm:rounded-tl-2xl">
          <button 
            onClick={onClose} 
            className="absolute top-3 right-3 p-3 rounded-full hover:bg-white/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <Link2 className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">Conciliar Transação</h2>
              <p className="text-white/80 text-sm mt-1 truncate">{linha.descricaoOriginal || linha.descricao}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatDate(linha.dataMovimento)}</div>
              <div className="text-xs text-white/70">Data</div>
            </div>
            <div className="text-center">
              <div className={cn(
                "text-2xl font-bold",
                linha.tipo === 'credito' ? 'text-green-200' : 'text-red-200'
              )}>
                {linha.tipo === 'credito' ? '+' : '-'}{formatCurrency(Math.abs(Number(linha.valor)))}
              </div>
              <div className="text-xs text-white/70">Valor</div>
            </div>
            <div className="text-center">
              <Badge className="bg-white/20 text-white">
                {linha.tipo === 'credito' ? 'Crédito' : 'Débito'}
              </Badge>
              <div className="text-xs text-white/70 mt-1">Tipo</div>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Sugestões de Match */}
              {sugestoes?.sugestoes && sugestoes.sugestoes.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-500" />
                    Sugestões de Vinculação ({sugestoes.sugestoes.length})
                  </h3>
                  <div className="space-y-2">
                    {sugestoes.sugestoes.map((sug: any) => (
                      <button
                        key={sug.id}
                        onClick={() => handleConciliar(sug.id, 'sugerido')}
                        disabled={conciliarMutation.isPending}
                        className={cn(
                          "w-full p-4 rounded-lg border transition-all text-left",
                          "hover:border-cyan-400 hover:bg-cyan-50",
                          sug.confianca >= 90 && "border-green-300 bg-green-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{sug.descricao}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {sug.pessoaNome || 'Sem doador'} • {formatDate(sug.data)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-emerald-600">{formatCurrency(Number(sug.valor))}</p>
                            <Badge 
                              variant={sug.confianca >= 90 ? 'default' : 'secondary'} 
                              className="text-[10px] mt-1"
                            >
                              {Math.round(sug.confianca)}% match
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 px-4 rounded-lg bg-slate-50 border border-dashed border-slate-200">
                  <Search className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma sugestão automática encontrada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use as opções abaixo para classificar esta transação
                  </p>
                </div>
              )}

              {/* Ações Manuais */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Ações Manuais</h3>
                
                {/* Ignorar */}
                <div className="p-4 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4 text-slate-500" />
                    <span className="font-medium text-sm">Ignorar Transação</span>
                  </div>
                  <Textarea
                    placeholder="Motivo para ignorar (opcional)..."
                    value={motivoIgnorar}
                    onChange={(e) => setMotivoIgnorar(e.target.value)}
                    className="text-sm"
                    rows={2}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => ignorarMutation.mutate({ linhaId: linha.id, motivo: motivoIgnorar })}
                    disabled={ignorarMutation.isPending}
                    className="w-full"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Ignorar
                  </Button>
                </div>

                {/* Marcar como Duplicado */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => duplicadoMutation.mutate({ linhaId: linha.id })}
                  disabled={duplicadoMutation.isPending}
                  className="w-full border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Marcar como Duplicado
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== CARDS DE CATEGORIAS DE INPUT ====================
function CategoriaInputCards({ statsAvancados }: { statsAvancados: any }) {
  const categorias = [
    {
      id: 'extratos',
      titulo: 'Extratos Bancários',
      descricao: 'OFX/CSV importados',
      icon: FileText,
      color: 'from-cyan-500 to-blue-600',
      bgLight: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
      total: statsAvancados?.extratos?.total || 0,
      pendentes: statsAvancados?.extratos?.pendentes || 0,
      valor: statsAvancados?.extratos?.valor || 0,
    },
    {
      id: 'contribuicoes',
      titulo: 'Contribuições',
      descricao: 'Títulos a receber',
      icon: TrendingUp,
      color: 'from-emerald-500 to-green-600',
      bgLight: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      total: statsAvancados?.contribuicoes?.total || 0,
      pendentes: statsAvancados?.contribuicoes?.pendentes || 0,
      valor: statsAvancados?.contribuicoes?.valor || 0,
    },
    {
      id: 'despesas',
      titulo: 'Despesas',
      descricao: 'Títulos a pagar',
      icon: CreditCard,
      color: 'from-red-500 to-rose-600',
      bgLight: 'bg-red-50',
      iconColor: 'text-red-600',
      total: statsAvancados?.despesas?.total || 0,
      pendentes: statsAvancados?.despesas?.pendentes || 0,
      valor: statsAvancados?.despesas?.valor || 0,
    },
    {
      id: 'baixas',
      titulo: 'Baixas',
      descricao: 'Pagamentos registrados',
      icon: Receipt,
      color: 'from-violet-500 to-purple-600',
      bgLight: 'bg-violet-50',
      iconColor: 'text-violet-600',
      total: statsAvancados?.baixas?.total || 0,
      pendentes: 0,
      valor: statsAvancados?.baixas?.valor || 0,
    },
    {
      id: 'lancamentos',
      titulo: 'Lançamentos Contábeis',
      descricao: 'Partidas dobradas',
      icon: BookOpen,
      color: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50',
      iconColor: 'text-amber-600',
      total: statsAvancados?.lancamentos?.total || 0,
      pendentes: statsAvancados?.lancamentos?.total - statsAvancados?.lancamentos?.efetivados || 0,
      valor: 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {categorias.map((cat) => {
        const Icon = cat.icon;
        return (
          <Card 
            key={cat.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] overflow-hidden",
              cat.pendentes > 0 && "ring-2 ring-amber-300"
            )}
          >
            <div className={cn("h-1.5 bg-gradient-to-r", cat.color)} />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", cat.bgLight)}>
                  <Icon className={cn("h-5 w-5", cat.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{cat.titulo}</p>
                  <p className="text-[10px] text-muted-foreground">{cat.descricao}</p>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold">{cat.total}</p>
                  <p className="text-[10px] text-muted-foreground">total</p>
                </div>
                {cat.pendentes > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                    {cat.pendentes} pendentes
                  </Badge>
                )}
              </div>
              {cat.valor > 0 && (
                <p className="text-xs text-muted-foreground mt-2 truncate">
                  {formatCurrencyCompact(cat.valor)}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ==================== PAINEL DE INCONSISTÊNCIAS ====================
function InconsistenciasPanel({ inconsistencias }: { inconsistencias: any[] }) {
  if (!inconsistencias || inconsistencias.length === 0) {
    return (
      <GlassCard className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center gap-4 p-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-800">Tudo em Ordem!</h3>
            <p className="text-sm text-green-600">Não há inconsistências para resolver.</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {inconsistencias.map((inc) => {
        const config = severidadeConfig[inc.severidade] || severidadeConfig.info;
        return (
          <GlassCard key={inc.codigo} className={cn("border", config.bg)}>
            <div className="flex items-start gap-4 p-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                inc.severidade === 'erro' ? 'bg-red-100' : 'bg-amber-100'
              )}>
                <AlertTriangle className={cn(
                  "h-5 w-5",
                  inc.severidade === 'erro' ? 'text-red-600' : 'text-amber-600'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-mono">{inc.codigo}</Badge>
                  <h3 className={cn("font-semibold text-sm", config.color)}>{inc.titulo}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{inc.descricao}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={cn("text-2xl font-bold", config.color)}>{inc.quantidade}</p>
                <p className="text-[10px] text-muted-foreground">itens</p>
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

// ==================== TABELA DE DOADORES SEM CPF ====================
function DoadoresSemCpfTable() {
  const { data: doadores = [], isLoading } = trpc.extratos.doadoresSemCpf.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (doadores.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <p className="font-medium text-green-700">Todos os doadores têm CPF!</p>
        <p className="text-sm text-muted-foreground mt-1">
          Não há pendências de cadastro fiscal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span className="font-semibold">{doadores.length} doadores sem CPF</span>
        </div>
        <Badge variant="outline" className="text-amber-700">
          Importante para recibos fiscais
        </Badge>
      </div>
      
      <ResponsiveTable stickyHeader density="compact">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Doador</TableHead>
              <TableHead className="text-center">Doações</TableHead>
              <TableHead className="text-right">Total Doado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doadores.map((doador: any) => (
              <TableRow key={doador.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <Users className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{doador.nome}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {doador.tipo === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{doador.totalDoacoes}</Badge>
                </TableCell>
                <TableCell className="text-right font-semibold text-emerald-600">
                  {formatCurrency(doador.valorTotal)}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Completar Cadastro
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ResponsiveTable>
    </div>
  );
}

// ==================== TRANSAÇÕES ÓRFÃS ====================
function TransacoesOrfasTable() {
  const { data: orfas = [], isLoading } = trpc.extratos.transacoesOrfas.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (orfas.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <p className="font-medium text-green-700">Nenhuma transação órfã!</p>
        <p className="text-sm text-muted-foreground mt-1">
          Todas as baixas estão corretamente vinculadas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <span className="font-semibold">{orfas.length} transações sem vínculo</span>
      </div>
      
      <ResponsiveTable stickyHeader density="compact">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orfas.map((orfa: any) => (
              <TableRow key={orfa.id}>
                <TableCell className="whitespace-nowrap">{formatDate(orfa.data)}</TableCell>
                <TableCell className="max-w-[200px] truncate">{orfa.descricao}</TableCell>
                <TableCell>{orfa.contaNome}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(orfa.valor)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ResponsiveTable>
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export default function Conciliacao() {
  const [statusFiltro, setStatusFiltro] = useState<string>('pendente');
  const [extratoFiltro, setExtratoFiltro] = useState<string>('');
  const [selectedLinha, setSelectedLinha] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('extratos');

  const { data: extratos = [] } = trpc.extratos.list.useQuery();
  const { data: linhas = [], isLoading } = trpc.extratos.linhas.useQuery({
    status: statusFiltro as any || undefined,
    extratoId: extratoFiltro || undefined,
  });
  const { data: stats, isLoading: loadingStats } = trpc.extratos.stats.useQuery();
  const { data: statsAvancados } = trpc.extratos.statsAvancados.useQuery();
  const { data: inconsistencias = [] } = trpc.extratos.inconsistencias.useQuery();

  const totalInconsistencias = inconsistencias.reduce((acc: number, i: any) => acc + i.quantidade, 0);

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Header */}
      <header className="animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-fluid-3xl font-bold text-foreground flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <ArrowLeftRight className="h-6 w-6 text-white" />
              </div>
              Hub de Conciliação
            </h1>
            <p className="text-fluid-sm text-muted-foreground mt-1">
              Centro de controle para vincular extratos, identificar inconsistências e manter dados íntegros
            </p>
          </div>
        </div>
      </header>

      {/* KPIs Principais */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loadingStats ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Total de Linhas"
              value={String(stats?.linhas || 0)}
              subtitle={`${stats?.extratos || 0} extratos`}
              icon={FileText}
              accentColor="primary"
              delay={1}
            />
            <StatCard
              title="Pendentes"
              value={String(stats?.pendentes || 0)}
              subtitle="aguardando conciliação"
              icon={Clock}
              accentColor="gold"
              delay={2}
            />
            <StatCard
              title="Conciliados"
              value={String(stats?.conciliados || 0)}
              subtitle="vinculados com sucesso"
              icon={CheckCircle2}
              accentColor="success"
              delay={3}
            />
            <StatCard
              title="Inconsistências"
              value={String(totalInconsistencias)}
              subtitle={`${inconsistencias.length} tipos`}
              icon={AlertTriangle}
              accentColor={totalInconsistencias > 0 ? 'danger' : 'success'}
              delay={4}
            />
          </>
        )}
      </section>

      {/* Cards de Categorias de Input */}
      <section className="animate-fade-in-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <GlassCard padding="md">
          <GlassCardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <GlassCardTitle>Categorias de Dados</GlassCardTitle>
            </div>
            <GlassCardDescription>
              Tipos de inputs disponíveis para conciliação
            </GlassCardDescription>
          </GlassCardHeader>
          <CategoriaInputCards statsAvancados={statsAvancados} />
        </GlassCard>
      </section>

      {/* Tabs de Conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="extratos" className="gap-2" aria-label="Extratos Bancários" title="Extratos Bancários">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Extratos</span>
            {stats?.pendentes ? (
              <Badge className="bg-amber-100 text-amber-700 text-[10px] ml-1">{stats.pendentes}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="inconsistencias" className="gap-2" aria-label="Inconsistências" title="Inconsistências">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Inconsistências</span>
            {totalInconsistencias > 0 && (
              <Badge className="bg-red-100 text-red-700 text-[10px] ml-1">{totalInconsistencias}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="doadores" className="gap-2" aria-label="Doadores sem CPF" title="Doadores sem CPF">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Sem CPF</span>
          </TabsTrigger>
          <TabsTrigger value="orfas" className="gap-2" aria-label="Transações Órfãs" title="Transações Órfãs">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Órfãs</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Extratos */}
        <TabsContent value="extratos" className="space-y-4">
          {/* Extratos Cards */}
          {extratos.length > 0 && (
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3">
              {extratos.map((item: any) => (
                <Card 
                  key={item.extrato.id} 
                  className={cn(
                    'cursor-pointer hover:border-cyan-400 transition-all duration-200 hover:shadow-md',
                    extratoFiltro === item.extrato.id && 'border-cyan-500 ring-2 ring-cyan-200'
                  )}
                  onClick={() => setExtratoFiltro(extratoFiltro === item.extrato.id ? '' : item.extrato.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-cyan-600" />
                      <CardTitle className="text-sm truncate">{item.conta?.nome || 'Conta'}</CardTitle>
                    </div>
                    <CardDescription className="text-[10px] truncate">{item.extrato.arquivoNome}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Período:</span>
                      <span>{formatDate(item.extrato.dataInicio)} - {formatDate(item.extrato.dataFim)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">Linhas:</span>
                      <span className="font-semibold">{item.extrato.totalLinhas}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Tabela de Linhas */}
          <Card>
            <CardHeader className="pb-3">
              <FilterBar showClear={!!(statusFiltro || extratoFiltro)} onClear={() => { setStatusFiltro(''); setExtratoFiltro(''); }}>
                <Select value={statusFiltro || 'all'} onValueChange={(v) => setStatusFiltro(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="conciliado">Conciliados</SelectItem>
                    <SelectItem value="ignorado">Ignorados</SelectItem>
                    <SelectItem value="duplicado">Duplicados</SelectItem>
                  </SelectContent>
                </Select>
              </FilterBar>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : linhas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhuma linha de extrato encontrada</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    <ResponsiveTable stickyHeader density="normal">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-center">Tipo</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {linhas.map((linha: any) => {
                            const config = statusConfig[linha.status] || statusConfig.pendente;
                            const Icon = config.icon;
                            return (
                              <TableRow 
                                key={linha.id}
                                className={cn(
                                  "cursor-pointer transition-colors",
                                  linha.status === 'pendente' && "hover:bg-cyan-50"
                                )}
                                onClick={() => linha.status === 'pendente' && setSelectedLinha(linha)}
                              >
                                <TableCell className="whitespace-nowrap text-sm font-medium">
                                  {formatDate(linha.dataMovimento)}
                                </TableCell>
                                <TableCell className="max-w-[250px] truncate text-sm">
                                  {linha.descricaoOriginal || linha.descricao}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={linha.tipo === 'credito' ? 'default' : 'secondary'} className="text-xs">
                                    {linha.tipo === 'credito' ? 'C' : 'D'}
                                  </Badge>
                                </TableCell>
                                <TableCell className={cn(
                                  'text-right font-mono font-semibold text-sm whitespace-nowrap',
                                  linha.tipo === 'credito' ? 'text-green-600' : 'text-red-600'
                                )}>
                                  {linha.tipo === 'credito' ? '+' : '-'}{formatCurrency(Math.abs(Number(linha.valor)))}
                                </TableCell>
                                <TableCell>
                                  <Badge className={cn('text-xs', config.color)}>
                                    <Icon className="h-3 w-3 mr-1" />
                                    {config.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {linha.status === 'pendente' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLinha(linha);
                                      }}
                                    >
                                      <Link2 className="h-3 w-3 mr-1" />
                                      Conciliar
                                    </Button>
                                  )}
                                  {linha.status === 'conciliado' && (
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ResponsiveTable>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden px-4">
                    <TableCardView
                      data={linhas}
                      keyExtractor={(l: any) => l.id}
                      renderCard={(linha: any) => {
                        const config = statusConfig[linha.status] || statusConfig.pendente;
                        const Icon = config.icon;
                        return (
                          <button
                            onClick={() => linha.status === 'pendente' && setSelectedLinha(linha)}
                            className="w-full text-left min-h-[44px] py-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted-foreground">{formatDate(linha.dataMovimento)}</p>
                                <p className="font-medium text-sm truncate">{linha.descricaoOriginal || linha.descricao}</p>
                              </div>
                              <span className={cn(
                                'font-mono font-bold text-sm whitespace-nowrap',
                                linha.tipo === 'credito' ? 'text-green-600' : 'text-red-600'
                              )}>
                                {linha.tipo === 'credito' ? '+' : '-'}{formatCurrency(Math.abs(Number(linha.valor)))}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <Badge className={cn('text-[10px]', config.color)}>
                                <Icon className="h-3 w-3 mr-1" />
                                {config.label}
                              </Badge>
                              {linha.status === 'pendente' && (
                                <ChevronRight className="h-4 w-4 text-cyan-500" />
                              )}
                            </div>
                          </button>
                        );
                      }}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Inconsistências */}
        <TabsContent value="inconsistencias">
          <GlassCard padding="md">
            <GlassCardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <GlassCardTitle>Painel de Inconsistências</GlassCardTitle>
              </div>
              <GlassCardDescription>
                Problemas identificados que precisam de atenção
              </GlassCardDescription>
            </GlassCardHeader>
            <InconsistenciasPanel inconsistencias={inconsistencias} />
          </GlassCard>
        </TabsContent>

        {/* Tab: Doadores sem CPF */}
        <TabsContent value="doadores">
          <GlassCard padding="md">
            <GlassCardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" />
                <GlassCardTitle>Doadores sem CPF</GlassCardTitle>
              </div>
              <GlassCardDescription>
                Pessoas que realizaram doações mas não possuem CPF cadastrado - importante para emissão de recibos fiscais
              </GlassCardDescription>
            </GlassCardHeader>
            <DoadoresSemCpfTable />
          </GlassCard>
        </TabsContent>

        {/* Tab: Transações Órfãs */}
        <TabsContent value="orfas">
          <GlassCard padding="md">
            <GlassCardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-amber-500" />
                <GlassCardTitle>Transações Órfãs</GlassCardTitle>
              </div>
              <GlassCardDescription>
                Baixas que não estão vinculadas a nenhuma conciliação bancária
              </GlassCardDescription>
            </GlassCardHeader>
            <TransacoesOrfasTable />
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* Drawer de Conciliação */}
      {selectedLinha && (
        <ConciliacaoDrawer linha={selectedLinha} onClose={() => setSelectedLinha(null)} />
      )}
    </div>
  );
}
