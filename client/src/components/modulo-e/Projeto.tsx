import { useState, useEffect } from 'react';
import { Edit2, CheckCircle, XCircle, Layers, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ResponsiveTable } from '@/components/ui/table';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { FormSection } from '@/components/ui/form-section';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusColors: Record<string, { bg: string; text: string }> = {
  planejamento: { bg: 'bg-slate-100', text: 'text-slate-700' },
  em_andamento: { bg: 'bg-blue-100', text: 'text-blue-700' },
  suspenso: { bg: 'bg-amber-100', text: 'text-amber-700' },
  concluido: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelado: { bg: 'bg-rose-100', text: 'text-rose-700' },
};

const statusLabels: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  suspenso: 'Suspenso',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

interface ProjetoGridProps {
  searchTerm: string;
  onEdit: (item: any) => void;
  onConcluir: (id: string) => void;
}

export function ProjetoGrid({ searchTerm, onEdit, onConcluir }: ProjetoGridProps) {
  const utils = trpc.useUtils();
  const { data: projetos = [], isLoading } = trpc.projeto.list.useQuery({
    busca: searchTerm || undefined,
  });

  const cancelarMutation = trpc.projeto.cancelar.useMutation({
    onSuccess: () => {
      utils.projeto.list.invalidate();
      toast.success('Projeto cancelado');
    },
    onError: (err) => {
      toast.error('Erro ao cancelar', { description: err.message });
    },
  });

  const [cancelarId, setCancelarId] = useState<string | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  const handleCancelar = () => {
    if (motivoCancelamento.length < 10) {
      toast.error('Motivo deve ter no mínimo 10 caracteres');
      return;
    }
    if (cancelarId) {
      cancelarMutation.mutate({ id: cancelarId, motivo: motivoCancelamento });
      setCancelarId(null);
      setMotivoCancelamento('');
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
          <Layers className="h-4 w-4" />
          Projetos
          <Badge variant="secondary" className="ml-2">{projetos.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveTable stickyHeader density="compact">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead>Centro de Custo</TableHead>
                <TableHead className="w-20 text-center">MROSC</TableHead>
                <TableHead className="text-right">Orçamento</TableHead>
                <TableHead className="w-24">Início</TableHead>
                <TableHead className="w-24">Fim Prev.</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projetos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum projeto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                projetos.map((projeto) => (
                  <TableRow key={projeto.id}>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {projeto.codigo}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{projeto.nome}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        statusColors[projeto.status]?.bg,
                        statusColors[projeto.status]?.text,
                        'border-0'
                      )}>
                        {statusLabels[projeto.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {projeto.centroCusto?.codigo || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {projeto.parceriaMrosc ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          MROSC
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(projeto.orcamentoPrevisto)}
                    </TableCell>
                    <TableCell>{formatDate(projeto.dataInicio)}</TableCell>
                    <TableCell>{formatDate(projeto.dataFimPrevista)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(projeto)}
                          aria-label={`Editar ${projeto.nome}`}
                        >
                          <Edit2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        {(projeto.status === 'planejamento' || projeto.status === 'em_andamento') && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                              onClick={() => onConcluir(projeto.id)}
                              aria-label={`Concluir ${projeto.nome}`}
                            >
                              <CheckCircle className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                setCancelarId(projeto.id);
                                setMotivoCancelamento('');
                              }}
                              aria-label={`Cancelar ${projeto.nome}`}
                              disabled={cancelarMutation.isPending}
                            >
                              <XCircle className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ResponsiveTable>

        {/* Dialog de Cancelamento de Projeto */}
        <Dialog open={!!cancelarId} onOpenChange={(o) => { if (!o) { setCancelarId(null); setMotivoCancelamento(''); } }}>
          <DialogContent className="max-w-md" role="alertdialog" aria-describedby="cancelar-projeto-description">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Cancelar Projeto
              </DialogTitle>
              <DialogDescription id="cancelar-projeto-description">
                Esta ação não pode ser desfeita. O projeto será marcado como cancelado permanentemente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="motivo-cancelamento-projeto">Motivo do cancelamento *</Label>
              <Textarea
                id="motivo-cancelamento-projeto"
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Descreva o motivo do cancelamento (mínimo 10 caracteres)"
                rows={3}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {motivoCancelamento.length}/10 caracteres mínimos
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelarId(null)}>
                Voltar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCancelar} 
                disabled={cancelarMutation.isPending || motivoCancelamento.length < 10}
              >
                {cancelarMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

interface ProjetoFormProps {
  open: boolean;
  onClose: () => void;
  editingItem: any;
}

export function ProjetoForm({ open, onClose, editingItem }: ProjetoFormProps) {
  const utils = trpc.useUtils();
  const { data: centrosCusto = [] } = trpc.centroCusto.list.useQuery({ ativo: true });
  const { data: pessoas = [] } = trpc.pessoas.list.useQuery();

  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    dataInicio: '',
    dataFimPrevista: '',
    orcamentoPrevisto: '',
    status: 'planejamento' as string,
    centroCustoId: '',
    responsavelId: '',
    parceriaMrosc: false,
    numeroTermoParceria: '',
    orgaoParceiro: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (editingItem) {
        setForm({
          codigo: editingItem.codigo || '',
          nome: editingItem.nome || '',
          descricao: editingItem.descricao || '',
          dataInicio: editingItem.dataInicio || '',
          dataFimPrevista: editingItem.dataFimPrevista || '',
          orcamentoPrevisto: editingItem.orcamentoPrevisto || '',
          status: editingItem.status || 'planejamento',
          centroCustoId: editingItem.centroCustoId || '',
          responsavelId: editingItem.responsavelId || '',
          parceriaMrosc: editingItem.parceriaMrosc || false,
          numeroTermoParceria: editingItem.numeroTermoParceria || '',
          orgaoParceiro: editingItem.orgaoParceiro || '',
        });
      } else {
        setForm({
          codigo: '',
          nome: '',
          descricao: '',
          dataInicio: '',
          dataFimPrevista: '',
          orcamentoPrevisto: '',
          status: 'planejamento',
          centroCustoId: '',
          responsavelId: '',
          parceriaMrosc: false,
          numeroTermoParceria: '',
          orgaoParceiro: '',
        });
      }
      setErrors({});
    }
  }, [open, editingItem]);

  const createMutation = trpc.projeto.create.useMutation({
    onSuccess: () => {
      utils.projeto.list.invalidate();
      toast.success('Projeto criado com sucesso');
      onClose();
    },
    onError: (err) => {
      if (err.message.includes('código')) {
        setErrors({ codigo: err.message });
      } else if (err.message.includes('termo') || err.message.includes('órgão')) {
        setErrors({ mrosc: err.message });
      } else {
        toast.error('Erro ao criar', { description: err.message });
      }
    },
  });

  const updateMutation = trpc.projeto.update.useMutation({
    onSuccess: () => {
      utils.projeto.list.invalidate();
      toast.success('Projeto atualizado');
      onClose();
    },
    onError: (err) => {
      toast.error('Erro ao atualizar', { description: err.message });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.codigo.trim()) newErrors.codigo = 'Informe o código';
    if (!form.nome.trim()) newErrors.nome = 'Informe o nome';
    if (form.nome.length < 3) newErrors.nome = 'Mínimo 3 caracteres';
    if (form.parceriaMrosc) {
      if (!form.numeroTermoParceria.trim()) {
        newErrors.mrosc = 'Informe o número do termo e órgão parceiro';
      }
      if (!form.orgaoParceiro.trim()) {
        newErrors.mrosc = 'Informe o número do termo e órgão parceiro';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const orcamento = form.orcamentoPrevisto ? parseFloat(form.orcamentoPrevisto.replace(/[^\d,.-]/g, '').replace(',', '.')) : undefined;

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        nome: form.nome,
        descricao: form.descricao || null,
        dataFimPrevista: form.dataFimPrevista || undefined,
        orcamentoPrevisto: orcamento,
        responsavelId: form.responsavelId || null,
        status: form.status as any,
        parceriaMrosc: form.parceriaMrosc,
        numeroTermoParceria: form.numeroTermoParceria || undefined,
        orgaoParceiro: form.orgaoParceiro || undefined,
      });
    } else {
      createMutation.mutate({
        codigo: form.codigo,
        nome: form.nome,
        descricao: form.descricao || undefined,
        dataInicio: form.dataInicio || undefined,
        dataFimPrevista: form.dataFimPrevista || undefined,
        orcamentoPrevisto: orcamento,
        status: form.status as any,
        centroCustoId: form.centroCustoId || undefined,
        responsavelId: form.responsavelId || undefined,
        parceriaMrosc: form.parceriaMrosc,
        numeroTermoParceria: form.numeroTermoParceria || undefined,
        orgaoParceiro: form.orgaoParceiro || undefined,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            {editingItem ? 'Editar Projeto' : 'Novo Projeto'}
          </DialogTitle>
          <DialogDescription>
            {editingItem
              ? 'Altere as informações do projeto.'
              : 'Preencha os dados para criar um novo projeto.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção: Identificação */}
          <FormSection title="Identificação">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pj-codigo">Código *</Label>
                <Input
                  id="pj-codigo"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                  placeholder="OBRA-2025"
                  disabled={!!editingItem}
                  className={cn('font-mono', errors.codigo && 'border-destructive')}
                  autoFocus={!editingItem}
                />
                {errors.codigo && <p className="text-xs text-destructive">{errors.codigo}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pj-status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger id="pj-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pj-nome">Nome *</Label>
              <Input
                id="pj-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome do projeto"
                className={errors.nome && 'border-destructive'}
              />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pj-descricao">Descrição</Label>
              <Textarea
                id="pj-descricao"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Objetivos e escopo do projeto"
                rows={2}
              />
            </div>
          </FormSection>

          {/* Seção: Cronograma */}
          <FormSection title="Cronograma">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pj-inicio">Data de Início</Label>
                <Input
                  id="pj-inicio"
                  type="date"
                  value={form.dataInicio}
                  onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
                  disabled={!!editingItem}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pj-fim">Previsão de Término</Label>
                <Input
                  id="pj-fim"
                  type="date"
                  value={form.dataFimPrevista}
                  onChange={(e) => setForm({ ...form, dataFimPrevista: e.target.value })}
                />
              </div>
            </div>
          </FormSection>

          {/* Seção: Orçamento */}
          <FormSection title="Orçamento">
            <div className="space-y-2">
              <Label htmlFor="pj-orcamento">Orçamento Previsto (R$)</Label>
              <Input
                id="pj-orcamento"
                value={form.orcamentoPrevisto}
                onChange={(e) => setForm({ ...form, orcamentoPrevisto: e.target.value })}
                placeholder="0,00"
                className="font-mono"
              />
            </div>
          </FormSection>

          {/* Seção: Vínculos */}
          <FormSection title="Vínculos">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pj-cc">Centro de Custo</Label>
                <Select
                  value={form.centroCustoId || 'none'}
                  onValueChange={(v) => setForm({ ...form, centroCustoId: v === 'none' ? '' : v })}
                  disabled={!!editingItem}
                >
                  <SelectTrigger id="pj-cc">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {centrosCusto.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.codigo} - {cc.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pj-resp">Responsável</Label>
                <Select
                  value={form.responsavelId || 'none'}
                  onValueChange={(v) => setForm({ ...form, responsavelId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger id="pj-resp">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {pessoas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>

          {/* Seção: Parceria MROSC */}
          <FormSection title="Parceria MROSC">
            <div className="flex items-center gap-2 mb-3">
              <Checkbox
                id="pj-mrosc"
                checked={form.parceriaMrosc}
                onCheckedChange={(v) => setForm({ ...form, parceriaMrosc: !!v })}
              />
              <Label htmlFor="pj-mrosc" className="flex items-center gap-1 cursor-pointer">
                É Parceria com Poder Público?
                <TooltipHelp content="Marque se for convênio, termo de fomento ou colaboração (Lei 13.019/2014)" />
              </Label>
            </div>

            {form.parceriaMrosc && (
              <div className="space-y-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start gap-2 text-purple-700 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Lembrete de prestação de contas: vincule todos os lançamentos ao projeto</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pj-termo">Número do Termo *</Label>
                    <Input
                      id="pj-termo"
                      value={form.numeroTermoParceria}
                      onChange={(e) => setForm({ ...form, numeroTermoParceria: e.target.value })}
                      placeholder="123/2025"
                      className={errors.mrosc && 'border-destructive'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pj-orgao">Órgão Parceiro *</Label>
                    <Input
                      id="pj-orgao"
                      value={form.orgaoParceiro}
                      onChange={(e) => setForm({ ...form, orgaoParceiro: e.target.value })}
                      placeholder="Prefeitura de..."
                      className={errors.mrosc && 'border-destructive'}
                    />
                  </div>
                </div>
                {errors.mrosc && <p className="text-xs text-destructive">{errors.mrosc}</p>}
              </div>
            )}
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

interface ProjetoConcluirDialogProps {
  projetoId: string | null;
  onClose: () => void;
}

export function ProjetoConcluirDialog({ projetoId, onClose }: ProjetoConcluirDialogProps) {
  const utils = trpc.useUtils();
  const [dataFimReal, setDataFimReal] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (projetoId) {
      setDataFimReal(new Date().toISOString().split('T')[0]);
      setObservacoes('');
      setError('');
    }
  }, [projetoId]);

  const concluirMutation = trpc.projeto.concluir.useMutation({
    onSuccess: () => {
      utils.projeto.list.invalidate();
      toast.success('Projeto concluído com sucesso');
      onClose();
    },
    onError: (err) => {
      toast.error('Erro ao concluir', { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataFimReal) {
      setError('Informe a data de conclusão');
      return;
    }
    if (!projetoId) return;

    concluirMutation.mutate({
      id: projetoId,
      dataFimReal,
      observacoes: observacoes || undefined,
    });
  };

  return (
    <Dialog open={!!projetoId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm" role="alertdialog" aria-describedby="concluir-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            Concluir Projeto
          </DialogTitle>
          <DialogDescription id="concluir-description">
            Após concluir, o projeto não aceitará novos lançamentos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="concluir-data">Data de Conclusão *</Label>
            <Input
              id="concluir-data"
              type="date"
              value={dataFimReal}
              onChange={(e) => setDataFimReal(e.target.value)}
              className={error && 'border-destructive'}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="concluir-obs">Observações</Label>
            <Textarea
              id="concluir-obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre a conclusão"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={concluirMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={concluirMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {concluirMutation.isPending ? 'Concluindo...' : 'Concluir Projeto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

