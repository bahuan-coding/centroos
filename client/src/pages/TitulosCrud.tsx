import { useState, useMemo } from 'react';
import {
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Eye,
  CreditCard,
  Check,
  X,
  Calendar,
  Building2,
  Clock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader, FilterBar } from '@/components/ui/page-header';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import TituloForm from '@/components/titulos/TituloForm';
import BaixaForm from '@/components/titulos/BaixaForm';
import TituloDetail from '@/components/titulos/TituloDetail';

// ============================================================================
// CONSTANTES
// ============================================================================

const tipoLabels: Record<string, { label: string; color: string; icon: typeof ArrowUpRight }> = {
  receber: { label: 'A Receber', color: 'text-emerald-600 bg-emerald-50', icon: ArrowUpRight },
  pagar: { label: 'A Pagar', color: 'text-rose-600 bg-rose-50', icon: ArrowDownRight },
};

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

// ============================================================================
// KPI CARD
// ============================================================================

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof ArrowUpRight;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const trendColors = {
    up: 'from-emerald-500 to-teal-600',
    down: 'from-rose-500 to-red-600',
    neutral: 'from-slate-500 to-slate-600',
  };

  return (
    <Card className="relative overflow-hidden">
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-5', trendColors[trend || 'neutral'])} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={cn('p-2 rounded-lg bg-gradient-to-br', trendColors[trend || 'neutral'])}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

export default function TitulosCrud() {
  // Estados
  const [tab, setTab] = useState<'todos' | 'receber' | 'pagar' | 'vencidos'>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [naturezaFilter, setNaturezaFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [mesAno, setMesAno] = useState<string>('');
  const [page, setPage] = useState(1);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [baixaOpen, setBaixaOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [selectedTituloId, setSelectedTituloId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const utils = trpc.useUtils();

  // Query de listagem
  const tipoQuery = tab === 'receber' ? 'receber' : tab === 'pagar' ? 'pagar' : undefined;
  const statusQuery = tab === 'vencidos' ? 'vencido' : statusFilter !== 'all' ? statusFilter : undefined;

  const { data, isLoading, refetch } = trpc.titulos.list.useQuery({
    tipo: tipoQuery as any,
    status: statusQuery as any,
    mesAno: mesAno || undefined,
    search: searchTerm || undefined,
    page,
    limit: 25,
  });

  const { data: stats } = trpc.titulos.stats.useQuery();

  // Mutations
  const aprovarMutation = trpc.titulos.aprovar.useMutation({
    onSuccess: () => {
      toast.success('Título aprovado');
      utils.titulos.list.invalidate();
      utils.titulos.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelarMutation = trpc.titulos.cancelar.useMutation({
    onSuccess: () => {
      toast.success('Título cancelado');
      utils.titulos.list.invalidate();
      utils.titulos.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Filtro local por natureza
  const titulosFiltrados = useMemo(() => {
    if (!data?.titulos) return [];
    if (naturezaFilter === 'all') return data.titulos;
    return data.titulos.filter((t) => t.natureza === naturezaFilter);
  }, [data?.titulos, naturezaFilter]);

  // Handlers
  const handleNovoTitulo = () => {
    setEditMode(false);
    setSelectedTituloId(null);
    setFormOpen(true);
  };

  const handleEditTitulo = (id: string) => {
    setSelectedTituloId(id);
    setEditMode(true);
    setFormOpen(true);
  };

  const handleVerTitulo = (id: string) => {
    setSelectedTituloId(id);
    setDetailOpen(true);
  };

  const handleBaixar = (id: string) => {
    setSelectedTituloId(id);
    setBaixaOpen(true);
  };

  const handleAprovar = (id: string) => {
    aprovarMutation.mutate({ id });
  };

  const handleCancelarClick = (id: string) => {
    setSelectedTituloId(id);
    setMotivoCancelamento('');
    setCancelarOpen(true);
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

  // Gerar meses para filtro
  const mesesDisponiveis = useMemo(() => {
    const meses = [];
    const hoje = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      meses.push({ value, label });
    }
    return meses;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Contas a Pagar e Receber"
        description="Gestão de títulos financeiros - Regime de competência"
        icon={<Receipt className="h-8 w-8 text-primary" />}
        actions={
          <Button onClick={handleNovoTitulo}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Título
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="A Receber"
          value={formatCurrency(stats?.totalReceber || 0)}
          subtitle={`${stats?.pendentes || 0} pendentes`}
          icon={ArrowUpRight}
          trend="up"
        />
        <KPICard
          title="A Pagar"
          value={formatCurrency(stats?.totalPagar || 0)}
          subtitle={`${stats?.quitados || 0} quitados`}
          icon={ArrowDownRight}
          trend="down"
        />
        <KPICard
          title="Saldo"
          value={formatCurrency(stats?.saldo || 0)}
          subtitle="Receber - Pagar"
          icon={Receipt}
          trend={(stats?.saldo || 0) >= 0 ? 'up' : 'down'}
        />
        <KPICard
          title="Total Títulos"
          value={String(stats?.total || 0)}
          icon={Calendar}
          trend="neutral"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'receber', label: 'A Receber', icon: ArrowUpRight },
          { key: 'pagar', label: 'A Pagar', icon: ArrowDownRight },
          { key: 'vencidos', label: 'Vencidos', icon: AlertTriangle },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key as any); setPage(1); }}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1.5',
              tab === t.key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.icon && <t.icon className="h-3.5 w-3.5" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="py-3">
          <FilterBar>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou pessoa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={mesAno || 'all'} onValueChange={(v) => setMesAno(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Competência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {mesesDisponiveis.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={naturezaFilter} onValueChange={setNaturezaFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Natureza" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(naturezaLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </FilterBar>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {data?.total || 0} título{(data?.total || 0) !== 1 && 's'}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Receber: {formatCurrency(data?.totalReceber || 0)} · Pagar: {formatCurrency(data?.totalPagar || 0)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : titulosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum título encontrado</p>
              <p className="text-sm mt-1">Ajuste os filtros ou crie um novo título</p>
            </div>
          ) : (
            <div className="space-y-2">
              {titulosFiltrados.map((titulo) => {
                const tipoInfo = tipoLabels[titulo.tipo];
                const statusInfo = statusConfig[titulo.status] || statusConfig.rascunho;
                const TipoIcon = tipoInfo?.icon || Receipt;
                const isVencido = new Date(titulo.dataVencimento) < new Date() && !['quitado', 'cancelado'].includes(titulo.status);

                return (
                  <div
                    key={titulo.id}
                    className={cn(
                      'group flex items-center gap-4 p-3 rounded-lg border transition-all hover:shadow-md',
                      isVencido && 'border-rose-200 bg-rose-50/30',
                      titulo.status === 'cancelado' && 'opacity-60'
                    )}
                  >
                    {/* Ícone tipo */}
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', tipoInfo?.color)}>
                      <TipoIcon className="h-5 w-5" />
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate max-w-[300px]">{titulo.descricao}</span>
                        <Badge className={cn('text-[10px]', statusInfo.bgColor, statusInfo.color)}>
                          {statusInfo.label}
                        </Badge>
                        {isVencido && titulo.status !== 'vencido' && (
                          <Badge className="text-[10px] bg-rose-100 text-rose-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Vencido
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {titulo.pessoa && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {titulo.pessoa.nome}
                          </span>
                        )}
                        <span>{naturezaLabels[titulo.natureza]}</span>
                        <span>Venc: {formatDate(titulo.dataVencimento)}</span>
                        <span>Comp: {formatDate(titulo.dataCompetencia)}</span>
                      </div>
                    </div>

                    {/* Valor */}
                    <div className="text-right shrink-0">
                      <p className={cn(
                        'font-mono font-bold text-sm',
                        titulo.tipo === 'pagar' ? 'text-rose-600' : 'text-emerald-600'
                      )}>
                        {titulo.tipo === 'pagar' ? '-' : '+'}{formatCurrency(Number(titulo.valorLiquido))}
                      </p>
                      {titulo.parcelaNumero && (
                        <p className="text-[10px] text-muted-foreground">
                          Parcela {titulo.parcelaNumero}/{titulo.parcelaTotal}
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1 shrink-0 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={() => handleVerTitulo(titulo.id)}
                        aria-label="Ver detalhes do título"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Button>

                      {['aprovado', 'parcial', 'vencido'].includes(titulo.status) && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-emerald-600" 
                          onClick={() => handleBaixar(titulo.id)}
                          aria-label="Registrar baixa/pagamento"
                        >
                          <CreditCard className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}

                      {['rascunho', 'pendente_aprovacao'].includes(titulo.status) && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600" 
                          onClick={() => handleAprovar(titulo.id)}
                          aria-label="Aprovar título"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}

                      {!['quitado', 'cancelado'].includes(titulo.status) && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-600" 
                          onClick={() => handleCancelarClick(titulo.id)}
                          aria-label="Cancelar título"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={() => handleEditTitulo(titulo.id)}
                        aria-label="Editar título"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginação */}
          {(data?.pages || 0) > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {data?.pages}
              </span>
              <Button variant="outline" size="sm" disabled={page === data?.pages} onClick={() => setPage(page + 1)}>
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Formulário */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar Título' : 'Novo Título'}</DialogTitle>
          </DialogHeader>
          <TituloForm
            tituloId={editMode ? selectedTituloId : null}
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
              }}
              onCancel={() => setBaixaOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Título</DialogTitle>
          </DialogHeader>
          {selectedTituloId && (
            <TituloDetail
              tituloId={selectedTituloId}
              onBaixar={() => {
                setDetailOpen(false);
                setBaixaOpen(true);
              }}
              onEdit={() => {
                setDetailOpen(false);
                setEditMode(true);
                setFormOpen(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Cancelar */}
      <Dialog open={cancelarOpen} onOpenChange={setCancelarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" aria-hidden="true" />
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


