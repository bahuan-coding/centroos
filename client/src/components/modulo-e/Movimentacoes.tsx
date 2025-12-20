import { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, CheckCircle, XCircle, AlertTriangle, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ResponsiveTable } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ===================== ALOCAÇÃO =====================

export function AlocacaoForm() {
  const utils = trpc.useUtils();
  const { data: fundos = [] } = trpc.fundo.list.useQuery({ ativo: true });
  const { data: alocacoes = [], isLoading } = trpc.fundoAlocacao.list.useQuery();

  const [form, setForm] = useState({
    fundoId: '',
    valor: '',
    dataAlocacao: new Date().toISOString().split('T')[0],
    origemDescricao: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = trpc.fundoAlocacao.create.useMutation({
    onSuccess: (data) => {
      utils.fundoAlocacao.list.invalidate();
      utils.fundo.list.invalidate();
      const fundo = fundos.find(f => f.id === form.fundoId);
      toast.success(
        `R$ ${parseFloat(form.valor).toFixed(2).replace('.', ',')} alocado ao fundo ${fundo?.nome || ''}. Novo saldo: R$ ${data.novoSaldo.toFixed(2).replace('.', ',')}`
      );
      setForm({ fundoId: '', valor: '', dataAlocacao: new Date().toISOString().split('T')[0], origemDescricao: '' });
    },
    onError: (err) => {
      toast.error('Erro ao alocar', { description: err.message });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.fundoId) newErrors.fundoId = 'Selecione o fundo';
    if (!form.valor || parseFloat(form.valor) <= 0) newErrors.valor = 'Informe um valor positivo';
    if (!form.dataAlocacao) newErrors.dataAlocacao = 'Informe a data';
    if (!form.origemDescricao.trim()) newErrors.origemDescricao = 'Informe a origem do recurso';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    createMutation.mutate({
      fundoId: form.fundoId,
      valor: parseFloat(form.valor.replace(/[^\d,.-]/g, '').replace(',', '.')),
      dataAlocacao: form.dataAlocacao,
      origemDescricao: form.origemDescricao,
    });
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

  const selectedFundo = fundos.find(f => f.id === form.fundoId);

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
            Alocar Recurso ao Fundo
          </CardTitle>
          <CardDescription>
            Registre a entrada de recursos em um fundo (doação recebida, transferência, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aloc-fundo" className="flex items-center gap-1">
                Fundo *
                <TooltipHelp content="Qual fundo receberá o recurso" />
              </Label>
              <Select value={form.fundoId} onValueChange={(v) => setForm({ ...form, fundoId: v })}>
                <SelectTrigger id="aloc-fundo" className={errors.fundoId && 'border-destructive'}>
                  <SelectValue placeholder="Selecionar fundo" />
                </SelectTrigger>
                <SelectContent>
                  {fundos.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-1 rounded">{f.codigo}</code>
                        <span>{f.nome}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          Saldo: {formatCurrency(f.saldoAtual)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.fundoId && <p className="text-xs text-destructive">{errors.fundoId}</p>}
              {selectedFundo && (
                <p className="text-xs text-muted-foreground">
                  Saldo atual: <strong>{formatCurrency(selectedFundo.saldoAtual)}</strong>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aloc-valor">Valor (R$) *</Label>
                <Input
                  id="aloc-valor"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder="0,00"
                  className={cn('font-mono', errors.valor && 'border-destructive')}
                />
                {errors.valor && <p className="text-xs text-destructive">{errors.valor}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="aloc-data">Data *</Label>
                <Input
                  id="aloc-data"
                  type="date"
                  value={form.dataAlocacao}
                  onChange={(e) => setForm({ ...form, dataAlocacao: e.target.value })}
                  className={errors.dataAlocacao && 'border-destructive'}
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="aloc-origem" className="flex items-center gap-1">
                Origem *
                <TooltipHelp content="De onde veio o recurso. Ex: Doação de João Silva" />
              </Label>
              <Textarea
                id="aloc-origem"
                value={form.origemDescricao}
                onChange={(e) => setForm({ ...form, origemDescricao: e.target.value })}
                placeholder="Descreva a origem do recurso"
                rows={2}
                className={errors.origemDescricao && 'border-destructive'}
              />
              {errors.origemDescricao && <p className="text-xs text-destructive">{errors.origemDescricao}</p>}
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Alocando...' : 'Alocar Recurso'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico de Alocações</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTable stickyHeader density="compact">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Fundo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">Carregando...</TableCell>
                  </TableRow>
                ) : alocacoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                      Nenhuma alocação registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  alocacoes.slice(0, 10).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{formatDate(a.dataAlocacao)}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 rounded">{a.fundo?.codigo}</code>
                        {' '}{a.fundo?.nome}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">
                        +{formatCurrency(a.valor)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {a.origemDescricao}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== CONSUMO =====================

export function ConsumoForm() {
  const utils = trpc.useUtils();
  const { data: fundos = [] } = trpc.fundo.list.useQuery({ ativo: true, saldoPositivo: true });
  const { data: regras = [] } = trpc.fundoRegra.list.useQuery(fundos[0]?.id || '', { enabled: false });

  const [form, setForm] = useState({
    fundoId: '',
    valor: '',
    dataConsumo: new Date().toISOString().split('T')[0],
    justificativa: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);

  // Fetch rules for selected fund
  const { data: fundoRegras = [] } = trpc.fundoRegra.list.useQuery(form.fundoId, {
    enabled: !!form.fundoId,
  });

  const createMutation = trpc.fundoConsumo.create.useMutation({
    onSuccess: (data) => {
      utils.fundoConsumo.list.invalidate();
      utils.fundoConsumo.pendentes.invalidate();
      utils.fundo.list.invalidate();
      
      if (data.requerAprovacao) {
        toast.info('Consumo registrado. Aguardando aprovação.');
      } else {
        toast.success(`Consumo realizado. Novo saldo: R$ ${data.novoSaldo?.toFixed(2).replace('.', ',')}`);
      }
      
      setForm({ fundoId: '', valor: '', dataConsumo: new Date().toISOString().split('T')[0], justificativa: '' });
      setWarnings([]);
    },
    onError: (err) => {
      if (err.message.includes('Saldo insuficiente')) {
        setErrors({ valor: err.message });
      } else if (err.message.includes('Justificativa')) {
        setErrors({ justificativa: err.message });
      } else if (err.message.includes('limite') || err.message.includes('excede')) {
        setErrors({ valor: err.message });
      } else {
        toast.error('Erro ao consumir', { description: err.message });
      }
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const newWarnings: string[] = [];
    
    if (!form.fundoId) newErrors.fundoId = 'Selecione o fundo';
    if (!form.valor || parseFloat(form.valor) <= 0) newErrors.valor = 'Informe um valor positivo';
    if (!form.dataConsumo) newErrors.dataConsumo = 'Informe a data';
    if (!form.justificativa.trim()) {
      newErrors.justificativa = 'Informe a justificativa';
    } else if (form.justificativa.length < 10) {
      newErrors.justificativa = 'Justificativa muito curta. Mínimo 10 caracteres.';
    }

    // Check fund rules
    const selectedFundo = fundos.find(f => f.id === form.fundoId);
    if (selectedFundo && form.valor) {
      const valor = parseFloat(form.valor.replace(/[^\d,.-]/g, '').replace(',', '.'));
      const saldo = parseFloat(selectedFundo.saldoAtual);
      
      if (valor > saldo) {
        newErrors.valor = `Saldo insuficiente. Disponível: R$ ${saldo.toFixed(2).replace('.', ',')}`;
      }

      // Check valor_maximo rule
      const regraValorMax = fundoRegras.find(r => r.tipoRegra === 'valor_maximo' && r.ativo);
      if (regraValorMax && regraValorMax.parametroNumerico) {
        const limite = parseFloat(regraValorMax.parametroNumerico);
        if (valor > limite) {
          newErrors.valor = `Valor excede limite de R$ ${limite.toFixed(2).replace('.', ',')} por operação`;
        }
      }

      // Check aprovador_obrigatorio rule
      const regraAprovador = fundoRegras.find(r => r.tipoRegra === 'aprovador_obrigatorio' && r.ativo);
      if (regraAprovador) {
        newWarnings.push('Este fundo requer aprovação. O consumo ficará pendente.');
      }
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    createMutation.mutate({
      fundoId: form.fundoId,
      valor: parseFloat(form.valor.replace(/[^\d,.-]/g, '').replace(',', '.')),
      dataConsumo: form.dataConsumo,
      justificativa: form.justificativa,
    });
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const selectedFundo = fundos.find(f => f.id === form.fundoId);

  // Real-time validation on value change
  const handleValorChange = (value: string) => {
    setForm({ ...form, valor: value });
    
    // Clear errors and re-validate
    if (selectedFundo && value) {
      const valorNum = parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
      const saldo = parseFloat(selectedFundo.saldoAtual);
      
      if (valorNum > saldo) {
        setErrors(prev => ({ ...prev, valor: `Saldo insuficiente. Disponível: R$ ${saldo.toFixed(2).replace('.', ',')}` }));
      } else {
        setErrors(prev => {
          const { valor, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowDownCircle className="h-4 w-4 text-rose-600" />
          Consumir Recurso do Fundo
        </CardTitle>
        <CardDescription>
          Registre a saída de recursos de um fundo (despesa vinculada, transferência, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cons-fundo" className="flex items-center gap-1">
              Fundo *
              <TooltipHelp content="De qual fundo sairá o recurso" />
            </Label>
            <Select value={form.fundoId} onValueChange={(v) => setForm({ ...form, fundoId: v })}>
              <SelectTrigger id="cons-fundo" className={errors.fundoId && 'border-destructive'}>
                <SelectValue placeholder="Selecionar fundo" />
              </SelectTrigger>
              <SelectContent>
                {fundos.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-1 rounded">{f.codigo}</code>
                      <span>{f.nome}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        Saldo: {formatCurrency(f.saldoAtual)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.fundoId && <p className="text-xs text-destructive">{errors.fundoId}</p>}
            {selectedFundo && (
              <p className="text-xs text-muted-foreground">
                Saldo disponível: <strong className="text-emerald-600">{formatCurrency(selectedFundo.saldoAtual)}</strong>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cons-valor">Valor (R$) *</Label>
              <Input
                id="cons-valor"
                value={form.valor}
                onChange={(e) => handleValorChange(e.target.value)}
                placeholder="0,00"
                className={cn('font-mono', errors.valor && 'border-destructive')}
              />
              {errors.valor && <p className="text-xs text-destructive">{errors.valor}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cons-data">Data *</Label>
              <Input
                id="cons-data"
                type="date"
                value={form.dataConsumo}
                onChange={(e) => setForm({ ...form, dataConsumo: e.target.value })}
              />
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="cons-just" className="flex items-center gap-1">
              Justificativa *
              <TooltipHelp content="Por que está usando este recurso. Mínimo 10 caracteres." />
            </Label>
            <Textarea
              id="cons-just"
              value={form.justificativa}
              onChange={(e) => setForm({ ...form, justificativa: e.target.value })}
              placeholder="Justifique o uso do recurso (mínimo 10 caracteres)"
              rows={2}
              className={errors.justificativa && 'border-destructive'}
            />
            {errors.justificativa && <p className="text-xs text-destructive">{errors.justificativa}</p>}
            <p className="text-xs text-muted-foreground">{form.justificativa.length}/10 caracteres mínimos</p>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="md:col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2 text-amber-700 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  {warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={createMutation.isPending} variant="destructive">
              {createMutation.isPending ? 'Consumindo...' : 'Consumir Recurso'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ===================== APROVAÇÕES =====================

export function AprovacaoGrid() {
  const utils = trpc.useUtils();
  const { data: pendentes = [], isLoading } = trpc.fundoConsumo.pendentes.useQuery();
  const [dialogItem, setDialogItem] = useState<any>(null);
  const [dialogAction, setDialogAction] = useState<'aprovar' | 'rejeitar' | null>(null);
  const [observacao, setObservacao] = useState('');

  const aprovarMutation = trpc.fundoConsumo.aprovar.useMutation({
    onSuccess: (data) => {
      utils.fundoConsumo.pendentes.invalidate();
      utils.fundoConsumo.list.invalidate();
      utils.fundo.list.invalidate();
      toast.success(`Consumo aprovado. Novo saldo: R$ ${data.novoSaldo.toFixed(2).replace('.', ',')}`);
      closeDialog();
    },
    onError: (err) => {
      toast.error('Erro ao aprovar', { description: err.message });
    },
  });

  const rejeitarMutation = trpc.fundoConsumo.rejeitar.useMutation({
    onSuccess: () => {
      utils.fundoConsumo.pendentes.invalidate();
      toast.success('Consumo rejeitado');
      closeDialog();
    },
    onError: (err) => {
      toast.error('Erro ao rejeitar', { description: err.message });
    },
  });

  const openDialog = (item: any, action: 'aprovar' | 'rejeitar') => {
    setDialogItem(item);
    setDialogAction(action);
    setObservacao('');
  };

  const closeDialog = () => {
    setDialogItem(null);
    setDialogAction(null);
    setObservacao('');
  };

  const handleConfirm = () => {
    if (!dialogItem) return;

    if (dialogAction === 'aprovar') {
      aprovarMutation.mutate({ id: dialogItem.id, observacao: observacao || undefined });
    } else {
      if (!observacao.trim() || observacao.length < 5) {
        toast.error('Informe o motivo da rejeição (mínimo 5 caracteres)');
        return;
      }
      rejeitarMutation.mutate({ id: dialogItem.id, observacao });
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

  const isPending = aprovarMutation.isPending || rejeitarMutation.isPending;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Aprovações Pendentes
            {pendentes.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendentes.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Consumos de fundos aguardando aprovação conforme regra configurada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveTable stickyHeader density="compact">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fundo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Justificativa</TableHead>
                  <TableHead className="w-32 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">Carregando...</TableCell>
                  </TableRow>
                ) : pendentes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                      Nenhuma aprovação pendente
                    </TableCell>
                  </TableRow>
                ) : (
                  pendentes.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <code className="text-xs bg-muted px-1 rounded">{p.fundo?.codigo}</code>
                          {' '}{p.fundo?.nome}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-rose-600">
                        -{formatCurrency(p.valor)}
                      </TableCell>
                      <TableCell>{formatDate(p.dataConsumo)}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {p.justificativa}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => openDialog(p, 'aprovar')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openDialog(p, 'rejeitar')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
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

      {/* Dialog de confirmação */}
      <Dialog open={!!dialogItem} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-sm" role="alertdialog" aria-describedby="approval-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogAction === 'aprovar' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  Aprovar Consumo
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Rejeitar Consumo
                </>
              )}
            </DialogTitle>
            <DialogDescription id="approval-description">
              {dialogAction === 'aprovar'
                ? 'Ao aprovar, o saldo do fundo será debitado.'
                : 'Ao rejeitar, o consumo será cancelado.'}
            </DialogDescription>
          </DialogHeader>

          {dialogItem && (
            <div className="py-2 space-y-2">
              <p className="text-sm">
                <strong>Fundo:</strong> {dialogItem.fundo?.codigo} - {dialogItem.fundo?.nome}
              </p>
              <p className="text-sm">
                <strong>Valor:</strong> <span className="font-mono text-rose-600">{formatCurrency(dialogItem.valor)}</span>
              </p>
              <p className="text-sm">
                <strong>Justificativa:</strong> {dialogItem.justificativa}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="aprov-obs">
              Observação {dialogAction === 'rejeitar' && '*'}
            </Label>
            <Textarea
              id="aprov-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder={dialogAction === 'rejeitar' ? 'Motivo da rejeição (obrigatório)' : 'Observação opcional'}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              variant={dialogAction === 'aprovar' ? 'default' : 'destructive'}
              className={dialogAction === 'aprovar' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              {isPending ? 'Processando...' : dialogAction === 'aprovar' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

