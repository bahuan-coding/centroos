import { useState } from 'react';
import { X, Lock, Calendar, TrendingUp, TrendingDown, FileText, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight, Sparkles, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { Doughnut } from 'react-chartjs-2';

interface PeriodDetailProps {
  periodId: number;
  onClose: () => void;
  onUpdated?: () => void;
}

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

export function PeriodDetail({ periodId, onClose, onUpdated }: PeriodDetailProps) {
  const utils = trpc.useUtils();
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeForm, setCloseForm] = useState({ closingBalance: '', notes: '' });

  const { data: periodDetail, isLoading, error } = trpc.periods.detail.useQuery(periodId);
  
  const closeMutation = trpc.periods.close.useMutation({
    onSuccess: () => {
      utils.periods.listWithStats.invalidate();
      utils.periods.detail.invalidate();
      setShowCloseDialog(false);
      toast.success('Período fechado com sucesso');
      onUpdated?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleClose = () => {
    const cb = parseFloat(closeForm.closingBalance.replace(',', '.')) * 100;
    if (isNaN(cb)) { toast.error('Saldo inválido'); return; }
    closeMutation.mutate({ id: periodId, closingBalance: Math.round(cb), notes: closeForm.notes || undefined });
  };

  const openCloseDialog = () => {
    if (periodDetail) {
      setCloseForm({ closingBalance: (periodDetail.totals.resultado / 100).toFixed(2), notes: '' });
      setShowCloseDialog(true);
    }
  };

  const isMobileOverlay = typeof window !== 'undefined' && window.innerWidth < 1024;

  if (isLoading) {
    if (isMobileOverlay) {
      return (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="relative w-full max-w-2xl bg-background shadow-2xl animate-in slide-in-from-right duration-300 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        </div>
      );
    }
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !periodDetail) {
    if (isMobileOverlay) {
      return (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <div className="relative w-full max-w-2xl bg-background shadow-2xl p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-medium">Erro ao carregar período</p>
            <Button onClick={onClose} className="mt-4">Fechar</Button>
          </div>
        </div>
      );
    }
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Erro ao carregar período</p>
        <Button onClick={onClose} className="mt-4" variant="outline">Voltar</Button>
      </div>
    );
  }

  const { period, totals, comparativo, composicaoReceitas, composicaoDespesas, topReceitas, insights } = periodDetail;
  const isClosed = period.status === 'closed';
  const isDeficit = totals.resultado < 0;
  const headerBg = isClosed ? 'from-slate-500 to-slate-600' : 'from-blue-500 to-indigo-600';

  // Donut charts
  const donutColors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];
  const receitasDonutData = {
    labels: composicaoReceitas.map(r => naturezaLabels[r.natureza] || r.natureza),
    datasets: [{ data: composicaoReceitas.map(r => r.valor), backgroundColor: donutColors, borderWidth: 0 }],
  };
  const despesasDonutData = {
    labels: composicaoDespesas.map(r => naturezaLabels[r.natureza] || r.natureza),
    datasets: [{ data: composicaoDespesas.map(r => r.valor), backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6'], borderWidth: 0 }],
  };
  const donutOptions = { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false }, tooltip: { enabled: true } } };

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (isMobileOverlay) {
      return (
        <div className="fixed inset-0 z-50 flex justify-end pt-16 lg:pt-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          {children}
        </div>
      );
    }
    return <>{children}</>;
  };

  return (
    <Wrapper>
      <div className={cn(
        "bg-background overflow-hidden flex flex-col h-full",
        isMobileOverlay && "relative w-full max-w-2xl shadow-2xl animate-in slide-in-from-right duration-300"
      )}>
        {/* Header */}
        <div className={cn('text-white p-6 shrink-0 relative', `bg-gradient-to-br ${headerBg}`)}>
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Fechar detalhes"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl shrink-0">
              <Calendar className="h-8 w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{formatPeriodName(period.month, period.year)}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={cn('border-white/40 text-white text-xs', isClosed ? 'bg-white/10' : 'bg-white/20')}>
                  {isClosed ? <Lock className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {isClosed ? 'Fechado' : 'Aberto'}
                </Badge>
                {isDeficit && (
                  <Badge className="bg-red-500/80 text-white text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />Déficit
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <ArrowUpRight className="h-4 w-4 text-emerald-300" />
                <span className="text-xl font-bold">{formatCompact(totals.receitas)}</span>
              </div>
              <div className="text-xs text-white/70">Receitas</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <ArrowDownRight className="h-4 w-4 text-red-300" />
                <span className="text-xl font-bold">{formatCompact(totals.despesas)}</span>
              </div>
              <div className="text-xs text-white/70">Despesas</div>
            </div>
            <div className="text-center">
              <div className={cn('text-xl font-bold', isDeficit ? 'text-red-300' : 'text-emerald-300')}>
                {formatCompact(totals.resultado)}
              </div>
              <div className="text-xs text-white/70">{isDeficit ? 'Déficit' : 'Superávit'}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Comparativo */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Comparativo vs Mês Anterior
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-xs text-muted-foreground">Receitas</span>
                  <span className={cn('text-sm font-medium flex items-center gap-1',
                    comparativo.receitasVar >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {comparativo.receitasVar >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(comparativo.receitasVar).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-xs text-muted-foreground">Despesas</span>
                  <span className={cn('text-sm font-medium flex items-center gap-1',
                    comparativo.despesasVar <= 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {comparativo.despesasVar <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    {Math.abs(comparativo.despesasVar).toFixed(0)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Composição */}
          {(composicaoReceitas.length > 0 || composicaoDespesas.length > 0) && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Composição
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="grid grid-cols-2 gap-6">
                  {composicaoReceitas.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 text-center">Receitas</p>
                      <div className="h-28"><Doughnut data={receitasDonutData} options={donutOptions} /></div>
                      <div className="mt-2 space-y-1">
                        {composicaoReceitas.slice(0, 3).map((r, i) => (
                          <div key={r.natureza} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: donutColors[i] }} />
                              {naturezaLabels[r.natureza] || r.natureza}
                            </span>
                            <span className="font-medium">{formatCompact(r.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {composicaoDespesas.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 text-center">Despesas</p>
                      <div className="h-28"><Doughnut data={despesasDonutData} options={donutOptions} /></div>
                      <div className="mt-2 space-y-1">
                        {composicaoDespesas.slice(0, 3).map((r, i) => (
                          <div key={r.natureza} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#ef4444', '#f97316', '#f59e0b'][i] }} />
                              {naturezaLabels[r.natureza] || r.natureza}
                            </span>
                            <span className="font-medium">{formatCompact(r.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Receitas */}
          {topReceitas.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" /> Maiores Receitas
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="space-y-2">
                  {topReceitas.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50">
                      <span className="text-sm truncate flex-1 mr-2">{r.pessoaNome || r.descricao}</span>
                      <span className="text-sm font-medium text-emerald-600">{formatCompact(r.valor)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          {insights.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" /> Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-2">
                {insights.map((insight, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      'text-xs p-2 rounded-lg border-l-2',
                      insight.tipo === 'success' && 'bg-emerald-50 border-l-emerald-500',
                      insight.tipo === 'warning' && 'bg-amber-50 border-l-amber-500',
                      insight.tipo === 'danger' && 'bg-red-50 border-l-red-500',
                      insight.tipo === 'info' && 'bg-blue-50 border-l-blue-500'
                    )}
                  >
                    {insight.mensagem}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Link href={`/titulos?mes=${period.year}-${String(period.month).padStart(2, '0')}`} className="flex-1">
              <Button variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" /> Ver Títulos
              </Button>
            </Link>
            {!isClosed && (
              <Button onClick={openCloseDialog} variant="destructive">
                <Lock className="h-4 w-4 mr-2" /> Fechar Período
              </Button>
            )}
          </div>
        </div>

        {/* Dialog Fechar Período */}
        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-destructive" />
                Fechar Período Contábil
              </DialogTitle>
              <DialogDescription>
                Esta ação impedirá novos lançamentos neste período. O fechamento é irreversível.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="closingBalance">Saldo de Fechamento (R$)</Label>
                <Input 
                  id="closingBalance"
                  value={closeForm.closingBalance} 
                  onChange={(e) => setCloseForm({ ...closeForm, closingBalance: e.target.value })} 
                  placeholder="0,00" 
                />
              </div>
              <div>
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea 
                  id="notes"
                  value={closeForm.notes} 
                  onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })} 
                  placeholder="Notas sobre o fechamento..." 
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleClose} disabled={closeMutation.isPending}>
                {closeMutation.isPending ? 'Fechando...' : 'Confirmar Fechamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Wrapper>
  );
}






