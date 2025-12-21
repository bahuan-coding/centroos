import { useState } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw, FileText, DollarSign, User, AlertTriangle, Check, X } from 'lucide-react';
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

const tipoLabels: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  titulo: { label: 'Título', icon: FileText, color: 'bg-blue-100 text-blue-700' },
  lancamento: { label: 'Lançamento', icon: FileText, color: 'bg-purple-100 text-purple-700' },
  fundo_consumo: { label: 'Consumo de Fundo', icon: DollarSign, color: 'bg-green-100 text-green-700' },
};

export function AprovacoesTab() {
  const [filtroTipo, setFiltroTipo] = useState<string>('all');
  const [selectedAprovacao, setSelectedAprovacao] = useState<any>(null);
  const [showDecisaoDialog, setShowDecisaoDialog] = useState(false);
  const [decisao, setDecisao] = useState<'aprovado' | 'rejeitado'>('aprovado');
  const [observacao, setObservacao] = useState('');

  const utils = trpc.useUtils();
  const { data: pendentes, isLoading, refetch } = trpc.aprovacoes.listPendentes.useQuery({
    entidadeTipo: filtroTipo === 'all' ? undefined : filtroTipo as any,
  });
  const { data: historico } = trpc.aprovacoes.getHistorico.useQuery({ limit: 10 });

  const decidirMutation = trpc.aprovacoes.decidir.useMutation({
    onSuccess: () => {
      toast.success(decisao === 'aprovado' ? 'Aprovação realizada!' : 'Solicitação rejeitada');
      setShowDecisaoDialog(false);
      setObservacao('');
      utils.aprovacoes.listPendentes.invalidate();
      utils.aprovacoes.getHistorico.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleOpenDecisao = (aprovacao: any, tipo: 'aprovado' | 'rejeitado') => {
    setSelectedAprovacao(aprovacao);
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

  const aprovacoesPendentes = pendentes || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Aprovações Pendentes
          </h2>
          <p className="text-sm text-muted-foreground">Solicitações aguardando sua decisão</p>
        </div>
        <div className="flex gap-2">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[180px]">
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-bold text-amber-600">{aprovacoesPendentes.length}</div>
          <div className="text-xs text-muted-foreground">Pendentes</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">
            {historico?.filter((h: any) => h.status === 'aprovado').length || 0}
          </div>
          <div className="text-xs text-muted-foreground">Aprovadas (recentes)</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">
            {historico?.filter((h: any) => h.status === 'rejeitado').length || 0}
          </div>
          <div className="text-xs text-muted-foreground">Rejeitadas (recentes)</div>
        </Card>
      </div>

      {/* Lista de Pendentes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Fila de Aprovação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : aprovacoesPendentes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20 text-green-500" />
              <p className="font-medium text-green-600">Nenhuma aprovação pendente!</p>
              <p className="text-sm">Todas as solicitações foram processadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {aprovacoesPendentes.map((ap: any) => {
                const tipo = tipoLabels[ap.entidade_tipo] || { label: ap.entidade_tipo, icon: FileText, color: 'bg-gray-100 text-gray-700' };
                const TipoIcon = tipo.icon;
                return (
                  <div key={ap.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={cn(tipo.color, 'gap-1')}>
                            <TipoIcon className="h-3 w-3" />
                            {tipo.label}
                          </Badge>
                          <Badge variant="outline">Nível mínimo: {ap.nivel_aprovacao}</Badge>
                        </div>
                        <p className="font-medium truncate">{ap.entidade_descricao || `ID: ${ap.entidade_id}`}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {ap.entidade_valor && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              <span className="font-semibold text-foreground">{formatCurrency(ap.entidade_valor)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{ap.criador_nome || 'Usuário'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDateTime(ap.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleOpenDecisao(ap, 'rejeitado')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleOpenDecisao(ap, 'aprovado')}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Decisão */}
      <Dialog open={showDecisaoDialog} onOpenChange={setShowDecisaoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={cn(
              'flex items-center gap-2',
              decisao === 'aprovado' ? 'text-green-600' : 'text-red-600'
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
              className={decisao === 'aprovado' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {decidirMutation.isPending ? 'Processando...' : decisao === 'aprovado' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




