import { 
  TrendingUp, 
  TrendingDown,
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Users,
  FileText,
  Building2,
  PieChart,
  BarChart3,
  Newspaper,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Calendar
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';
import { Line, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement,
  LineElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler 
} from 'chart.js';

import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/glass-card';
import { StatCard, StatCardSkeleton } from '@/components/ui/stat-card';
import { ChartContainer, ChartContainerSkeleton } from '@/components/ui/chart-container';
import { AlertBanner, AlertStack } from '@/components/ui/alert-banner';
import { NewsFeed, type NewsItem } from '@/components/ui/news-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) {
    const m = value / 1000000;
    return `R$ ${m.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  }
  if (value >= 1000) {
    const k = value / 1000;
    return `R$ ${k.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatCurrentDate(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export default function Dashboard() {
  const { data: kpis, isLoading: loadingKpis } = trpc.dashboard.kpisEnhanced.useQuery();
  const { data: fluxoCaixa, isLoading: loadingFluxo } = trpc.dashboard.fluxoCaixa.useQuery(12);
  const { data: composicao, isLoading: loadingComposicao } = trpc.dashboard.composicaoReceitas.useQuery();
  const { data: alertas = [] } = trpc.dashboard.alertasFiscais.useQuery();
  const { data: topContribuintes = [], isLoading: loadingTop } = trpc.dashboard.topContribuintes.useQuery({ limite: 5 });
  const { data: contasData, isLoading: loadingContas } = trpc.dashboard.contasComSaldo.useQuery();
  const { data: newsFeed = [], isLoading: loadingNews } = trpc.dashboard.newsFeed.useQuery();

  // Chart configs
  const fluxoChartData = {
    labels: fluxoCaixa?.map(m => m.mesFormatado) || [],
    datasets: [
      {
        label: 'Receitas',
        data: fluxoCaixa?.map(m => m.receitas) || [],
        borderColor: 'hsl(160 60% 45%)',
        backgroundColor: 'hsla(160, 60%, 45%, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'hsl(160 60% 45%)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
      },
      {
        label: 'Despesas',
        data: fluxoCaixa?.map(m => m.despesas) || [],
        borderColor: 'hsl(0 84% 60%)',
        backgroundColor: 'hsla(0, 84%, 60%, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'hsl(0 84% 60%)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
      },
    ],
  };

  const fluxoChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        position: 'top' as const,
        labels: { 
          boxWidth: 12, 
          padding: 16, 
          font: { size: 12, family: 'Plus Jakarta Sans' },
          usePointStyle: true,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1a1a2e',
        bodyColor: '#4a5568',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { 
          callback: (value: any) => formatCompact(value),
          font: { size: 11, family: 'Plus Jakarta Sans' }
        },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, family: 'Plus Jakarta Sans' } }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  // Doughnut chart for composition
  const naturezaLabels: Record<string, string> = {
    contribuicao: 'Contribuições',
    doacao: 'Doações',
    evento: 'Eventos',
    outros: 'Outros',
    servico: 'Serviços',
  };

  // Cores refinadas para o donut
  const chartColors = ['#3b82f6', '#8b5cf6']; // Blue-500, Violet-500
  
  const doughnutData = {
    labels: composicao?.porTipoPessoa.map(p => p.tipo === 'associado' ? 'Associados' : 'Não Associados') || [],
    datasets: [{
      data: composicao?.porTipoPessoa.map(p => p.total) || [],
      backgroundColor: chartColors,
      borderColor: 'white',
      borderWidth: 3,
      hoverOffset: 6,
      hoverBorderWidth: 0,
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 14,
        cornerRadius: 10,
        titleFont: { size: 13, weight: '600' as const, family: 'Plus Jakarta Sans' },
        bodyFont: { size: 12, family: 'Plus Jakarta Sans' },
        callbacks: {
          title: () => '',
          label: (ctx: any) => {
            const value = ctx.parsed;
            const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const pct = ((value / total) * 100).toFixed(0);
            return `${ctx.label}: ${formatCurrency(value)} (${pct}%)`;
          },
        },
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
    },
  };

  // Convert alerts to AlertStack format
  const alertItems = alertas.map(a => ({
    id: a.id,
    variant: a.tipo as 'info' | 'warning' | 'danger' | 'success',
    title: a.titulo,
    message: a.mensagem,
  }));

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      {/* ========== HEADER ========== */}
      <header className="animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-fluid-3xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" />
              {getGreeting()}
            </h1>
            <p className="text-fluid-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatCurrentDate()}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {kpis?.mesAtual && (
              <Badge variant="secondary" className="text-sm px-3 py-1.5">
                Período: {kpis.mesAtual.split('-').reverse().join('/')}
              </Badge>
            )}
            <Link href="/titulos">
              <Button size="sm" className="glass-hover shadow-sm">
                <FileText className="mr-2 h-4 w-4" />
                Novo Lançamento
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ========== KPIs PRINCIPAIS ========== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {loadingKpis ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Saldo Consolidado"
              value={formatCurrency(kpis?.saldoConsolidado || 0)}
              subtitle={`${kpis?.contasAtivas || 0} contas ativas`}
              icon={Wallet}
              accentColor="success"
              delay={1}
            />
            <StatCard
              title="Receitas do Mês"
              value={formatCurrency(kpis?.receitasMes || 0)}
              change={{ value: kpis?.receitasVariacao || 0, label: 'vs mês ant.' }}
              icon={ArrowUpRight}
              trend={(kpis?.receitasVariacao || 0) >= 0 ? 'up' : 'down'}
              accentColor="primary"
              delay={2}
            />
            <StatCard
              title="Despesas do Mês"
              value={formatCurrency(kpis?.despesasMes || 0)}
              change={{ value: kpis?.despesasVariacao || 0, label: 'vs mês ant.' }}
              icon={ArrowDownRight}
              trend={(kpis?.despesasVariacao || 0) <= 0 ? 'up' : 'down'}
              accentColor="danger"
              delay={3}
            />
            <StatCard
              title="Resultado"
              value={formatCurrency(kpis?.resultadoMes || 0)}
              subtitle={(kpis?.resultadoMes || 0) >= 0 ? 'Superávit' : 'Déficit'}
              change={{ value: kpis?.resultadoVariacao || 0 }}
              icon={(kpis?.resultadoMes || 0) >= 0 ? TrendingUp : TrendingDown}
              trend={(kpis?.resultadoMes || 0) >= 0 ? 'up' : 'down'}
              accentColor={(kpis?.resultadoMes || 0) >= 0 ? 'gold' : 'danger'}
              delay={4}
            />
          </>
        )}
      </section>

      {/* ========== GRÁFICOS ========== */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Fluxo de Caixa */}
        {loadingFluxo ? (
          <ChartContainerSkeleton minHeight="300px" />
        ) : (
          <ChartContainer
            title="Fluxo de Caixa"
            subtitle="Últimos 12 meses"
            icon={BarChart3}
            minHeight="300px"
            className="lg:col-span-2"
            delay={5}
          >
            <Line data={fluxoChartData} options={fluxoChartOptions} />
          </ChartContainer>
        )}

        {/* Composição de Receitas - Redesign Premium */}
        {loadingComposicao ? (
          <ChartContainerSkeleton minHeight="300px" />
        ) : (
          <ChartContainer
            title="Composição"
            subtitle="Receitas por tipo"
            icon={PieChart}
            minHeight="300px"
            delay={6}
          >
            <div className="flex flex-col h-full">
              {/* Gráfico com centro absoluto */}
              <div className="relative flex-1 flex items-center justify-center py-2">
                <div className="relative w-36 h-36">
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                  {/* Centro do donut - posição absoluta precisa */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <span className="block text-[10px] text-muted-foreground/70 uppercase tracking-widest font-medium">
                        Total
                      </span>
                      <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent leading-tight">
                        {formatCurrencyCompact(composicao?.totalReceitas || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Legenda customizada externa */}
              <div className="flex justify-center gap-6 pt-3 pb-1 border-t border-border/30">
                {composicao?.porTipoPessoa.map((p, i) => {
                  const pct = composicao.totalReceitas > 0 
                    ? ((p.total / composicao.totalReceitas) * 100).toFixed(0) 
                    : '0';
                  return (
                    <div key={p.tipo} className="flex items-center gap-2 group cursor-default">
                      <span 
                        className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm" 
                        style={{ backgroundColor: chartColors[i] }} 
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground/80">
                          {p.tipo === 'associado' ? 'Associados' : 'Não Associados'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {pct}% · {formatCurrency(p.total)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ChartContainer>
        )}
      </section>

      {/* ========== ALERTAS FISCAIS ========== */}
      {alertItems.length > 0 && (
        <section className="animate-fade-in-up opacity-0 stagger-7" style={{ animationFillMode: 'forwards' }}>
          <GlassCard padding="md">
            <GlassCardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <GlassCardTitle>Alertas e Compliance</GlassCardTitle>
              </div>
            </GlassCardHeader>
            <AlertStack alerts={alertItems} maxVisible={3} />
          </GlassCard>
        </section>
      )}

      {/* ========== OPERACIONAL ========== */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Top Contribuintes */}
        <GlassCard 
          padding="md" 
          className="animate-fade-in-up opacity-0" 
          style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
        >
          <GlassCardHeader
            action={
              <Link href="/pessoas">
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver todos <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            }
          >
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <GlassCardTitle>Top Contribuintes</GlassCardTitle>
            </div>
          </GlassCardHeader>

          {loadingTop ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="skeleton h-3 w-20 rounded" />
                  </div>
                  <div className="skeleton h-4 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {topContribuintes.map((pessoa, idx) => (
                <div 
                  key={pessoa.id} 
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <div className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    idx === 0 ? 'bg-gold/20 text-gold' :
                    idx === 1 ? 'bg-muted text-muted-foreground' :
                    idx === 2 ? 'bg-warning/20 text-warning' :
                    'bg-muted/50 text-muted-foreground'
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{pessoa.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {pessoa.totalContribuicoes} contribuiç{pessoa.totalContribuicoes === 1 ? 'ão' : 'ões'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {formatCompact(pessoa.valorTotal)}
                  </span>
                </div>
              ))}
              {topContribuintes.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Nenhuma contribuição registrada
                </p>
              )}
            </div>
          )}
        </GlassCard>

        {/* Contas Financeiras */}
        <GlassCard 
          padding="md" 
          className="animate-fade-in-up opacity-0" 
          style={{ animationDelay: '450ms', animationFillMode: 'forwards' }}
        >
          <GlassCardHeader
            action={
              <Link href="/contas">
                <Button variant="ghost" size="sm" className="text-xs">
                  Gerenciar <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            }
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-success" />
              <GlassCardTitle>Contas Financeiras</GlassCardTitle>
            </div>
          </GlassCardHeader>

          {loadingContas ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="skeleton h-4 w-28 rounded" />
                    <div className="skeleton h-4 w-20 rounded" />
                  </div>
                  <div className="skeleton h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {contasData?.contas.map(conta => (
                <div key={conta.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{conta.nome}</p>
                      <p className="text-xs text-muted-foreground capitalize">{conta.tipo?.replace('_', ' ')}</p>
                    </div>
                    <span className={cn(
                      'text-sm font-semibold whitespace-nowrap',
                      conta.saldoAtual >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {formatCurrency(conta.saldoAtual)}
                    </span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-success to-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, conta.percentualEntradas)}%` }}
                    />
                  </div>
                </div>
              ))}
              {(!contasData?.contas || contasData.contas.length === 0) && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Nenhuma conta cadastrada
                </p>
              )}

              {/* Total */}
              {contasData && contasData.contas.length > 0 && (
                <div className="pt-3 mt-3 border-t border-border/50 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Saldo Total</span>
                  <span className={cn(
                    'text-base font-bold',
                    (contasData?.saldoTotal || 0) >= 0 ? 'text-success' : 'text-destructive'
                  )}>
                    {formatCurrency(contasData?.saldoTotal || 0)}
                  </span>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* Ações Rápidas */}
        <GlassCard 
          padding="md" 
          className="animate-fade-in-up opacity-0" 
          style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}
        >
          <GlassCardHeader>
            <GlassCardTitle>Ações Rápidas</GlassCardTitle>
            <GlassCardDescription>Acesso direto às principais funções</GlassCardDescription>
          </GlassCardHeader>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/pessoas">
              <Button className="w-full h-auto py-4 flex-col gap-2 glass-subtle glass-hover border-0" variant="outline">
                <Users className="h-6 w-6 text-violet" />
                <span className="text-xs font-medium">Pessoas</span>
              </Button>
            </Link>
            <Link href="/titulos">
              <Button className="w-full h-auto py-4 flex-col gap-2 glass-subtle glass-hover border-0" variant="outline">
                <FileText className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium">Lançamentos</span>
              </Button>
            </Link>
            <Link href="/contas">
              <Button className="w-full h-auto py-4 flex-col gap-2 glass-subtle glass-hover border-0" variant="outline">
                <Building2 className="h-6 w-6 text-success" />
                <span className="text-xs font-medium">Contas</span>
              </Button>
            </Link>
            <Link href="/reports">
              <Button className="w-full h-auto py-4 flex-col gap-2 glass-subtle glass-hover border-0" variant="outline">
                <BarChart3 className="h-6 w-6 text-gold" />
                <span className="text-xs font-medium">Relatórios</span>
              </Button>
            </Link>
          </div>

          {/* Stats mini */}
          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-fluid-xl font-bold text-foreground">{kpis?.totalPessoas || 0}</p>
              <p className="text-xs text-muted-foreground">Pessoas</p>
            </div>
            <div>
              <p className="text-fluid-xl font-bold text-primary">{kpis?.totalAssociados || 0}</p>
              <p className="text-xs text-muted-foreground">Associados</p>
            </div>
            <div>
              <p className="text-fluid-xl font-bold text-violet">{kpis?.totalNaoAssociados || 0}</p>
              <p className="text-xs text-muted-foreground">Outros</p>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* ========== FEED DE NOTÍCIAS ========== */}
      <section className="animate-fade-in-up opacity-0" style={{ animationDelay: '550ms', animationFillMode: 'forwards' }}>
        <GlassCard padding="md">
          <GlassCardHeader
            action={
              <Button variant="ghost" size="sm" className="text-xs" asChild>
                <a href="https://www.febnet.org.br" target="_blank" rel="noopener noreferrer">
                  Ver mais <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            }
          >
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              <GlassCardTitle>Notícias do Movimento Espírita</GlassCardTitle>
            </div>
            <GlassCardDescription>FEB, USE-AL e terceiro setor</GlassCardDescription>
          </GlassCardHeader>

          <NewsFeed 
            items={newsFeed as NewsItem[]} 
            loading={loadingNews} 
            compact={false}
            maxItems={4}
          />
        </GlassCard>
      </section>
    </div>
  );
}
