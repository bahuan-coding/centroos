import { TrendingUp, DollarSign, Users, Building2, FileText, Calendar, AlertCircle, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { PageHeader, StatsGrid } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export default function Dashboard() {
  const { data: kpis, isLoading } = trpc.dashboard.kpis.useQuery();
  const { data: titulosPorMes = [] } = trpc.titulos.byMonth.useQuery(12);
  const { data: contasFinanceiras = [] } = trpc.contasFinanceiras.list.useQuery();

  const barChartData = {
    labels: titulosPorMes.map(m => {
      const [ano, mes] = m.mes.split('-');
      return `${mes}/${ano.slice(2)}`;
    }),
    datasets: [
      {
        label: 'Receitas',
        data: titulosPorMes.map(m => m.receitas / 100),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderRadius: 4,
      },
      {
        label: 'Despesas',
        data: titulosPorMes.map(m => m.despesas / 100),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderRadius: 4,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top' as const,
        labels: { boxWidth: 12, padding: 8, font: { size: 11 } }
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: R$ ${ctx.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { 
          callback: (value: any) => `R$ ${value.toLocaleString('pt-BR')}`,
          font: { size: 10 }
        },
      },
      x: {
        ticks: { font: { size: 10 } }
      }
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        description={`Visão geral do sistema financeiro${titulosPorMes.length > 0 ? ` • Últimos ${Math.min(12, titulosPorMes.length)} meses` : ''}`}
        actions={
          <Link href="/entries">
            <Button size="sm" className="touch-target">
              <FileText className="mr-2 h-4 w-4" />
              <span className="hidden xs:inline">Novo </span>Lançamento
            </Button>
          </Link>
        }
      />

      {/* KPI Cards - Row 1: Financeiro */}
      <StatsGrid columns={4}>
        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Saldo Total</CardTitle>
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-emerald-600">{formatCurrency((kpis?.saldoTotal || 0) * 100)}</div>
            <p className="text-xs text-muted-foreground mt-1">{kpis?.contasFinanceiras} contas ativas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Receitas</CardTitle>
            <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(kpis?.receitas || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1 hidden xs:block">Total acumulado</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Despesas</CardTitle>
            <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-red-600">{formatCurrency(kpis?.despesas || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1 hidden xs:block">Total acumulado</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Resultado</CardTitle>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-lg sm:text-2xl font-bold',
              (kpis?.resultado || 0) >= 0 ? 'text-blue-600' : 'text-red-600'
            )}>
              {formatCurrency(kpis?.resultado || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{(kpis?.resultado || 0) >= 0 ? 'Superávit' : 'Déficit'}</p>
          </CardContent>
        </Card>
      </StatsGrid>

      {/* KPI Cards - Row 2: Cadastros */}
      <StatsGrid columns={4}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Pessoas</CardTitle>
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{kpis?.pessoas || 0}</div>
            <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] sm:text-xs">{kpis?.associados} assoc.</Badge>
              <Badge variant="outline" className="text-[10px] sm:text-xs hidden xs:inline-flex">{kpis?.naoAssociados} outros</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Lançamentos</CardTitle>
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{kpis?.lancamentos || 0}</div>
            <p className="text-xs text-muted-foreground mt-1 hidden xs:block">Títulos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Períodos</CardTitle>
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{kpis?.periodos || 0}</div>
            <p className="text-xs text-muted-foreground mt-1 hidden xs:block">Períodos contábeis</p>
          </CardContent>
        </Card>

        <Card className={cn(kpis?.extratosPendentes && 'border-amber-200 bg-amber-50/50')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Conciliação</CardTitle>
            {kpis?.extratosPendentes ? <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" /> : <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />}
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{kpis?.extratosPendentes || 0}</div>
            <p className="text-xs text-muted-foreground mt-1 hidden xs:block">Linhas pendentes</p>
          </CardContent>
        </Card>
      </StatsGrid>

      {/* Charts and Contas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Gráfico de Barras */}
        {titulosPorMes.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                Evolução Financeira
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Receitas vs Despesas por mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 sm:h-64 lg:h-72">
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contas Financeiras */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
              Contas Financeiras
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Saldo por conta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4 max-h-64 overflow-auto">
              {contasFinanceiras.map((conta: any) => (
                <div key={conta.id} className="flex items-center justify-between py-2 border-b last:border-0 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs sm:text-sm truncate">{conta.nome}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground capitalize">{conta.tipo.replace('_', ' ')}</p>
                  </div>
                  <span className={cn(
                    'font-semibold text-xs sm:text-sm whitespace-nowrap',
                    conta.saldoAtual >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {formatCurrency(conta.saldoAtual * 100)}
                  </span>
                </div>
              ))}
              {contasFinanceiras.length === 0 && (
                <p className="text-center text-muted-foreground py-4 text-sm">Nenhuma conta cadastrada</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Link href="/pessoas">
              <Button className="w-full h-auto py-3 sm:py-4 flex-col gap-1 sm:gap-2 touch-target" variant="outline">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600" />
                <span className="text-xs sm:text-sm">Pessoas</span>
              </Button>
            </Link>
            <Link href="/titulos">
              <Button className="w-full h-auto py-3 sm:py-4 flex-col gap-1 sm:gap-2 touch-target" variant="outline">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                <span className="text-xs sm:text-sm">Lançamentos</span>
              </Button>
            </Link>
            <Link href="/contas">
              <Button className="w-full h-auto py-3 sm:py-4 flex-col gap-1 sm:gap-2 touch-target" variant="outline">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                <span className="text-xs sm:text-sm">Contas</span>
              </Button>
            </Link>
            <Link href="/reports">
              <Button className="w-full h-auto py-3 sm:py-4 flex-col gap-1 sm:gap-2 touch-target" variant="outline">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                <span className="text-xs sm:text-sm">Relatórios</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
