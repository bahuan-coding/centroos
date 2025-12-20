import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Eye,
  CreditCard,
  Banknote,
  XCircle,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement,
  LineElement,
  Title, 
  Tooltip, 
  Legend,
  Filler 
} from 'chart.js';

import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/glass-card';
import { StatCard, StatCardSkeleton } from '@/components/ui/stat-card';
import { ChartContainer, ChartContainerSkeleton } from '@/components/ui/chart-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

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

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// Cores do aging por severidade
const agingColors = [
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
  { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
  { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-800', badge: 'bg-rose-200 text-rose-900' },
];

export default function Titulos() {
  const [expandedAging, setExpandedAging] = useState<string | null>(null);
  
  const { data: fluxo, isLoading, isError, error } = trpc.titulos.fluxoCaixa.useQuery(undefined, {
    retry: 2,
  });

  // Mostrar toast de erro
  useEffect(() => {
    if (isError && error) {
      toast.error('Erro ao carregar fluxo de caixa', {
        description: error.message || 'Verifique sua conexão e tente novamente',
      });
    }
  }, [isError, error]);

  // Gráfico de projeção
  const chartData = {
    labels: fluxo?.projecaoDiaria.map(d => formatDateShort(d.data)) || [],
    datasets: [
      {
        label: 'Entradas',
        data: fluxo?.projecaoDiaria.map(d => d.entradas) || [],
        borderColor: 'hsl(160 60% 45%)',
        backgroundColor: 'hsla(160, 60%, 45%, 0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: 'hsl(160 60% 45%)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
      },
      {
        label: 'Saídas',
        data: fluxo?.projecaoDiaria.map(d => d.saidas) || [],
        borderColor: 'hsl(0 84% 60%)',
        backgroundColor: 'hsla(0, 84%, 60%, 0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: 'hsl(0 84% 60%)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { 
        display: true, 
        position: 'top' as const,
        labels: { boxWidth: 10, padding: 16, font: { size: 11 }, usePointStyle: true }
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
        ticks: { callback: (value: any) => formatCurrencyCompact(value) }
      },
      x: { grid: { display: false } },
    },
  };

  const proximosVencimentos = fluxo?.proximosVencimentos || [];
  const totalVencidos = fluxo?.aging.reduce((acc, a) => acc + a.count, 0) || 0;
  const temDados = fluxo && (fluxo.vencidos.count > 0 || proximosVencimentos.length > 0 || fluxo.projecaoDiaria.length > 0);

  // Estado de erro
  if (isError) {
    return (
      <div className="space-y-4 sm:space-y-6 pb-8">
        <header>
          <h1 className="text-fluid-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            Fluxo de Caixa
          </h1>
        </header>
        
        <GlassCard padding="lg" className="text-center">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Erro ao carregar dados</h2>
          <p className="text-muted-foreground mb-4">
            {error?.message || 'Não foi possível conectar ao servidor'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Header */}
      <header className="animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-fluid-3xl font-bold text-foreground flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              Fluxo de Caixa
            </h1>
            <p className="text-fluid-sm text-muted-foreground mt-1">
              Projeção financeira e gestão de vencimentos
            </p>
          </div>
        </div>
      </header>

      {/* KPIs Principais */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Saldo Projetado 30d"
              value={formatCurrencyCompact(fluxo?.projecao.d30.saldo || 0)}
              subtitle="próximos 30 dias"
              icon={Wallet}
              accentColor={(fluxo?.projecao.d30.saldo || 0) >= 0 ? 'success' : 'danger'}
              delay={1}
            />
            <StatCard
              title="Recebimentos Esperados"
              value={formatCurrencyCompact(fluxo?.projecao.d30.receber || 0)}
              subtitle="a receber em 30d"
              icon={ArrowUpRight}
              accentColor="success"
              delay={2}
            />
            <StatCard
              title="Pagamentos Previstos"
              value={formatCurrencyCompact(fluxo?.projecao.d30.pagar || 0)}
              subtitle="a pagar em 30d"
              icon={ArrowDownRight}
              accentColor="gold"
              delay={3}
            />
            <StatCard
              title="Vencidos"
              value={String(fluxo?.vencidos.count || 0)}
              subtitle={formatCurrency(fluxo?.vencidos.valor || 0)}
              icon={AlertTriangle}
              accentColor={totalVencidos > 0 ? 'danger' : 'success'}
              delay={4}
            />
          </>
        )}
      </section>

      {/* Gráfico de Projeção */}
      <section className="animate-fade-in-up opacity-0" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
        {isLoading ? (
          <ChartContainerSkeleton minHeight="280px" />
        ) : !temDados ? (
          <GlassCard padding="lg" className="text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum dado para projeção</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cadastre títulos a pagar ou receber para visualizar o fluxo de caixa
            </p>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Título
            </Button>
          </GlassCard>
        ) : (
          <ChartContainer
            title="Projeção de Fluxo"
            subtitle="Próximos 30 dias"
            icon={TrendingUp}
            minHeight="280px"
            delay={5}
          >
            <Line data={chartData} options={chartOptions} />
          </ChartContainer>
        )}
      </section>

      {/* Aging Report */}
      <section className="animate-fade-in-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <GlassCard padding="md">
          <GlassCardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <GlassCardTitle>Aging de Vencidos</GlassCardTitle>
            </div>
            <GlassCardDescription>
              Títulos vencidos por faixa de tempo - clique para expandir
            </GlassCardDescription>
          </GlassCardHeader>
          
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {fluxo?.aging.map((bucket, i) => (
                <button
                  key={bucket.faixa}
                  onClick={() => setExpandedAging(expandedAging === bucket.faixa ? null : bucket.faixa)}
                  disabled={bucket.count === 0}
                  aria-expanded={expandedAging === bucket.faixa}
                  aria-label={`${bucket.faixa}: ${bucket.count} títulos, ${formatCurrency(bucket.valor)}`}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all duration-200 text-left',
                    agingColors[i].bg,
                    agingColors[i].border,
                    expandedAging === bucket.faixa && 'ring-2 ring-offset-2 ring-primary shadow-lg scale-[1.02]',
                    bucket.count === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn('text-xs font-medium', agingColors[i].text)}>{bucket.faixa}</span>
                    <div className="flex items-center gap-1">
                      {bucket.count > 0 && (
                        <Badge className={cn('text-[10px]', agingColors[i].badge)}>
                          {bucket.count}
                        </Badge>
                      )}
                      {bucket.count > 0 && (
                        expandedAging === bucket.faixa 
                          ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
                          : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className={cn('text-lg font-bold', agingColors[i].text)}>
                    {formatCurrencyCompact(bucket.valor)}
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* Lista expandida de vencidos por faixa */}
          {expandedAging && totalVencidos > 0 && (
            <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-dashed animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">Títulos vencidos: {expandedAging}</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setExpandedAging(null)}
                  className="h-7 px-2"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Para ver detalhes dos títulos vencidos nesta faixa, acesse o módulo de Títulos.
              </p>
              <Button variant="outline" size="sm" className="mt-3">
                Ver títulos vencidos
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
          
          {totalVencidos === 0 && !isLoading && (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
              <p className="font-medium text-green-700">Nenhum título vencido!</p>
              <p className="text-xs text-muted-foreground mt-1">Todos os compromissos estão em dia</p>
            </div>
          )}
        </GlassCard>
      </section>

      {/* Próximos Vencimentos - Timeline */}
      <section className="animate-fade-in-up opacity-0" style={{ animationDelay: '250ms', animationFillMode: 'forwards' }}>
        <GlassCard padding="md">
          <GlassCardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <GlassCardTitle>Próximos Vencimentos</GlassCardTitle>
            </div>
            <GlassCardDescription>
              Compromissos dos próximos 14 dias
            </GlassCardDescription>
          </GlassCardHeader>

          {isLoading ? (
            <div className="space-y-3 mt-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-lg" />
              ))}
            </div>
          ) : proximosVencimentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="font-medium">Nenhum vencimento nos próximos 14 dias</p>
              <p className="text-xs mt-1">Sua agenda está livre!</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {proximosVencimentos.map((titulo, idx) => {
                const hoje = new Date();
                const venc = new Date(titulo.dataVencimento);
                const diffDays = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                const isUrgent = diffDays <= 3;
                const isToday = diffDays === 0;
                
                return (
                  <div 
                    key={titulo.id}
                    className={cn(
                      'group flex items-center gap-4 p-3 rounded-lg border transition-all hover:shadow-md',
                      titulo.tipo === 'pagar' 
                        ? 'border-red-100 hover:border-red-300 bg-red-50/30' 
                        : 'border-green-100 hover:border-green-300 bg-green-50/30',
                      isUrgent && 'ring-1 ring-amber-300'
                    )}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {/* Indicador de tipo */}
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                      titulo.tipo === 'pagar' ? 'bg-red-100' : 'bg-green-100'
                    )}>
                      {titulo.tipo === 'pagar' ? (
                        <Banknote className="h-5 w-5 text-red-600" />
                      ) : (
                        <CreditCard className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{titulo.descricao}</p>
                        {isToday && (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px]">Hoje</Badge>
                        )}
                        {isUrgent && !isToday && (
                          <Badge className="bg-orange-100 text-orange-800 text-[10px]">Urgente</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {titulo.pessoaNome || 'Sem pessoa'} · {formatDate(titulo.dataVencimento)}
                      </p>
                    </div>
                    
                    {/* Valor */}
                    <div className="text-right shrink-0">
                      <p className={cn(
                        'font-mono font-bold',
                        titulo.tipo === 'pagar' ? 'text-red-600' : 'text-green-600'
                      )}>
                        {titulo.tipo === 'pagar' ? '-' : '+'}{formatCurrency(titulo.valor)}
                      </p>
                    </div>
                    
                    {/* Ações */}
                    <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              {proximosVencimentos.length >= 10 && (
                <div className="text-center pt-2">
                  <Button variant="ghost" size="sm" className="text-primary">
                    Ver todos os vencimentos
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </section>
    </div>
  );
}
