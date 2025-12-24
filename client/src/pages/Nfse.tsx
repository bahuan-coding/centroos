import { useState } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  Calendar,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, Pagination } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { NfseList, NfseDetail, NfseWizard, NfseCancelModal } from '@/components/nfse';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { QueryError } from '@/components/ui/query-error';
import { getOrgCode } from '@/lib/org';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function QuickStats({ 
  stats, 
  filtroStatus, 
  setFiltroStatus 
}: { 
  stats: { total: number; normais: number; canceladas: number; valorTotal: number };
  filtroStatus: string | undefined;
  setFiltroStatus: (v: string | undefined) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <button 
        onClick={() => setFiltroStatus(undefined)}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtroStatus === undefined 
            ? 'bg-primary/10 ring-2 ring-primary' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <FileText className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
        <p className="text-lg font-bold">{stats.total}</p>
        <p className="text-[10px] text-muted-foreground">Total</p>
      </button>
      
      <button 
        onClick={() => setFiltroStatus(filtroStatus === 'N' ? undefined : 'N')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtroStatus === 'N' 
            ? 'bg-emerald-100 ring-2 ring-emerald-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <CheckCircle className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
        <p className="text-lg font-bold text-emerald-600">{stats.normais}</p>
        <p className="text-[10px] text-muted-foreground">Normais</p>
      </button>
      
      <button 
        onClick={() => setFiltroStatus(filtroStatus === 'C' ? undefined : 'C')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtroStatus === 'C' 
            ? 'bg-rose-100 ring-2 ring-rose-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <XCircle className="h-4 w-4 mx-auto mb-1 text-rose-600" />
        <p className="text-lg font-bold text-rose-600">{stats.canceladas}</p>
        <p className="text-[10px] text-muted-foreground">Canceladas</p>
      </button>
    </div>
  );
}

function EmptySelection({ onNewNfse }: { onNewNfse: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mb-6">
        <FileText className="h-12 w-12 text-indigo-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Selecione uma NFS-e</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Clique em uma nota na lista para visualizar detalhes, consultar status ou cancelar.
      </p>
      <Button onClick={onNewNfse} className="bg-indigo-600 hover:bg-indigo-700">
        <Plus className="h-4 w-4 mr-2" />
        Emitir NFS-e
      </Button>
    </div>
  );
}

// Helper to format date as YYYY-MM-DD in local timezone (avoids UTC conversion issues)
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Nfse() {
  // State
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState<string | undefined>(undefined);
  
  // Date range - default to current month (but limit end date to today for API)
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  // API doesn't accept future dates - use today as max
  const maxEndDate = lastDay > now ? now : lastDay;
  const [dataInicio, setDataInicio] = useState(formatLocalDate(firstDay));
  const [dataFim, setDataFim] = useState(formatLocalDate(maxEndDate));
  
  const [selectedNota, setSelectedNota] = useState<any>(null);
  const [showEmitirModal, setShowEmitirModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Query - passa orgCode para multi-tenant
  const orgCode = getOrgCode();
  const { data, isLoading, isError, error, refetch, isRefetching } = trpc.nfse.spConsultarPeriodo.useQuery({
    dataInicio,
    dataFim,
    pagina: page,
    orgCode,
  });

  // Stats derived from data
  const notas = data?.notas || [];
  const notasFiltradas = filtroStatus 
    ? notas.filter(n => n.statusNFe === filtroStatus)
    : notas;
  
  const stats = {
    total: notas.length,
    normais: notas.filter(n => n.statusNFe === 'N').length,
    canceladas: notas.filter(n => n.statusNFe === 'C').length,
    valorTotal: notas.reduce((acc, n) => acc + n.valorServicos, 0),
  };

  // Search filter
  const notasExibidas = search
    ? notasFiltradas.filter(n => 
        n.numeroNFe.includes(search) ||
        n.razaoSocialTomador?.toLowerCase().includes(search.toLowerCase()) ||
        n.cpfCnpjTomador?.includes(search.replace(/\D/g, ''))
      )
    : notasFiltradas;

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="NFS-e" 
          description="Notas Fiscais de Serviço Eletrônicas" 
          icon={<FileText className="h-8 w-8 text-indigo-600" />}
        />
        <QueryError error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  // Handlers
  const handleSelectNota = (nota: any) => {
    setSelectedNota(nota);
    if (window.innerWidth < 1024) {
      setShowMobileDetail(true);
    }
  };

  const handleEmitirSuccess = () => {
    setShowEmitirModal(false);
    refetch();
  };

  const handleCancelSuccess = () => {
    setShowCancelModal(false);
    setSelectedNota(null);
    refetch();
  };

  const handleCloseMobileDetail = () => {
    setShowMobileDetail(false);
    setSelectedNota(null);
  };

  // Generate month options
  const monthOptions = [];
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    monthOptions.push({ value, label });
  }

  const handleMonthChange = (value: string) => {
    if (value === 'custom') return;
    const [year, month] = value.split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    // Limit dataFim to today to avoid API errors
    const effectiveLast = last > now ? now : last;
    setDataInicio(formatLocalDate(first));
    setDataFim(formatLocalDate(effectiveLast));
    setPage(1);
  };

  // Parse date string manually to avoid timezone issues (new Date("YYYY-MM-DD") is UTC)
  const [anoInicio, mesInicio] = dataInicio.split('-').map(Number);
  const currentMonth = `${anoInicio}-${String(mesInicio).padStart(2, '0')}`;

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] lg:h-[calc(100vh-theme(spacing.8))] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <PageHeader
          title="NFS-e"
          description="Nota Fiscal de Serviço Eletrônica - São Paulo"
          icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>}
        />
        <Button onClick={() => setShowEmitirModal(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Emitir NFS-e</span>
        </Button>
      </div>

      {/* Summary Card */}
      <div className="mb-4 shrink-0">
        <GlassCard className="border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-indigo-600" />
              <div>
                <span className="font-medium text-indigo-900 text-sm">
                  {stats.total} nota{stats.total !== 1 ? 's' : ''} no período
                </span>
                <span className="text-indigo-600 text-xs ml-2">
                  Total: {formatCurrency(stats.valorTotal)}
                </span>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-100"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={cn('h-4 w-4 mr-1', isRefetching && 'animate-spin')} />
              Atualizar
            </Button>
          </div>
        </GlassCard>
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
                  placeholder="Buscar por número, tomador..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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

              {/* Filtro de Período */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={currentMonth} onValueChange={handleMonthChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Stats */}
              <QuickStats 
                stats={stats} 
                filtroStatus={filtroStatus} 
                setFiltroStatus={(v) => { setFiltroStatus(v); }}
              />
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-2">
            <NfseList 
              notas={notasExibidas} 
              selectedId={selectedNota?.numeroNFe} 
              onSelect={handleSelectNota}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        {/* Detalhes (Detail) - Desktop */}
        <Card className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col overflow-hidden">
          {selectedNota ? (
            <NfseDetail 
              nota={selectedNota}
              onClose={() => setSelectedNota(null)}
              onCancel={() => setShowCancelModal(true)}
              onRefresh={() => refetch()}
              isRefreshing={isRefetching}
            />
          ) : (
            <EmptySelection onNewNfse={() => setShowEmitirModal(true)} />
          )}
        </Card>
      </div>

      {/* Detail Mobile Overlay */}
      {showMobileDetail && selectedNota && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white">
          <NfseDetail 
            nota={selectedNota}
            onClose={handleCloseMobileDetail}
            onCancel={() => setShowCancelModal(true)}
            onRefresh={() => refetch()}
            isRefreshing={isRefetching}
          />
        </div>
      )}

      {/* Modal Emitir NFS-e */}
      <NfseWizard 
        open={showEmitirModal} 
        onOpenChange={setShowEmitirModal}
        onSuccess={handleEmitirSuccess}
      />

      {/* Modal Cancelar */}
      {selectedNota && (
        <NfseCancelModal
          open={showCancelModal}
          onOpenChange={setShowCancelModal}
          numeroNFe={selectedNota.numeroNFe}
          onSuccess={handleCancelSuccess}
        />
      )}
    </div>
  );
}

