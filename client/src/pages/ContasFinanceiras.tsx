import { useState, useMemo, useEffect } from 'react';
import { Plus, Building2, Wallet, PiggyBank, TrendingUp, CreditCard, Search, X, ChevronRight, Loader2, FileEdit, Trash2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
import { InativarContaModal, ContaFinanceiraWizard, ContaDetail } from '@/components/caixa';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

type TipoConta = 'caixa' | 'conta_corrente' | 'poupanca' | 'aplicacao' | 'cartao';
type TipoFilter = 'all' | 'bancos' | 'caixa';

interface ContaFinanceira {
  id: string;
  tipo: TipoConta;
  nome: string;
  bancoNome?: string;
  bancoCodigo?: string;
  saldo: number;
  ativo: boolean;
  updatedAt?: string;
}

const TIPO_CONFIG: Record<TipoConta, { label: string; icon: typeof Wallet; color: string; emoji: string }> = {
  caixa: { label: 'Caixa', icon: Wallet, color: 'from-amber-500 to-orange-600', emoji: '💵' },
  conta_corrente: { label: 'Conta Corrente', icon: Building2, color: 'from-blue-500 to-indigo-600', emoji: '🏦' },
  poupanca: { label: 'Poupança', icon: PiggyBank, color: 'from-emerald-500 to-teal-600', emoji: '🐷' },
  aplicacao: { label: 'Aplicação', icon: TrendingUp, color: 'from-purple-500 to-violet-600', emoji: '📈' },
  cartao: { label: 'Cartão', icon: CreditCard, color: 'from-rose-500 to-pink-600', emoji: '💳' },
};

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
}

// ============================================================================
// CONTA ICON
// ============================================================================
function ContaIcon({ tipo, size = 'md' }: { tipo: TipoConta; size?: 'sm' | 'md' }) {
  const config = TIPO_CONFIG[tipo];
  const sizeClasses = size === 'sm' ? 'w-8 h-8 text-lg' : 'w-10 h-10 text-xl';
  return (
    <div className={cn('rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br', sizeClasses, config.color)}>
      <span>{config.emoji}</span>
    </div>
  );
}

