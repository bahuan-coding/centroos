import { useState } from 'react';
import { X, Edit2, Building2, Wallet, PiggyBank, TrendingUp, CreditCard, Power, RefreshCw, FileSpreadsheet, Clock, AlertTriangle, RotateCcw, CheckCircle, Settings, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip-help';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

type TipoConta = 'caixa' | 'conta_corrente' | 'poupanca' | 'aplicacao' | 'cartao';

interface ContaDetailProps {
  contaId: string;
  onClose: () => void;
  onEdit: () => void;
  onInativar: () => void;
  onUpdated?: () => void;
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

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
}

export function ContaDetail({ contaId, onClose, onEdit, onInativar, onUpdated }: ContaDetailProps) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState('dados');

  const { data: conta, isLoading, error } = trpc.contasFinanceiras.getById.useQuery(contaId);

  const recalcularMutation = trpc.contasFinanceiras.recalcular.useMutation({
    onSuccess: () => {
      utils.contasFinanceiras.invalidate();
      toast.success('Saldo recalculado');
      onUpdated?.();
    },
    onError: (err) => toast.error(err.message || 'Erro ao recalcular'),
  });

  const reativarMutation = trpc.contasFinanceiras.update.useMutation({
    onSuccess: () => {
      utils.contasFinanceiras.invalidate();
      toast.success('Conta reativada');
      onUpdated?.();
    },
    onError: (err) => toast.error(err.message || 'Erro ao reativar'),
  });

  const isMobileOverlay = typeof window !== 'undefined' && window.innerWidth < 1024;

  if (isLoading) {
    if (isMobileOverlay) {
      return (
        <div className="fixed inset-0 z-50 flex justify-end pt-16 lg:pt-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="relative w-full max-w-2xl bg-background shadow-2xl animate-in slide-in-from-right duration-300 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        </div>
      );
    }
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !conta) {
    if (isMobileOverlay) {
      return (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <div className="relative w-full max-w-2xl bg-background shadow-2xl p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-medium">Erro ao carregar conta</p>
            <Button onClick={onClose} className="mt-4">Fechar</Button>
          </div>
        </div>
      );
    }
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Erro ao carregar conta</p>
        <Button onClick={onClose} className="mt-4" variant="outline">Voltar</Button>
      </div>
    );
  }

  const config = TIPO_CONFIG[conta.tipo as TipoConta] || TIPO_CONFIG.conta_corrente;
  const Icon = config.icon;
  const saldo = conta.saldoAtual || 0;

  const handleVerExtratos = () => {
    navigate(`/extratos?conta=${conta.id}`);
  };

  const handleReativar = () => {
    reativarMutation.mutate({ id: conta.id, ativo: true });
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (isMobileOverlay) {
      return (
        <div className="fixed inset-0 z-50 flex justify-end pt-16 lg:pt-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          {children}
        </div>
      );
    }
    return <>{children}</>;
  };

  return (
    <Wrapper>
      <div className={cn(
        "bg-background overflow-hidden flex flex-col h-full",
        isMobileOverlay && "relative w-full max-w-2xl shadow-2xl animate-in slide-in-from-right duration-300"
      )}>
        {/* Header */}
        <div className={cn('text-white p-6 shrink-0', `bg-gradient-to-br ${config.color}`)}>
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Fechar detalhes"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl shrink-0">
              {config.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{conta.nome}</h2>
              {conta.bancoNome && <p className="text-sm text-white/80 truncate">{conta.bancoNome}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="border-white/40 text-white text-xs">
                  <Icon className="h-3 w-3 mr-1" />{config.label}
                </Badge>
                {conta.ativo ? (
                  <Badge className="bg-emerald-500/80 text-white text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />Ativa
                  </Badge>
                ) : (
                  <Badge className="bg-red-500 text-white text-xs">Inativa</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Saldo no Header */}
          <div className="mt-6 pt-4 border-t border-white/20">
            <p className="text-xs text-white/70 mb-1">Saldo Atual</p>
            <p className={cn('text-3xl font-bold font-mono', saldo < 0 && 'text-red-200')}>
              {formatCurrency(saldo)}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="px-4 pt-4 border-b sticky top-0 bg-background z-10">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="dados" className="text-xs">
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />Dados
                </TabsTrigger>
                <TabsTrigger value="extratos" className="text-xs">
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />Extratos
                </TabsTrigger>
                <TabsTrigger value="config" className="text-xs">
                  <Settings className="h-3.5 w-3.5 mr-1.5" />Config
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              {/* Tab: Dados */}
              <TabsContent value="dados" className="mt-0 space-y-4">
                {/* Dados Bancários */}
                {conta.bancoNome && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> Dados Bancários
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 space-y-2">
                      <div className="flex justify-between py-1.5 px-2 rounded bg-muted/50">
                        <span className="text-xs text-muted-foreground">Banco</span>
                        <span className="text-sm font-medium">{conta.bancoNome} ({conta.bancoCodigo})</span>
                      </div>
                      {conta.agencia && (
                        <div className="flex justify-between py-1.5 px-2 rounded bg-muted/50">
                          <span className="text-xs text-muted-foreground">Agência</span>
                          <span className="text-sm font-mono">{conta.agencia}</span>
                        </div>
                      )}
                      {conta.contaNumero && (
                        <div className="flex justify-between py-1.5 px-2 rounded bg-muted/50">
                          <span className="text-xs text-muted-foreground">Conta</span>
                          <span className="text-sm font-mono">{conta.contaNumero}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Saldos */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Movimentação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 space-y-2">
                    <div className="flex justify-between py-1.5 px-2 rounded bg-muted/50">
                      <span className="text-xs text-muted-foreground">Saldo Inicial</span>
                      <span className="text-sm font-mono">{formatCurrency(conta.saldoInicial || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-2 rounded bg-emerald-50">
                      <span className="text-xs text-emerald-600">Entradas</span>
                      <span className="text-sm font-mono text-emerald-600">+ {formatCurrency(conta.totalEntradas || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-2 rounded bg-rose-50">
                      <span className="text-xs text-rose-600">Saídas</span>
                      <span className="text-sm font-mono text-rose-600">- {formatCurrency(conta.totalSaidas || 0)}</span>
                    </div>
                    <div className="flex justify-between py-2 px-2 rounded bg-primary/10 font-medium">
                      <span className="text-sm">Saldo Atual</span>
                      <span className="text-sm font-mono">{formatCurrency(saldo)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Metadados */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Informações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 space-y-2">
                    <div className="flex justify-between py-1.5 px-2 rounded bg-muted/50">
                      <span className="text-xs text-muted-foreground">Criada em</span>
                      <span className="text-sm">{formatDate(conta.createdAt)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-2 rounded bg-muted/50">
                      <span className="text-xs text-muted-foreground">Atualizada em</span>
                      <span className="text-sm">{formatDate(conta.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button onClick={onEdit} variant="outline" className="flex-1">
                    <Edit2 className="h-4 w-4 mr-2" /> Editar
                  </Button>
                  <Tooltip content="Recalcular saldo com base nas baixas">
                    <Button 
                      onClick={() => recalcularMutation.mutate()} 
                      variant="outline"
                      disabled={recalcularMutation.isPending}
                    >
                      <RefreshCw className={cn("h-4 w-4", recalcularMutation.isPending && "animate-spin")} />
                    </Button>
                  </Tooltip>
                  {conta.ativo ? (
                    <Tooltip content="Inativar conta">
                      <Button onClick={onInativar} variant="destructive" size="icon">
                        <Power className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  ) : (
                    <Button 
                      onClick={handleReativar} 
                      variant="outline" 
                      className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                      disabled={reativarMutation.isPending}
                    >
                      <RotateCcw className={cn("h-4 w-4 mr-2", reativarMutation.isPending && "animate-spin")} />
                      Reativar
                    </Button>
                  )}
                </div>
              </TabsContent>

              {/* Tab: Extratos */}
              <TabsContent value="extratos" className="mt-0 space-y-4">
                <div className="text-center py-12">
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Ver Movimentações</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Acesse o histórico completo de entradas e saídas desta conta.
                  </p>
                  <Button onClick={handleVerExtratos}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Abrir Extratos
                  </Button>
                </div>
              </TabsContent>

              {/* Tab: Config */}
              <TabsContent value="config" className="mt-0 space-y-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Settings className="h-4 w-4" /> Configurações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 space-y-2">
                    <div className="flex justify-between py-1.5 px-2 rounded bg-muted/50">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <Badge variant={conta.ativo ? 'default' : 'secondary'}>
                        {conta.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <div className="flex justify-between py-1.5 px-2 rounded bg-muted/50">
                      <span className="text-xs text-muted-foreground">Tipo</span>
                      <span className="text-sm">{config.label}</span>
                    </div>
                    {conta.contaContabilId && (
                      <div className="flex justify-between py-1.5 px-2 rounded bg-muted/50">
                        <span className="text-xs text-muted-foreground">Conta Contábil</span>
                        <span className="text-sm font-mono">Vinculada</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {conta.ativo && (
                  <Card className="border-rose-200 bg-rose-50/50">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <Power className="h-5 w-5 text-rose-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-rose-800">Inativar Conta</p>
                          <p className="text-xs text-rose-600">A conta não aparecerá nos relatórios, mas o histórico será mantido.</p>
                        </div>
                        <Button size="sm" variant="destructive" onClick={onInativar}>
                          Inativar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </Wrapper>
  );
}

