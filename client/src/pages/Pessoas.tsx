import { useState } from 'react';
import { Users, Search, UserCheck, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ResponsiveTable, TableCardView } from '@/components/ui/table';
import { PageHeader, FilterBar, StatsGrid, Pagination } from '@/components/ui/page-header';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

export default function Pessoas() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filtroAssociados, setFiltroAssociados] = useState<boolean | undefined>(undefined);

  const { data, isLoading } = trpc.pessoas.list.useQuery({
    search: search || undefined,
    apenasAssociados: filtroAssociados,
    page,
    limit: 20,
  });

  const { data: stats } = trpc.pessoas.stats.useQuery();

  const pessoas = data?.pessoas || [];
  const totalPages = data?.pages || 1;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <PageHeader
        title="Pessoas"
        description="Cadastro de pessoas físicas e jurídicas"
        icon={<Users className="h-6 w-6 sm:h-8 sm:w-8 text-violet-600 shrink-0" />}
      />

      {/* Stats */}
      <StatsGrid columns={3}>
        <Card className="cursor-pointer hover:border-primary transition-colors touch-target" onClick={() => setFiltroAssociados(undefined)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            'cursor-pointer hover:border-primary transition-colors touch-target',
            filtroAssociados === true && 'border-violet-500 bg-violet-50'
          )}
          onClick={() => setFiltroAssociados(filtroAssociados === true ? undefined : true)}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Associados</CardTitle>
            <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-violet-600">{stats?.associados || 0}</div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            'cursor-pointer hover:border-primary transition-colors touch-target',
            filtroAssociados === false && 'border-slate-500 bg-slate-50'
          )}
          onClick={() => setFiltroAssociados(filtroAssociados === false ? undefined : false)}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Não Associados</CardTitle>
            <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-slate-600">{stats?.naoAssociados || 0}</div>
          </CardContent>
        </Card>
      </StatsGrid>

      {/* Search and Filter */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <FilterBar showClear={filtroAssociados !== undefined} onClear={() => setFiltroAssociados(undefined)}>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 w-full"
              />
            </div>
          </FilterBar>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : pessoas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground px-4">
              Nenhuma pessoa encontrada
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <ResponsiveTable stickyHeader density="normal">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead className="col-priority-medium">Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="col-priority-low">Categoria</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pessoas.map((pessoa: any) => (
                        <TableRow key={pessoa.id}>
                          <TableCell className="font-medium">{pessoa.nome}</TableCell>
                          <TableCell className="col-priority-medium">
                            <Badge variant="outline" className="text-xs">
                              {pessoa.tipo === 'fisica' ? 'PF' : 'PJ'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {pessoa.isAssociado ? (
                              <Badge className="bg-violet-100 text-violet-700 text-xs">
                                <UserCheck className="h-3 w-3 mr-1" />
                                Associado
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Não Assoc.</Badge>
                            )}
                          </TableCell>
                          <TableCell className="col-priority-low">
                            {pessoa.associado?.categoria && (
                              <Badge variant="outline" className="capitalize text-xs">{pessoa.associado.categoria}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">Ver</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResponsiveTable>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden px-4">
                <TableCardView
                  data={pessoas}
                  keyExtractor={(p: any) => p.id}
                  renderCard={(pessoa: any) => (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{pessoa.nome}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {pessoa.tipo === 'fisica' ? 'PF' : 'PJ'}
                          </Badge>
                          {pessoa.isAssociado ? (
                            <Badge className="bg-violet-100 text-violet-700 text-[10px]">Associado</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Não Assoc.</Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="shrink-0">Ver</Button>
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
                  itemsShown={pessoas.length}
                  onPageChange={setPage}
                  itemLabel="pessoas"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

