import { useState, useMemo, useEffect } from 'react';
import { Plus, Building2, Wallet, PiggyBank, TrendingUp, CreditCard, Edit2, Power, RefreshCw, Loader2, FileSpreadsheet, FileEdit, Trash2, X, Search, Filter, ArrowUpDown, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipHelp } from '@/components/ui/tooltip-help';
import { RichPopover } from '@/components/ui/rich-popover';
import { PageHeader, FilterBar } from '@/components/ui/page-header';
import { EmptyState, EMPTY_STATES } from '@/components/ui/empty-state';
import { QueryError } from '@/components/ui/query-error';
import { InativarContaModal } from '@/components/caixa';
import { ContaFinanceiraWizard } from '@/components/caixa/ContaFinanceiraWizard';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

// Types
type TipoConta = 'caixa' | 'conta_corrente' | 'poupanca' | 'aplicacao' | 'cartao';
type SortOption = 'saldo_desc' | 'saldo_asc' | 'nome_asc' | 'nome_desc';
type StatusFilter = 'all' | 'ativa' | 'inativa';
type TipoFilter = 'all' | TipoConta;

interface ContaFinanceira {
  id: string;
  tipo: TipoConta;
  nome: string;
  bancoNome?: string;
  bancoCodigo?: string;
  agencia?: string;
  contaNumero?: string;
  saldo: number;
  ativo: boolean;
  ultimaMovimentacao?: string;
  updatedAt?: string;
}

// Constants
const TIPO_CONFIG: Record<TipoConta, { label: string; icon: typeof Wallet; color: string }> = {
  caixa: { label: 'Caixa', icon: Wallet, color: 'from-amber-500 to-orange-600' },
  conta_corrente: { label: 'Conta Corrente', icon: Building2, color: 'from-blue-500 to-indigo-600' },
  poupanca: { label: 'Poupança', icon: PiggyBank, color: 'from-emerald-500 to-teal-600' },
  aplicacao: { label: 'Aplicação', icon: TrendingUp, color: 'from-purple-500 to-violet-600' },
  cartao: { label: 'Cartão', icon: CreditCard, color: 'from-rose-500 to-pink-600' },
};

const SORT_OPTIONS = [
  { value: 'saldo_desc', label: 'Maior saldo' },
  { value: 'saldo_asc', label: 'Menor saldo' },
  { value: 'nome_asc', label: 'Nome A-Z' },
  { value: 'nome_desc', label: 'Nome Z-A' },
] as const;

