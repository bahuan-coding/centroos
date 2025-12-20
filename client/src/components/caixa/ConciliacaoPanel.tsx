import { useState, useMemo } from 'react';
import { 
  Search, Filter, CheckCircle2, Clock, XCircle, RefreshCw, 
  Link2, Plus, ArrowRight, Sparkles, AlertCircle, ChevronDown, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { MatchCard } from './MatchCard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

// Types
type StatusLinha = 'pendente' | 'conciliado' | 'ignorado';

interface LinhaExtrato {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'credito' | 'debito';
  status: StatusLinha;
}

interface Titulo {
  id: string;
  descricao: string;
  pessoa?: string;
  valor: number;
  dataVencimento: string;
  tipo: 'pagar' | 'receber';
  status: 'pendente' | 'quitado';
}

interface MatchSugestao {
  linha: LinhaExtrato;
  titulo: { id: string; descricao: string; pessoa?: string; valor: number; dataVencimento: string; tipo: 'pagar' | 'receber' };
  score: number;
}

interface ConciliacaoPanelProps {
  extratoId?: string;
  contaId?: string;
}

const STATUS_CONFIG: Record<StatusLinha, { label: string; icon: typeof Clock; color: string }> = {
  pendente: { label: 'Pendente', icon: Clock, color: 'text-amber-600 bg-amber-500/10' },
  conciliado: { label: 'Conciliado', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-500/10' },
  ignorado: { label: 'Ignorado', icon: XCircle, color: 'text-muted-foreground bg-muted' },
};

export function ConciliacaoPanel({ extratoId, contaId }: ConciliacaoPanelProps) {
  const [filterStatus, setFilterStatus] = useState<StatusLinha | 'all'>('pendente');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLinhas, setSelectedLinhas] = useState<Set<string>>(new Set());
  const [selectedTitulo, setSelectedTitulo] = useState<string | null>(null);
  const [showSugestoes, setShowSugestoes] = useState(true);
  const [vincularDialogOpen, setVincularDialogOpen] = useState(false);
  const [linhaParaVincular, setLinhaParaVincular] = useState<LinhaExtrato | null>(null);
  
  const utils = trpc.useUtils();
  
  // Queries
  const { data: pendentesData, isLoading: loadingPendentes } = trpc.conciliacao.pendentes.useQuery(
    { contaId, extratoId },
    { enabled: true }
  );
  
  const { data: sugestoesData } = trpc.conciliacao.sugestoes.useQuery(
    { contaId, extratoId },
    { enabled: true }
  );
  
  const { data: statsData } = trpc.conciliacao.stats.useQuery(
    { contaId },
    { enabled: true }
  );
  
  const { data: titulosData } = trpc.titulos.list.useQuery({});
  
  // Mutations
  const conciliarMutation = trpc.conciliacao.conciliar.useMutation({
    onSuccess: () => {
      utils.conciliacao.invalidate();
      utils.titulos.invalidate();
      toast.success('Linha conciliada com sucesso!');
    },
    onError: (err) => toast.error(err.message || 'Erro ao conciliar'),
  });
  
  const ignorarMutation = trpc.conciliacao.ignorar.useMutation({
    onSuccess: () => {
      utils.conciliacao.invalidate();
      toast.success('Linha marcada como ignorada');
    },
    onError: (err) => toast.error(err.message || 'Erro ao ignorar'),
  });
  
  // Transform data
  const linhas: LinhaExtrato[] = useMemo(() => {
    if (!pendentesData) return [];
    return pendentesData.map((item: any) => ({
      id: item.linha.id,
      data: item.linha.dataMovimento,
      descricao: item.linha.descricaoOriginal,
      valor: Number(item.linha.valor),
      tipo: item.linha.tipo as 'credito' | 'debito',
      status: item.linha.status as StatusLinha,
    }));
  }, [pendentesData]);
  
  const titulos: Titulo[] = useMemo(() => {
    const titulosList = titulosData?.titulos ?? titulosData;
    if (!titulosList || !Array.isArray(titulosList)) return [];
    return titulosList.filter((t: any) => t.status !== 'quitado' && t.status !== 'cancelado').map((t: any) => ({
      id: t.id,
      descricao: t.descricao,
      pessoa: t.pessoaNome,
      valor: Number(t.valorLiquido),
      dataVencimento: t.dataVencimento,
      tipo: t.tipo as 'pagar' | 'receber',
      status: t.status as 'pendente' | 'quitado',
    }));
  }, [titulosData]);
  
  const sugestoes: MatchSugestao[] = useMemo(() => {
    if (!sugestoesData) return [];
    return sugestoesData.map((s: any) => ({
      linha: {
        id: s.linha.id,
        data: s.linha.dataMovimento,
        descricao: s.linha.descricaoOriginal,
        valor: Number(s.linha.valor),
        tipo: s.linha.tipo,
        status: s.linha.status,
      },
      titulo: {
        id: s.titulo.id,
        descricao: s.titulo.descricao,
        pessoa: s.titulo.pessoaNome,
        valor: Number(s.titulo.valorLiquido),
        dataVencimento: s.titulo.dataVencimento,
        tipo: s.titulo.tipo,
      },
      score: s.score,
    }));
  }, [sugestoesData]);

  // Filtered data
  const filteredLinhas = useMemo(() => {
    return linhas.filter(l => {
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return l.descricao.toLowerCase().includes(term) || l.data.includes(term);
      }
      return true;
    });
  }, [linhas, filterStatus, searchTerm]);

  const filteredTitulos = useMemo(() => {
    return titulos.filter(t => t.status === 'pendente');
  }, [titulos]);

  // Stats
  const stats = useMemo(() => {
    if (!statsData) return { total: 0, pendentes: 0, conciliados: 0, ignorados: 0, percent: 0 };
    return {
      total: statsData.total,
      pendentes: statsData.pendentes,
      conciliados: statsData.conciliados,
      ignorados: statsData.ignorados,
      percent: statsData.percentual,
    };
  }, [statsData]);

  // Handlers
  const handleConciliar = (linhaId: string, tituloId: string) => {
    conciliarMutation.mutate({ linhaId, tituloId, criarBaixa: true });
  };

  const handleIgnorar = (linhaId: string) => {
    ignorarMutation.mutate({ linhaId, motivo: 'Ignorado pelo usuário' });
  };

  const handleVincularClick = (linha: LinhaExtrato) => {
    setLinhaParaVincular(linha);
    setVincularDialogOpen(true);
  };

  const handleVincularConfirm = () => {
    if (linhaParaVincular && selectedTitulo) {
      handleConciliar(linhaParaVincular.id, selectedTitulo);
      setVincularDialogOpen(false);
      setLinhaParaVincular(null);
      setSelectedTitulo(null);
    }
  };

  const handleBulkConciliar = () => {
    const sugestoesAltas = sugestoes.filter(s => s.score >= 80 && s.linha.status === 'pendente');
    sugestoesAltas.forEach(s => handleConciliar(s.linha.id, s.titulo.id));
    toast.success(`${sugestoesAltas.length} linhas conciliadas automaticamente!`);
  };

  const toggleLinhaSelection = (id: string) => {
    setSelectedLinhas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pendentes}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.conciliados}</p>
              <p className="text-xs text-muted-foreground">Conciliados</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.ignorados}</p>
              <p className="text-xs text-muted-foreground">Ignorados</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <RefreshCw className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.percent}%</p>
              <p className="text-xs text-muted-foreground">Progresso</p>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Suggestions */}
      {showSugestoes && sugestoes.filter(s => s.linha.status === 'pendente').length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Sugestões Automáticas
                <Badge variant="secondary" className="ml-2">{sugestoes.filter(s => s.linha.status === 'pendente').length}</Badge>
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleBulkConciliar}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Aplicar Alta Confiança
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSugestoes(false)}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {sugestoes.filter(s => s.linha.status === 'pendente').slice(0, 4).map((match) => (
                <MatchCard
                  key={match.linha.id}
                  match={match}
                  onConfirm={() => handleConciliar(match.linha.id, match.titulo.id)}
                  onReject={() => handleIgnorar(match.linha.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Split View */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Left: Extrato Lines */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">Extrato Bancário</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8 w-40"
                  />
                </div>
                <Select value={filterStatus} onValueChange={(v: StatusLinha | 'all') => setFilterStatus(v)}>
                  <SelectTrigger className="h-8 w-32">
                    <Filter className="h-3.5 w-3.5 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="conciliado">Conciliados</SelectItem>
                    <SelectItem value="ignorado">Ignorados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {filteredLinhas.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma linha encontrada</p>
                </div>
              ) : (
                filteredLinhas.map((linha) => {
                  const statusConfig = STATUS_CONFIG[linha.status];
                  const StatusIcon = statusConfig.icon;
                  const isSelected = selectedLinhas.has(linha.id);

                  return (
                    <div
                      key={linha.id}
                      className={cn(
                        'flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer',
                        isSelected && 'bg-primary/5'
                      )}
                      onClick={() => linha.status === 'pendente' && handleVincularClick(linha)}
                    >
                      {linha.status === 'pendente' && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleLinhaSelection(linha.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{linha.data}</span>
                          <Badge variant="outline" className={cn('text-[10px]', statusConfig.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-sm truncate mt-0.5">{linha.descricao}</p>
                      </div>

                      <p className={cn(
                        'font-mono font-medium text-sm shrink-0',
                        linha.tipo === 'credito' ? 'text-emerald-600' : 'text-rose-600'
                      )}>
                        {linha.tipo === 'credito' ? '+' : '-'}R$ {linha.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>

                      {linha.status === 'pendente' && (
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleVincularClick(linha); }}>
                          <Link2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Titles */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Títulos Pendentes</CardTitle>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Novo Título
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {filteredTitulos.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Todos os títulos estão quitados</p>
                </div>
              ) : (
                filteredTitulos.map((titulo) => (
                  <div
                    key={titulo.id}
                    className={cn(
                      'flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer',
                      selectedTitulo === titulo.id && 'bg-primary/5 ring-1 ring-primary/20'
                    )}
                    onClick={() => setSelectedTitulo(titulo.id === selectedTitulo ? null : titulo.id)}
                  >
                    <div className={cn(
                      'w-1 h-10 rounded-full',
                      titulo.tipo === 'receber' ? 'bg-emerald-500' : 'bg-rose-500'
                    )} />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{titulo.descricao}</p>
                      {titulo.pessoa && (
                        <p className="text-xs text-muted-foreground truncate">{titulo.pessoa}</p>
                      )}
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        Venc: {new Date(titulo.dataVencimento).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-[10px] mb-1">
                        {titulo.tipo === 'receber' ? 'A Receber' : 'A Pagar'}
                      </Badge>
                      <p className={cn(
                        'font-mono font-medium text-sm',
                        titulo.tipo === 'receber' ? 'text-emerald-600' : 'text-rose-600'
                      )}>
                        R$ {titulo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vincular Dialog */}
      <Dialog open={vincularDialogOpen} onOpenChange={setVincularDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular Linha a Título</DialogTitle>
          </DialogHeader>
          
          {linhaParaVincular && (
            <div className="space-y-4">
              {/* Linha Info */}
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Linha do Extrato</p>
                <p className="font-medium">{linhaParaVincular.descricao}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground font-mono">{linhaParaVincular.data}</span>
                  <span className={cn(
                    'font-mono font-bold',
                    linhaParaVincular.tipo === 'credito' ? 'text-emerald-600' : 'text-rose-600'
                  )}>
                    {linhaParaVincular.tipo === 'credito' ? '+' : '-'}R$ {linhaParaVincular.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <ArrowRight className="h-4 w-4" />
                <span className="text-sm">Selecione o título correspondente:</span>
              </div>

              {/* Títulos List */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredTitulos.map((titulo) => (
                  <div
                    key={titulo.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                      selectedTitulo === titulo.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    )}
                    onClick={() => setSelectedTitulo(titulo.id)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{titulo.descricao}</p>
                      {titulo.pessoa && <p className="text-xs text-muted-foreground">{titulo.pessoa}</p>}
                    </div>
                    <p className="font-mono text-sm">
                      R$ {titulo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {selectedTitulo === titulo.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleIgnorar(linhaParaVincular.id)}>
                  <XCircle className="h-4 w-4 mr-1" />
                  Ignorar Linha
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Plus className="h-4 w-4 mr-1" />
                  Criar Título
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setVincularDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleVincularConfirm} disabled={!selectedTitulo} className="bg-emerald-600 hover:bg-emerald-700">
              <Link2 className="h-4 w-4 mr-1" />
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

