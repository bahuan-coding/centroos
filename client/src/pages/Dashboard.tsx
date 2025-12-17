import { TrendingUp, TrendingDown, DollarSign, Users, Building2, FileText, Calendar, AlertCircle, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

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
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: R$ ${ctx.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (value: any) => `R$ ${value.toLocaleString('pt-BR')}` },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Visão geral do sistema financeiro</p>
        </div>
        <div className="flex gap-2">
          <Link href="/entries">
            <Button><FileText className="mr-2 h-4 w-4" />Novo Lançamento</Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards - Row 1: Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total</CardTitle>
            <Wallet className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency((kpis?.saldoTotal || 0) * 100)}</div>
            <p className="text-xs text-muted-foreground mt-1">{kpis?.contasFinanceiras} contas ativas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas</CardTitle>
            <ArrowUpRight className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(kpis?.receitas || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total acumulado</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas</CardTitle>
            <ArrowDownRight className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(kpis?.despesas || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total acumulado</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(kpis?.resultado || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(kpis?.resultado || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{(kpis?.resultado || 0) >= 0 ? 'Superávit' : 'Déficit'}</p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards - Row 2: Cadastros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pessoas</CardTitle>
            <Users className="h-5 w-5 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.pessoas || 0}</div>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">{kpis?.associados} associados</Badge>
              <Badge variant="outline" className="text-xs">{kpis?.naoAssociados} outros</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lançamentos</CardTitle>
            <FileText className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.lancamentos || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Títulos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Períodos</CardTitle>
            <Calendar className="h-5 w-5 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.periodos || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Períodos contábeis</p>
          </CardContent>
        </Card>

        <Card className={kpis?.extratosPendentes ? 'border-amber-200 bg-amber-50/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conciliação</CardTitle>
            {kpis?.extratosPendentes ? <AlertCircle className="h-5 w-5 text-amber-600" /> : <Building2 className="h-5 w-5 text-slate-600" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.extratosPendentes || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Linhas pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Contas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras */}
        {titulosPorMes.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Evolução Financeira
              </CardTitle>
              <CardDescription>Receitas vs Despesas por mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contas Financeiras */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Contas Financeiras
            </CardTitle>
            <CardDescription>Saldo por conta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contasFinanceiras.map((conta: any) => (
                <div key={conta.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{conta.nome}</p>
                    <p className="text-xs text-muted-foreground capitalize">{conta.tipo.replace('_', ' ')}</p>
                  </div>
                  <span className={`font-semibold ${conta.saldoAtual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(conta.saldoAtual * 100)}
                  </span>
                </div>
              ))}
              {contasFinanceiras.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Nenhuma conta cadastrada</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/pessoas">
              <Button className="w-full h-auto py-4 flex-col gap-2" variant="outline">
                <Users className="h-6 w-6 text-violet-600" />
                <span>Pessoas</span>
              </Button>
            </Link>
            <Link href="/entries">
              <Button className="w-full h-auto py-4 flex-col gap-2" variant="outline">
                <FileText className="h-6 w-6 text-amber-600" />
                <span>Lançamentos</span>
              </Button>
            </Link>
            <Link href="/contas">
              <Button className="w-full h-auto py-4 flex-col gap-2" variant="outline">
                <Building2 className="h-6 w-6 text-emerald-600" />
                <span>Contas</span>
              </Button>
            </Link>
            <Link href="/reports">
              <Button className="w-full h-auto py-4 flex-col gap-2" variant="outline">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                <span>Relatórios</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
