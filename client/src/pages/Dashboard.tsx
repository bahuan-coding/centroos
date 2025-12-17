import { TrendingUp, TrendingDown, DollarSign, FileText, Upload, BarChart3, AlertTriangle, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { formatCurrency, formatPeriod, formatPercent, formatDate } from '@/lib/utils';
import { Link } from 'wouter';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard() {
  const { data: currentPeriod } = trpc.periods.getCurrent.useQuery();
  const { data: org } = trpc.organization.get.useQuery();
  const { data: summary } = trpc.entries.getSummary.useQuery(currentPeriod?.id || 0, { enabled: !!currentPeriod?.id });
  const { data: recentEntries } = trpc.entries.list.useQuery({ limit: 5 });
  const { data: history = [] } = trpc.entries.getHistory.useQuery(6);
  const { data: categories = [] } = trpc.entries.getByCategory.useQuery(currentPeriod?.id || 0, { enabled: !!currentPeriod?.id });

  const periodLabel = currentPeriod ? formatPeriod(currentPeriod.month, currentPeriod.year) : 'Nenhum período';

  const barChartData = {
    labels: history.map(h => h.label),
    datasets: [
      {
        label: 'Receitas',
        data: history.map(h => h.revenues / 100),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderRadius: 4,
      },
      {
        label: 'Despesas',
        data: history.map(h => h.expenses / 100),
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
        ticks: {
          callback: (value: any) => `R$ ${value.toLocaleString('pt-BR')}`,
        },
      },
    },
  };

  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'fixed_asset').slice(0, 6);
  
  const donutChartData = {
    labels: expenseCategories.map(c => c.name),
    datasets: [{
      data: expenseCategories.map(c => c.amount / 100),
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(168, 85, 247, 0.8)',
      ],
      borderWidth: 0,
    }],
  };

  const donutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const, labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.label}: R$ ${ctx.parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{org?.name || 'CentrOS'}</h1>
          <p className="text-muted-foreground">Gestão Financeira</p>
        </div>
        <Link href="/entries">
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            Novo Lançamento
          </Button>
        </Link>
      </div>

      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <span className="text-sm text-muted-foreground">Período Atual:</span>
                <span className="ml-2 font-semibold capitalize">{periodLabel}</span>
              </div>
            </div>
            {currentPeriod && (
              <Badge variant={currentPeriod.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                {currentPeriod.status === 'open' ? 'Aberto' : currentPeriod.status === 'closed' ? 'Fechado' : 'Em Revisão'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas</CardTitle>
            <div className="p-2 rounded-full bg-green-100">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(summary?.revenues || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total do período atual</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas</CardTitle>
            <div className="p-2 rounded-full bg-red-100">
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{formatCurrency(summary?.expenses || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total do período atual</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado</CardTitle>
            <div className="p-2 rounded-full bg-blue-100">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${(summary?.balance || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(summary?.balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{(summary?.balance || 0) >= 0 ? 'Superávit' : 'Déficit'}</p>
          </CardContent>
        </Card>
      </div>

      {summary?.nfc && summary.nfc.total > 0 && (
        <Card className={summary.nfc.compliant ? 'border-purple-200 bg-purple-50/50' : 'border-yellow-300 bg-yellow-50'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {!summary.nfc.compliant && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                <span className="text-purple-700">Nota Fiscal Cidadã</span>
              </CardTitle>
              <Badge variant={summary.nfc.compliant ? 'success' : 'destructive'}>
                {summary.nfc.compliant ? 'Conforme' : 'Atenção Necessária'}
              </Badge>
            </div>
            <CardDescription>Proporção de aplicação dos recursos NFC</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Projeto (Meta: 70%)</span>
                  <span className="text-sm text-purple-600 font-semibold">{formatPercent(summary.nfc.project70Percent)}</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${Math.min(summary.nfc.project70Percent, 100)}%` }} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{formatCurrency(summary.nfc.project70)}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Custeio (Meta: 30%)</span>
                  <span className="text-sm text-yellow-600 font-semibold">{formatPercent(summary.nfc.operating30Percent)}</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${Math.min(summary.nfc.operating30Percent, 100)}%` }} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{formatCurrency(summary.nfc.operating30)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Evolução Financeira
              </CardTitle>
              <CardDescription>Receitas vs Despesas nos últimos meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            </CardContent>
          </Card>
        )}

        {expenseCategories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Despesas por Categoria</CardTitle>
              <CardDescription>Distribuição das despesas do período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Doughnut data={donutChartData} options={donutChartOptions} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Atividade Recente
              </CardTitle>
              <Link href="/entries">
                <Button variant="ghost" size="sm">
                  Ver todos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!recentEntries?.entries.length ? (
              <p className="text-center text-muted-foreground py-8">Nenhum lançamento recente</p>
            ) : (
              <div className="space-y-4">
                {recentEntries.entries.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(e.transactionDate)}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`text-sm font-semibold ${e.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {e.type === 'credit' ? '+' : '-'}{formatCurrency(e.amountCents)}
                      </span>
                      {e.isNfc === 1 && <Badge variant="nfc" className="text-xs">NFC</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>O que você deseja fazer?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Link href="/entries">
                <Button className="w-full justify-start h-auto py-4" variant="outline">
                  <FileText className="mr-3 h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium">Novo Lançamento</p>
                    <p className="text-xs text-muted-foreground">Registrar receita ou despesa</p>
                  </div>
                </Button>
              </Link>
              <Link href="/import">
                <Button className="w-full justify-start h-auto py-4" variant="outline">
                  <Upload className="mr-3 h-5 w-5 text-purple-600" />
                  <div className="text-left">
                    <p className="font-medium">Importar Extrato</p>
                    <p className="text-xs text-muted-foreground">CSV, OFX ou TXT bancário</p>
                  </div>
                </Button>
              </Link>
              <Link href="/reports">
                <Button className="w-full justify-start h-auto py-4" variant="outline">
                  <BarChart3 className="mr-3 h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">Gerar Relatório</p>
                    <p className="text-xs text-muted-foreground">Financeiro, NFC, DRE ou Balancete</p>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
