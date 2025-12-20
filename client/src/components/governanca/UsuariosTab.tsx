import { useState } from 'react';
import { Search, UserCog, UserMinus, History, RefreshCw, X, User, Mail, Clock, Shield, Plus, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ResponsiveTable } from '@/components/ui/table';
import { Tooltip } from '@/components/ui/tooltip-help';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function formatDateTime(date: string | null): string {
  if (!date) return 'Nunca acessou';
  return new Date(date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

interface UsuariosTabProps {
  readOnly?: boolean;
}

export function UsuariosTab({ readOnly = false }: UsuariosTabProps) {
  const [search, setSearch] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<string>('all');
  const [filtroPapel, setFiltroPapel] = useState<string>('all');
  const [selectedUsuario, setSelectedUsuario] = useState<any>(null);
  const [showPapeisDialog, setShowPapeisDialog] = useState(false);
  const [showDesativarDialog, setShowDesativarDialog] = useState(false);
  const [motivoDesativacao, setMotivoDesativacao] = useState('');

  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.usuarios.list.useQuery({
    search: search || undefined,
    ativo: filtroAtivo === 'all' ? undefined : filtroAtivo === 'ativo',
    papelId: filtroPapel === 'all' ? undefined : filtroPapel,
  });
  const { data: papeis } = trpc.papeis.list.useQuery();
  const { data: adminCount } = trpc.usuarios.countAdmins.useQuery();

  const desativarMutation = trpc.usuarios.desativar.useMutation({
    onSuccess: () => {
      toast.success('Usuário desativado com sucesso');
      setShowDesativarDialog(false);
      setMotivoDesativacao('');
      utils.usuarios.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const atribuirPapelMutation = trpc.usuarios.atribuirPapel.useMutation({
    onSuccess: () => {
      toast.success('Papel atribuído com sucesso');
      utils.usuarios.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const removerPapelMutation = trpc.usuarios.removerPapel.useMutation({
    onSuccess: () => {
      toast.success('Papel removido com sucesso');
      utils.usuarios.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const usuarios = data?.usuarios || [];

  const handleDesativar = () => {
    if (!selectedUsuario || motivoDesativacao.length < 10) return;
    desativarMutation.mutate({ id: selectedUsuario.id, motivo: motivoDesativacao });
  };

  const handleAtribuirPapel = (papelId: string) => {
    if (!selectedUsuario) return;
    atribuirPapelMutation.mutate({
      usuarioId: selectedUsuario.id,
      papelId,
      dataInicio: new Date().toISOString().split('T')[0],
    });
  };

  const handleRemoverPapel = (papelId: string) => {
    if (!selectedUsuario) return;
    removerPapelMutation.mutate({ usuarioId: selectedUsuario.id, papelId });
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Select value={filtroAtivo} onValueChange={setFiltroAtivo}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroPapel} onValueChange={setFiltroPapel}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os papéis</SelectItem>
                {papeis?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-bold">{data?.total || 0}</div>
          <div className="text-xs text-muted-foreground">Total de usuários</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{usuarios.filter((u: any) => u.ativo).length}</div>
          <div className="text-xs text-muted-foreground">Ativos</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-amber-600">{adminCount?.count || 0}</div>
          <div className="text-xs text-muted-foreground">Administradores</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-slate-400">{usuarios.filter((u: any) => !u.ativo).length}</div>
          <div className="text-xs text-muted-foreground">Inativos</div>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5" />
            Usuários do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <ResponsiveTable stickyHeader density="normal">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Papéis</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario: any) => {
                    const papeisAtivos = usuario.papeis_ativos || [];
                    return (
                      <TableRow key={usuario.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {usuario.avatar_url ? (
                              <img src={usuario.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                <User className="h-4 w-4 text-slate-400" />
                              </div>
                            )}
                            <span className="font-medium">{usuario.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {usuario.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {usuario.ativo ? (
                            <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-slate-500">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {papeisAtivos.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Sem papéis</span>
                            ) : (
                              papeisAtivos.slice(0, 3).map((p: any) => (
                                <Badge key={p.papelId} variant="outline" className="text-xs">
                                  {p.nome}
                                </Badge>
                              ))
                            )}
                            {papeisAtivos.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{papeisAtivos.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDateTime(usuario.ultimo_acesso)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!readOnly && (
                              <>
                                <Tooltip content="Gerenciar papéis">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => { setSelectedUsuario(usuario); setShowPapeisDialog(true); }}
                                  >
                                    <Shield className="h-4 w-4" />
                                  </Button>
                                </Tooltip>
                                {usuario.ativo && (
                                  <Tooltip content="Desativar usuário">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => { setSelectedUsuario(usuario); setShowDesativarDialog(true); }}
                                    >
                                      <UserMinus className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </Tooltip>
                                )}
                              </>
                            )}
                            <Tooltip content="Ver histórico">
                              <Button variant="ghost" size="icon">
                                <History className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Gerenciar Papéis */}
      <Dialog open={showPapeisDialog} onOpenChange={setShowPapeisDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Gerenciar Papéis
            </DialogTitle>
            <DialogDescription>
              Atribua ou remova papéis do usuário <strong>{selectedUsuario?.nome}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Papéis Ativos</Label>
              <div className="mt-2 space-y-2">
                {(selectedUsuario?.papeis_ativos || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum papel atribuído</p>
                ) : (
                  (selectedUsuario?.papeis_ativos || []).map((p: any) => (
                    <div key={p.papelId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <span className="font-medium">{p.nome}</span>
                        <span className="text-xs text-muted-foreground ml-2">Nível {p.nivel}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleRemoverPapel(p.papelId)}
                        disabled={removerPapelMutation.isPending}
                      >
                        Remover
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Adicionar Papel</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {papeis?.filter((p: any) => 
                  !(selectedUsuario?.papeis_ativos || []).some((up: any) => up.papelId === p.id)
                ).map((p: any) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    className="justify-start gap-2"
                    onClick={() => handleAtribuirPapel(p.id)}
                    disabled={atribuirPapelMutation.isPending}
                  >
                    <Plus className="h-4 w-4" />
                    {p.nome}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPapeisDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Desativar Usuário */}
      <Dialog open={showDesativarDialog} onOpenChange={setShowDesativarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserMinus className="h-5 w-5" />
              Desativar Usuário
            </DialogTitle>
            <DialogDescription>
              Esta ação bloqueará o acesso do usuário <strong>{selectedUsuario?.nome}</strong> e encerrará todos os papéis ativos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="motivo">Motivo da desativação *</Label>
            <Textarea
              id="motivo"
              placeholder="Informe o motivo da desativação (mínimo 10 caracteres)"
              value={motivoDesativacao}
              onChange={(e) => setMotivoDesativacao(e.target.value)}
              className="mt-2"
            />
            {motivoDesativacao.length > 0 && motivoDesativacao.length < 10 && (
              <p className="text-xs text-red-500 mt-1">Mínimo 10 caracteres ({motivoDesativacao.length}/10)</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDesativarDialog(false); setMotivoDesativacao(''); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDesativar}
              disabled={motivoDesativacao.length < 10 || desativarMutation.isPending}
            >
              {desativarMutation.isPending ? 'Desativando...' : 'Desativar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

