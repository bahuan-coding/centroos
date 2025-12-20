import { useState } from 'react';
import { Key, Plus, Edit2, Copy, Trash2, RefreshCw, Users, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ResponsiveTable } from '@/components/ui/table';
import { Tooltip } from '@/components/ui/tooltip-help';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PapeisTabProps {
  readOnly?: boolean;
}

export function PapeisTab({ readOnly = false }: PapeisTabProps) {
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDuplicarDialog, setShowDuplicarDialog] = useState(false);
  const [selectedPapel, setSelectedPapel] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState({ codigo: '', nome: '', descricao: '', nivel: 50 });
  const [duplicarForm, setDuplicarForm] = useState({ novoCodigo: '', novoNome: '' });

  const utils = trpc.useUtils();
  const { data: papeis, isLoading, refetch } = trpc.papeis.list.useQuery();

  const createMutation = trpc.papeis.create.useMutation({
    onSuccess: () => {
      toast.success('Papel criado com sucesso');
      setShowFormDialog(false);
      resetForm();
      utils.papeis.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.papeis.update.useMutation({
    onSuccess: () => {
      toast.success('Papel atualizado com sucesso');
      setShowFormDialog(false);
      resetForm();
      utils.papeis.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.papeis.delete.useMutation({
    onSuccess: () => {
      toast.success('Papel excluído com sucesso');
      utils.papeis.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const duplicarMutation = trpc.papeis.duplicar.useMutation({
    onSuccess: () => {
      toast.success('Papel duplicado com sucesso');
      setShowDuplicarDialog(false);
      setDuplicarForm({ novoCodigo: '', novoNome: '' });
      utils.papeis.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm({ codigo: '', nome: '', descricao: '', nivel: 50 });
    setSelectedPapel(null);
    setFormMode('create');
  };

  const handleOpenCreate = () => {
    resetForm();
    setFormMode('create');
    setShowFormDialog(true);
  };

  const handleOpenEdit = (papel: any) => {
    setSelectedPapel(papel);
    setFormMode('edit');
    setForm({ codigo: papel.codigo, nome: papel.nome, descricao: papel.descricao || '', nivel: papel.nivel });
    setShowFormDialog(true);
  };

  const handleOpenDuplicar = (papel: any) => {
    setSelectedPapel(papel);
    setDuplicarForm({ novoCodigo: `${papel.codigo}_copia`, novoNome: `${papel.nome} (Cópia)` });
    setShowDuplicarDialog(true);
  };

  const handleSubmit = () => {
    if (formMode === 'create') {
      createMutation.mutate(form);
    } else {
      updateMutation.mutate({ id: selectedPapel.id, nome: form.nome, descricao: form.descricao || null, nivel: form.nivel });
    }
  };

  const handleDuplicar = () => {
    if (!selectedPapel) return;
    duplicarMutation.mutate({ id: selectedPapel.id, ...duplicarForm });
  };

  const handleDelete = (papel: any) => {
    if (confirm(`Tem certeza que deseja excluir o papel "${papel.nome}"?`)) {
      deleteMutation.mutate(papel.id);
    }
  };

  const isCodigoValido = /^[a-z_]+$/.test(form.codigo);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Key className="h-5 w-5" />
            Papéis do Sistema
          </h2>
          <p className="text-sm text-muted-foreground">Perfis de acesso com níveis hierárquicos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
          {!readOnly && (
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Papel
            </Button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !papeis?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum papel cadastrado</p>
            </div>
          ) : (
            <ResponsiveTable stickyHeader density="normal">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-center">
                      <Tooltip content="Nível hierárquico (1-100). Maior = mais autoridade para aprovações">
                        Nível
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">Usuários</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {papeis.map((papel: any) => (
                    <TableRow key={papel.id}>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-0.5 rounded">{papel.codigo}</code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{papel.nome}</span>
                          {papel.descricao && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{papel.descricao}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                          papel.nivel >= 80 && 'border-red-200 bg-red-50 text-red-700',
                          papel.nivel >= 50 && papel.nivel < 80 && 'border-amber-200 bg-amber-50 text-amber-700',
                          papel.nivel < 50 && 'border-slate-200 bg-slate-50 text-slate-700',
                        )}>
                          {papel.nivel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{papel.usuarios_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {papel.protegido ? (
                          <Badge className="bg-blue-100 text-blue-700 gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Protegido
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Customizado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!readOnly && (
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip content="Editar">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(papel)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="Duplicar">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDuplicar(papel)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                            {!papel.protegido && (
                              <Tooltip content="Excluir">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(papel)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Criar/Editar Papel */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'Novo Papel' : 'Editar Papel'}</DialogTitle>
            <DialogDescription>
              {formMode === 'create' ? 'Crie um novo perfil de acesso' : `Editando: ${selectedPapel?.nome}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Código *</Label>
              <Input
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value.toLowerCase().replace(/[^a-z_]/g, '') })}
                placeholder="Ex: tesoureiro_auxiliar"
                disabled={formMode === 'edit'}
                className="mt-1"
              />
              {formMode === 'create' && form.codigo && !isCodigoValido && (
                <p className="text-xs text-red-500 mt-1">Use apenas letras minúsculas e underscore</p>
              )}
              {formMode === 'edit' && (
                <p className="text-xs text-muted-foreground mt-1">O código não pode ser alterado</p>
              )}
            </div>
            <div>
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome do papel"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="O que este papel pode fazer"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Nível Hierárquico (1-100) *</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.nivel}
                onChange={(e) => setForm({ ...form, nivel: Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) })}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maior = mais autoridade para aprovações
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={(formMode === 'create' && (!form.codigo || !isCodigoValido)) || !form.nome || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Duplicar Papel */}
      <Dialog open={showDuplicarDialog} onOpenChange={setShowDuplicarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Duplicar Papel
            </DialogTitle>
            <DialogDescription>
              Criando cópia de: <strong>{selectedPapel?.nome}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Novo Código *</Label>
              <Input
                value={duplicarForm.novoCodigo}
                onChange={(e) => setDuplicarForm({ ...duplicarForm, novoCodigo: e.target.value.toLowerCase().replace(/[^a-z_]/g, '') })}
                placeholder="codigo_novo"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Novo Nome *</Label>
              <Input
                value={duplicarForm.novoNome}
                onChange={(e) => setDuplicarForm({ ...duplicarForm, novoNome: e.target.value })}
                placeholder="Nome do novo papel"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicarDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleDuplicar}
              disabled={!duplicarForm.novoCodigo || !duplicarForm.novoNome || duplicarMutation.isPending}
            >
              {duplicarMutation.isPending ? 'Duplicando...' : 'Duplicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

