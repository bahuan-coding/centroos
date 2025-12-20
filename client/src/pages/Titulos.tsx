import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { FileText, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ResponsiveTable, TableCardView } from '@/components/ui/table';
import { PageHeader, FilterBar, StatsGrid, Pagination } from '@/components/ui/page-header';
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

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  pendente_aprovacao: 'Pendente',
  aprovado: 'Aprovado',
  parcial: 'Parcial',
  quitado: 'Quitado',
  cancelado: 'Cancelado',
  vencido: 'Vencido',
};

const statusColors: Record<string, string> = {
  rascunho: 'bg-slate-100 text-slate-700',
  pendente_aprovacao: 'bg-amber-100 text-amber-700',
  aprovado: 'bg-blue-100 text-blue-700',
  parcial: 'bg-purple-100 text-purple-700',
  quitado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
  vencido: 'bg-red-100 text-red-700',
};

export default function Titulos() {
  const [location] = useLocation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [tipoFiltro, setTipoFiltro] = useState<'pagar' | 'receber' | ''>('');
  const [mesFiltro, setMesFiltro] = useState<string>('');
  
  // Read mes from URL query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mesParam = params.get('mes');
    if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
      setMesFiltro(mesParam);
    }
  }, []);

  const { data, isLoading } = trpc.titulos.list.useQuery({
    tipo: tipoFiltro || undefined,
    mesAno: mesFiltro || undefined,
    page,
    limit: 20,
  });

  const { data: stats } = trpc.titulos.stats.useQuery();

  const titulos = data?.titulos || [];
  const totalPages = data?.pages || 1;

  // Gerar opções de meses (últimos 12 meses)
  const meses = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    meses.push({ value, label });
  }

  const hasFilters = tipoFiltro || mesFiltro;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <PageHeader
        title="Lançamentos"
        description="Títulos a pagar e a receber"
        icon={<FileText className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600 shrink-0" />}
      />

      {/* Stats - Responsivo com breakpoints intermediários */}
      <StatsGrid columns={4}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Total de Títulos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            'cursor-pointer hover:border-primary transition-colors touch-target',
            tipoFiltro === 'receber' && 'border-green-500 bg-green-50'
          )}
          onClick={() => setTipoFiltro(tipoFiltro === 'receber' ? '' : 'receber')}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">A Receber</CardTitle>
            <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(stats?.totalReceber || 0)}</div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            'cursor-pointer hover:border-primary transition-colors touch-target',
            tipoFiltro === 'pagar' && 'border-red-500 bg-red-50'
          )}
          onClick={() => setTipoFiltro(tipoFiltro === 'pagar' ? '' : 'pagar')}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">A Pagar</CardTitle>
            <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-red-600">{formatCurrency(stats?.totalPagar || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-lg sm:text-2xl font-bold',
              (stats?.saldo || 0) >= 0 ? 'text-blue-600' : 'text-red-600'
            )}>
              {formatCurrency(stats?.saldo || 0)}
            </div>
          </CardContent>
        </Card>
      </StatsGrid>

      {/* Filters & Table */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <FilterBar 
            showClear={!!hasFilters} 
            onClear={() => { setTipoFiltro(''); setMesFiltro(''); }}
          >
            <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 w-full"
              />
            </div>
            <Select value={mesFiltro || 'all'} onValueChange={(v) => { setMesFiltro(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todos os meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {meses.map(m => (
                  <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterBar>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : titulos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground px-4">
              Nenhum título encontrado
            </div>
          ) : (
            <>
              {/* Tabela Desktop */}
              <div className="hidden md:block">
                <ResponsiveTable stickyHeader density="normal">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="col-priority-low">Pessoa</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="col-priority-medium">Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {titulos.map((titulo: any) => (
                        <TableRow key={titulo.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(titulo.dataCompetencia)}</TableCell>
                          <TableCell className="max-w-[200px] lg:max-w-xs truncate">{titulo.descricao}</TableCell>
                          <TableCell className="col-priority-low">{titulo.pessoa?.nome || '-'}</TableCell>
                          <TableCell>
                            <Badge className={titulo.tipo === 'receber' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {titulo.tipo === 'receber' ? (
                                <><ArrowUpRight className="h-3 w-3 mr-1" />Receber</>
                              ) : (
                                <><ArrowDownRight className="h-3 w-3 mr-1" />Pagar</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="col-priority-medium">
                            <Badge className={statusColors[titulo.status] || 'bg-slate-100'}>
                              {statusLabels[titulo.status] || titulo.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold whitespace-nowrap">
                            {formatCurrency(Number(titulo.valorLiquido) * 100)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResponsiveTable>
              </div>

              {/* Cards Mobile */}
              <div className="md:hidden px-4">
                <TableCardView
                  data={titulos}
                  keyExtractor={(t: any) => t.id}
                  renderCard={(titulo: any) => (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{titulo.descricao}</p>
                          <p className="text-xs text-muted-foreground">{titulo.pessoa?.nome || '-'}</p>
                        </div>
                        <Badge className={titulo.tipo === 'receber' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {titulo.tipo === 'receber' ? 'Receber' : 'Pagar'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{formatDate(titulo.dataCompetencia)}</span>
                          <Badge className={cn('text-xs', statusColors[titulo.status] || 'bg-slate-100')}>
                            {statusLabels[titulo.status] || titulo.status}
                          </Badge>
                        </div>
                        <span className={cn(
                          'font-mono font-bold',
                          titulo.tipo === 'receber' ? 'text-green-600' : 'text-red-600'
                        )}>
                          {formatCurrency(Number(titulo.valorLiquido) * 100)}
                        </span>
                      </div>
                    </div>
                  )}
                />
              </div>

              {/* Pagination */}
              <div className="px-4 sm:px-0">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={data?.total || 0}
                  itemsShown={titulos.length}
                  onPageChange={setPage}
                  itemLabel="títulos"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

