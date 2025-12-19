import { useState } from 'react';
import { Building2, Wallet, ArrowUpRight, ArrowDownRight, CreditCard, Landmark, PiggyBank, ClipboardCheck, RefreshCw, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getContaIcon(tipo: string) {
  switch (tipo) {
    case 'caixa': return <Wallet className="h-8 w-8" />;
    case 'conta_corrente': return <Landmark className="h-8 w-8" />;
    case 'poupanca': return <PiggyBank className="h-8 w-8" />;
    case 'aplicacao': return <CreditCard className="h-8 w-8" />;
    default: return <Building2 className="h-8 w-8" />;
  }
}

function getContaColor(tipo: string) {
  switch (tipo) {
    case 'caixa': return 'text-amber-600 bg-amber-100';
    case 'conta_corrente': return 'text-blue-600 bg-blue-100';
    case 'poupanca': return 'text-green-600 bg-green-100';
    case 'aplicacao': return 'text-purple-600 bg-purple-100';
    default: return 'text-slate-600 bg-slate-100';
  }
}

export default function ContasFinanceiras() {
  const [showAuditoria, setShowAuditoria] = useState(false);
  const { data: contas = [], isLoading } = trpc.contasFinanceiras.list.useQuery();
  const { data: stats } = trpc.contasFinanceiras.stats.useQuery();
  const { data: auditoria, isLoading: loadingAuditoria, refetch: refetchAuditoria } = trpc.contasFinanceiras.auditoria.useQuery(undefined, { enabled: showAuditoria });
  const recalcularMutation = trpc.contasFinanceiras.recalcular.useMutation();

  const saldoTotal = contas.reduce((acc: number, c: any) => acc + c.saldoAtual, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <PageHeader
        title="Contas Financeiras"
        description="Gestão de caixa e contas bancárias"
        icon={<Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600 shrink-0" />}
      />

      {/* Saldo Total */}
      <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">
        <CardContent className="py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-emerald-100 text-xs sm:text-sm">Saldo Total Consolidado</p>
              <p className="text-3xl sm:text-4xl font-bold mt-1">{formatCurrency(saldoTotal)}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowAuditoria(true)}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Auditar
              </Button>
              <p className="text-emerald-100 text-xs sm:text-sm">{stats?.total || 0} contas ativas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Contas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {contas.map((conta: any) => {
          const colorClass = getContaColor(conta.tipo);
          return (
            <Card key={conta.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className={cn('p-2 sm:p-3 rounded-xl shrink-0', colorClass)}>
                      {getContaIcon(conta.tipo)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base sm:text-lg truncate">{conta.nome}</CardTitle>
                      <CardDescription className="capitalize text-xs sm:text-sm">{conta.tipo.replace('_', ' ')}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={conta.ativo ? 'default' : 'secondary'} className="text-xs shrink-0">
                    {conta.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {/* Saldo */}
                <div className="flex items-center justify-between py-2 sm:py-3 border-y">
                  <span className="text-sm sm:text-base text-muted-foreground">Saldo Atual</span>
                  <span className={cn(
                    'text-xl sm:text-2xl font-bold',
                    conta.saldoAtual >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {formatCurrency(conta.saldoAtual)}
                  </span>
                </div>

                {/* Movimentação */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Entradas</p>
                      <p className="font-semibold text-green-600 text-xs sm:text-base truncate">{formatCurrency(conta.entradas)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Saídas</p>
                      <p className="font-semibold text-red-600 text-xs sm:text-base truncate">{formatCurrency(conta.saidas)}</p>
                    </div>
                  </div>
                </div>

                {/* Dados Bancários */}
                {conta.bancoNome && (
                  <div className="pt-2 sm:pt-3 border-t space-y-1 text-xs sm:text-sm">
                    <p><span className="text-muted-foreground">Banco:</span> {conta.bancoNome}</p>
                    {conta.agencia && <p><span className="text-muted-foreground">Agência:</span> {conta.agencia}</p>}
                    {conta.contaNumero && <p><span className="text-muted-foreground">Conta:</span> {conta.contaNumero}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {contas.length === 0 && (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center px-4">
            <Building2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">Nenhuma conta financeira cadastrada</p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Auditoria */}
      <Dialog open={showAuditoria} onOpenChange={setShowAuditoria}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              Auditoria de Contas Financeiras
            </DialogTitle>
          </DialogHeader>

          {loadingAuditoria ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : auditoria ? (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{auditoria.resumo.qtdContas}</p>
                    <p className="text-xs text-muted-foreground">Contas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(auditoria.resumo.totalEntradas)}</p>
                    <p className="text-xs text-muted-foreground">Total Entradas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(auditoria.resumo.totalSaidas)}</p>
                    <p className="text-xs text-muted-foreground">Total Saídas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className={cn("text-2xl font-bold", auditoria.resumo.saldoTotalCalculado >= 0 ? "text-emerald-600" : "text-red-600")}>
                      {formatCurrency(auditoria.resumo.saldoTotalCalculado)}
                    </p>
                    <p className="text-xs text-muted-foreground">Saldo Total</p>
                  </CardContent>
                </Card>
              </div>

              {/* Alertas */}
              {auditoria.resumo.qtdProblemas > 0 && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                      {auditoria.resumo.qtdProblemas} Problema(s) Encontrado(s)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1 text-amber-800">
                      {auditoria.resumo.problemas.map((p: string, i: number) => (
                        <li key={i}>• {p}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {auditoria.resumo.qtdProblemas === 0 && (
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">Nenhum problema encontrado nas contas</span>
                  </CardContent>
                </Card>
              )}

              {/* Detalhes por Conta */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Detalhes por Conta</h3>
                {auditoria.contas.map((conta: any) => (
                  <Card key={conta.id}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{conta.nome}</CardTitle>
                        <Badge variant="outline" className="text-xs">{conta.tipo}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Saldo Inicial</p>
                          <p className="font-semibold">{formatCurrency(conta.saldoInicial)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Entradas ({conta.qtdEntradas})</p>
                          <p className="font-semibold text-green-600">{formatCurrency(conta.entradas)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Saídas ({conta.qtdSaidas})</p>
                          <p className="font-semibold text-red-600">{formatCurrency(conta.saidas)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Saldo Calculado</p>
                          <p className={cn("font-semibold", conta.saldoCalculado >= 0 ? "text-emerald-600" : "text-red-600")}>
                            {formatCurrency(conta.saldoCalculado)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Baixas</p>
                          <p className="font-semibold">{conta.qtdBaixasTotal}</p>
                        </div>
                      </div>
                      {conta.baixasSemTitulo > 0 && (
                        <p className="text-xs text-amber-600 mt-2">⚠️ {conta.baixasSemTitulo} baixa(s) sem título</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Ações */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => refetchAuditoria()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recarregar
                </Button>
                <Button onClick={() => setShowAuditoria(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

