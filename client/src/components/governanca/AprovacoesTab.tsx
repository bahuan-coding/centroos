import { useState } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw, FileText, DollarSign, User, AlertTriangle, Check, X, ChevronRight, History, Calendar, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const tipoConfig: Record<string, { label: string; icon: typeof FileText; color: string; bgColor: string }> = {
  titulo: { label: 'Título', icon: FileText, color: 'text-blue-700', bgColor: 'bg-blue-100' },
  lancamento: { label: 'Lançamento', icon: FileText, color: 'text-purple-700', bgColor: 'bg-purple-100' },
  fundo_consumo: { label: 'Consumo de Fundo', icon: DollarSign, color: 'text-green-700', bgColor: 'bg-green-100' },
};

// Quick Stats clicáveis
function QuickStats({ pendentes, aprovadas, rejeitadas, filtro, setFiltro }: {
  pendentes: number;
  aprovadas: number;
  rejeitadas: number;
  filtro: 'pendente' | 'aprovado' | 'rejeitado' | 'all';
  setFiltro: (v: 'pendente' | 'aprovado' | 'rejeitado' | 'all') => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        onClick={() => setFiltro(filtro === 'pendente' ? 'all' : 'pendente')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtro === 'pendente' ? 'bg-amber-100 ring-2 ring-amber-500' : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <p className="text-xl font-bold text-amber-600">{pendentes}</p>
        <p className="text-[10px] text-muted-foreground">Pendentes</p>
      </button>
      <button
        onClick={() => setFiltro(filtro === 'aprovado' ? 'all' : 'aprovado')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtro === 'aprovado' ? 'bg-emerald-100 ring-2 ring-emerald-500' : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <p className="text-xl font-bold text-emerald-600">{aprovadas}</p>
        <p className="text-[10px] text-muted-foreground">Aprovadas</p>
      </button>
      <button
        onClick={() => setFiltro(filtro === 'rejeitado' ? 'all' : 'rejeitado')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtro === 'rejeitado' ? 'bg-rose-100 ring-2 ring-rose-500' : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <p className="text-xl font-bold text-rose-600">{rejeitadas}</p>
        <p className="text-[10px] text-muted-foreground">Rejeitadas</p>
      </button>
    </div>
  );
}

// Lista de Aprovações (Master)
function AprovacoesList({ 
  items, 
  selectedId, 
  onSelect, 
  isLoading 
}: { 
  items: any[]; 
  selectedId: string | null; 
  onSelect: (item: any) => void; 
  isLoading: boolean; 
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted" />
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

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-300" />
        <p className="font-medium text-emerald-600">Tudo em dia!</p>
        <p className="text-sm mt-1">Nenhuma aprovação pendente</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const tipo = tipoConfig[item.entidade_tipo] || { label: item.entidade_tipo, icon: FileText, color: 'text-gray-700', bgColor: 'bg-gray-100' };
        const TipoIcon = tipo.icon;
        const isPendente = item.status === 'pendente';

        return (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
              'hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1',
              selectedId === item.id && 'bg-indigo-100 ring-2 ring-indigo-500'
            )}
          >
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', tipo.bgColor)}>
              <TipoIcon className={cn('h-5 w-5', tipo.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-sm truncate">
                  {item.entidade_descricao || `${tipo.label} #${item.entidade_id.slice(0, 6)}`}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {isPendente ? (
                  <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">
                    <Clock className="h-2.5 w-2.5 mr-0.5" />Pendente
                  </Badge>
                ) : item.status === 'aprovado' ? (
                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0">
                    <Check className="h-2.5 w-2.5 mr-0.5" />Aprovado
                  </Badge>
                ) : (
                  <Badge className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0">
                    <X className="h-2.5 w-2.5 mr-0.5" />Rejeitado
                  </Badge>
                )}
                {item.entidade_valor && (
                  <span className="text-[10px] font-medium text-slate-600">
                    {formatCurrency(item.entidade_valor)}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className={cn(
              'h-4 w-4 text-slate-300 shrink-0 transition-transform',
              selectedId === item.id && 'text-indigo-500 rotate-90'
            )} />
          </button>
        );
      })}
    </div>
  );
}

// Detalhe da Aprovação (Detail)
function AprovacaoDetail({ 
  aprovacao, 
  onAprovar, 
  onRejeitar,
  isPending
}: { 
  aprovacao: any; 
  onAprovar: () => void;
  onRejeitar: () => void;
  isPending: boolean;
}) {
  const tipo = tipoConfig[aprovacao.entidade_tipo] || { label: aprovacao.entidade_tipo, icon: FileText, color: 'text-gray-700', bgColor: 'bg-gray-100' };
  const TipoIcon = tipo.icon;
  const isPendente = aprovacao.status === 'pendente';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={cn('p-6 border-b', tipo.bgColor)}>
        <div className="flex items-start gap-4">
          <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-white/60')}>
            <TipoIcon className={cn('h-7 w-7', tipo.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn(tipo.bgColor, tipo.color, 'border-0')}>{tipo.label}</Badge>
              {isPendente ? (
                <Badge className="bg-amber-500 text-white">Aguardando Decisão</Badge>
              ) : aprovacao.status === 'aprovado' ? (
                <Badge className="bg-emerald-500 text-white">Aprovado</Badge>
              ) : (
                <Badge className="bg-rose-500 text-white">Rejeitado</Badge>
              )}
            </div>
            <h2 className="text-lg font-bold mt-2">
              {aprovacao.entidade_descricao || `ID: ${aprovacao.entidade_id}`}
            </h2>
            {aprovacao.entidade_valor && (
              <p className="text-2xl font-bold mt-1">{formatCurrency(aprovacao.entidade_valor)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Informações */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <User className="h-4 w-4" />
              <span className="text-xs">Solicitante</span>
            </div>
            <p className="font-medium">{aprovacao.criador_nome || 'Usuário'}</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Data da Solicitação</span>
            </div>
            <p className="font-medium">{formatDateTime(aprovacao.created_at)}</p>
          </div>
        </div>

        {/* Nível de Aprovação */}
        <div className="p-4 rounded-lg border bg-indigo-50/50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-800">Nível de Aprovação Necessário</span>
          </div>
          <p className="text-lg font-bold text-indigo-600">Nível {aprovacao.nivel_aprovacao}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Apenas usuários com nível igual ou superior podem aprovar esta solicitação.
          </p>
        </div>

        {/* Observação (se rejeitado) */}
        {aprovacao.status === 'rejeitado' && aprovacao.observacao && (
          <div className="p-4 rounded-lg border border-rose-200 bg-rose-50">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-rose-600" />
              <span className="text-sm font-medium text-rose-800">Motivo da Rejeição</span>
            </div>
            <p className="text-sm text-rose-700">{aprovacao.observacao}</p>
          </div>
        )}

        {/* Ações */}
        {isPendente && (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              onClick={onRejeitar}
              disabled={isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={onAprovar}
              disabled={isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              Aprovar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Empty State
function EmptySelection() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-6">
        <CheckCircle className="h-12 w-12 text-amber-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Selecione uma aprovação</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Clique em uma solicitação na lista para ver detalhes e tomar sua decisão.
      </p>
    </div>
  );
}

export function AprovacoesTab() {
  const [filtroTipo, setFiltroTipo] = useState<string>('all');
  const [filtroStatus, setFiltroStatus] = useState<'pendente' | 'aprovado' | 'rejeitado' | 'all'>('pendente');
  const [selectedAprovacao, setSelectedAprovacao] = useState<any>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [showDecisaoDialog, setShowDecisaoDialog] = useState(false);
  const [decisao, setDecisao] = useState<'aprovado' | 'rejeitado'>('aprovado');
  const [observacao, setObservacao] = useState('');

  const utils = trpc.useUtils();
  const { data: pendentes, isLoading, refetch } = trpc.aprovacoes.listPendentes.useQuery({
    entidadeTipo: filtroTipo === 'all' ? undefined : filtroTipo as any,
  });
  const { data: historico } = trpc.aprovacoes.getHistorico.useQuery({ limit: 20 });

  const decidirMutation = trpc.aprovacoes.decidir.useMutation({
    onSuccess: () => {
      toast.success(decisao === 'aprovado' ? 'Aprovação realizada!' : 'Solicitação rejeitada');
      setShowDecisaoDialog(false);
      setObservacao('');
      setSelectedAprovacao(null);
      utils.aprovacoes.listPendentes.invalidate();
      utils.aprovacoes.getHistorico.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleOpenDecisao = (tipo: 'aprovado' | 'rejeitado') => {
    setDecisao(tipo);
    setShowDecisaoDialog(true);
  };

  const handleDecidir = () => {
    if (!selectedAprovacao) return;
    decidirMutation.mutate({
      id: selectedAprovacao.id,
      decisao,
      observacao: observacao || undefined,
    });
  };

  // Combinar pendentes e histórico para lista unificada
  const aprovacoesPendentes = (pendentes || []).map((p: any) => ({ ...p, status: 'pendente' }));
  const historicoItems = (historico || []).map((h: any) => ({ ...h }));
  
  const allItems = [...aprovacoesPendentes, ...historicoItems];
  const filteredItems = allItems.filter(item => {
    if (filtroStatus !== 'all' && item.status !== filtroStatus) return false;
    if (filtroTipo !== 'all' && item.entidade_tipo !== filtroTipo) return false;
    return true;
  });

  const stats = {
    pendentes: aprovacoesPendentes.length,
    aprovadas: historicoItems.filter((h: any) => h.status === 'aprovado').length,
    rejeitadas: historicoItems.filter((h: any) => h.status === 'rejeitado').length,
  };

  // Atualizar seleção se o item mudar
  const currentSelected = filteredItems.find(i => i.id === selectedAprovacao?.id);

  const handleSelectAprovacao = (item: any) => {
    setSelectedAprovacao(item);
    if (window.innerWidth < 1024) {
      setShowMobileDetail(true);
    }
  };

  const handleCloseMobileDetail = () => {
    setShowMobileDetail(false);
    setSelectedAprovacao(null);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4">
      {/* Lista (Master) */}
      <Card className="lg:w-[380px] xl:w-[420px] flex flex-col shrink-0">
        <CardHeader className="py-3 px-4 shrink-0 border-b space-y-3">
          {/* Filtro por tipo */}
          <div className="flex gap-2">
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="titulo">Títulos</SelectItem>
                <SelectItem value="lancamento">Lançamentos</SelectItem>
                <SelectItem value="fundo_consumo">Consumo de Fundo</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>

          {/* Stats */}
          <QuickStats 
            pendentes={stats.pendentes}
            aprovadas={stats.aprovadas}
            rejeitadas={stats.rejeitadas}
            filtro={filtroStatus}
            setFiltro={setFiltroStatus}
          />
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-2">
          <AprovacoesList
            items={filteredItems}
            selectedId={selectedAprovacao?.id || null}
            onSelect={handleSelectAprovacao}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Detalhes (Detail) - Desktop */}
      <Card className="hidden lg:flex flex-1 overflow-hidden">
        {currentSelected ? (
          <AprovacaoDetail
            aprovacao={currentSelected}
            onAprovar={() => handleOpenDecisao('aprovado')}
            onRejeitar={() => handleOpenDecisao('rejeitado')}
            isPending={decidirMutation.isPending}
          />
        ) : (
          <EmptySelection />
        )}
      </Card>

      {/* Mobile Detail Overlay */}
      {showMobileDetail && currentSelected && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background">
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b">
              <Button variant="ghost" size="icon" onClick={handleCloseMobileDetail}>
                <X className="h-5 w-5" />
              </Button>
              <span className="font-medium">Detalhes da Aprovação</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AprovacaoDetail
                aprovacao={currentSelected}
                onAprovar={() => handleOpenDecisao('aprovado')}
                onRejeitar={() => handleOpenDecisao('rejeitado')}
                isPending={decidirMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Decisão */}
      <Dialog open={showDecisaoDialog} onOpenChange={setShowDecisaoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={cn(
              'flex items-center gap-2',
              decisao === 'aprovado' ? 'text-emerald-600' : 'text-rose-600'
            )}>
              {decisao === 'aprovado' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              {decisao === 'aprovado' ? 'Aprovar Solicitação' : 'Rejeitar Solicitação'}
            </DialogTitle>
            <DialogDescription>
              {decisao === 'aprovado'
                ? 'Confirme a aprovação desta solicitação.'
                : 'Informe o motivo da rejeição.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Observação {decisao === 'rejeitado' && '*'}</Label>
            <Textarea
              placeholder={decisao === 'aprovado' ? 'Observação opcional...' : 'Motivo da rejeição...'}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDecisaoDialog(false); setObservacao(''); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleDecidir}
              disabled={decidirMutation.isPending || (decisao === 'rejeitado' && observacao.length < 5)}
              className={decisao === 'aprovado' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
            >
              {decidirMutation.isPending ? 'Processando...' : decisao === 'aprovado' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
