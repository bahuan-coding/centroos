import { useState } from 'react';
import { 
  TrendingUp, 
  Search, 
  Plus, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight,
  X,
  Filter,
  Calendar,
  Wallet,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, Pagination } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { TitulosList, TituloDetail, TituloWizard, TituloBaixaModal } from '@/components/titulos';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { QueryError } from '@/components/ui/query-error';

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
}

// ============================================================================
// QUICK STATS
// ============================================================================

function QuickStats({ 
  stats, 
  filtroTipo, 
  setFiltroTipo 
}: { 
  stats: any; 
  filtroTipo: 'pagar' | 'receber' | undefined;
  setFiltroTipo: (v: 'pagar' | 'receber' | undefined) => void;
}) {
  const total = (stats?.totalPagar || 0) + (stats?.totalReceber || 0);
  
  return (
    <div className="grid grid-cols-3 gap-2">
      <button 
        onClick={() => setFiltroTipo(undefined)}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtroTipo === undefined 
            ? 'bg-primary/10 ring-2 ring-primary' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">📋</span>
        <p className="text-lg font-bold">{total}</p>
        <p className="text-[10px] text-muted-foreground">Total</p>
      </button>
      
      <button 
        onClick={() => setFiltroTipo(filtroTipo === 'receber' ? undefined : 'receber')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtroTipo === 'receber' 
            ? 'bg-emerald-100 ring-2 ring-emerald-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">📈</span>
        <p className="text-lg font-bold text-emerald-600">{stats?.totalReceber || 0}</p>
        <p className="text-[10px] text-muted-foreground">A Receber</p>
      </button>
      
      <button 
        onClick={() => setFiltroTipo(filtroTipo === 'pagar' ? undefined : 'pagar')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtroTipo === 'pagar' 
            ? 'bg-rose-100 ring-2 ring-rose-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">📉</span>
        <p className="text-lg font-bold text-rose-600">{stats?.totalPagar || 0}</p>
        <p className="text-[10px] text-muted-foreground">A Pagar</p>
      </button>
    </div>
  );
}

// ============================================================================
// FINANCIAL SUMMARY
// ============================================================================

function FinancialSummary({ stats }: { stats: any }) {
  if (!stats) return null;
  
  const saldo = (stats?.valorReceber || 0) - (stats?.valorPagar || 0);
  
  return (
    <div className="p-3 rounded-lg bg-slate-50 border space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Wallet className="h-3 w-3" /> Resumo Financeiro
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-sm font-bold text-emerald-600">
            {formatCurrencyCompact(stats?.valorReceber || 0)}
          </p>
          <p className="text-[10px] text-muted-foreground">Receber</p>
        </div>
        <div>
          <p className="text-sm font-bold text-rose-600">
            {formatCurrencyCompact(stats?.valorPagar || 0)}
          </p>
          <p className="text-[10px] text-muted-foreground">Pagar</p>
        </div>
        <div>
          <p className={cn(
            'text-sm font-bold',
            saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'
          )}>
            {formatCurrencyCompact(saldo)}
          </p>
          <p className="text-[10px] text-muted-foreground">Saldo</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STATUS FILTER PILLS
// ============================================================================

function StatusFilters({ 
  status, 
  setStatus,
  vencidosCount
}: { 
  status: string | undefined; 
  setStatus: (v: string | undefined) => void;
  vencidosCount: number;
}) {
  const statuses = [
    { value: undefined, label: 'Todos', icon: Filter },
    { value: 'aprovado', label: 'Pendentes', icon: Clock },
    { value: 'quitado', label: 'Quitados', icon: ArrowUpRight },
    { value: 'vencido', label: `Vencidos${vencidosCount > 0 ? ` (${vencidosCount})` : ''}`, icon: AlertTriangle, danger: vencidosCount > 0 },
  ];

  return (
    <div className="flex gap-1 flex-wrap">
      {statuses.map((s) => (
        <button
          key={s.value || 'all'}
          onClick={() => setStatus(s.value)}
          className={cn(
            'px-2 py-1 text-[10px] font-medium rounded-full transition-all flex items-center gap-1',
            status === s.value 
              ? 'bg-primary text-primary-foreground' 
              : s.danger 
                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                : 'bg-muted hover:bg-muted/80'
          )}
        >
          <s.icon className="h-3 w-3" />
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY SELECTION
// ============================================================================

function EmptySelection({ onNewTitulo }: { onNewTitulo: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-6">
        <TrendingUp className="h-12 w-12 text-emerald-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Selecione um título</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Clique em um título na lista ao lado para ver detalhes, registrar pagamentos ou gerenciar baixas.
      </p>
      <Button onClick={onNewTitulo} className="bg-emerald-600 hover:bg-emerald-700">
        <Plus className="h-4 w-4 mr-2" />
        Novo Título
      </Button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Titulos() {
  // State
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filtroTipo, setFiltroTipo] = useState<'pagar' | 'receber' | undefined>(undefined);
  const [filtroStatus, setFiltroStatus] = useState<string | undefined>(undefined);
  const [mesAno, setMesAno] = useState<string | undefined>(undefined);
  const [selectedTituloId, setSelectedTituloId] = useState<string | null>(null);
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [showBaixaModal, setShowBaixaModal] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [editingTituloId, setEditingTituloId] = useState<string | null>(null);

  // Queries
  const { data, isLoading, isError, error, refetch } = trpc.titulos.list.useQuery({
    search: search || undefined,
    tipo: filtroTipo,
    status: filtroStatus as any,
    mesAno,
    page,
    limit: 20,
  });

  const { data: fluxo } = trpc.titulos.fluxoCaixa.useQuery();

  // Stats derivados
  const stats = {
    totalPagar: data?.titulos?.filter(t => t.tipo === 'pagar').length || 0,
    totalReceber: data?.titulos?.filter(t => t.tipo === 'receber').length || 0,
    valorPagar: data?.titulos?.filter(t => t.tipo === 'pagar').reduce((acc, t) => acc + Number(t.valorLiquido), 0) || 0,
    valorReceber: data?.titulos?.filter(t => t.tipo === 'receber').reduce((acc, t) => acc + Number(t.valorLiquido), 0) || 0,
  };

  const vencidosCount = fluxo?.vencidos?.count || 0;

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Títulos" 
          description="Gestão de contas a pagar e receber" 
          icon={<TrendingUp className="h-8 w-8 text-emerald-600" />}
        />
        <QueryError error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  const titulos = data?.titulos || [];
  const totalPages = data?.pages || 1;

  // Handlers
  const handleSelectTitulo = (titulo: any) => {
    setSelectedTituloId(titulo.id);
    if (window.innerWidth < 1024) {
      setShowMobileDetail(true);
    }
  };

  const handleNewTituloSuccess = () => {
    setShowNovoModal(false);
    refetch();
  };

  const handleBaixaSuccess = () => {
    setShowBaixaModal(false);
    refetch();
  };

  const handleCloseMobileDetail = () => {
    setShowMobileDetail(false);
    setSelectedTituloId(null);
  };

  const handleEditTitulo = () => {
    if (selectedTituloId) {
      setEditingTituloId(selectedTituloId);
      setShowNovoModal(true);
    }
  };

  // Generate month options
  const monthOptions = [];
  const now = new Date();
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    monthOptions.push({ value, label });
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] lg:h-[calc(100vh-theme(spacing.8))] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <PageHeader
          title="Títulos"
          description="Gestão de contas a pagar e receber"
          icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>}
        />
        <Button onClick={() => { setEditingTituloId(null); setShowNovoModal(true); }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Título</span>
        </Button>
      </div>

      {/* Alertas */}
      {vencidosCount > 0 && (
        <div className="mb-4 shrink-0">
          <GlassCard className="border-rose-200 bg-gradient-to-r from-rose-50 to-red-50">
            <div className="flex items-center gap-3 p-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-rose-800 text-sm">
                  {vencidosCount} título{vencidosCount > 1 ? 's' : ''} vencido{vencidosCount > 1 ? 's' : ''}
                </span>
                <span className="text-rose-600 text-xs ml-2 hidden sm:inline">
                  Total: {formatCurrency(fluxo?.vencidos?.valor || 0)}
                </span>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                className="border-rose-500 text-rose-600 hover:bg-rose-50"
                onClick={() => setFiltroStatus('vencido')}
              >
                Ver Vencidos
              </Button>
            </div>
          </GlassCard>
        </div>
      )}

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
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-10 h-9"
                />
                {search && (
                  <button 
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filtro de Mês */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={mesAno || 'all'} onValueChange={(v) => { setMesAno(v === 'all' ? undefined : v); setPage(1); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos os meses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {monthOptions.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Stats */}
              <QuickStats 
                stats={stats} 
                filtroTipo={filtroTipo} 
                setFiltroTipo={(v) => { setFiltroTipo(v); setPage(1); }} 
              />

              {/* Status Filters */}
              <StatusFilters 
                status={filtroStatus} 
                setStatus={(v) => { setFiltroStatus(v); setPage(1); }}
                vencidosCount={vencidosCount}
              />

              {/* Financial Summary */}
              <FinancialSummary stats={stats} />
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
            <div className="h-full overflow-hidden">
              <TituloDetail 
                tituloId={selectedTituloId} 
                onClose={() => setSelectedTituloId(null)}
                onBaixar={() => setShowBaixaModal(true)}
                onEdit={handleEditTitulo}
              />
            </div>
          ) : (
            <EmptySelection onNewTitulo={() => { setEditingTituloId(null); setShowNovoModal(true); }} />
          )}
        </Card>
      </div>

      {/* Detail Mobile Overlay */}
      {showMobileDetail && selectedTituloId && (
        <div className="lg:hidden">
          <TituloDetail 
            tituloId={selectedTituloId} 
            onClose={handleCloseMobileDetail}
            onBaixar={() => setShowBaixaModal(true)}
            onEdit={handleEditTitulo}
          />
        </div>
      )}

      {/* Modal Novo/Editar Título */}
      <TituloWizard 
        open={showNovoModal} 
        onOpenChange={setShowNovoModal}
        tituloId={editingTituloId}
        onSuccess={handleNewTituloSuccess}
      />

      {/* Modal Baixa */}
      <TituloBaixaModal
        open={showBaixaModal}
        onOpenChange={setShowBaixaModal}
        tituloId={selectedTituloId}
        onSuccess={handleBaixaSuccess}
      />
    </div>
  );
}
