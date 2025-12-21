import { useState } from 'react';
import { X, Edit2, XCircle, CheckCircle, Building2, Layers, Wallet, AlertTriangle, History, ArrowUpDown, FileText, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CentroCustoForm } from './CentroCusto';
import { ProjetoForm, ProjetoConcluirDialog } from './Projeto';
import { FundoForm } from './Fundo';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { EntityType, UnifiedItem } from './ModuloEList';

interface ModuloEDetailProps {
  item: UnifiedItem;
  onClose: () => void;
  onUpdated?: () => void;
}

const typeConfig: Record<EntityType, { headerBg: string; icon: React.ReactNode; label: string }> = {
  centro: { 
    headerBg: 'from-blue-500 to-indigo-600', 
    icon: <Building2 className="h-6 w-6" />, 
    label: 'Centro de Custo' 
  },
  projeto: { 
    headerBg: 'from-emerald-500 to-teal-600', 
    icon: <Layers className="h-6 w-6" />, 
    label: 'Projeto' 
  },
  fundo: { 
    headerBg: 'from-violet-500 to-purple-600', 
    icon: <Wallet className="h-6 w-6" />, 
    label: 'Fundo' 
  },
};

const statusLabels: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  suspenso: 'Suspenso',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  restrito: 'Restrito',
  designado: 'Designado',
  livre: 'Livre',
};

function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
}

