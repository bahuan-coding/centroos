import { Building2, Wallet, ArrowUpRight, ArrowDownRight, CreditCard, Landmark, PiggyBank } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';

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
  const { data: contas = [], isLoading } = trpc.contasFinanceiras.list.useQuery();
  const { data: stats } = trpc.contasFinanceiras.stats.useQuery();

  const saldoTotal = contas.reduce((acc: number, c: any) => acc + c.saldoAtual, 0);

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
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8 text-emerald-600" />
            Contas Financeiras
          </h1>
          <p className="text-muted-foreground">Gestão de caixa e contas bancárias</p>
        </div>
      </div>

      {/* Saldo Total */}
      <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">
        <CardContent className="py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Saldo Total Consolidado</p>
              <p className="text-4xl font-bold mt-1">{formatCurrency(saldoTotal)}</p>
            </div>
            <div className="text-right">
              <p className="text-emerald-100 text-sm">{stats?.total || 0} contas ativas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {contas.map((conta: any) => {
          const colorClass = getContaColor(conta.tipo);
          return (
            <Card key={conta.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${colorClass}`}>
                      {getContaIcon(conta.tipo)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{conta.nome}</CardTitle>
                      <CardDescription className="capitalize">{conta.tipo.replace('_', ' ')}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={conta.ativo ? 'default' : 'secondary'}>
                    {conta.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Saldo */}
                  <div className="flex items-center justify-between py-3 border-y">
                    <span className="text-muted-foreground">Saldo Atual</span>
                    <span className={`text-2xl font-bold ${conta.saldoAtual >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(conta.saldoAtual)}
                    </span>
                  </div>

                  {/* Movimentação */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Entradas</p>
                        <p className="font-semibold text-green-600">{formatCurrency(conta.entradas)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Saídas</p>
                        <p className="font-semibold text-red-600">{formatCurrency(conta.saidas)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dados Bancários */}
                  {conta.bancoNome && (
                    <div className="pt-3 border-t space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Banco:</span> {conta.bancoNome}</p>
                      {conta.agencia && <p><span className="text-muted-foreground">Agência:</span> {conta.agencia}</p>}
                      {conta.contaNumero && <p><span className="text-muted-foreground">Conta:</span> {conta.contaNumero}</p>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {contas.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma conta financeira cadastrada</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

