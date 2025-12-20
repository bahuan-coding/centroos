import { useState, useEffect } from 'react';
import { Edit2, XCircle, Wallet, Plus, Trash2, Info } from 'lucide-react';
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
import { FormSection } from '@/components/ui/form-section';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const tipoColors: Record<string, { bg: string; text: string }> = {
  restrito: { bg: 'bg-rose-100', text: 'text-rose-700' },
  designado: { bg: 'bg-amber-100', text: 'text-amber-700' },
  livre: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

const tipoLabels: Record<string, string> = {
  restrito: 'Restrito',
  designado: 'Designado',
  livre: 'Livre',
};

const tipoDescriptions: Record<string, string> = {
  restrito: 'Uso definido pelo doador. Não pode ser alterado.',
  designado: 'Uso definido pela diretoria. Pode ser redesignado com ata.',
  livre: 'Sem restrição de uso.',
};

const regraLabels: Record<string, string> = {
  percentual_receita: 'Destinar % das Receitas',
  categoria_permitida: 'Categorias Permitidas',
  categoria_proibida: 'Categorias Proibidas',
  valor_maximo: 'Limite por Consumo',
  aprovador_obrigatorio: 'Requer Aprovação',
};

interface FundoGridProps {
  searchTerm: string;
  onEdit: (item: any) => void;
}

export function FundoGrid({ searchTerm, onEdit }: FundoGridProps) {
  const utils = trpc.useUtils();
  const { data: fundos = [], isLoading } = trpc.fundo.list.useQuery({
    busca: searchTerm || undefined,
  });

  const inativarMutation = trpc.fundo.inativar.useMutation({
    onSuccess: () => {
      utils.fundo.list.invalidate();
      toast.success('Fundo inativado');
    },
    onError: (err) => {
      toast.error('Erro ao inativar', { description: err.message });
    },
  });

  const handleInativar = (id: string) => {
    if (confirm('Tem certeza que deseja inativar este fundo?')) {
      inativarMutation.mutate(id);
    }
  };

  const formatCurrency = (value: string | number | null) => {
    if (!value) return '—';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pt-BR');
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
          <Wallet className="h-4 w-4" />
          Fundos
          <Badge variant="secondary" className="ml-2">{fundos.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveTable stickyHeader density="compact">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-28">Tipo</TableHead>
                <TableHead className="text-right">Saldo Atual</TableHead>
                <TableHead className="text-right">Meta</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead className="w-20 text-center">Ativo</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fundos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum fundo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                fundos.map((fundo) => (
                  <TableRow key={fundo.id}>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {fundo.codigo}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{fundo.nome}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        tipoColors[fundo.tipo]?.bg,
                        tipoColors[fundo.tipo]?.text,
                        'border-0'
                      )}>
                        {tipoLabels[fundo.tipo]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(fundo.saldoAtual)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {formatCurrency(fundo.metaValor)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fundo.dataInicio || fundo.dataLimite
                        ? `${formatDate(fundo.dataInicio)} → ${formatDate(fundo.dataLimite)}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={fundo.ativo ? 'default' : 'secondary'}>
                        {fundo.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(fundo)}
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {fundo.ativo && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleInativar(fundo.id)}
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

interface FundoFormProps {
  open: boolean;
  onClose: () => void;
  editingItem: any;
}

export function FundoForm({ open, onClose, editingItem }: FundoFormProps) {
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    tipo: 'livre' as string,
    finalidade: '',
    dataInicio: '',
    dataLimite: '',
    metaValor: '',
    saldoInicial: '',
  });

  const [regras, setRegras] = useState<Array<{
    id?: string;
    tipoRegra: string;
    parametroNumerico: string;
    parametroTexto: string;
    ativo: boolean;
  }>>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch existing rules when editing
  const { data: existingRegras } = trpc.fundoRegra.list.useQuery(editingItem?.id || '', {
    enabled: !!editingItem?.id,
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        setForm({
          codigo: editingItem.codigo || '',
          nome: editingItem.nome || '',
          descricao: editingItem.descricao || '',
          tipo: editingItem.tipo || 'livre',
          finalidade: editingItem.finalidade || '',
          dataInicio: editingItem.dataInicio || '',
          dataLimite: editingItem.dataLimite || '',
          metaValor: editingItem.metaValor || '',
          saldoInicial: '',
        });
        if (existingRegras) {
          setRegras(existingRegras.map(r => ({
            id: r.id,
            tipoRegra: r.tipoRegra,
            parametroNumerico: r.parametroNumerico || '',
            parametroTexto: r.parametroTexto || '',
            ativo: r.ativo,
          })));
        }
      } else {
        setForm({
          codigo: '',
          nome: '',
          descricao: '',
          tipo: 'livre',
          finalidade: '',
          dataInicio: '',
          dataLimite: '',
          metaValor: '',
          saldoInicial: '',
        });
        setRegras([]);
      }
      setErrors({});
    }
  }, [open, editingItem, existingRegras]);

  const createMutation = trpc.fundo.create.useMutation({
    onSuccess: () => {
      utils.fundo.list.invalidate();
      toast.success('Fundo criado com sucesso');
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

  const updateMutation = trpc.fundo.update.useMutation({
    onSuccess: () => {
      utils.fundo.list.invalidate();
      toast.success('Fundo atualizado');
      onClose();
    },
    onError: (err) => {
      if (err.message.includes('tipo') || err.message.includes('restrito')) {
        setErrors({ tipo: err.message });
      } else {
        toast.error('Erro ao atualizar', { description: err.message });
      }
    },
  });

  const createRegraMutation = trpc.fundoRegra.create.useMutation();
  const updateRegraMutation = trpc.fundoRegra.update.useMutation();
  const deleteRegraMutation = trpc.fundoRegra.delete.useMutation();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.codigo.trim()) newErrors.codigo = 'Informe o código';
    if (!form.nome.trim()) newErrors.nome = 'Informe o nome';
    if (form.nome.length < 3) newErrors.nome = 'Mínimo 3 caracteres';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const meta = form.metaValor ? parseFloat(form.metaValor.replace(/[^\d,.-]/g, '').replace(',', '.')) : undefined;
    const saldo = form.saldoInicial ? parseFloat(form.saldoInicial.replace(/[^\d,.-]/g, '').replace(',', '.')) : 0;

    if (editingItem) {
      await updateMutation.mutateAsync({
        id: editingItem.id,
        nome: form.nome,
        descricao: form.descricao || null,
        tipo: form.tipo as any,
        finalidade: form.finalidade || null,
        dataLimite: form.dataLimite || undefined,
        metaValor: meta,
      });

      // Update rules
      for (const regra of regras) {
        if (regra.id) {
          await updateRegraMutation.mutateAsync({
            id: regra.id,
            parametroNumerico: regra.parametroNumerico ? parseFloat(regra.parametroNumerico) : undefined,
            parametroTexto: regra.parametroTexto || undefined,
            ativo: regra.ativo,
          });
        } else {
          await createRegraMutation.mutateAsync({
            fundoId: editingItem.id,
            tipoRegra: regra.tipoRegra as any,
            parametroNumerico: regra.parametroNumerico ? parseFloat(regra.parametroNumerico) : undefined,
            parametroTexto: regra.parametroTexto || undefined,
          });
        }
      }
    } else {
      createMutation.mutate({
        codigo: form.codigo,
        nome: form.nome,
        descricao: form.descricao || undefined,
        tipo: form.tipo as any,
        finalidade: form.finalidade || undefined,
        dataInicio: form.dataInicio || undefined,
        dataLimite: form.dataLimite || undefined,
        metaValor: meta,
        saldoInicial: saldo,
        regras: regras.map(r => ({
          tipoRegra: r.tipoRegra as any,
          parametroNumerico: r.parametroNumerico ? parseFloat(r.parametroNumerico) : undefined,
          parametroTexto: r.parametroTexto || undefined,
        })),
      });
    }
  };

  const addRegra = () => {
    setRegras([...regras, { tipoRegra: 'aprovador_obrigatorio', parametroNumerico: '', parametroTexto: '', ativo: true }]);
  };

  const removeRegra = async (index: number) => {
    const regra = regras[index];
    if (regra.id) {
      await deleteRegraMutation.mutateAsync(regra.id);
    }
    setRegras(regras.filter((_, i) => i !== index));
  };

  const updateRegra = (index: number, field: string, value: any) => {
    const updated = [...regras];
    (updated[index] as any)[field] = value;
    setRegras(updated);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {editingItem ? 'Editar Fundo' : 'Novo Fundo'}
          </DialogTitle>
          <DialogDescription>
            {editingItem
              ? 'Altere as informações do fundo.'
              : 'Preencha os dados para criar um novo fundo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção: Identificação */}
          <FormSection title="Identificação">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fd-codigo">Código *</Label>
                <Input
                  id="fd-codigo"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                  placeholder="OBRA, RESERVA"
                  disabled={!!editingItem}
                  className={cn('font-mono', errors.codigo && 'border-destructive')}
                />
                {errors.codigo && <p className="text-xs text-destructive">{errors.codigo}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fd-tipo" className="flex items-center gap-1">
                  Tipo *
                  <TooltipHelp content="NBC TG 26: Restrito (doador), Designado (diretoria), Livre (sem restrição)" />
                </Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger id="fd-tipo" className={errors.tipo && 'border-destructive'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <div className="flex items-center gap-2">
                          <span>{v}</span>
                          <span className="text-xs text-muted-foreground">— {tipoDescriptions[k]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo && <p className="text-xs text-destructive">{errors.tipo}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fd-nome">Nome *</Label>
              <Input
                id="fd-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome do fundo"
                className={errors.nome && 'border-destructive'}
              />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fd-descricao">Descrição</Label>
              <Textarea
                id="fd-descricao"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Detalhes sobre a finalidade"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fd-finalidade">Finalidade Específica</Label>
              <Input
                id="fd-finalidade"
                value={form.finalidade}
                onChange={(e) => setForm({ ...form, finalidade: e.target.value })}
                placeholder="Para que este fundo deve ser usado"
              />
            </div>
          </FormSection>

          {/* Seção: Vigência e Meta */}
          <FormSection title="Vigência e Meta">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fd-inicio">Data de Criação</Label>
                <Input
                  id="fd-inicio"
                  type="date"
                  value={form.dataInicio}
                  onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
                  disabled={!!editingItem}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fd-limite">Data Limite</Label>
                <Input
                  id="fd-limite"
                  type="date"
                  value={form.dataLimite}
                  onChange={(e) => setForm({ ...form, dataLimite: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fd-meta">Meta (R$)</Label>
                <Input
                  id="fd-meta"
                  value={form.metaValor}
                  onChange={(e) => setForm({ ...form, metaValor: e.target.value })}
                  placeholder="0,00"
                  className="font-mono"
                />
              </div>
            </div>
          </FormSection>

          {/* Seção: Saldo Inicial (apenas no create) */}
          {!editingItem && (
            <FormSection title="Saldo Inicial (Migração)">
              <div className="space-y-2">
                <Label htmlFor="fd-saldo" className="flex items-center gap-1">
                  Saldo Inicial (R$)
                  <TooltipHelp content="Para migração: saldo existente antes do sistema" />
                </Label>
                <Input
                  id="fd-saldo"
                  value={form.saldoInicial}
                  onChange={(e) => setForm({ ...form, saldoInicial: e.target.value })}
                  placeholder="0,00"
                  className="font-mono"
                />
              </div>
            </FormSection>
          )}

          {/* Seção: Regras */}
          <FormSection title="Regras do Fundo">
            <div className="space-y-3">
              {regras.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhuma regra configurada
                </p>
              ) : (
                regras.map((regra, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Select
                        value={regra.tipoRegra}
                        onValueChange={(v) => updateRegra(index, 'tipoRegra', v)}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(regraLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(regra.tipoRegra === 'percentual_receita' || regra.tipoRegra === 'valor_maximo') ? (
                        <Input
                          value={regra.parametroNumerico}
                          onChange={(e) => updateRegra(index, 'parametroNumerico', e.target.value)}
                          placeholder={regra.tipoRegra === 'percentual_receita' ? '10%' : 'R$ 5.000'}
                          className="text-sm font-mono"
                        />
                      ) : (
                        <Input
                          value={regra.parametroTexto}
                          onChange={(e) => updateRegra(index, 'parametroTexto', e.target.value)}
                          placeholder="Descrição"
                          className="text-sm"
                        />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeRegra(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
              <Button type="button" variant="outline" size="sm" onClick={addRegra} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Regra
              </Button>
            </div>
          </FormSection>

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