// ============================================================================
// CONTA CARD COMPONENT
// ============================================================================
function ContaCard({ 
  conta, 
  onEdit, 
  onView, 
  onInativar 
}: { 
  conta: ContaFinanceira; 
  onEdit: () => void; 
  onView: () => void; 
  onInativar: () => void;
}) {
  const config = TIPO_CONFIG[conta.tipo];
  const Icon = config.icon;

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all hover:shadow-lg group',
      !conta.ativo && 'opacity-60'
    )}>
      {/* Gradient Header */}
      <div className={cn('h-2 bg-gradient-to-r', config.color)} />
      
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('p-2.5 rounded-xl bg-gradient-to-br text-white shrink-0', config.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{conta.nome}</h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Tooltip content={`Tipo: ${config.label}`}>
                  <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
                </Tooltip>
                <Tooltip content={conta.ativo 
                  ? 'Conta ativa e operacional' 
                  : 'Conta inativa - não aparece nos relatórios'
                }>
                  <Badge 
                    variant={conta.ativo ? 'default' : 'secondary'} 
                    className={cn('text-[10px]', conta.ativo && 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20')}
                  >
                    {conta.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                </Tooltip>
                <Tooltip content="Saldo calculado manualmente a partir das baixas">
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">Manual</Badge>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Info */}
        {conta.bancoNome && (
          <div className="mt-3 p-2 rounded-lg bg-muted/50 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{conta.bancoNome}</span>
              <span className="font-mono">{conta.bancoCodigo}</span>
            </div>
            {(conta.agencia || conta.contaNumero) && (
              <div className="flex gap-4 mt-1 font-mono text-muted-foreground">
                {conta.agencia && <span>Ag: {conta.agencia}</span>}
                {conta.contaNumero && <span>Cc: {conta.contaNumero}</span>}
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Atualizado: {conta.updatedAt ? new Date(conta.updatedAt).toLocaleDateString('pt-BR') : '—'}
          </span>
        </div>

        {/* Balance */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-xs text-muted-foreground">Saldo Atual</p>
            <TooltipHelp content="Calculado como: Saldo Inicial + Entradas - Saídas. Baseado nas baixas de títulos vinculadas a esta conta." />
          </div>
          <p className={cn(
            'text-2xl font-bold font-mono',
            conta.saldo >= 0 ? 'text-foreground' : 'text-rose-600'
          )}>
            R$ {conta.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
          <Tooltip content="Ver lançamentos e movimentações desta conta">
            <Button size="sm" variant="outline" className="flex-1" onClick={onView}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Extratos
            </Button>
          </Tooltip>
          <Tooltip content="Alterar dados bancários, saldo inicial e vínculo contábil">
            <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </Tooltip>
          {conta.ativo && (
            <Tooltip content="Inativar conta. A conta não aparecerá mais nos relatórios, mas o histórico será mantido.">
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                onClick={onInativar}
                aria-label={`Inativar conta ${conta.nome}`}
              >
                <Power className="h-4 w-4" />
              </Button>
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DRAFT INFO
// ============================================================================
interface DraftInfo {
  nome: string;
  tipo: string;
  savedAt?: string;
  pendencias: string[];
}

function getDraftInfo(): DraftInfo | null {
  try {
    const draft = localStorage.getItem('conta_financeira_draft');
    if (!draft) return null;
    const parsed = JSON.parse(draft);
    if (parsed && (parsed.nome || parsed.tipo)) {
      const pendencias: string[] = [];
      if (!parsed.tipo) pendencias.push('Tipo de conta não selecionado');
      if (!parsed.nome) pendencias.push('Nome da conta não preenchido');
      if (parsed.tipo !== 'caixa' && !parsed.bancoCodigo) pendencias.push('Banco não selecionado');
      if (pendencias.length === 0) pendencias.push('Cadastro incompleto');
      
      return {
        nome: parsed.nome || 'Nova Conta',
        tipo: parsed.tipo || 'conta_corrente',
        savedAt: parsed.savedAt,
        pendencias,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  } catch {
    return '';
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ContasFinanceiras() {
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaFinanceira | null>(null);
  const [inativarModalOpen, setInativarModalOpen] = useState(false);
  const [contaParaInativar, setContaParaInativar] = useState<ContaFinanceira | null>(null);
  const [draftInfo, setDraftInfo] = useState<DraftInfo | null>(null);
  const [draftDismissed, setDraftDismissed] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('saldo_desc');

  // Check for draft on mount
  useEffect(() => {
    setDraftInfo(getDraftInfo());
  }, [dialogOpen]);

  const { data: contasData, isLoading, isError, error, refetch } = trpc.contasFinanceiras.list.useQuery();
  const utils = trpc.useUtils();
  
  const inativarMutation = trpc.contasFinanceiras.update.useMutation({
    onSuccess: () => {
      utils.contasFinanceiras.invalidate();
      toast.success('Conta inativada com sucesso');
      setInativarModalOpen(false);
      setContaParaInativar(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao inativar conta');
    },
  });

  const recalcularMutation = trpc.contasFinanceiras.recalcular.useMutation({
    onSuccess: () => {
      utils.contasFinanceiras.invalidate();
      toast.success('Saldos recalculados com sucesso');
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao recalcular saldos');
    },
  });
  
  const contas: ContaFinanceira[] = useMemo(() => {
    if (!contasData) return [];
    return contasData.map((c: any) => ({
      id: c.id,
      tipo: c.tipo as TipoConta,
      nome: c.nome,
      bancoNome: c.bancoNome,
      bancoCodigo: c.bancoCodigo,
      agencia: c.agencia,
      contaNumero: c.contaNumero,
      saldo: c.saldoAtual || 0,
      ativo: c.ativo,
      ultimaMovimentacao: undefined,
      updatedAt: c.updatedAt,
    }));
  }, [contasData]);

  // Apply filters and sorting
  const filteredContas = useMemo(() => {
    let result = [...contas];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.nome.toLowerCase().includes(term) ||
        c.bancoNome?.toLowerCase().includes(term)
      );
    }

    // Tipo filter
    if (tipoFilter !== 'all') {
      result = result.filter(c => c.tipo === tipoFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => statusFilter === 'ativa' ? c.ativo : !c.ativo);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'saldo_desc': return b.saldo - a.saldo;
        case 'saldo_asc': return a.saldo - b.saldo;
        case 'nome_asc': return a.nome.localeCompare(b.nome);
        case 'nome_desc': return b.nome.localeCompare(a.nome);
        default: return 0;
      }
    });

    return result;
  }, [contas, searchTerm, tipoFilter, statusFilter, sortBy]);

  // Stats
  const contasAtivas = contas.filter(c => c.ativo);
  const saldoTotal = contasAtivas.reduce((sum, c) => sum + c.saldo, 0);
  const saldoBancos = contasAtivas.filter(c => c.tipo !== 'caixa').reduce((s, c) => s + c.saldo, 0);
  const saldoCaixa = contasAtivas.filter(c => c.tipo === 'caixa').reduce((s, c) => s + c.saldo, 0);
  const qtdBancos = contasAtivas.filter(c => c.tipo !== 'caixa').length;
  const qtdCaixa = contasAtivas.filter(c => c.tipo === 'caixa').length;

  const hasActiveFilters = Boolean(searchTerm) || tipoFilter !== 'all' || statusFilter !== 'all';
  
  if (isError) {
    return <QueryError error={error} onRetry={() => refetch()} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleNew = () => {
    setEditingConta(null);
    setDialogOpen(true);
  };

  const handleResumeDraft = () => {
    setEditingConta(null);
    setDialogOpen(true);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('conta_financeira_draft');
    setDraftInfo(null);
    setDraftDismissed(false);
    toast.success('Rascunho descartado');
  };

  const handleEdit = (conta: ContaFinanceira) => {
    setEditingConta(conta);
    setDialogOpen(true);
  };

  const handleView = (conta: ContaFinanceira) => {
    navigate(`/extratos?conta=${conta.id}`);
  };

  const handleInativar = (conta: ContaFinanceira) => {
    setContaParaInativar(conta);
    setInativarModalOpen(true);
  };

  const handleConfirmInativar = () => {
    if (contaParaInativar) {
      inativarMutation.mutate({
        id: contaParaInativar.id,
        ativo: false,
      });
    }
  };

  const handleSyncClick = () => {
    recalcularMutation.mutate();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTipoFilter('all');
    setStatusFilter('all');
    setSortBy('saldo_desc');
  };

  const handleKpiClick = (filter: 'all' | 'bancos' | 'caixa') => {
    if (filter === 'all') {
      setTipoFilter('all');
      setStatusFilter('ativa');
    } else if (filter === 'bancos') {
      // Filter to show only banco types (not caixa)
      setTipoFilter('all');
      setStatusFilter('ativa');
      // Since we can't filter "not caixa" with current select, just show all active
    } else if (filter === 'caixa') {
      setTipoFilter('caixa');
      setStatusFilter('ativa');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Contas Financeiras"
        description="Gerencie caixa, contas bancárias e aplicações"
        icon={
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <RichPopover
              title="O que são Contas Financeiras?"
              items={[
                'Representam os locais onde a entidade guarda dinheiro: caixa físico, contas bancárias e aplicações.',
                'Caixa Físico: dinheiro em espécie guardado na sede.',
                'Bancos: contas correntes, poupança e aplicações em instituições financeiras.',
                'Os saldos são calculados automaticamente com base nas baixas de títulos.',
              ]}
              footer="Conforme ITG 2002, essas contas compõem o grupo Disponibilidades no Ativo."
              side="bottom"
              align="start"
            />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Tooltip content="Recalcula os saldos de todas as contas ativas com base nas baixas registradas">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSyncClick}
                disabled={recalcularMutation.isPending}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', recalcularMutation.isPending && 'animate-spin')} />
                Sincronizar
              </Button>
            </Tooltip>
            <Tooltip content="Cria uma nova conta: Caixa, Conta Corrente, Poupança, Aplicação ou Cartão">
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            </Tooltip>
          </div>
        }
      />

      {/* Draft Banner */}
      {draftInfo && !draftDismissed && (
        <div className="relative rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4">
          <button
            onClick={() => setDraftDismissed(true)}
            className="absolute top-3 right-3 p-1 rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-100 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <FileEdit className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-amber-900">Rascunho encontrado</h3>
                <TooltipHelp content="Rascunhos são salvos automaticamente enquanto você preenche o formulário. Você pode retomar de onde parou ou descartar para começar do zero." />
              </div>
              <p className="text-sm text-amber-700 mt-0.5">
                <span className="font-medium">"{draftInfo.nome}"</span>
                {draftInfo.savedAt && (
                  <span className="text-amber-600"> • Salvo {formatTimeAgo(draftInfo.savedAt)}</span>
                )}
              </p>
              {draftInfo.pendencias.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Pendências: {draftInfo.pendencias.join(', ')}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscardDraft}
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Descartar
              </Button>
              <Button
                size="sm"
                onClick={handleResumeDraft}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <FileEdit className="h-4 w-4 mr-1" />
                Retomar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Saldo Total */}
        <button 
          onClick={() => handleKpiClick('all')}
          className="text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-xl"
        >
          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white h-full">
            <CardContent className="pt-5">
              <div className="flex items-center gap-1.5">
                <p className="text-sm text-white/70">Saldo Total Disponível</p>
                <RichPopover
                  title="Saldo Total Disponível"
                  items={[
                    'Soma dos saldos de todas as contas ativas.',
                    'Inclui: caixa físico, contas bancárias e aplicações.',
                    'Calculado: Saldo Inicial + Entradas - Saídas.',
                  ]}
                  footer="Representa o total de recursos líquidos disponíveis da entidade."
                  triggerClassName="text-white/60 hover:text-white hover:bg-white/10"
                />
              </div>
              <p className="text-3xl font-bold font-mono mt-1">
                R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-white/60 mt-2">
                Base: {contasAtivas.length} conta{contasAtivas.length !== 1 ? 's' : ''} ativa{contasAtivas.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </button>

        {/* Bancos + Aplicações */}
        <button 
          onClick={() => handleKpiClick('bancos')}
          className="text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-xl"
        >
          <Card className="h-full">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-muted-foreground">Bancos + Aplicações</p>
                    <RichPopover
                      title="Bancos + Aplicações"
                      items={[
                        'Soma das contas em instituições financeiras.',
                        'Inclui: Conta Corrente, Poupança, Aplicação e Cartão.',
                        'Não inclui: Caixa físico.',
                      ]}
                      footer="Representa recursos custodiados por terceiros."
                    />
                  </div>
                  <p className="text-xl font-bold font-mono">
                    R$ {saldoBancos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Base: {qtdBancos} conta{qtdBancos !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </button>

        {/* Caixa Físico */}
        <button 
          onClick={() => handleKpiClick('caixa')}
          className="text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-xl"
        >
          <Card className="h-full">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Wallet className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-muted-foreground">Caixa Físico</p>
                    <RichPopover
                      title="Caixa Físico"
                      items={[
                        'Dinheiro em espécie guardado na sede da entidade.',
                        'Inclui apenas contas do tipo "Caixa".',
                        'Requer controle rigoroso e contagem periódica.',
                      ]}
                      footer="Valores de fácil acesso, porém com maior risco de perdas."
                    />
                  </div>
                  <p className="text-xl font-bold font-mono">
                    R$ {saldoCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Base: {qtdCaixa} conta{qtdCaixa !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Toolbar */}
      <FilterBar className="bg-muted/30 p-3 rounded-xl" showClear={hasActiveFilters} onClear={clearFilters}>
        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou banco..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
              aria-label="Buscar contas"
            />
          </div>

          {/* Tipo Filter */}
          <Tooltip content="Filtrar por tipo de conta">
            <div>
              <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as TipoFilter)}>
                <SelectTrigger className="w-[150px] h-9" aria-label="Filtrar por tipo">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                  <SelectItem value="conta_corrente">Conta Corrente</SelectItem>
                  <SelectItem value="poupanca">Poupança</SelectItem>
                  <SelectItem value="aplicacao">Aplicação</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Tooltip>

          {/* Status Filter */}
          <Tooltip content="Filtrar por status da conta">
            <div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[130px] h-9" aria-label="Filtrar por status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativa">Ativas</SelectItem>
                  <SelectItem value="inativa">Inativas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Tooltip>

          {/* Sort */}
          <Tooltip content="Ordenar lista de contas">
            <div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[140px] h-9" aria-label="Ordenar por">
                  <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Tooltip>

          {/* Counter */}
          <span className="text-sm text-muted-foreground ml-auto">
            {filteredContas.length} conta{filteredContas.length !== 1 ? 's' : ''}
          </span>
        </div>
      </FilterBar>

      {/* Contas Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {statusFilter === 'inativa' ? 'Contas Inativas' : statusFilter === 'ativa' ? 'Contas Ativas' : 'Todas as Contas'}
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContas.length === 0 ? (
            <div className="col-span-full">
              {hasActiveFilters ? (
                <EmptyState
                  icon={<Search className="h-8 w-8" />}
                  title="Nenhuma conta encontrada"
                  description="Nenhuma conta corresponde aos filtros aplicados. Tente ajustar a busca ou limpar os filtros."
                  action={
                    <Button variant="outline" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Limpar filtros
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<Building2 className="h-8 w-8" />}
                  title={EMPTY_STATES.contas.title}
                  description={EMPTY_STATES.contas.description}
                  action={
                    <Button onClick={handleNew}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeira Conta
                    </Button>
                  }
                />
              )}
            </div>
          ) : (
            filteredContas.map((conta) => (
              <ContaCard
                key={conta.id}
                conta={conta}
                onEdit={() => handleEdit(conta)}
                onView={() => handleView(conta)}
                onInativar={() => handleInativar(conta)}
              />
            ))
          )}
        </div>
      </div>

      {/* Wizard Full-Screen */}
      <ContaFinanceiraWizard
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contaId={editingConta?.id}
        initialData={editingConta ? {
          tipo: editingConta.tipo,
          nome: editingConta.nome,
          bancoCodigo: editingConta.bancoCodigo,
          bancoNome: editingConta.bancoNome,
          agencia: editingConta.agencia,
          contaNumero: editingConta.contaNumero,
        } : undefined}
        mode={editingConta ? 'edit' : 'create'}
        onSuccess={() => setDialogOpen(false)}
      />

      {/* Inativar Modal */}
      <InativarContaModal
        open={inativarModalOpen}
        onOpenChange={setInativarModalOpen}
        conta={contaParaInativar ? {
          id: contaParaInativar.id,
          nome: contaParaInativar.nome,
          saldo: contaParaInativar.saldo,
          extratosPendentes: 0,
        } : null}
        onConfirm={handleConfirmInativar}
        isLoading={inativarMutation.isPending}
      />
    </div>
  );
}