// ============================================================================
// CONTAS LIST
// ============================================================================
function ContasList({ 
  contas, 
  selectedId, 
  onSelect,
  isLoading 
}: { 
  contas: ContaFinanceira[]; 
  selectedId: string | null;
  onSelect: (conta: ContaFinanceira) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
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

  if (contas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <span className="text-5xl">🏦</span>
        <p className="mt-3 text-sm">Nenhuma conta encontrada</p>
        <p className="text-xs mt-1">Tente outros termos de busca</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {contas.map((conta) => {
        const config = TIPO_CONFIG[conta.tipo];
        return (
          <button
            key={conta.id}
            onClick={() => onSelect(conta)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
              'hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
              selectedId === conta.id && 'bg-blue-100 ring-2 ring-blue-500',
              !conta.ativo && 'opacity-60'
            )}
          >
            <ContaIcon tipo={conta.tipo} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-sm truncate">{conta.nome}</p>
                {!conta.ativo && <Badge variant="outline" className="text-[10px] px-1 py-0 border-slate-300">Inativa</Badge>}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{config.label}</Badge>
                {conta.bancoNome && (
                  <span className="text-[10px] text-muted-foreground truncate">{conta.bancoNome}</span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={cn('text-sm font-mono font-medium', conta.saldo < 0 && 'text-rose-600')}>
                {formatCurrencyCompact(conta.saldo)}
              </p>
            </div>
            <ChevronRight className={cn('h-4 w-4 text-slate-300 shrink-0 transition-transform', 
              selectedId === conta.id && 'text-blue-500 rotate-90')} />
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// QUICK STATS
// ============================================================================
function QuickStats({ 
  saldoTotal, 
  saldoBancos, 
  saldoCaixa,
  qtdTotal,
  qtdBancos,
  qtdCaixa,
  filtro,
  setFiltro 
}: { 
  saldoTotal: number;
  saldoBancos: number;
  saldoCaixa: number;
  qtdTotal: number;
  qtdBancos: number;
  qtdCaixa: number;
  filtro: TipoFilter;
  setFiltro: (v: TipoFilter) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <button 
        onClick={() => setFiltro(filtro === 'all' ? 'all' : 'all')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtro === 'all' 
            ? 'bg-blue-100 ring-2 ring-blue-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">🏛️</span>
        <p className="text-sm font-bold font-mono">{formatCurrencyCompact(saldoTotal)}</p>
        <p className="text-[10px] text-muted-foreground">{qtdTotal} contas</p>
      </button>
      
      <button 
        onClick={() => setFiltro(filtro === 'bancos' ? 'all' : 'bancos')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtro === 'bancos' 
            ? 'bg-blue-100 ring-2 ring-blue-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">🏦</span>
        <p className="text-sm font-bold font-mono text-blue-600">{formatCurrencyCompact(saldoBancos)}</p>
        <p className="text-[10px] text-muted-foreground">{qtdBancos} bancos</p>
      </button>
      
      <button 
        onClick={() => setFiltro(filtro === 'caixa' ? 'all' : 'caixa')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtro === 'caixa' 
            ? 'bg-amber-100 ring-2 ring-amber-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">💵</span>
        <p className="text-sm font-bold font-mono text-amber-600">{formatCurrencyCompact(saldoCaixa)}</p>
        <p className="text-[10px] text-muted-foreground">{qtdCaixa} caixa</p>
      </button>
    </div>
  );
}

// ============================================================================
// EMPTY SELECTION
// ============================================================================
function EmptySelection({ onNewConta }: { onNewConta: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-6">
        <Building2 className="h-12 w-12 text-blue-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Selecione uma conta</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Clique em uma conta na lista ao lado para ver seus detalhes, saldos, extratos e configurações.
      </p>
      <Button onClick={onNewConta} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="h-4 w-4 mr-2" />
        Nova Conta
      </Button>
    </div>
  );
}

// ============================================================================
// DRAFT BANNER
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
      if (!parsed.tipo) pendencias.push('Tipo não selecionado');
      if (!parsed.nome) pendencias.push('Nome não preenchido');
      if (pendencias.length === 0) pendencias.push('Cadastro incompleto');
      return { nome: parsed.nome || 'Nova Conta', tipo: parsed.tipo || 'conta_corrente', savedAt: parsed.savedAt, pendencias };
    }
    return null;
  } catch { return null; }
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins} min`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `há ${diffHours}h`;
    return `há ${Math.floor(diffMs / 86400000)} dias`;
  } catch { return ''; }
}

function DraftBanner({ draft, onResume, onDiscard, onDismiss }: { 
  draft: DraftInfo; 
  onResume: () => void; 
  onDiscard: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="relative p-3 rounded-lg bg-amber-50 border border-amber-200">
      <button onClick={onDismiss} className="absolute top-2 right-2 p-1 text-amber-400 hover:text-amber-600">
        <X className="h-3 w-3" />
      </button>
      <div className="flex items-center gap-3">
        <FileEdit className="h-5 w-5 text-amber-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-amber-900">Rascunho: "{draft.nome}"</p>
          {draft.savedAt && <p className="text-[10px] text-amber-600">Salvo {formatTimeAgo(draft.savedAt)}</p>}
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button size="sm" variant="ghost" onClick={onDiscard} className="h-7 text-xs text-amber-700">
            <Trash2 className="h-3 w-3 mr-1" />Descartar
          </Button>
          <Button size="sm" onClick={onResume} className="h-7 text-xs bg-amber-600 hover:bg-amber-700">
            Retomar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ContasFinanceiras() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaFinanceira | null>(null);
  const [inativarModalOpen, setInativarModalOpen] = useState(false);
  const [contaParaInativar, setContaParaInativar] = useState<ContaFinanceira | null>(null);
  const [selectedContaId, setSelectedContaId] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoFilter>('all');
  const [draftInfo, setDraftInfo] = useState<DraftInfo | null>(null);
  const [draftDismissed, setDraftDismissed] = useState(false);

  useEffect(() => { setDraftInfo(getDraftInfo()); }, [dialogOpen]);

  const { data: contasData, isLoading, isError, error, refetch } = trpc.contasFinanceiras.list.useQuery();
  const utils = trpc.useUtils();
  
  const inativarMutation = trpc.contasFinanceiras.update.useMutation({
    onSuccess: () => {
      utils.contasFinanceiras.invalidate();
      toast.success('Conta inativada com sucesso');
      setInativarModalOpen(false);
      setContaParaInativar(null);
      setSelectedContaId(null);
    },
    onError: (err) => toast.error(err.message || 'Erro ao inativar conta'),
  });

  const contas: ContaFinanceira[] = useMemo(() => {
    if (!contasData) return [];
    return contasData.map((c: any) => ({
      id: c.id,
      tipo: c.tipo as TipoConta,
      nome: c.nome,
      bancoNome: c.bancoNome,
      bancoCodigo: c.bancoCodigo,
      saldo: c.saldoAtual || 0,
      ativo: c.ativo,
      updatedAt: c.updatedAt,
    }));
  }, [contasData]);

  const filteredContas = useMemo(() => {
    let result = [...contas];
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(c => c.nome.toLowerCase().includes(term) || c.bancoNome?.toLowerCase().includes(term));
    }
    if (filtroTipo === 'bancos') {
      result = result.filter(c => c.tipo !== 'caixa');
    } else if (filtroTipo === 'caixa') {
      result = result.filter(c => c.tipo === 'caixa');
    }
    return result.sort((a, b) => b.saldo - a.saldo);
  }, [contas, search, filtroTipo]);

  const contasAtivas = contas.filter(c => c.ativo);
  const saldoTotal = contasAtivas.reduce((sum, c) => sum + c.saldo, 0);
  const saldoBancos = contasAtivas.filter(c => c.tipo !== 'caixa').reduce((s, c) => s + c.saldo, 0);
  const saldoCaixa = contasAtivas.filter(c => c.tipo === 'caixa').reduce((s, c) => s + c.saldo, 0);
  const qtdTotal = contasAtivas.length;
  const qtdBancos = contasAtivas.filter(c => c.tipo !== 'caixa').length;
  const qtdCaixa = contasAtivas.filter(c => c.tipo === 'caixa').length;

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Contas Financeiras" description="Gerencie caixa, contas bancárias e aplicações" icon="🏦" />
        <QueryError error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  const handleSelectConta = (conta: ContaFinanceira) => {
    setSelectedContaId(conta.id);
    if (window.innerWidth < 1024) setShowMobileDetail(true);
  };

  const handleNew = () => { setEditingConta(null); setDialogOpen(true); };
  const handleResumeDraft = () => { setEditingConta(null); setDialogOpen(true); };
  const handleDiscardDraft = () => { localStorage.removeItem('conta_financeira_draft'); setDraftInfo(null); toast.success('Rascunho descartado'); };
  const handleEdit = (conta: ContaFinanceira) => { setEditingConta(conta); setDialogOpen(true); };
  const handleInativar = (conta: ContaFinanceira) => { setContaParaInativar(conta); setInativarModalOpen(true); };
  const handleConfirmInativar = () => { if (contaParaInativar) inativarMutation.mutate({ id: contaParaInativar.id, ativo: false }); };
  const handleCloseMobileDetail = () => { setShowMobileDetail(false); setSelectedContaId(null); };

  const selectedConta = contas.find(c => c.id === selectedContaId);

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] lg:h-[calc(100vh-theme(spacing.8))] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <PageHeader
          title="Contas Financeiras"
          description="Gerencie caixa, contas bancárias e aplicações"
          icon={<span className="text-3xl">🏦</span>}
        />
        <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Conta</span>
        </Button>
      </div>

      {/* Master-Detail Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Lista (Master) */}
        <Card className="lg:col-span-5 xl:col-span-4 flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 shrink-0 border-b">
            <div className="space-y-3">
              {/* Draft Banner */}
              {draftInfo && !draftDismissed && (
                <DraftBanner 
                  draft={draftInfo} 
                  onResume={handleResumeDraft} 
                  onDiscard={handleDiscardDraft}
                  onDismiss={() => setDraftDismissed(true)}
                />
              )}

              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou banco..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-9"
                  aria-label="Buscar contas"
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

              {/* Quick Stats */}
              <QuickStats 
                saldoTotal={saldoTotal}
                saldoBancos={saldoBancos}
                saldoCaixa={saldoCaixa}
                qtdTotal={qtdTotal}
                qtdBancos={qtdBancos}
                qtdCaixa={qtdCaixa}
                filtro={filtroTipo}
                setFiltro={setFiltroTipo}
              />
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-2">
            <ContasList 
              contas={filteredContas} 
              selectedId={selectedContaId} 
              onSelect={handleSelectConta}
              isLoading={isLoading}
            />
          </CardContent>

          {/* Footer com contador */}
          <div className="p-3 border-t shrink-0 text-center text-xs text-muted-foreground">
            {filteredContas.length} conta{filteredContas.length !== 1 ? 's' : ''} 
            {filtroTipo !== 'all' && ` (filtrado)`}
          </div>
        </Card>

        {/* Detalhes (Detail) - Desktop */}
        <Card className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col overflow-hidden">
          {selectedContaId ? (
            <div className="h-full overflow-hidden">
              <ContaDetail 
                contaId={selectedContaId} 
                onClose={() => setSelectedContaId(null)}
                onEdit={() => selectedConta && handleEdit(selectedConta)}
                onInativar={() => selectedConta && handleInativar(selectedConta)}
                onUpdated={() => {}}
              />
            </div>
          ) : (
            <EmptySelection onNewConta={handleNew} />
          )}
        </Card>
      </div>

      {/* Detail Mobile Overlay */}
      {showMobileDetail && selectedContaId && (
        <div className="lg:hidden">
          <ContaDetail 
            contaId={selectedContaId} 
            onClose={handleCloseMobileDetail}
            onEdit={() => selectedConta && handleEdit(selectedConta)}
            onInativar={() => selectedConta && handleInativar(selectedConta)}
            onUpdated={() => {}}
          />
        </div>
      )}

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
