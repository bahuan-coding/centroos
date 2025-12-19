import { useState } from 'react';
import { ArrowLeftRight, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ResponsiveTable, TableCardView } from '@/components/ui/table';
import { PageHeader, FilterBar, StatsGrid } from '@/components/ui/page-header';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <PageHeader
        title="Conciliação Bancária"
        description="Vincule extratos aos lançamentos"
        icon={<ArrowLeftRight className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-600 shrink-0" />}
      />

      {/* Stats */}
      <StatsGrid columns={4}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Extratos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{stats?.extratos || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Linhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{stats?.linhas || 0}</div>
          </CardContent>
        </Card>
        <Card className={cn(stats?.pendentes && 'border-amber-200 bg-amber-50')}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Pendentes</CardTitle>
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-amber-600">{stats?.pendentes || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Conciliados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-green-600">{(stats?.linhas || 0) - (stats?.pendentes || 0)}</div>
          </CardContent>
        </Card>
      </StatsGrid>

      {/* Extratos */}
      {extratos.length > 0 && (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {extratos.map((item: any) => (
            <Card 
              key={item.extrato.id} 
              className={cn(
                'cursor-pointer hover:border-primary transition-colors touch-target',
                extratoFiltro === item.extrato.id && 'border-cyan-500'
              )}
              onClick={() => setExtratoFiltro(extratoFiltro === item.extrato.id ? '' : item.extrato.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base truncate">{item.conta?.nome || 'Conta'}</CardTitle>
                <CardDescription className="text-xs truncate">{item.extrato.nomeArquivo}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Período:</span>
                  <span className="text-right">{formatDate(item.extrato.dataInicio)} - {formatDate(item.extrato.dataFim)}</span>
                </div>
                <div className="flex justify-between mt-1">
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
        <CardHeader className="pb-3 sm:pb-6">
          <FilterBar showClear={!!(statusFiltro || extratoFiltro)} onClear={() => { setStatusFiltro(''); setExtratoFiltro(''); }}>
            <Select value={statusFiltro || 'all'} onValueChange={(v) => setStatusFiltro(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="conciliado">Conciliados</SelectItem>
                <SelectItem value="ignorado">Ignorados</SelectItem>
                <SelectItem value="duplicado">Duplicados</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : linhas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground px-4">
              Nenhuma linha de extrato encontrada
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <ResponsiveTable stickyHeader density="normal">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="col-priority-low">Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right col-priority-medium">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linhas.map((linha: any) => {
                        const config = statusConfig[linha.status] || statusConfig.pendente;
                        const Icon = config.icon;
                        return (
                          <TableRow key={linha.id}>
                            <TableCell className="whitespace-nowrap text-sm">{formatDate(linha.dataMovimento)}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">{linha.descricao}</TableCell>
                            <TableCell className="col-priority-low">
                              <Badge variant={linha.tipo === 'credito' ? 'default' : 'secondary'} className="text-xs">
                                {linha.tipo === 'credito' ? 'C' : 'D'}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn(
                              'text-right font-mono font-semibold text-sm whitespace-nowrap',
                              linha.tipo === 'credito' ? 'text-green-600' : 'text-red-600'
                            )}>
                              {linha.tipo === 'credito' ? '+' : '-'}{formatCurrency(Math.abs(Number(linha.valor) * 100))}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn('text-xs', config.color)}>
                                <Icon className="h-3 w-3 mr-1" />
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right col-priority-medium">
                              {linha.status === 'pendente' && (
                                <Button variant="outline" size="sm">Conciliar</Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ResponsiveTable>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden px-4">
                <TableCardView
                  data={linhas}
                  keyExtractor={(l: any) => l.id}
                  renderCard={(linha: any) => {
                    const config = statusConfig[linha.status] || statusConfig.pendente;
                    const Icon = config.icon;
                    return (
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">{formatDate(linha.dataMovimento)}</p>
                            <p className="font-medium text-sm truncate">{linha.descricao}</p>
                          </div>
                          <span className={cn(
                            'font-mono font-bold text-sm whitespace-nowrap',
                            linha.tipo === 'credito' ? 'text-green-600' : 'text-red-600'
                          )}>
                            {linha.tipo === 'credito' ? '+' : '-'}{formatCurrency(Math.abs(Number(linha.valor) * 100))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge className={cn('text-[10px]', config.color)}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                          {linha.status === 'pendente' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs">Conciliar</Button>
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

