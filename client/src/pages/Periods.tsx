import { useState, useEffect } from 'react';
import { Plus, Calendar, Lock, ChevronRight, Search, X, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useSearch, useLocation } from 'wouter';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { PeriodDetail } from '@/components/periods';
import { PeriodoWizard } from '@/components/periodos/PeriodoWizard';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return formatCurrency(value);
}

function formatPeriodShort(month: number, year: number): string {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[month - 1]}/${String(year).slice(2)}`;
}

function formatPeriodName(month: number, year: number): string {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${meses[month - 1]} ${year}`;
}

// Quick Stats com filtros clicáveis
function QuickStats({ totals, filtroStatus, setFiltroStatus }: {
  totals: any;
  filtroStatus: 'all' | 'open' | 'closed';
  setFiltroStatus: (v: 'all' | 'open' | 'closed') => void;
}) {
  const total = (totals?.periodosFechados || 0) + (totals?.periodosAbertos || 0);
  return (
    <div className="grid grid-cols-3 gap-2">
      <button 
        onClick={() => setFiltroStatus('all')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtroStatus === 'all' 
            ? 'bg-blue-100 ring-2 ring-blue-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">📅</span>
        <p className="text-lg font-bold">{total}</p>
        <p className="text-[10px] text-muted-foreground">Total</p>
      </button>
      
      <button 
        onClick={() => setFiltroStatus(filtroStatus === 'open' ? 'all' : 'open')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtroStatus === 'open' 
            ? 'bg-blue-100 ring-2 ring-blue-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">🔓</span>
        <p className="text-lg font-bold text-blue-600">{totals?.periodosAbertos || 0}</p>
        <p className="text-[10px] text-muted-foreground">Abertos</p>
      </button>
      
      <button 
        onClick={() => setFiltroStatus(filtroStatus === 'closed' ? 'all' : 'closed')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtroStatus === 'closed' 
            ? 'bg-slate-200 ring-2 ring-slate-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">🔒</span>
        <p className="text-lg font-bold text-slate-600">{totals?.periodosFechados || 0}</p>
        <p className="text-[10px] text-muted-foreground">Fechados</p>
      </button>
    </div>
  );
}

// Resumo do Exercício
function ExercicioSummary({ totals }: { totals: any }) {
  if (!totals) return null;
  const isDeficit = (totals.resultadoAno || 0) < 0;
  return (
    <div className="p-3 rounded-lg bg-slate-50 border space-y-2">
      <p className="text-xs font-medium text-muted-foreground">📊 Exercício {new Date().getFullYear()}</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="text-sm font-bold text-emerald-600">{formatCompact(totals.receitasAno || 0)}</div>
          <p className="text-[10px] text-muted-foreground">Receitas</p>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-red-600">{formatCompact(totals.despesasAno || 0)}</div>
          <p className="text-[10px] text-muted-foreground">Despesas</p>
        </div>
        <div className="text-center">
          <div className={cn('text-sm font-bold', isDeficit ? 'text-red-600' : 'text-emerald-600')}>
            {formatCompact(totals.resultadoAno || 0)}
          </div>
          <p className="text-[10px] text-muted-foreground">{isDeficit ? 'Déficit' : 'Superávit'}</p>
        </div>
      </div>
    </div>
  );
}

// Lista de Períodos
function PeriodsList({ 
  periods, 
  selectedId, 
  onSelect,
  isLoading 
}: { 
  periods: any[]; 
  selectedId: number | null;
  onSelect: (period: any) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <span className="text-5xl">📅</span>
        <p className="mt-3 text-sm">Nenhum período encontrado</p>
        <p className="text-xs mt-1">Crie um novo período para começar</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {periods.map((period) => {
        const isClosed = period.status === 'closed';
        const isDeficit = period.resultado < 0;
        
        return (
          <button
            key={period.id}
            onClick={() => onSelect(period)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
              'hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
              selectedId === period.id && 'bg-blue-100 ring-2 ring-blue-500'
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
              isClosed ? 'bg-slate-100' : 'bg-blue-100'
            )}>
              <Calendar className={cn('h-5 w-5', isClosed ? 'text-slate-500' : 'text-blue-600')} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-sm">{formatPeriodName(period.month, period.year)}</p>
                {isDeficit && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge className={cn('text-[10px] px-1.5 py-0', 
                  isClosed ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700')}>
                  {isClosed ? <Lock className="h-2.5 w-2.5 mr-0.5" /> : <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />}
                  {isClosed ? 'Fechado' : 'Aberto'}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {period.qtdLancamentos} lançamentos
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={cn('text-sm font-semibold', isDeficit ? 'text-red-600' : 'text-emerald-600')}>
                {formatCompact(period.resultado)}
              </p>
              <div className="flex items-center justify-end gap-0.5 mt-0.5">
                {isDeficit ? (
                  <TrendingDown className="h-3 w-3 text-red-400" />
                ) : (
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                )}
              </div>
            </div>
            <ChevronRight className={cn('h-4 w-4 text-slate-300 shrink-0 transition-transform', 
              selectedId === period.id && 'text-blue-500 rotate-90')} />
          </button>
        );
      })}
    </div>
  );
}

// Empty State
function EmptySelection({ onNewPeriod }: { onNewPeriod: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-6">
        <Calendar className="h-12 w-12 text-blue-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Selecione um período</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Clique em um período na lista ao lado para ver detalhes financeiros, composição e análises comparativas.
      </p>
      <Button onClick={onNewPeriod} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="h-4 w-4 mr-2" />
        Novo Período
      </Button>
    </div>
  );
}

export default function Periods() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [filtroAno, setFiltroAno] = useState<string>(new Date().getFullYear().toString());
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const searchString = useSearch();
  const [, navigate] = useLocation();
  
  const utils = trpc.useUtils();
  const { data: periodsData, isLoading } = trpc.periods.listWithStats.useQuery();
  
  // Handle URL query param for selected period
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const selected = params.get('selected');
    if (selected) {
      const periodId = parseInt(selected);
      if (!isNaN(periodId)) {
        setSelectedPeriodId(periodId);
        // Find the period to set the correct year filter
        const period = periodsData?.periods?.find(p => p.id === periodId);
        if (period) {
          setFiltroAno(period.year.toString());
        }
        // Clean up the URL after reading the param
        navigate('/periods', { replace: true });
      }
    }
  }, [searchString, periodsData?.periods, navigate]);

  const handleWizardSuccess = () => {
    utils.periods.listWithStats.invalidate();
    utils.periods.list.invalidate();
  };

  // Filtrar períodos
  const allPeriods = periodsData?.periods || [];
  const filteredPeriods = allPeriods.filter(p => {
    if (filtroAno && p.year !== parseInt(filtroAno)) return false;
    if (filtroStatus === 'open' && p.status !== 'open') return false;
    if (filtroStatus === 'closed' && p.status !== 'closed') return false;
    return true;
  });

  // Anos disponíveis para filtro
  const years = [...new Set(allPeriods.map(p => p.year))].sort((a, b) => b - a);
  if (!years.includes(new Date().getFullYear())) {
    years.unshift(new Date().getFullYear());
  }

  const handleSelectPeriod = (period: any) => {
    setSelectedPeriodId(period.id);
    if (window.innerWidth < 1024) {
      setShowMobileDetail(true);
    }
  };

  const handleCloseMobileDetail = () => {
    setShowMobileDetail(false);
    setSelectedPeriodId(null);
  };

  // Insights/Alertas
  const insights = periodsData?.insights || [];
  const alertasCriticos = insights.filter((i: any) => i.tipo === 'danger' || i.tipo === 'warning');

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] lg:h-[calc(100vh-theme(spacing.8))] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <PageHeader
          title="Períodos Contábeis"
          description="Gestão e análise de períodos mensais"
          icon={<Calendar className="h-7 w-7 text-blue-600" />}
        />
        <Button onClick={() => setWizardOpen(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Período</span>
        </Button>
      </div>

      {/* Alertas */}
      {alertasCriticos.length > 0 && (
        <div className="mb-4 shrink-0">
          {alertasCriticos.slice(0, 1).map((alerta: any, idx: number) => (
            <Card key={idx} className={cn('border-l-4', 
              alerta.tipo === 'danger' ? 'border-l-red-500 bg-red-50' : 'border-l-amber-500 bg-amber-50')}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={cn('h-5 w-5 shrink-0', 
                    alerta.tipo === 'danger' ? 'text-red-600' : 'text-amber-600')} />
                  <span className={cn('font-medium text-sm flex-1', 
                    alerta.tipo === 'danger' ? 'text-red-800' : 'text-amber-800')}>
                    {alerta.mensagem}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Master-Detail Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Lista (Master) */}
        <Card className="lg:col-span-5 xl:col-span-4 flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 shrink-0 border-b">
            <div className="space-y-3">
              {/* Filtro por Ano */}
              <div className="relative flex gap-2">
                <Select value={filtroAno} onValueChange={setFiltroAno}>
                  <SelectTrigger className="h-9">
                    <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os anos</SelectItem>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filtroAno !== 'all' && (
                  <Button variant="ghost" size="sm" onClick={() => setFiltroAno('all')} className="h-9 px-2">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Quick Stats */}
              <QuickStats 
                totals={periodsData?.totals} 
                filtroStatus={filtroStatus}
                setFiltroStatus={setFiltroStatus}
              />

              {/* Resumo do Exercício */}
              <ExercicioSummary totals={periodsData?.totals} />
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-2">
            <PeriodsList 
              periods={filteredPeriods} 
              selectedId={selectedPeriodId} 
              onSelect={handleSelectPeriod}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        {/* Detalhes (Detail) - Desktop */}
        <Card className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col overflow-hidden">
          {selectedPeriodId ? (
            <div className="h-full overflow-hidden">
              <PeriodDetail 
                periodId={selectedPeriodId} 
                onClose={() => setSelectedPeriodId(null)}
                onUpdated={() => utils.periods.listWithStats.invalidate()}
              />
            </div>
          ) : (
            <EmptySelection onNewPeriod={() => setWizardOpen(true)} />
          )}
        </Card>
      </div>

      {/* Detail Mobile Overlay */}
      {showMobileDetail && selectedPeriodId && (
        <div className="lg:hidden">
          <PeriodDetail 
            periodId={selectedPeriodId} 
            onClose={handleCloseMobileDetail}
            onUpdated={() => utils.periods.listWithStats.invalidate()}
          />
        </div>
      )}

      {/* Wizard Novo Período */}
      <PeriodoWizard 
        open={wizardOpen} 
        onOpenChange={setWizardOpen} 
        onSuccess={handleWizardSuccess}
      />
    </div>
  );
}
