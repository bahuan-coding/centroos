import { useState } from 'react';
import { Users, Search, UserCheck, UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/lib/trpc';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-violet-600" />
            Pessoas
          </h1>
          <p className="text-muted-foreground">Cadastro de pessoas físicas e jurídicas</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setFiltroAssociados(undefined)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:border-primary transition-colors ${filtroAssociados === true ? 'border-violet-500 bg-violet-50' : ''}`}
          onClick={() => setFiltroAssociados(filtroAssociados === true ? undefined : true)}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Associados</CardTitle>
            <UserCheck className="h-5 w-5 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-violet-600">{stats?.associados || 0}</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:border-primary transition-colors ${filtroAssociados === false ? 'border-slate-500 bg-slate-50' : ''}`}
          onClick={() => setFiltroAssociados(filtroAssociados === false ? undefined : false)}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Não Associados</CardTitle>
            <UserX className="h-5 w-5 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-600">{stats?.naoAssociados || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            {filtroAssociados !== undefined && (
              <Button variant="ghost" onClick={() => setFiltroAssociados(undefined)}>
                Limpar filtro
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pessoas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma pessoa encontrada
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pessoas.map((pessoa: any) => (
                    <TableRow key={pessoa.id}>
                      <TableCell className="font-medium">{pessoa.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {pessoa.tipo === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {pessoa.isAssociado ? (
                          <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-200">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Associado
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Não Associado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {pessoa.associado?.categoria && (
                          <Badge variant="outline" className="capitalize">
                            {pessoa.associado.categoria}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Ver detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {pessoas.length} de {data?.total || 0} pessoas
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