export function ModuloEDetail({ item, onClose, onUpdated }: ModuloEDetailProps) {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState('dados');
  const [isEditing, setIsEditing] = useState(false);
  const [showInativarDialog, setShowInativarDialog] = useState(false);
  const [showConcluirDialog, setShowConcluirDialog] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  // Fetch full data based on type
  const { data: centroCusto, isLoading: loadingCC } = trpc.centroCusto.byId.useQuery(item.id, {
    enabled: item.tipo === 'centro',
  });
  const { data: projeto, isLoading: loadingProjeto } = trpc.projeto.byId.useQuery(item.id, {
    enabled: item.tipo === 'projeto',
  });
  const { data: fundo, isLoading: loadingFundo } = trpc.fundo.byId.useQuery(item.id, {
    enabled: item.tipo === 'fundo',
  });

  // Mutations
  const inativarCCMutation = trpc.centroCusto.inativar.useMutation({
    onSuccess: () => {
      toast.success('Centro de custo inativado');
      utils.centroCusto.list.invalidate();
      setShowInativarDialog(false);
      onUpdated?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelarProjetoMutation = trpc.projeto.cancelar.useMutation({
    onSuccess: () => {
      toast.success('Projeto cancelado');
      utils.projeto.list.invalidate();
      setShowInativarDialog(false);
      onUpdated?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const inativarFundoMutation = trpc.fundo.inativar.useMutation({
    onSuccess: () => {
      toast.success('Fundo inativado');
      utils.fundo.list.invalidate();
      setShowInativarDialog(false);
      onUpdated?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const isLoading = (item.tipo === 'centro' && loadingCC) || 
                    (item.tipo === 'projeto' && loadingProjeto) || 
                    (item.tipo === 'fundo' && loadingFundo);

  const config = typeConfig[item.tipo];
  const isMobileOverlay = typeof window !== 'undefined' && window.innerWidth < 1024;

  const handleFormSuccess = () => {
    setIsEditing(false);
    if (item.tipo === 'centro') utils.centroCusto.list.invalidate();
    if (item.tipo === 'projeto') utils.projeto.list.invalidate();
    if (item.tipo === 'fundo') utils.fundo.list.invalidate();
    onUpdated?.();
  };

  const handleInativar = () => {
    if (item.tipo === 'centro') {
      inativarCCMutation.mutate(item.id);
    } else if (item.tipo === 'projeto') {
      if (motivoCancelamento.length < 10) {
        toast.error('Motivo deve ter no mínimo 10 caracteres');
        return;
      }
      cancelarProjetoMutation.mutate({ id: item.id, motivo: motivoCancelamento });
    } else if (item.tipo === 'fundo') {
      inativarFundoMutation.mutate(item.id);
    }
  };

  const isPendingInativar = inativarCCMutation.isPending || cancelarProjetoMutation.isPending || inativarFundoMutation.isPending;

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

  if (isLoading) {
    if (isMobileOverlay) {
      return (
        <Wrapper>
          <div className="relative w-full max-w-2xl bg-background shadow-2xl animate-in slide-in-from-right duration-300 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        </Wrapper>
      );
    }
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // Get the full data object
  const fullData = item.tipo === 'centro' ? centroCusto : item.tipo === 'projeto' ? projeto : fundo;

  return (
    <Wrapper>
      <div className={cn(
        "bg-background overflow-hidden flex flex-col h-full",
        isMobileOverlay && "relative w-full max-w-2xl shadow-2xl animate-in slide-in-from-right duration-300"
      )}>
        {/* Header */}
        <div className={cn('text-white p-6 shrink-0', `bg-gradient-to-br ${config.headerBg}`)}>
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Fechar detalhes"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-sm bg-white/20 px-2 py-0.5 rounded font-mono">{item.codigo}</code>
                <Badge variant="outline" className="border-white/40 text-white text-xs">
                  {config.label}
                </Badge>
              </div>
              <h2 className="text-xl font-bold truncate">{item.nome}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {item.status && (
                  <Badge className="bg-white/20 text-white text-xs">
                    {statusLabels[item.status]}
                  </Badge>
                )}
                {!item.ativo && <Badge className="bg-red-500 text-white text-xs">Inativo</Badge>}
                {item.parceriaMrosc && (
                  <Badge className="bg-purple-200 text-purple-800 text-xs">MROSC</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {item.tipo === 'centro' && (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold">{(fullData as any)?.projetosCount || 0}</div>
                  <div className="text-xs text-white/70">Projetos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{item.ativo ? '✓' : '✗'}</div>
                  <div className="text-xs text-white/70">Status</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">-</div>
                  <div className="text-xs text-white/70">Responsável</div>
                </div>
              </>
            )}
            {item.tipo === 'projeto' && (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatCurrency((fullData as any)?.orcamentoPrevisto)}</div>
                  <div className="text-xs text-white/70">Orçamento</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatDate((fullData as any)?.dataInicio)}</div>
                  <div className="text-xs text-white/70">Início</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatDate((fullData as any)?.dataFimPrevista)}</div>
                  <div className="text-xs text-white/70">Término</div>
                </div>
              </>
            )}
            {item.tipo === 'fundo' && (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatCurrency((fullData as any)?.saldoAtual)}</div>
                  <div className="text-xs text-white/70">Saldo</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatCurrency((fullData as any)?.metaValor)}</div>
                  <div className="text-xs text-white/70">Meta</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatDate((fullData as any)?.dataLimite)}</div>
                  <div className="text-xs text-white/70">Limite</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="px-4 pt-4 border-b sticky top-0 bg-background z-10">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="dados" className="text-xs">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />Dados
                </TabsTrigger>
                <TabsTrigger value="movimentacoes" className="text-xs">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />Movimentações
                </TabsTrigger>
                <TabsTrigger value="historico" className="text-xs">
                  <History className="h-3.5 w-3.5 mr-1.5" />Histórico
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              {/* Tab: Dados */}
              <TabsContent value="dados" className="mt-0 space-y-4">
                {/* Basic Info Card */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Informações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 space-y-3">
                    {(fullData as any)?.descricao && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Descrição</p>
                        <p className="text-sm">{(fullData as any).descricao}</p>
                      </div>
                    )}
                    {item.tipo === 'projeto' && (fullData as any)?.centroCusto && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Centro de Custo</p>
                        <p className="text-sm">{(fullData as any).centroCusto.codigo} - {(fullData as any).centroCusto.nome}</p>
                      </div>
                    )}
                    {(fullData as any)?.responsavel && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Responsável</p>
                        <p className="text-sm">{(fullData as any).responsavel.nome}</p>
                      </div>
                    )}
                    {item.tipo === 'fundo' && (fullData as any)?.finalidade && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Finalidade</p>
                        <p className="text-sm">{(fullData as any).finalidade}</p>
                      </div>
                    )}
                    {item.tipo === 'fundo' && (fullData as any)?.regras && (fullData as any).regras.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Regras</p>
                        <div className="space-y-1">
                          {(fullData as any).regras.map((r: any) => (
                            <Badge key={r.id} variant="outline" className="mr-1">
                              {r.tipoRegra}: {r.parametroNumerico || r.parametroTexto || '-'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.tipo === 'projeto' && (fullData as any)?.parceriaMrosc && (
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-start gap-2 text-purple-700 text-sm">
                          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium">Parceria MROSC</p>
                            <p className="text-xs mt-1">Termo: {(fullData as any).numeroTermoParceria || '-'}</p>
                            <p className="text-xs">Órgão: {(fullData as any).orgaoParceiro || '-'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button onClick={() => setIsEditing(true)} variant="outline" className="flex-1">
                    <Edit2 className="h-4 w-4 mr-2" /> Editar
                  </Button>
                  {item.tipo === 'projeto' && item.status !== 'concluido' && item.status !== 'cancelado' && (
                    <Button 
                      onClick={() => setShowConcluirDialog(true)} 
                      variant="outline"
                      className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Concluir
                    </Button>
                  )}
                  {item.ativo && (
                    <Button 
                      onClick={() => setShowInativarDialog(true)} 
                      variant="destructive" 
                      size="icon" 
                      aria-label={`Inativar ${config.label}`}
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </TabsContent>

              {/* Tab: Movimentações */}
              <TabsContent value="movimentacoes" className="mt-0">
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowUpDown className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Movimentações em desenvolvimento</p>
                  <p className="text-xs mt-1">Use a aba "Movimentações" no menu principal</p>
                </div>
              </TabsContent>

              {/* Tab: Histórico */}
              <TabsContent value="historico" className="mt-0">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="h-4 w-4" /> Histórico de Alterações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-sm">Nenhuma alteração registrada</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Edit Forms */}
        <CentroCustoForm
          open={isEditing && item.tipo === 'centro'}
          onClose={() => setIsEditing(false)}
          editingItem={centroCusto}
        />
        <ProjetoForm
          open={isEditing && item.tipo === 'projeto'}
          onClose={() => setIsEditing(false)}
          editingItem={projeto}
        />
        <FundoForm
          open={isEditing && item.tipo === 'fundo'}
          onClose={() => setIsEditing(false)}
          editingItem={fundo}
        />

        {/* Concluir Projeto Dialog */}
        {item.tipo === 'projeto' && (
          <ProjetoConcluirDialog
            projetoId={showConcluirDialog ? item.id : null}
            onClose={() => setShowConcluirDialog(false)}
          />
        )}

        {/* Inativar Dialog */}
        <Dialog open={showInativarDialog} onOpenChange={setShowInativarDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {item.tipo === 'projeto' ? 'Cancelar Projeto' : `Inativar ${config.label}`}
              </DialogTitle>
              <DialogDescription>
                {item.tipo === 'projeto' 
                  ? 'Esta ação não pode ser desfeita. O projeto será marcado como cancelado permanentemente.'
                  : `O ${config.label.toLowerCase()} será inativado e não aceitará novos lançamentos.`
                }
              </DialogDescription>
            </DialogHeader>
            {item.tipo === 'projeto' && (
              <div className="space-y-2 py-4">
                <Label htmlFor="motivo">Motivo do cancelamento *</Label>
                <Textarea 
                  id="motivo" 
                  value={motivoCancelamento} 
                  onChange={e => setMotivoCancelamento(e.target.value)}
                  placeholder="Descreva o motivo (mínimo 10 caracteres)" 
                  rows={3} 
                />
                <p className="text-xs text-muted-foreground">{motivoCancelamento.length}/10 caracteres mínimos</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInativarDialog(false)}>Cancelar</Button>
              <Button 
                variant="destructive" 
                onClick={handleInativar}
                disabled={isPendingInativar || (item.tipo === 'projeto' && motivoCancelamento.length < 10)}
              >
                {isPendingInativar ? 'Processando...' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Wrapper>
  );
}

// Empty state component
export function EmptySelection({ onNew }: { onNew: (type: EntityType) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-6">
        <Layers className="h-12 w-12 text-violet-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Selecione um item</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Clique em um centro de custo, projeto ou fundo na lista ao lado para ver detalhes e gerenciar.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => onNew('centro')} variant="outline" size="sm">
          <Building2 className="h-4 w-4 mr-2" />Centro
        </Button>
        <Button onClick={() => onNew('projeto')} variant="outline" size="sm">
          <Layers className="h-4 w-4 mr-2" />Projeto
        </Button>
        <Button onClick={() => onNew('fundo')} className="bg-violet-600 hover:bg-violet-700" size="sm">
          <Wallet className="h-4 w-4 mr-2" />Fundo
        </Button>
      </div>
    </div>
  );
}

