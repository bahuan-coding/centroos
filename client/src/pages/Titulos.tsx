import { useState } from 'react';
import { FileText, Search, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [tipoFiltro, setTipoFiltro] = useState<'pagar' | 'receber' | ''>('');
  const [mesFiltro, setMesFiltro] = useState<string>('');

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-amber-600" />
            Lançamentos
          </h1>
          <p className="text-muted-foreground">Títulos a pagar e a receber</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total de Títulos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:border-primary transition-colors ${tipoFiltro === 'receber' ? 'border-green-500 bg-green-50' : ''}`}
          onClick={() => setTipoFiltro(tipoFiltro === 'receber' ? '' : 'receber')}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">A Receber</CardTitle>
            <ArrowUpRight className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats?.totalReceber || 0)}</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:border-primary transition-colors ${tipoFiltro === 'pagar' ? 'border-red-500 bg-red-50' : ''}`}
          onClick={() => setTipoFiltro(tipoFiltro === 'pagar' ? '' : 'pagar')}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">A Pagar</CardTitle>
            <ArrowDownRight className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats?.totalPagar || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.saldo || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(stats?.saldo || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <div className="w-48">
              <Select value={mesFiltro} onValueChange={(v) => { setMesFiltro(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os meses</SelectItem>
                  {meses.map(m => (
                    <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(tipoFiltro || mesFiltro) && (
              <Button variant="ghost" onClick={() => { setTipoFiltro(''); setMesFiltro(''); }}>
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
          ) : titulos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum título encontrado
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {titulos.map((titulo: any) => (
                    <TableRow key={titulo.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(titulo.dataCompetencia)}</TableCell>
                      <TableCell className="max-w-xs truncate">{titulo.descricao}</TableCell>
                      <TableCell>{titulo.pessoa?.nome || '-'}</TableCell>
                      <TableCell>
                        <Badge className={titulo.tipo === 'receber' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {titulo.tipo === 'receber' ? (
                            <><ArrowUpRight className="h-3 w-3 mr-1" />Receber</>
                          ) : (
                            <><ArrowDownRight className="h-3 w-3 mr-1" />Pagar</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[titulo.status] || 'bg-slate-100'}>
                          {statusLabels[titulo.status] || titulo.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(Number(titulo.valorLiquido) * 100)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {titulos.length} de {data?.total || 0} títulos
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

