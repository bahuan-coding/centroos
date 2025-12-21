import { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, CheckCircle, XCircle, AlertTriangle, Wallet, Info, Shield, Calendar, FileText } from 'lucide-react';
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

// Config for fund types
const tipoConfig: Record<string, { label: string; color: string; bg: string }> = {
  livre: { label: 'Livre', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  designado: { label: 'Designado', color: 'text-amber-700', bg: 'bg-amber-100' },
  restrito: { label: 'Restrito', color: 'text-rose-700', bg: 'bg-rose-100' },
};

// ===================== FUNDO SUMMARY CARD =====================

interface FundoSummaryProps {
  fundo: {
    id: string;
    codigo: string;
    nome: string;
    tipo: string;
    saldoAtual: string | number;
    metaValor?: number | null;
  };
}

function FundoSummaryCard({ fundo }: FundoSummaryProps) {
  const tipo = tipoConfig[fundo.tipo];
  const saldo = typeof fundo.saldoAtual === 'string' ? parseFloat(fundo.saldoAtual) : fundo.saldoAtual;
  
  return (
    <div className="p-3 rounded-lg bg-zinc-50 border space-y-2">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-zinc-500" />
        <code className="text-xs font-mono font-bold bg-white px-1.5 py-0.5 rounded border">{fundo.codigo}</code>
        <span className="font-medium text-sm truncate">{fundo.nome}</span>
        {tipo && (
          <Badge className={cn(tipo.bg, tipo.color, 'border-0 text-xs ml-auto')}>
            {tipo.label}
          </Badge>
        )}
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Saldo disponível:</span>
        <span className={cn("font-mono font-bold", saldo > 0 ? "text-emerald-600" : "text-zinc-400")}>
          R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>
      
      {fundo.metaValor && fundo.metaValor > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Meta:</span>
          <span className="font-mono">R$ {fundo.metaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      )}
      
      {fundo.tipo === 'restrito' && (
        <div className="flex items-start gap-2 p-2 rounded bg-rose-50 text-xs text-rose-700 border border-rose-100">
          <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Fundo restrito: uso definido pelo doador</span>
        </div>
      )}
    </div>
  );
}

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
    if (!validate()) {
      const firstErrorField = document.querySelector('[class*="border-destructive"]') as HTMLElement;
      if (firstErrorField) firstErrorField.focus();
      toast.error('Verifique os campos destacados');
      return;
    }

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
            <TooltipHelp 
              content="Alocação é a entrada de recursos em um fundo. Use para registrar doações recebidas, transferências de outras contas, ou receitas vinculadas a determinado fim. A alocação aumenta o saldo disponível do fundo."
              side="right"
            />
          </CardTitle>
          <CardDescription>
            Registre a entrada de recursos em um fundo (doação recebida, transferência, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aloc-fundo" className="flex items-center gap-1">
                  Fundo *
                  <TooltipHelp content="Selecione o fundo que receberá os recursos. O fundo é uma reserva financeira com finalidade específica. Ao alocar, você está aumentando o saldo disponível para uso conforme a finalidade do fundo." />
                </Label>
                <Select value={form.fundoId} onValueChange={(v) => setForm({ ...form, fundoId: v })}>
                  <SelectTrigger id="aloc-fundo" className={errors.fundoId && 'border-destructive'}>
                    <SelectValue placeholder="Selecionar fundo" />
                  </SelectTrigger>
                  <SelectContent>
                    {fundos.map((f) => {
                      const tipo = tipoConfig[f.tipo];
                      return (
                        <SelectItem key={f.id} value={f.id}>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-1 rounded">{f.codigo}</code>
                            <span>{f.nome}</span>
                            {tipo && (
                              <Badge className={cn(tipo.bg, tipo.color, 'border-0 text-xs')}>
                                {tipo.label}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.fundoId && <p className="text-xs text-destructive">{errors.fundoId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aloc-valor" className="flex items-center gap-1">
                    Valor (R$) *
                    <TooltipHelp content="Valor a ser alocado no fundo. Este valor será somado ao saldo atual do fundo e ficará disponível para consumo conforme regras configuradas." />
                  </Label>
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
                  <Label htmlFor="aloc-data" className="flex items-center gap-1">
                    Data *
                    <TooltipHelp content="Data de competência da alocação. Use a data em que o recurso foi efetivamente recebido ou registrado. Importante para relatórios e conciliação." />
                  </Label>
                  <Input
                    id="aloc-data"
                    type="date"
                    value={form.dataAlocacao}
                    onChange={(e) => setForm({ ...form, dataAlocacao: e.target.value })}
                    className={errors.dataAlocacao && 'border-destructive'}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aloc-origem" className="flex items-center gap-1">
                Origem *
                <TooltipHelp content="Descreva de onde veio o recurso. Exemplos: 'Doação de João Silva - PIX 15/01', 'Transferência conta corrente', 'Evento beneficente - rifa'. Esta informação é importante para prestação de contas e auditoria." />
              </Label>
              <Textarea
                id="aloc-origem"
                value={form.origemDescricao}
                onChange={(e) => setForm({ ...form, origemDescricao: e.target.value })}
                placeholder="Ex: Doação de João Silva, Transferência conta X, Evento beneficente"
                rows={2}
                className={errors.origemDescricao && 'border-destructive'}
              />
              {errors.origemDescricao && <p className="text-xs text-destructive">{errors.origemDescricao}</p>}
            </div>

            {/* Fund Summary */}
            {selectedFundo && (
              <FundoSummaryCard fundo={selectedFundo} />
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                {createMutation.isPending ? 'Alocando...' : 'Alocar Recurso'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            Histórico de Alocações
            <TooltipHelp content="Lista das últimas alocações realizadas. Mostra a data, fundo destino, valor e origem de cada entrada de recurso." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTable stickyHeader density="compact">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Data
                      <TooltipHelp content="Data de competência da alocação" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" />
                      Fundo
                      <TooltipHelp content="Fundo que recebeu os recursos" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      Valor
                      <TooltipHelp content="Valor alocado (entrada)" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      Origem
                      <TooltipHelp content="Descrição da origem do recurso" />
                    </div>
                  </TableHead>
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

  const [form, setForm] = useState({
    fundoId: '',
    valor: '',
    dataConsumo: new Date().toISOString().split('T')[0],
    justificativa: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [requerAprovacao, setRequerAprovacao] = useState(false);

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
        toast.info('Consumo registrado. Aguardando aprovação.', {
          description: 'O consumo ficará pendente até ser aprovado por um gestor.',
        });
      } else {
        toast.success(`Consumo realizado. Novo saldo: R$ ${data.novoSaldo?.toFixed(2).replace('.', ',')}`);
      }
      
      setForm({ fundoId: '', valor: '', dataConsumo: new Date().toISOString().split('T')[0], justificativa: '' });
      setWarnings([]);
      setRequerAprovacao(false);
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
    let needsApproval = false;
    
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
      const saldo = parseFloat(String(selectedFundo.saldoAtual));
      
      if (valor > saldo) {
        newErrors.valor = `Saldo insuficiente. Disponível: R$ ${saldo.toFixed(2).replace('.', ',')}`;
      }

      // Check valor_maximo rule
      const regraValorMax = fundoRegras.find(r => r.tipoRegra === 'valor_maximo' && r.ativo);
      if (regraValorMax && regraValorMax.parametroNumerico) {
        const limite = parseFloat(String(regraValorMax.parametroNumerico));
        if (valor > limite) {
          newWarnings.push(`Valor acima do limite de R$ ${limite.toFixed(2).replace('.', ',')}. Consumo irá para aprovação.`);
          needsApproval = true;
        }
      }

      // Check aprovador_obrigatorio rule
      const regraAprovador = fundoRegras.find(r => r.tipoRegra === 'aprovador_obrigatorio' && r.ativo);
      if (regraAprovador) {
        newWarnings.push('Este fundo requer aprovação para todos os consumos.');
        needsApproval = true;
      }
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    setRequerAprovacao(needsApproval);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      const firstErrorField = document.querySelector('[class*="border-destructive"]') as HTMLElement;
      if (firstErrorField) firstErrorField.focus();
      toast.error('Verifique os campos destacados');
      return;
    }

    createMutation.mutate({
      fundoId: form.fundoId,
      valor: parseFloat(form.valor.replace(/[^\d,.-]/g, '').replace(',', '.')),
      dataConsumo: form.dataConsumo,
      justificativa: form.justificativa,
    });
  };

  const selectedFundo = fundos.find(f => f.id === form.fundoId);

  // Real-time validation on changes
  const handleFundoChange = (fundoId: string) => {
    setForm({ ...form, fundoId });
    setWarnings([]);
    setRequerAprovacao(false);
  };

  const handleValorChange = (value: string) => {
    setForm({ ...form, valor: value });
    
    // Clear errors
    if (selectedFundo && value) {
      const valorNum = parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
      const saldo = parseFloat(String(selectedFundo.saldoAtual));
      
      if (valorNum > saldo) {
        setErrors(prev => ({ ...prev, valor: `Saldo insuficiente. Disponível: R$ ${saldo.toFixed(2).replace('.', ',')}` }));
      } else {
        setErrors(prev => {
          const { valor, ...rest } = prev;
          return rest;
        });
      }
      
      // Check approval rules
      const regraValorMax = fundoRegras.find(r => r.tipoRegra === 'valor_maximo' && r.ativo);
      if (regraValorMax && regraValorMax.parametroNumerico) {
        const limite = parseFloat(String(regraValorMax.parametroNumerico));
        if (valorNum > limite) {
          setRequerAprovacao(true);
        }
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowDownCircle className="h-4 w-4 text-rose-600" />
          Consumir Recurso do Fundo
          <TooltipHelp 
            content="Consumo é a saída de recursos de um fundo. Use para registrar despesas vinculadas à finalidade do fundo. O consumo diminui o saldo disponível e pode requerer aprovação dependendo das regras configuradas."
            side="right"
          />
        </CardTitle>
        <CardDescription>
          Registre a saída de recursos de um fundo (despesa vinculada, transferência, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cons-fundo" className="flex items-center gap-1">
                Fundo *
                <TooltipHelp content="Selecione o fundo de onde sairá o recurso. Apenas fundos com saldo positivo são exibidos. O consumo deve estar alinhado com a finalidade do fundo." />
              </Label>
              <Select value={form.fundoId} onValueChange={handleFundoChange}>
                <SelectTrigger id="cons-fundo" className={errors.fundoId && 'border-destructive'}>
                  <SelectValue placeholder="Selecionar fundo" />
                </SelectTrigger>
                <SelectContent>
                  {fundos.map((f) => {
                    const tipo = tipoConfig[f.tipo];
                    const saldo = typeof f.saldoAtual === 'string' ? parseFloat(f.saldoAtual) : f.saldoAtual;
                    return (
                      <SelectItem key={f.id} value={f.id}>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-1 rounded">{f.codigo}</code>
                          <span>{f.nome}</span>
                          {tipo && (
                            <Badge className={cn(tipo.bg, tipo.color, 'border-0 text-xs')}>
                              {tipo.label}
                            </Badge>
                          )}
                          <span className="text-xs text-emerald-600 font-mono ml-auto">
                            R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.fundoId && <p className="text-xs text-destructive">{errors.fundoId}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cons-valor" className="flex items-center gap-1">
                  Valor (R$) *
                  <TooltipHelp content="Valor a ser consumido do fundo. Não pode exceder o saldo disponível. Dependendo das regras do fundo, valores acima de determinado limite podem requerer aprovação." />
                </Label>
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
                <Label htmlFor="cons-data" className="flex items-center gap-1">
                  Data *
                  <TooltipHelp content="Data de competência do consumo. Use a data em que a despesa ocorreu. Importante para relatórios e conciliação contábil." />
                </Label>
                <Input
                  id="cons-data"
                  type="date"
                  value={form.dataConsumo}
                  onChange={(e) => setForm({ ...form, dataConsumo: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cons-just" className="flex items-center gap-1">
              Justificativa *
              <TooltipHelp content="Explique para que será usado o recurso. A justificativa deve ter no mínimo 10 caracteres e deve estar alinhada com a finalidade do fundo. É importante para prestação de contas e auditoria." />
            </Label>
            <Textarea
              id="cons-just"
              value={form.justificativa}
              onChange={(e) => setForm({ ...form, justificativa: e.target.value })}
              placeholder="Descreva para que será usado o recurso (mínimo 10 caracteres)"
              rows={2}
              className={errors.justificativa && 'border-destructive'}
            />
            {errors.justificativa && <p className="text-xs text-destructive">{errors.justificativa}</p>}
            <p className="text-xs text-muted-foreground">{form.justificativa.length}/10 caracteres mínimos</p>
          </div>

          {/* Fund Summary */}
          {selectedFundo && (
            <FundoSummaryCard fundo={selectedFundo} />
          )}

          {/* Approval Warning */}
          {requerAprovacao && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">Este consumo irá para aprovação</p>
                  <ul className="text-sm text-amber-700 mt-1 space-y-1">
                    {warnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-amber-500 mt-2 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-600 mt-2">
                    O consumo ficará pendente até ser aprovado por um gestor com permissão.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={createMutation.isPending} variant="destructive">
              <ArrowDownCircle className="h-4 w-4 mr-2" />
              {createMutation.isPending ? 'Consumindo...' : requerAprovacao ? 'Solicitar Consumo' : 'Consumir Recurso'}
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
            <Shield className="h-4 w-4" />
            Aprovações Pendentes
            {pendentes.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendentes.length}</Badge>
            )}
            <TooltipHelp 
              content="Lista de consumos aguardando aprovação. Estes consumos foram solicitados mas ainda não foram efetivados. Ao aprovar, o saldo do fundo será debitado. Ao rejeitar, a solicitação será cancelada."
              side="right"
            />
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
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" />
                      Fundo
                      <TooltipHelp content="Fundo de onde será consumido o recurso" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      Valor
                      <TooltipHelp content="Valor solicitado para consumo" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Data
                      <TooltipHelp content="Data de competência do consumo" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      Justificativa
                      <TooltipHelp content="Motivo informado pelo solicitante para uso do recurso" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5" />
                      Regra
                      <TooltipHelp content="Regra do fundo que disparou a necessidade de aprovação" />
                    </div>
                  </TableHead>
                  <TableHead className="w-32 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">Carregando...</TableCell>
                  </TableRow>
                ) : pendentes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                      Nenhuma aprovação pendente
                    </TableCell>
                  </TableRow>
                ) : (
                  pendentes.map((p) => {
                    const tipo = tipoConfig[p.fundo?.tipo || 'livre'];
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-1 rounded">{p.fundo?.codigo}</code>
                            <span className="truncate max-w-[100px]">{p.fundo?.nome}</span>
                            {tipo && (
                              <Badge className={cn(tipo.bg, tipo.color, 'border-0 text-xs')}>
                                {tipo.label}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-rose-600">
                          -{formatCurrency(p.valor)}
                        </TableCell>
                        <TableCell>{formatDate(p.dataConsumo)}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground">
                          {p.justificativa}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">—</span>
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>

      {/* Dialog de confirmação */}
      <Dialog open={!!dialogItem} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md" role="alertdialog" aria-describedby="approval-description">
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
                ? 'Ao aprovar, o saldo do fundo será debitado imediatamente.'
                : 'Ao rejeitar, a solicitação será cancelada e o solicitante será notificado.'}
            </DialogDescription>
          </DialogHeader>

          {dialogItem && (
            <div className="py-2 space-y-3">
              <div className="p-3 rounded-lg bg-zinc-50 border space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fundo:</span>
                  <span className="font-medium">
                    <code className="text-xs bg-muted px-1 rounded mr-1">{dialogItem.fundo?.codigo}</code>
                    {dialogItem.fundo?.nome}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-mono font-bold text-rose-600">{formatCurrency(dialogItem.valor)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Data:</span>
                  <span>{formatDate(dialogItem.dataConsumo)}</span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Justificativa do solicitante:</p>
                <p className="text-sm p-2 rounded bg-zinc-50 border">{dialogItem.justificativa}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="aprov-obs" className="flex items-center gap-1">
              {dialogAction === 'rejeitar' ? 'Motivo da rejeição *' : 'Observação (opcional)'}
              <TooltipHelp 
                content={dialogAction === 'rejeitar' 
                  ? 'Informe o motivo da rejeição. O solicitante será notificado com esta informação.'
                  : 'Adicione uma observação opcional sobre a aprovação.'
                }
              />
            </Label>
            <Textarea
              id="aprov-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder={dialogAction === 'rejeitar' ? 'Motivo da rejeição (obrigatório, mín. 5 caracteres)' : 'Observação opcional sobre a aprovação'}
              rows={2}
            />
            {dialogAction === 'rejeitar' && (
              <p className="text-xs text-muted-foreground">{observacao.length}/5 caracteres mínimos</p>
            )}
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
