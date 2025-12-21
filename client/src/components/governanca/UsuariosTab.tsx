import { useState } from 'react';
import { Search, UserCog, UserMinus, History, RefreshCw, X, User, Mail, Clock, Shield, Plus, Check, ChevronRight, Key, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

// Lista de Usuários (Master)
function UsuariosList({ 
  usuarios, 
  selectedId, 
  onSelect, 
  isLoading 
}: { 
  usuarios: any[]; 
  selectedId: string | null; 
  onSelect: (usuario: any) => void; 
  isLoading: boolean; 
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (usuarios.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Nenhum usuário encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {usuarios.map((usuario) => {
        const papeisAtivos = usuario.papeis_ativos || [];
        return (
          <button
            key={usuario.id}
            onClick={() => onSelect(usuario)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
              'hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1',
              selectedId === usuario.id && 'bg-indigo-100 ring-2 ring-indigo-500'
            )}
          >
            {usuario.avatar_url ? (
              <img src={usuario.avatar_url} alt="" className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-indigo-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-sm truncate">{usuario.nome}</p>
                {!usuario.ativo && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">Inativo</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {papeisAtivos.length > 0 ? (
                  <Badge className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0">
                    <Shield className="h-2.5 w-2.5 mr-0.5" />
                    {papeisAtivos[0].nome}
                    {papeisAtivos.length > 1 && ` +${papeisAtivos.length - 1}`}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-amber-600">Sem papel</Badge>
                )}
              </div>
            </div>
            <ChevronRight className={cn(
              'h-4 w-4 text-slate-300 shrink-0 transition-transform',
              selectedId === usuario.id && 'text-indigo-500 rotate-90'
            )} />
          </button>
        );
      })}
    </div>
  );
}

// Detalhe do Usuário (Detail)
function UsuarioDetail({ 
  usuario, 
  papeis,
  readOnly,
  onAtribuirPapel,
  onRemoverPapel,
  onDesativar,
  isAtribuindo,
  isRemovendo 
}: { 
  usuario: any; 
  papeis: any[];
  readOnly: boolean;
  onAtribuirPapel: (papelId: string) => void;
  onRemoverPapel: (papelId: string) => void;
  onDesativar: () => void;
  isAtribuindo: boolean;
  isRemovendo: boolean;
}) {
  const papeisAtivos = usuario.papeis_ativos || [];
  const papeisDisponiveis = papeis.filter(p => !papeisAtivos.some((pa: any) => pa.papelId === p.id));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="flex items-start gap-4">
          {usuario.avatar_url ? (
            <img src={usuario.avatar_url} alt="" className="w-16 h-16 rounded-full" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-200 to-purple-200 flex items-center justify-center shrink-0">
              <User className="h-8 w-8 text-indigo-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold truncate">{usuario.nome}</h2>
              {usuario.ativo ? (
                <Badge className="bg-emerald-100 text-emerald-700">Ativo</Badge>
              ) : (
                <Badge variant="secondary">Inativo</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
              <Mail className="h-4 w-4" />
              <span className="text-sm">{usuario.email}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Último acesso: {formatDateTime(usuario.ultimo_acesso)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Papéis Ativos */}
        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Key className="h-4 w-4 text-indigo-500" />
            Papéis Ativos
          </h3>
          {papeisAtivos.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-amber-50 p-3 rounded-lg border border-amber-200">
              ⚠️ Nenhum papel atribuído. Este usuário não possui permissões no sistema.
            </p>
          ) : (
            <div className="space-y-2">
              {papeisAtivos.map((p: any) => (
                <div key={p.papelId} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">Nível {p.nivel}</p>
                    </div>
                  </div>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onRemoverPapel(p.papelId)}
                      disabled={isRemovendo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Adicionar Papel */}
        {!readOnly && papeisDisponiveis.length > 0 && (
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Plus className="h-4 w-4 text-emerald-500" />
              Adicionar Papel
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {papeisDisponiveis.map((p: any) => (
                <Button
                  key={p.id}
                  variant="outline"
                  className="justify-start gap-2 h-auto py-3"
                  onClick={() => onAtribuirPapel(p.id)}
                  disabled={isAtribuindo}
                >
                  <Plus className="h-4 w-4 text-emerald-500" />
                  <div className="text-left">
                    <p className="font-medium">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">Nível {p.nivel}</p>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        {!readOnly && usuario.ativo && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={onDesativar}
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Desativar Usuário
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Empty State
function EmptySelection() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-6">
        <UserCog className="h-12 w-12 text-indigo-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Selecione um usuário</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Clique em um usuário na lista para ver detalhes, gerenciar papéis e permissões.
      </p>
    </div>
  );
}

// Quick Stats
function QuickStats({ stats, filtroAtivo, setFiltroAtivo }: {
  stats: { total: number; ativos: number; inativos: number; admins: number };
  filtroAtivo: string;
  setFiltroAtivo: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <button
        onClick={() => setFiltroAtivo('all')}
        className={cn(
          'p-2 rounded-lg text-center transition-all',
          filtroAtivo === 'all' ? 'bg-indigo-100 ring-2 ring-indigo-500' : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <p className="text-lg font-bold">{stats.total}</p>
        <p className="text-[10px] text-muted-foreground">Total</p>
      </button>
      <button
        onClick={() => setFiltroAtivo('ativo')}
        className={cn(
          'p-2 rounded-lg text-center transition-all',
          filtroAtivo === 'ativo' ? 'bg-emerald-100 ring-2 ring-emerald-500' : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <p className="text-lg font-bold text-emerald-600">{stats.ativos}</p>
        <p className="text-[10px] text-muted-foreground">Ativos</p>
      </button>
      <button
        onClick={() => setFiltroAtivo('inativo')}
        className={cn(
          'p-2 rounded-lg text-center transition-all',
          filtroAtivo === 'inativo' ? 'bg-slate-200 ring-2 ring-slate-500' : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <p className="text-lg font-bold text-slate-500">{stats.inativos}</p>
        <p className="text-[10px] text-muted-foreground">Inativos</p>
      </button>
      <button
        onClick={() => setFiltroAtivo('admin')}
        className={cn(
          'p-2 rounded-lg text-center transition-all',
          filtroAtivo === 'admin' ? 'bg-amber-100 ring-2 ring-amber-500' : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <p className="text-lg font-bold text-amber-600">{stats.admins}</p>
        <p className="text-[10px] text-muted-foreground">Admins</p>
      </button>
    </div>
  );
}

export function UsuariosTab({ readOnly = false }: UsuariosTabProps) {
  const [search, setSearch] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<string>('all');
  const [selectedUsuario, setSelectedUsuario] = useState<any>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [showDesativarDialog, setShowDesativarDialog] = useState(false);
  const [motivoDesativacao, setMotivoDesativacao] = useState('');

  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.usuarios.list.useQuery({
    search: search || undefined,
    ativo: filtroAtivo === 'all' ? undefined : filtroAtivo === 'ativo',
  });
  const { data: papeis } = trpc.papeis.list.useQuery();
  const { data: adminCount } = trpc.usuarios.countAdmins.useQuery();

  const desativarMutation = trpc.usuarios.desativar.useMutation({
    onSuccess: () => {
      toast.success('Usuário desativado com sucesso');
      setShowDesativarDialog(false);
      setMotivoDesativacao('');
      setSelectedUsuario(null);
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
  const stats = {
    total: data?.total || 0,
    ativos: usuarios.filter((u: any) => u.ativo).length,
    inativos: usuarios.filter((u: any) => !u.ativo).length,
    admins: adminCount?.count || 0,
  };

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

  // Atualizar usuário selecionado quando a lista mudar
  const currentSelectedUsuario = usuarios.find((u: any) => u.id === selectedUsuario?.id);

  const handleSelectUsuario = (usuario: any) => {
    setSelectedUsuario(usuario);
    if (window.innerWidth < 1024) {
      setShowMobileDetail(true);
    }
  };

  const handleCloseMobileDetail = () => {
    setShowMobileDetail(false);
    setSelectedUsuario(null);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4">
      {/* Lista (Master) */}
      <Card className="lg:w-[380px] xl:w-[420px] flex flex-col shrink-0">
        <CardHeader className="py-3 px-4 shrink-0 border-b space-y-3">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Stats */}
          <QuickStats stats={stats} filtroAtivo={filtroAtivo} setFiltroAtivo={setFiltroAtivo} />
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-2">
          <UsuariosList
            usuarios={usuarios}
            selectedId={selectedUsuario?.id || null}
            onSelect={handleSelectUsuario}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Detalhes (Detail) - Desktop */}
      <Card className="hidden lg:flex flex-1 overflow-hidden">
        {currentSelectedUsuario ? (
          <UsuarioDetail
            usuario={currentSelectedUsuario}
            papeis={papeis || []}
            readOnly={readOnly}
            onAtribuirPapel={handleAtribuirPapel}
            onRemoverPapel={handleRemoverPapel}
            onDesativar={() => setShowDesativarDialog(true)}
            isAtribuindo={atribuirPapelMutation.isPending}
            isRemovendo={removerPapelMutation.isPending}
          />
        ) : (
          <EmptySelection />
        )}
      </Card>

      {/* Mobile Detail Overlay */}
      {showMobileDetail && currentSelectedUsuario && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background">
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b">
              <Button variant="ghost" size="icon" onClick={handleCloseMobileDetail}>
                <X className="h-5 w-5" />
              </Button>
              <span className="font-medium">Detalhes do Usuário</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <UsuarioDetail
                usuario={currentSelectedUsuario}
                papeis={papeis || []}
                readOnly={readOnly}
                onAtribuirPapel={handleAtribuirPapel}
                onRemoverPapel={handleRemoverPapel}
                onDesativar={() => setShowDesativarDialog(true)}
                isAtribuindo={atribuirPapelMutation.isPending}
                isRemovendo={removerPapelMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}

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
