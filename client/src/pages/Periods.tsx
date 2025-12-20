import { useState } from 'react';
import { 
  Plus, Lock, Calendar, TrendingUp, TrendingDown, 
  ArrowUpRight, ArrowDownRight, ChevronRight, Eye,
  FileText, AlertTriangle, CheckCircle2, Clock,
  BarChart3, PieChart, Sparkles, X
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardFooter } from '@/components/ui/glass-card';
import { StatCard, StatCardSkeleton } from '@/components/ui/stat-card';
import { ChartContainer, ChartContainerSkeleton } from '@/components/ui/chart-container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return formatCurrency(value);
}

function formatPeriodName(month: number, year: number): string {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${meses[month - 1]} ${year}`;
}

function formatPeriodShort(month: number, year: number): string {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[month - 1]}/${String(year).slice(2)}`;
}

const naturezaLabels: Record<string, string> = {
  contribuicao: 'Contribuições',
  doacao: 'Doações',
  evento: 'Eventos',
  convenio: 'Convênios',
  servico: 'Serviços',
  utilidade: 'Utilidades',
  taxa: 'Taxas',
  imposto: 'Impostos',
  material: 'Material',
  outros: 'Outros',
};

export default function Periods() {
  const [createOpen, setCreateOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [form, setForm] = useState({ month: '', year: new Date().getFullYear().toString(), openingBalance: '' });
  const [closeForm, setCloseForm] = useState({ closingBalance: '', notes: '' });

  const utils = trpc.useUtils();
  const { data: periodsData, isLoading: loadingPeriods } = trpc.periods.listWithStats.useQuery();
  const { data: periodDetail, isLoading: loadingDetail } = trpc.periods.detail.useQuery(selectedPeriod ?? 0, { enabled: !!selectedPeriod });
  const createMutation = trpc.periods.create.useMutation({ 
    onSuccess: () => { 
      utils.periods.listWithStats.invalidate(); 
      setCreateOpen(false); 
      toast.success('Período criado'); 
    } 
  });
  const closeMutation = trpc.periods.close.useMutation({ 
    onSuccess: () => { 
      utils.periods.listWithStats.invalidate(); 
      utils.periods.detail.invalidate();
      setCloseOpen(null); 
      toast.success('Período fechado'); 
    } 
  });

  const handleCreate = () => {
    const ob = parseFloat(form.openingBalance.replace(',', '.')) * 100 || 0;
    createMutation.mutate({ month: parseInt(form.month), year: parseInt(form.year), openingBalance: Math.round(ob) });
  };

  const handleClose = () => {
    if (!closeOpen) return;
    const cb = parseFloat(closeForm.closingBalance.replace(',', '.')) * 100;
    if (isNaN(cb)) { toast.error('Saldo inválido'); return; }
    closeMutation.mutate({ id: closeOpen, closingBalance: Math.round(cb), notes: closeForm.notes || undefined });
  };

  const openCloseDialog = (id: number, resultadoReais: number) => {
    setCloseForm({ closingBalance: resultadoReais.toFixed(2), notes: '' });
    setCloseOpen(id);
  };

  const periods = periodsData?.periods || [];
  const totals = periodsData?.totals;

  // Chart colors
  const chartColors = {
    receitas: 'hsl(160, 60%, 45%)',
    despesas: 'hsl(0, 84%, 60%)',
    primary: 'hsl(220, 70%, 50%)',
    violet: 'hsl(270, 60%, 60%)',
    gold: 'hsl(45, 90%, 55%)',
  };

  // Bar chart for period comparison
  const barChartData = {
    labels: periods.slice(0, 6).reverse().map(p => formatPeriodShort(p.month, p.year)),
    datasets: [
      {
        label: 'Receitas',
        data: periods.slice(0, 6).reverse().map(p => p.receitas),
        backgroundColor: chartColors.receitas,
        borderRadius: 6,
      },
      {
        label: 'Despesas',
        data: periods.slice(0, 6).reverse().map(p => p.despesas),
        backgroundColor: chartColors.despesas,
        borderRadius: 6,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true, 
        position: 'top' as const,
        labels: { boxWidth: 12, padding: 16, font: { size: 12 }, usePointStyle: true }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1a1a2e',
        bodyColor: '#4a5568',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` },
      },
    },
    scales: {
      y: { 
        beginAtZero: true, 
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { callback: (value: any) => formatCompact(value) }
      },
      x: { grid: { display: false } },
    },
  };

  // Donut chart for detail view
  const donutColors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];
  
  const receitasDonutData = {
    labels: periodDetail?.composicaoReceitas.map(r => naturezaLabels[r.natureza] || r.natureza) || [],
    datasets: [{
      data: periodDetail?.composicaoReceitas.map(r => r.valor) || [],
      backgroundColor: donutColors,
      borderWidth: 0,
    }],
  };

  const despesasDonutData = {
    labels: periodDetail?.composicaoDespesas.map(r => naturezaLabels[r.natureza] || r.natureza) || [],
    datasets: [{
      data: periodDetail?.composicaoDespesas.map(r => r.valor) || [],
      backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6'],
      borderWidth: 0,
    }],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      {/* ========== HEADER ========== */}
      <header className="animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-fluid-3xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-7 w-7 text-primary" />
              Períodos Contábeis
            </h1>
            <p className="text-fluid-sm text-muted-foreground mt-1">
              Gestão e análise de períodos mensais
            </p>
          </div>
          <Button onClick={() => { setForm({ month: '', year: new Date().getFullYear().toString(), openingBalance: '' }); setCreateOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Período
          </Button>
        </div>
      </header>

      {/* ========== KPIs GLOBAIS ========== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingPeriods ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Receitas do Exercício"
              value={formatCurrency(totals?.receitasAno || 0)}
              subtitle={`${new Date().getFullYear()}`}
              icon={ArrowUpRight}
              accentColor="success"
              delay={1}
            />
            <StatCard
              title="Despesas do Exercício"
              value={formatCurrency(totals?.despesasAno || 0)}
              subtitle={`${new Date().getFullYear()}`}
              icon={ArrowDownRight}
              accentColor="danger"
              delay={2}
            />
            <StatCard
              title="Resultado Acumulado"
              value={formatCurrency(totals?.resultadoAno || 0)}
              subtitle={(totals?.resultadoAno || 0) >= 0 ? 'Superávit' : 'Déficit'}
              icon={(totals?.resultadoAno || 0) >= 0 ? TrendingUp : TrendingDown}
              trend={(totals?.resultadoAno || 0) >= 0 ? 'up' : 'down'}
              accentColor={(totals?.resultadoAno || 0) >= 0 ? 'gold' : 'danger'}
              delay={3}
            />
            <StatCard
              title="Períodos"
              value={`${totals?.periodosFechados || 0} / ${(totals?.periodosFechados || 0) + (totals?.periodosAbertos || 0)}`}
              subtitle="Fechados / Total"
              icon={CheckCircle2}
              accentColor="primary"
              delay={4}
            />
          </>
        )}
      </section>

      {/* ========== INSIGHTS GLOBAIS ========== */}
      {!loadingPeriods && periodsData?.insights && periodsData.insights.length > 0 && (
        <section className="animate-fade-in-up opacity-0 stagger-5" style={{ animationFillMode: 'forwards' }}>
          <div className="flex flex-wrap gap-3">
            {periodsData.insights.map((insight, i) => (
              <div 
                key={i} 
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium',
                  insight.tipo === 'success' && 'bg-success/10 text-success border border-success/20',
                  insight.tipo === 'warning' && 'bg-warning/10 text-warning border border-warning/20',
                  insight.tipo === 'danger' && 'bg-destructive/10 text-destructive border border-destructive/20',
                  insight.tipo === 'info' && 'bg-primary/10 text-primary border border-primary/20'
                )}
              >
                {insight.tipo === 'success' && <CheckCircle2 className="h-4 w-4" />}
                {insight.tipo === 'warning' && <AlertTriangle className="h-4 w-4" />}
                {insight.tipo === 'danger' && <AlertTriangle className="h-4 w-4" />}
                {insight.tipo === 'info' && <Sparkles className="h-4 w-4" />}
                {insight.mensagem}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========== TIMELINE DOS PERÍODOS ========== */}
      <section className="animate-fade-in-up opacity-0 stagger-5" style={{ animationFillMode: 'forwards' }}>
        <GlassCard padding="md">
          <GlassCardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <GlassCardTitle>Timeline de Períodos</GlassCardTitle>
            </div>
            <GlassCardDescription>Clique em um período para ver detalhes</GlassCardDescription>
          </GlassCardHeader>

          {loadingPeriods ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-20 w-32 rounded-xl flex-shrink-0" />
              ))}
            </div>
          ) : periods.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Nenhum período cadastrado</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Clique em "Novo Período" para começar</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
              {periods.slice(0, 12).map((p) => {
                const isSelected = selectedPeriod === p.id;
                const isDeficit = p.resultado < 0;
                const isClosed = p.status === 'closed';
                
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPeriod(isSelected ? null : p.id)}
                    className={cn(
                      'flex-shrink-0 w-36 p-4 rounded-xl border-2 transition-all duration-200 text-left',
                      isSelected 
                        ? 'border-primary bg-primary/10 shadow-lg' 
                        : 'border-transparent glass-subtle glass-hover',
                      'hover:scale-[1.02]'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge 
                        variant={isClosed ? 'secondary' : 'default'} 
                        className={cn('text-[10px]', isDeficit && !isClosed && 'bg-destructive')}
                      >
                        {isClosed ? 'Fechado' : 'Aberto'}
                      </Badge>
                      {isDeficit && <AlertTriangle className="h-3 w-3 text-destructive" />}
                    </div>
                    <p className="text-sm font-semibold truncate">{formatPeriodShort(p.month, p.year)}</p>
                    <p className={cn(
                      'text-xs font-medium mt-1',
                      isDeficit ? 'text-destructive' : 'text-success'
                    )}>
                      {formatCompact(p.resultado)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </GlassCard>
      </section>

      {/* ========== CONTEÚDO PRINCIPAL ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Comparação */}
        {loadingPeriods ? (
          <ChartContainerSkeleton minHeight="300px" />
        ) : (
          <ChartContainer
            title="Comparativo Mensal"
            subtitle="Últimos 6 meses"
            icon={BarChart3}
            minHeight="300px"
            className="lg:col-span-2"
            delay={6}
          >
            <Bar data={barChartData} options={barChartOptions} />
          </ChartContainer>
        )}

        {/* Cards de Período ou Detalhes */}
        <div className="space-y-4">
          {/* Loading skeleton for detail */}
          {selectedPeriod && loadingDetail && (
            <GlassCard padding="md">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="skeleton h-5 w-32 rounded" />
                    <div className="skeleton h-4 w-16 rounded" />
                  </div>
                  <div className="skeleton h-8 w-8 rounded" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="skeleton h-16 rounded-lg" />
                  <div className="skeleton h-16 rounded-lg" />
                  <div className="skeleton h-16 rounded-lg" />
                </div>
                <div className="skeleton h-10 rounded-lg" />
                <div className="skeleton h-24 rounded-lg" />
                <div className="space-y-2">
                  <div className="skeleton h-4 w-24 rounded" />
                  <div className="skeleton h-6 rounded" />
                  <div className="skeleton h-6 rounded" />
                </div>
              </div>
            </GlassCard>
          )}
          
          {selectedPeriod && periodDetail && !loadingDetail ? (
            // Painel de detalhes do período
            <GlassCard 
              padding="md" 
              className="animate-scale-in opacity-0"
              style={{ animationFillMode: 'forwards' }}
            >
              <GlassCardHeader
                action={
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPeriod(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                }
              >
                <div>
                  <GlassCardTitle>{formatPeriodName(periodDetail.period.month, periodDetail.period.year)}</GlassCardTitle>
                  <GlassCardDescription>
                    <Badge variant={periodDetail.period.status === 'closed' ? 'secondary' : 'default'} className="mt-1">
                      {periodDetail.period.status === 'closed' ? 'Fechado' : 'Aberto'}
                    </Badge>
                  </GlassCardDescription>
                </div>
              </GlassCardHeader>

              {/* Totais */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 rounded-lg bg-success/10">
                  <p className="text-xs text-muted-foreground">Receitas</p>
                  <p className="text-sm font-bold text-success">{formatCompact(periodDetail.totals.receitas)}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-destructive/10">
                  <p className="text-xs text-muted-foreground">Despesas</p>
                  <p className="text-sm font-bold text-destructive">{formatCompact(periodDetail.totals.despesas)}</p>
                </div>
                <div className={cn(
                  'text-center p-3 rounded-lg',
                  periodDetail.totals.resultado >= 0 ? 'bg-gold/10' : 'bg-destructive/10'
                )}>
                  <p className="text-xs text-muted-foreground">Resultado</p>
                  <p className={cn(
                    'text-sm font-bold',
                    periodDetail.totals.resultado >= 0 ? 'text-gold' : 'text-destructive'
                  )}>
                    {formatCompact(periodDetail.totals.resultado)}
                  </p>
                </div>
              </div>

              {/* Comparativo */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 mb-4">
                <span className="text-xs text-muted-foreground">vs Mês Anterior</span>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'text-xs font-medium flex items-center gap-1',
                    periodDetail.comparativo.receitasVar >= 0 ? 'text-success' : 'text-destructive'
                  )}>
                    {periodDetail.comparativo.receitasVar >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(periodDetail.comparativo.receitasVar).toFixed(0)}%
                  </span>
                  <span className={cn(
                    'text-xs font-medium flex items-center gap-1',
                    periodDetail.comparativo.despesasVar <= 0 ? 'text-success' : 'text-destructive'
                  )}>
                    {periodDetail.comparativo.despesasVar <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    {Math.abs(periodDetail.comparativo.despesasVar).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Composição Charts */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {periodDetail.composicaoReceitas.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 text-center">Receitas</p>
                    <div className="h-20">
                      <Doughnut data={receitasDonutData} options={donutOptions} />
                    </div>
                  </div>
                )}
                {periodDetail.composicaoDespesas.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 text-center">Despesas</p>
                    <div className="h-20">
                      <Doughnut data={despesasDonutData} options={donutOptions} />
                    </div>
                  </div>
                )}
              </div>

              {/* Top 3 Receitas */}
              {periodDetail.topReceitas.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Top Receitas</p>
                  <div className="space-y-2">
                    {periodDetail.topReceitas.slice(0, 3).map((r, i) => (
                      <div key={r.id} className="flex items-center justify-between text-xs">
                        <span className="truncate flex-1 mr-2">{r.pessoaNome || r.descricao}</span>
                        <span className="font-medium text-success">{formatCompact(r.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              {periodDetail.insights.length > 0 && (
                <div className="space-y-2 mb-4">
                  {periodDetail.insights.slice(0, 2).map((insight, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        'text-xs p-2 rounded-lg border-l-2',
                        insight.tipo === 'success' && 'bg-success/5 border-l-success',
                        insight.tipo === 'warning' && 'bg-warning/5 border-l-warning',
                        insight.tipo === 'danger' && 'bg-destructive/5 border-l-destructive',
                        insight.tipo === 'info' && 'bg-info/5 border-l-info'
                      )}
                    >
                      {insight.mensagem}
                    </div>
                  ))}
                </div>
              )}

              <GlassCardFooter className="gap-2">
                <Link href={`/titulos?mes=${periodDetail.period.year}-${String(periodDetail.period.month).padStart(2, '0')}`}>
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-3 w-3" />
                    Ver Títulos
                  </Button>
                </Link>
                {periodDetail.period.status === 'open' && (
                  <Button 
                    size="sm"
                    variant="destructive"
                    onClick={() => openCloseDialog(periodDetail.period.id, periodDetail.totals.resultado)}
                  >
                    <Lock className="mr-2 h-3 w-3" />
                    Fechar
                  </Button>
                )}
              </GlassCardFooter>
            </GlassCard>
          ) : (
            // Lista resumida de períodos recentes
            <GlassCard padding="md" className="animate-fade-in-up opacity-0 stagger-7" style={{ animationFillMode: 'forwards' }}>
              <GlassCardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-violet" />
                  <GlassCardTitle>Períodos Recentes</GlassCardTitle>
                </div>
              </GlassCardHeader>

              {loadingPeriods ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton h-14 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {periods.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPeriod(p.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          p.status === 'closed' ? 'bg-muted-foreground' : 'bg-primary'
                        )} />
                        <div>
                          <p className="text-sm font-medium">{formatPeriodShort(p.month, p.year)}</p>
                          <p className="text-xs text-muted-foreground">{p.qtdLancamentos} lançamentos</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          'text-sm font-semibold',
                          p.resultado >= 0 ? 'text-success' : 'text-destructive'
                        )}>
                          {formatCompact(p.resultado)}
                        </p>
                        <ChevronRight className="h-4 w-4 text-muted-foreground inline-block" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </GlassCard>
          )}
        </div>
      </div>

      {/* ========== DIALOGS ========== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Período Contábil</DialogTitle>
            <DialogDescription>Crie um novo período mensal para controle contábil</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mês</Label>
                <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        {new Date(2000, m - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ano</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Saldo de Abertura (R$)</Label>
              <Input value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} placeholder="0,00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar Período'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!closeOpen} onOpenChange={() => setCloseOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar Período Contábil</DialogTitle>
            <DialogDescription>Esta ação impedirá novos lançamentos neste período.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Saldo de Fechamento (R$)</Label>
              <Input value={closeForm.closingBalance} onChange={(e) => setCloseForm({ ...closeForm, closingBalance: e.target.value })} placeholder="0,00" />
            </div>
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea value={closeForm.notes} onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })} placeholder="Notas sobre o fechamento..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(null)}>Cancelar</Button>
            <Button onClick={handleClose} disabled={closeMutation.isPending}>
              {closeMutation.isPending ? 'Fechando...' : 'Confirmar Fechamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
