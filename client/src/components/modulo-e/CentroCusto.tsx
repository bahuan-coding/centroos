import { useState } from 'react';
import { Edit2, XCircle, Building2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ResponsiveTable } from '@/components/ui/table';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CentroCustoGridProps {
  searchTerm: string;
  onEdit: (item: any) => void;
}

export function CentroCustoGrid({ searchTerm, onEdit }: CentroCustoGridProps) {
  const utils = trpc.useUtils();
  const { data: centros = [], isLoading } = trpc.centroCusto.list.useQuery({
    busca: searchTerm || undefined,
  });

  const inativarMutation = trpc.centroCusto.inativar.useMutation({
    onSuccess: () => {
      utils.centroCusto.list.invalidate();
      toast.success('Centro de custo inativado');
    },
    onError: (err) => {
      toast.error('Erro ao inativar', { description: err.message });
    },
  });

  const handleInativar = (id: string) => {
    if (confirm('Tem certeza que deseja inativar este centro de custo?')) {
      inativarMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Centros de Custo
          <Badge variant="secondary" className="ml-2">{centros.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveTable stickyHeader density="compact">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="w-20 text-center">Projetos</TableHead>
                <TableHead className="w-20 text-center">Ativo</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum centro de custo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                centros.map((centro) => (
                  <TableRow key={centro.id}>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {centro.codigo}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{centro.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {centro.responsavel?.nome || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{centro.projetosCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={centro.ativo ? 'default' : 'secondary'}>
                        {centro.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(centro)}
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {centro.ativo && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleInativar(centro.id)}
                            title="Inativar"
                            disabled={inativarMutation.isPending}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ResponsiveTable>
      </CardContent>
    </Card>
  );
}

interface CentroCustoFormProps {
  open: boolean;
  onClose: () => void;
  editingItem: any;
}

export function CentroCustoForm({ open, onClose, editingItem }: CentroCustoFormProps) {
  const utils = trpc.useUtils();
  const { data: pessoas = [] } = trpc.pessoas.list.useQuery();

  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    responsavelId: '',
    ativo: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when opening/closing or changing item
  useState(() => {
    if (open) {
      if (editingItem) {
        setForm({
          codigo: editingItem.codigo || '',
          nome: editingItem.nome || '',
          descricao: editingItem.descricao || '',
          responsavelId: editingItem.responsavelId || '',
          ativo: editingItem.ativo ?? true,
        });
      } else {
        setForm({ codigo: '', nome: '', descricao: '', responsavelId: '', ativo: true });
      }
      setErrors({});
    }
  });

  const createMutation = trpc.centroCusto.create.useMutation({
    onSuccess: () => {
      utils.centroCusto.list.invalidate();
      toast.success('Centro de custo criado com sucesso');
      onClose();
    },
    onError: (err) => {
      if (err.message.includes('código')) {
        setErrors({ codigo: err.message });
      } else {
        toast.error('Erro ao criar', { description: err.message });
      }
    },
  });

  const updateMutation = trpc.centroCusto.update.useMutation({
    onSuccess: () => {
      utils.centroCusto.list.invalidate();
      toast.success('Centro de custo atualizado');
      onClose();
    },
    onError: (err) => {
      toast.error('Erro ao atualizar', { description: err.message });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.codigo.trim()) newErrors.codigo = 'Informe o código';
    if (form.codigo.length > 20) newErrors.codigo = 'Máximo 20 caracteres';
    if (!form.nome.trim()) newErrors.nome = 'Informe o nome';
    if (form.nome.length < 3) newErrors.nome = 'Mínimo 3 caracteres';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        nome: form.nome,
        descricao: form.descricao || null,
        responsavelId: form.responsavelId || null,
        ativo: form.ativo,
      });
    } else {
      createMutation.mutate({
        codigo: form.codigo,
        nome: form.nome,
        descricao: form.descricao || undefined,
        responsavelId: form.responsavelId || undefined,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {editingItem ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
          </DialogTitle>
          <DialogDescription>
            {editingItem
              ? 'Altere as informações do centro de custo.'
              : 'Preencha os dados para criar um novo centro de custo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código */}
          <div className="space-y-2">
            <Label htmlFor="cc-codigo" className="flex items-center gap-1">
              Código *
              <TooltipHelp content="Código único para identificar o centro. Ex: ADM, PAST, SOC" />
            </Label>
            <Input
              id="cc-codigo"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
              placeholder="ADM, PAST, SOC"
              disabled={!!editingItem}
              className={cn('font-mono', errors.codigo && 'border-destructive')}
              maxLength={20}
            />
            {errors.codigo && (
              <p className="text-xs text-destructive">{errors.codigo}</p>
            )}
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="cc-nome" className="flex items-center gap-1">
              Nome *
              <TooltipHelp content="Nome descritivo. Ex: Administração, Pastoral, Assistência Social" />
            </Label>
            <Input
              id="cc-nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome do centro de custo"
              className={errors.nome && 'border-destructive'}
              maxLength={100}
            />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="cc-descricao">Descrição</Label>
            <Textarea
              id="cc-descricao"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Detalhes sobre as atividades deste centro de custo"
              rows={3}
            />
          </div>

          {/* Responsável */}
          <div className="space-y-2">
            <Label htmlFor="cc-responsavel" className="flex items-center gap-1">
              Responsável
              <TooltipHelp content="Pessoa responsável por este centro de custo" />
            </Label>
            <Select
              value={form.responsavelId || 'none'}
              onValueChange={(v) => setForm({ ...form, responsavelId: v === 'none' ? '' : v })}
            >
              <SelectTrigger id="cc-responsavel">
                <SelectValue placeholder="Selecionar responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {pessoas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : editingItem ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


