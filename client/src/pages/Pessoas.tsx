import { useState } from 'react';
import { Users, Search, UserCheck, UserX, Heart, TrendingUp, Plus, Calendar, X, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ResponsiveTable, TableCardView } from '@/components/ui/table';
import { PageHeader, FilterBar, StatsGrid, Pagination } from '@/components/ui/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
}

function formatMonthLabel(mes: string): string {
  const [year, month] = mes.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
}

// Drawer de perfil da pessoa
function PessoaDrawer({ pessoa, onClose }: { pessoa: any; onClose: () => void }) {
  const { data: historico, isLoading } = trpc.pessoas.historico.useQuery(pessoa.id);

  const maxValor = historico?.porMes?.length 
    ? Math.max(...historico.porMes.map(m => m.total)) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-6 z-10">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {pessoa.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{pessoa.nome}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="border-white/40 text-white text-xs">
                  {pessoa.tipo === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </Badge>
                {pessoa.isAssociado && (
                  <Badge className="bg-white/20 text-white text-xs">
                    <UserCheck className="h-3 w-3 mr-1" />
                    {pessoa.associado?.categoria || 'Associado'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Stats no header */}
          {historico?.stats && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{historico.stats.totalDoacoes}</div>
                <div className="text-xs text-white/70">Doações</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(historico.stats.valorTotal)}</div>
                <div className="text-xs text-white/70">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(historico.stats.mediaDoacao)}</div>
                <div className="text-xs text-white/70">Média</div>
              </div>
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Gráfico de barras */}
              {historico?.porMes && historico.porMes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Contribuições por Mês</h3>
                  <div className="flex items-end gap-1 h-32">
                    {historico.porMes.map((m, idx) => {
                      const height = maxValor > 0 ? (m.total / maxValor) * 100 : 0;
                      return (
                        <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                          <div 
                            className={cn(
                              "w-full rounded-t transition-all duration-500",
                              idx === historico.porMes.length - 1 
                                ? "bg-gradient-to-t from-violet-500 to-violet-400" 
                                : "bg-gradient-to-t from-slate-300 to-slate-200"
                            )}
                            style={{ 
                              height: `${Math.max(height, 4)}%`,
                              animationDelay: `${idx * 50}ms`
                            }}
                            title={`${formatMonthLabel(m.mes)}: ${formatCurrency(m.total)}`}
                          />
                          <span className="text-[9px] text-muted-foreground">
                            {formatMonthLabel(m.mes).split('/')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timeline de doações */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Histórico de Doações</h3>
                {historico?.doacoes && historico.doacoes.length > 0 ? (
                  <div className="relative space-y-0">
                    <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-violet-200 via-slate-200 to-transparent" />
                    {historico.doacoes.map((doacao, idx) => (
                      <div 
                        key={doacao.id} 
                        className="relative flex items-start gap-4 py-3"
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <div className={cn(
                          "relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                          idx === 0 
                            ? "bg-violet-500 text-white" 
                            : "bg-slate-100 border-2 border-slate-200"
                        )}>
                          <Heart className={cn("h-3 w-3", idx === 0 ? "fill-white" : "text-slate-400")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm">
                              {formatCurrency(doacao.valor)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(doacao.dataCompetencia)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {doacao.descricao || doacao.natureza}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-2 text-slate-200" />
                    <p className="text-sm">Nenhuma doação registrada</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal de cadastro
function NovaPessoaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const createMutation = trpc.pessoas.create.useMutation({
    onSuccess: () => {
      utils.pessoas.list.invalidate();
      utils.pessoas.stats.invalidate();
      onClose();
      setForm({ nome: '', tipo: 'fisica', cpfCnpj: '', email: '', telefone: '', observacoes: '', tornarAssociado: false, categoria: '' });
    },
  });

  const [form, setForm] = useState({
    nome: '',
    tipo: 'fisica' as 'fisica' | 'juridica',
    cpfCnpj: '',
    email: '',
    telefone: '',
    observacoes: '',
    tornarAssociado: false,
    categoria: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      nome: form.nome,
      tipo: form.tipo,
      cpfCnpj: form.cpfCnpj || undefined,
      email: form.email || undefined,
      telefone: form.telefone || undefined,
      observacoes: form.observacoes || undefined,
      tornarAssociado: form.tornarAssociado,
      categoria: form.tornarAssociado && form.categoria 
        ? form.categoria as 'trabalhador' | 'frequentador' | 'benemerito' | 'honorario' 
        : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-violet-600" />
            Nova Pessoa
          </DialogTitle>
          <DialogDescription>
            Cadastre uma nova pessoa no sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Nome da pessoa"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v: 'fisica' | 'juridica') => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">Pessoa Física</SelectItem>
                  <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpfCnpj">{form.tipo === 'fisica' ? 'CPF' : 'CNPJ'}</Label>
              <Input
                id="cpfCnpj"
                value={form.cpfCnpj}
                onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))}
                placeholder={form.tipo === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border">
            <Checkbox 
              id="tornarAssociado" 
              checked={form.tornarAssociado}
              onCheckedChange={(checked) => setForm(f => ({ ...f, tornarAssociado: !!checked }))}
            />
            <div className="flex-1">
              <Label htmlFor="tornarAssociado" className="font-medium cursor-pointer">
                Tornar associado
              </Label>
              <p className="text-xs text-muted-foreground">Cadastrar também como membro da instituição</p>
            </div>
          </div>

          {form.tornarAssociado && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label>Categoria do associado</Label>
              <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trabalhador">Trabalhador</SelectItem>
                  <SelectItem value="frequentador">Frequentador</SelectItem>
                  <SelectItem value="benemerito">Benemérito</SelectItem>
                  <SelectItem value="honorario">Honorário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || !form.nome.trim() || (form.tornarAssociado && !form.categoria)}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {createMutation.isPending ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>

          {createMutation.isError && (
            <p className="text-sm text-destructive text-center">
              {createMutation.error.message}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Pessoas() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filtroAssociados, setFiltroAssociados] = useState<boolean | undefined>(undefined);
  const [selectedPessoa, setSelectedPessoa] = useState<any>(null);
  const [showNovaModal, setShowNovaModal] = useState(false);

  const { data, isLoading } = trpc.pessoas.list.useQuery({
    search: search || undefined,
    apenasAssociados: filtroAssociados,
    page,
    limit: 20,
  });

  const { data: stats } = trpc.pessoas.stats.useQuery();
  const { data: topDoadores } = trpc.pessoas.topDoadores.useQuery(5);

  const pessoas = data?.pessoas || [];
  const totalPages = data?.pages || 1;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader
          title="Pessoas"
          description="Cadastro de doadores e associados"
          icon={<Users className="h-6 w-6 sm:h-8 sm:w-8 text-violet-600 shrink-0" />}
        />
        <Button 
          onClick={() => setShowNovaModal(true)}
          className="bg-violet-600 hover:bg-violet-700 gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Pessoa
        </Button>
      </div>

      {/* Stats */}
      <StatsGrid columns={3}>
        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-md",
            filtroAssociados === undefined && "ring-2 ring-violet-500 ring-offset-2"
          )} 
          onClick={() => setFiltroAssociados(undefined)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              {stats?.total || 0}
            </div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            'cursor-pointer transition-all duration-200 hover:shadow-md',
            filtroAssociados === true && 'ring-2 ring-violet-500 ring-offset-2'
          )}
          onClick={() => setFiltroAssociados(filtroAssociados === true ? undefined : true)}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Associados</CardTitle>
            <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-bold text-violet-600">{stats?.associados || 0}</div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            'cursor-pointer transition-all duration-200 hover:shadow-md',
            filtroAssociados === false && 'ring-2 ring-slate-500 ring-offset-2'
          )}
          onClick={() => setFiltroAssociados(filtroAssociados === false ? undefined : false)}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Não Associados</CardTitle>
            <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-bold text-slate-600">{stats?.naoAssociados || 0}</div>
          </CardContent>
        </Card>
      </StatsGrid>

      {/* Top Doadores */}
      {topDoadores && topDoadores.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-sm font-medium">Maiores Contribuidores</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {topDoadores.map((doador, idx) => (
                <button
                  key={doador.id}
                  onClick={() => setSelectedPessoa(doador)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0",
                    idx === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-200" :
                    idx === 1 ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white" :
                    idx === 2 ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white" :
                    "bg-slate-100 text-slate-600"
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doador.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {doador.totalContribuicoes} doações
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600">{formatCurrency(doador.valorTotal)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Table */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <FilterBar showClear={filtroAssociados !== undefined} onClear={() => setFiltroAssociados(undefined)}>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
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
            <div className="text-center py-12 text-muted-foreground px-4">
              <Users className="h-12 w-12 mx-auto mb-3 text-slate-200" />
              <p>Nenhuma pessoa encontrada</p>
              <Button 
                variant="link" 
                className="mt-2 text-violet-600"
                onClick={() => setShowNovaModal(true)}
              >
                Cadastrar nova pessoa
              </Button>
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
                        <TableHead className="text-right">Total Doado</TableHead>
                        <TableHead className="text-center col-priority-low">Última Doação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pessoas.map((pessoa: any) => (
                        <TableRow 
                          key={pessoa.id} 
                          className="cursor-pointer hover:bg-violet-50/50 transition-colors"
                          onClick={() => setSelectedPessoa(pessoa)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-violet-600 font-semibold text-sm">
                                {pessoa.nome.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-medium hover:text-violet-600 transition-colors flex items-center gap-1">
                                  {pessoa.nome}
                                  {pessoa.totalContribuicoes > 5 && (
                                    <Heart className="h-3 w-3 text-rose-500 fill-rose-500" title="Doador frequente" />
                                  )}
                                </span>
                                {pessoa.associado?.categoria && (
                                  <span className="text-xs text-muted-foreground capitalize block">
                                    {pessoa.associado.categoria}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
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
                          <TableCell className="text-right">
                            {pessoa.valorTotal > 0 ? (
                              <span className="font-semibold text-emerald-600">
                                {formatCurrency(pessoa.valorTotal)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center col-priority-low">
                            {pessoa.totalContribuicoes > 0 ? (
                              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{pessoa.totalContribuicoes} doações</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
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
                    <button
                      onClick={() => setSelectedPessoa(pessoa)}
                      className="w-full flex items-center gap-3 text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-violet-600 font-semibold shrink-0">
                        {pessoa.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="font-medium text-sm truncate">{pessoa.nome}</p>
                          {pessoa.totalContribuicoes > 5 && (
                            <Heart className="h-3 w-3 text-rose-500 fill-rose-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {pessoa.isAssociado ? (
                            <Badge className="bg-violet-100 text-violet-700 text-[10px]">Associado</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Não Assoc.</Badge>
                          )}
                          {pessoa.valorTotal > 0 && (
                            <span className="text-xs font-medium text-emerald-600">
                              {formatCurrency(pessoa.valorTotal)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    </button>
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

      {/* Drawer de perfil */}
      {selectedPessoa && (
        <PessoaDrawer pessoa={selectedPessoa} onClose={() => setSelectedPessoa(null)} />
      )}

      {/* Modal de cadastro */}
      <NovaPessoaModal open={showNovaModal} onClose={() => setShowNovaModal(false)} />
    </div>
  );
}
