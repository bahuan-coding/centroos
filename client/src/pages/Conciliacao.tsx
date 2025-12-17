import { useState } from 'react';
import { ArrowLeftRight, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/lib/trpc';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  conciliado: { label: 'Conciliado', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  ignorado: { label: 'Ignorado', color: 'bg-slate-100 text-slate-700', icon: XCircle },
  duplicado: { label: 'Duplicado', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

export default function Conciliacao() {
  const [statusFiltro, setStatusFiltro] = useState<string>('pendente');
  const [extratoFiltro, setExtratoFiltro] = useState<string>('');

  const { data: extratos = [] } = trpc.extratos.list.useQuery();
  const { data: linhas = [], isLoading } = trpc.extratos.linhas.useQuery({
    status: statusFiltro as any || undefined,
    extratoId: extratoFiltro || undefined,
  });
  const { data: stats } = trpc.extratos.stats.useQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ArrowLeftRight className="h-8 w-8 text-cyan-600" />
            Conciliação Bancária
          </h1>
          <p className="text-muted-foreground">Vincule extratos aos lançamentos</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Extratos Importados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.extratos || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total de Linhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.linhas || 0}</div>
          </CardContent>
        </Card>
        <Card className={stats?.pendentes ? 'border-amber-200 bg-amber-50' : ''}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Pendentes</CardTitle>
            <Clock className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats?.pendentes || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Conciliados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{(stats?.linhas || 0) - (stats?.pendentes || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Extratos */}
      {extratos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {extratos.map((item: any) => (
            <Card 
              key={item.extrato.id} 
              className={`cursor-pointer hover:border-primary transition-colors ${extratoFiltro === item.extrato.id ? 'border-cyan-500' : ''}`}
              onClick={() => setExtratoFiltro(extratoFiltro === item.extrato.id ? '' : item.extrato.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{item.conta?.nome || 'Conta'}</CardTitle>
                <CardDescription>{item.extrato.nomeArquivo}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Período:</span>
                  <span>{formatDate(item.extrato.dataInicio)} - {formatDate(item.extrato.dataFim)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Linhas:</span>
                  <span className="font-semibold">{item.extrato.totalLinhas}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-48">
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="conciliado">Conciliados</SelectItem>
                  <SelectItem value="ignorado">Ignorados</SelectItem>
                  <SelectItem value="duplicado">Duplicados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(statusFiltro || extratoFiltro) && (
              <Button variant="ghost" onClick={() => { setStatusFiltro(''); setExtratoFiltro(''); }}>
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : linhas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma linha de extrato encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((linha: any) => {
                  const config = statusConfig[linha.status] || statusConfig.pendente;
                  const Icon = config.icon;
                  return (
                    <TableRow key={linha.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(linha.dataMovimento)}</TableCell>
                      <TableCell className="max-w-xs truncate">{linha.descricao}</TableCell>
                      <TableCell>
                        <Badge variant={linha.tipo === 'credito' ? 'default' : 'secondary'}>
                          {linha.tipo === 'credito' ? 'Crédito' : 'Débito'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${linha.tipo === 'credito' ? 'text-green-600' : 'text-red-600'}`}>
                        {linha.tipo === 'credito' ? '+' : '-'}{formatCurrency(Math.abs(Number(linha.valor) * 100))}
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {linha.status === 'pendente' && (
                          <Button variant="outline" size="sm">Conciliar</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

