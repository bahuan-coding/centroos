import { useState, useMemo } from 'react';
import { Plus, Building2, Wallet, PiggyBank, TrendingUp, CreditCard, Edit2, Power, RefreshCw, Loader2, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip-help';
import { PageHeader } from '@/components/ui/page-header';
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
}

// Constants
const TIPO_CONFIG: Record<TipoConta, { label: string; icon: typeof Wallet; color: string }> = {
  caixa: { label: 'Caixa', icon: Wallet, color: 'from-amber-500 to-orange-600' },
  conta_corrente: { label: 'Conta Corrente', icon: Building2, color: 'from-blue-500 to-indigo-600' },
  poupanca: { label: 'Poupança', icon: PiggyBank, color: 'from-emerald-500 to-teal-600' },
  aplicacao: { label: 'Aplicação', icon: TrendingUp, color: 'from-purple-500 to-violet-600' },
  cartao: { label: 'Cartão', icon: CreditCard, color: 'from-rose-500 to-pink-600' },
};


function ContaCard({ conta, onEdit, onView, onInativar }: { conta: ContaFinanceira; onEdit: () => void; onView: () => void; onInativar: () => void }) {
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
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl bg-gradient-to-br text-white', config.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">{conta.nome}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
                {!conta.ativo && <Badge variant="secondary" className="text-[10px]">Inativa</Badge>}
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

        {/* Balance */}
        <div className="mt-4 pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-1">Saldo Atual</p>
          <p className={cn(
            'text-2xl font-bold font-mono',
            conta.saldo >= 0 ? 'text-foreground' : 'text-rose-600'
          )}>
            R$ {conta.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          {conta.ultimaMovimentacao && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Última movimentação: {new Date(conta.ultimaMovimentacao).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="outline" className="flex-1" onClick={onView}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Extratos
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}>
            <Edit2 className="h-4 w-4 mr-1" />
            Editar
          </Button>
          {conta.ativo && (
            <Tooltip content="Inativar conta">
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

export default function ContasFinanceiras() {
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaFinanceira | null>(null);
  const [showInativas, setShowInativas] = useState(false);
  const [inativarModalOpen, setInativarModalOpen] = useState(false);
  const [contaParaInativar, setContaParaInativar] = useState<ContaFinanceira | null>(null);

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
    }));
  }, [contasData]);

  // Stats
  const saldoTotal = contas.filter(c => c.ativo).reduce((sum, c) => sum + c.saldo, 0);
  const totalContas = contas.filter(c => c.ativo).length;
  const contasAtivas = contas.filter(c => c.ativo);
  const contasInativas = contas.filter(c => !c.ativo);
  
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Contas Financeiras"
        description="Gerencie caixa, contas bancárias e aplicações"
        icon={<Building2 className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar
            </Button>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
          <CardContent className="pt-5">
            <p className="text-sm text-white/70">Saldo Total Disponível</p>
            <p className="text-3xl font-bold font-mono mt-1">
              R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-white/60 mt-2">
              Em {totalContas} conta{totalContas !== 1 ? 's' : ''} ativa{totalContas !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bancos + Aplicações</p>
                <p className="text-xl font-bold font-mono">
                  R$ {contasAtivas.filter(c => c.tipo !== 'caixa').reduce((s, c) => s + c.saldo, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Wallet className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Caixa Físico</p>
                <p className="text-xl font-bold font-mono">
                  R$ {contasAtivas.filter(c => c.tipo === 'caixa').reduce((s, c) => s + c.saldo, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contas Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Contas Ativas</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contasAtivas.length === 0 ? (
            <div className="col-span-full">
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
            </div>
          ) : (
            contasAtivas.map((conta) => (
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

      {/* Inactive Accounts */}
      {contasInativas.length > 0 && (
        <div>
          <button
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            onClick={() => setShowInativas(!showInativas)}
          >
            <Power className="h-4 w-4" />
            {showInativas ? 'Ocultar' : 'Mostrar'} contas inativas ({contasInativas.length})
          </button>
          
          {showInativas && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {contasInativas.map((conta) => (
                <ContaCard
                  key={conta.id}
                  conta={conta}
                  onEdit={() => handleEdit(conta)}
                  onView={() => handleView(conta)}
                  onInativar={() => {}}
                />
              ))}
            </div>
          )}
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
          extratosPendentes: 0, // TODO: get from API
        } : null}
        onConfirm={handleConfirmInativar}
        isLoading={inativarMutation.isPending}
      />
    </div>
  );
}
