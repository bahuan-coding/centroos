import { useState, useMemo } from 'react';
import { 
  Link2, Building2, Search, Clock, CheckCircle2, XCircle, 
  Sparkles, ChevronRight, ChevronDown, Plus, Loader2, X, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader, Pagination } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

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
}

// Quick Stats clicáveis como filtros
function QuickStats({ 
  stats, 
  filterStatus, 
  setFilterStatus 
}: { 
  stats: { pendentes: number; conciliados: number; ignorados: number };
  filterStatus: StatusLinha | 'all';
  setFilterStatus: (v: StatusLinha | 'all') => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <button 
        onClick={() => setFilterStatus(filterStatus === 'pendente' ? 'all' : 'pendente')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filterStatus === 'pendente' 
            ? 'bg-amber-100 ring-2 ring-amber-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <Clock className="h-4 w-4 mx-auto text-amber-600" />
        <p className="text-lg font-bold text-amber-600">{stats.pendentes}</p>
        <p className="text-[10px] text-muted-foreground">Pendentes</p>
      </button>
      
      <button 
        onClick={() => setFilterStatus(filterStatus === 'conciliado' ? 'all' : 'conciliado')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filterStatus === 'conciliado' 
            ? 'bg-emerald-100 ring-2 ring-emerald-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <CheckCircle2 className="h-4 w-4 mx-auto text-emerald-600" />
        <p className="text-lg font-bold text-emerald-600">{stats.conciliados}</p>
        <p className="text-[10px] text-muted-foreground">Conciliados</p>
      </button>
      
      <button 
        onClick={() => setFilterStatus(filterStatus === 'ignorado' ? 'all' : 'ignorado')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filterStatus === 'ignorado' 
            ? 'bg-slate-200 ring-2 ring-slate-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <XCircle className="h-4 w-4 mx-auto text-slate-500" />
        <p className="text-lg font-bold text-slate-600">{stats.ignorados}</p>
        <p className="text-[10px] text-muted-foreground">Ignorados</p>
      </button>
    </div>
  );
}

// Lista de linhas do extrato (master)
function LinhaExtratoList({ 
  linhas, 
  selectedId, 
  onSelect,
  isLoading 
}: { 
  linhas: LinhaExtrato[]; 
  selectedId: string | null;
  onSelect: (linha: LinhaExtrato) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
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

  if (linhas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-3">
          <Search className="h-8 w-8 opacity-40" />
        </div>
        <p className="text-sm font-medium">Nenhuma linha encontrada</p>
        <p className="text-xs mt-1">Ajuste os filtros ou importe um extrato</p>
      </div>
    );
  }

  const statusConfig = {
    pendente: { icon: Clock, color: 'text-amber-600 bg-amber-100' },
    conciliado: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100' },
    ignorado: { icon: XCircle, color: 'text-slate-500 bg-slate-100' },
  };

  return (
    <div className="space-y-1">
      {linhas.map((linha) => {
        const config = statusConfig[linha.status];
        const StatusIcon = config.icon;
        
        return (
          <button
            key={linha.id}
            onClick={() => onSelect(linha)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
              'hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
              selectedId === linha.id && 'bg-blue-100 ring-2 ring-blue-500'
            )}
          >
            <div className={cn('p-2 rounded-lg', config.color)}>
              <StatusIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{linha.descricao}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground font-mono">{linha.data}</span>
                <Badge 
                  variant="secondary" 
                  className={cn('text-[10px] px-1.5 py-0', linha.tipo === 'credito' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}
                >
                  {linha.tipo === 'credito' ? 'Crédito' : 'Débito'}
                </Badge>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={cn(
                'font-mono font-bold text-sm',
                linha.tipo === 'credito' ? 'text-emerald-600' : 'text-rose-600'
              )}>
                {linha.tipo === 'credito' ? '+' : '-'}R$ {linha.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <ChevronRight className={cn('h-4 w-4 text-slate-300 shrink-0 transition-transform', 
              selectedId === linha.id && 'text-blue-500 rotate-90')} />
          </button>
        );
      })}
    </div>
  );
}

// Estado vazio quando nenhuma linha selecionada
function EmptySelection({ onImportExtrato }: { onImportExtrato: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-6">
        <Link2 className="h-12 w-12 text-blue-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Selecione uma linha</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Clique em uma linha do extrato ao lado para vincular a um título, ignorar ou criar um novo lançamento.
      </p>
      <Button onClick={onImportExtrato} variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        Importar Extrato
      </Button>
    </div>
  );
}

// Painel de vinculação (detail)
function VinculacaoPanel({ 
  linha, 
  titulos,
  onVincular,
  onIgnorar,
  onClose,
  isVinculando
}: { 
  linha: LinhaExtrato;
  titulos: Titulo[];
  onVincular: (tituloId: string) => void;
  onIgnorar: () => void;
  onClose: () => void;
  isVinculando: boolean;
}) {
  const [selectedTituloId, setSelectedTituloId] = useState<string | null>(null);
  const [searchTitulo, setSearchTitulo] = useState('');

  const filteredTitulos = useMemo(() => {
    const tipoCompativel = linha.tipo === 'credito' ? 'receber' : 'pagar';
    return titulos.filter(t => {
      if (t.tipo !== tipoCompativel) return false;
      if (searchTitulo) {
        const term = searchTitulo.toLowerCase();
        return t.descricao.toLowerCase().includes(term) || t.pessoa?.toLowerCase().includes(term);
      }
      return true;
    });
  }, [titulos, linha.tipo, searchTitulo]);

  const handleVincular = () => {
    if (selectedTituloId) {
      onVincular(selectedTituloId);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header da linha */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Linha do Extrato</p>
            <p className="font-semibold text-lg">{linha.descricao}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-muted-foreground font-mono flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {linha.data}
              </span>
              <span className={cn(
                'font-mono font-bold text-lg',
                linha.tipo === 'credito' ? 'text-emerald-600' : 'text-rose-600'
              )}>
                {linha.tipo === 'credito' ? '+' : '-'}R$ {linha.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Ações rápidas */}
      {linha.status === 'pendente' && (
        <div className="p-4 border-b flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={onIgnorar}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Ignorar
          </Button>
          <Button 
            size="sm" 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={!selectedTituloId || isVinculando}
            onClick={handleVincular}
          >
            {isVinculando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Link2 className="h-4 w-4 mr-1" />}
            Vincular
          </Button>
        </div>
      )}

      {/* Busca de títulos */}
      {linha.status === 'pendente' && (
        <div className="p-4 border-b">
          <p className="text-sm font-medium mb-2">Selecione um título para vincular:</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar título por descrição ou pessoa..."
              value={searchTitulo}
              onChange={(e) => setSearchTitulo(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>
      )}

      {/* Lista de títulos */}
      <div className="flex-1 overflow-y-auto p-2">
        {linha.status !== 'pendente' ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
            <p className="font-medium">Linha já processada</p>
            <p className="text-sm mt-1">Status: {linha.status === 'conciliado' ? 'Conciliada' : 'Ignorada'}</p>
          </div>
        ) : filteredTitulos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Nenhum título compatível encontrado</p>
            <Button variant="outline" size="sm" className="mt-3">
              <Plus className="h-4 w-4 mr-1" />
              Criar Novo Título
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTitulos.map((titulo) => (
              <button
                key={titulo.id}
                onClick={() => setSelectedTituloId(titulo.id === selectedTituloId ? null : titulo.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all border',
                  selectedTituloId === titulo.id
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-transparent hover:bg-muted/50'
                )}
              >
                <div className={cn(
                  'w-1 h-10 rounded-full shrink-0',
                  titulo.tipo === 'receber' ? 'bg-emerald-500' : 'bg-rose-500'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{titulo.descricao}</p>
                  {titulo.pessoa && (
                    <p className="text-xs text-muted-foreground truncate">{titulo.pessoa}</p>
                  )}
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    Venc: {new Date(titulo.dataVencimento).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn(
                    'font-mono font-bold text-sm',
                    titulo.tipo === 'receber' ? 'text-emerald-600' : 'text-rose-600'
                  )}>
                    R$ {titulo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {selectedTituloId === titulo.id && (
                    <CheckCircle2 className="h-4 w-4 text-blue-500 ml-auto mt-1" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Componente Principal
export default function Conciliacao() {
  const [selectedContaId, setSelectedContaId] = useState<string>('');
  const [selectedLinhaId, setSelectedLinhaId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<StatusLinha | 'all'>('pendente');
  const [search, setSearch] = useState('');
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: contasData, isLoading: loadingContas } = trpc.contasFinanceiras.list.useQuery();
  const { data: pendentesData, isLoading: loadingLinhas } = trpc.conciliacao.pendentes.useQuery(
    { contaId: selectedContaId || undefined },
    { enabled: !!selectedContaId }
  );
  const { data: statsData } = trpc.conciliacao.stats.useQuery(
    { contaId: selectedContaId || undefined },
    { enabled: !!selectedContaId }
  );
  const { data: sugestoesData } = trpc.conciliacao.sugestoes.useQuery(
    { contaId: selectedContaId || undefined },
    { enabled: !!selectedContaId }
  );
  const { data: titulosData } = trpc.titulos.list.useQuery({});

  // Mutations
  const conciliarMutation = trpc.conciliacao.conciliar.useMutation({
    onSuccess: () => {
      utils.conciliacao.invalidate();
      utils.titulos.invalidate();
      toast.success('Linha conciliada com sucesso!');
      setSelectedLinhaId(null);
      setShowMobileDetail(false);
    },
    onError: (err) => toast.error(err.message || 'Erro ao conciliar'),
  });

  const ignorarMutation = trpc.conciliacao.ignorar.useMutation({
    onSuccess: () => {
      utils.conciliacao.invalidate();
      toast.success('Linha marcada como ignorada');
      setSelectedLinhaId(null);
      setShowMobileDetail(false);
    },
    onError: (err) => toast.error(err.message || 'Erro ao ignorar'),
  });

  // Transform data
  const contas = useMemo(() => {
    if (!contasData) return [];
    return contasData.map((c: any) => ({
      id: c.id,
      nome: c.nome,
      bancoNome: c.bancoNome,
    }));
  }, [contasData]);

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
    }));
  }, [titulosData]);

  const sugestoesCount = sugestoesData?.filter((s: any) => s.linha.status === 'pendente').length || 0;

  // Filtered linhas
  const filteredLinhas = useMemo(() => {
    return linhas.filter(l => {
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      if (search) {
        const term = search.toLowerCase();
        return l.descricao.toLowerCase().includes(term) || l.data.includes(term);
      }
      return true;
    });
  }, [linhas, filterStatus, search]);

  const stats = useMemo(() => ({
    pendentes: statsData?.pendentes || 0,
    conciliados: statsData?.conciliados || 0,
    ignorados: statsData?.ignorados || 0,
  }), [statsData]);

  const selectedLinha = linhas.find(l => l.id === selectedLinhaId);

  // Set default conta when data loads
  if (!selectedContaId && contas.length > 0) {
    setSelectedContaId(contas[0].id);
  }

  const handleSelectLinha = (linha: LinhaExtrato) => {
    setSelectedLinhaId(linha.id);
    if (window.innerWidth < 1024) {
      setShowMobileDetail(true);
    }
  };

  const handleVincular = (tituloId: string) => {
    if (selectedLinhaId) {
      conciliarMutation.mutate({ linhaId: selectedLinhaId, tituloId, criarBaixa: true });
    }
  };

  const handleIgnorar = () => {
    if (selectedLinhaId) {
      ignorarMutation.mutate({ linhaId: selectedLinhaId, motivo: 'Ignorado pelo usuário' });
    }
  };

  const handleApplySugestoes = () => {
    const sugestoesAltas = sugestoesData?.filter((s: any) => s.score >= 80 && s.linha.status === 'pendente') || [];
    sugestoesAltas.forEach((s: any) => {
      conciliarMutation.mutate({ linhaId: s.linha.id, tituloId: s.titulo.id, criarBaixa: true });
    });
    toast.success(`${sugestoesAltas.length} linhas conciliadas automaticamente!`);
  };

  if (loadingContas) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] lg:h-[calc(100vh-theme(spacing.8))] flex flex-col">
      {/* Header com seletor de conta */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0 flex-wrap">
        <PageHeader
          title="Conciliação Bancária"
          description="Vincule movimentos do extrato aos títulos do sistema"
          icon={<Link2 className="h-7 w-7 text-blue-600" />}
        />
        <div className="flex items-center gap-3">
          <Select value={selectedContaId} onValueChange={setSelectedContaId}>
            <SelectTrigger className="w-56">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Selecione uma conta" />
            </SelectTrigger>
            <SelectContent>
              {contas.map((conta: any) => (
                <SelectItem key={conta.id} value={conta.id}>
                  {conta.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Banner de Sugestões IA */}
      {sugestoesCount > 0 && (
        <GlassCard className="mb-4 shrink-0 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3 p-3">
            <Sparkles className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-blue-800 text-sm">{sugestoesCount} sugestões de conciliação automática</span>
              <span className="text-blue-600 text-xs ml-2 hidden sm:inline">Linhas com alta correspondência detectadas</span>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleApplySugestoes}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Aplicar
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Master-Detail Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Lista (Master) */}
        <Card className="lg:col-span-5 xl:col-span-4 flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 shrink-0 border-b">
            <div className="space-y-3">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição ou data..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-9"
                />
                {search && (
                  <button 
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Stats clicáveis */}
              <QuickStats 
                stats={stats} 
                filterStatus={filterStatus} 
                setFilterStatus={setFilterStatus} 
              />
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-2">
            <LinhaExtratoList 
              linhas={filteredLinhas} 
              selectedId={selectedLinhaId} 
              onSelect={handleSelectLinha}
              isLoading={loadingLinhas}
            />
          </CardContent>
        </Card>

        {/* Detalhes (Detail) - Desktop */}
        <Card className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col overflow-hidden">
          {selectedLinha ? (
            <VinculacaoPanel 
              linha={selectedLinha}
              titulos={titulos}
              onVincular={handleVincular}
              onIgnorar={handleIgnorar}
              onClose={() => setSelectedLinhaId(null)}
              isVinculando={conciliarMutation.isPending}
            />
          ) : (
            <EmptySelection onImportExtrato={() => window.location.href = '/import'} />
          )}
        </Card>
      </div>

      {/* Detail Mobile Overlay */}
      {showMobileDetail && selectedLinha && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background">
          <Card className="h-full rounded-none border-0">
            <VinculacaoPanel 
              linha={selectedLinha}
              titulos={titulos}
              onVincular={handleVincular}
              onIgnorar={handleIgnorar}
              onClose={() => {
                setShowMobileDetail(false);
                setSelectedLinhaId(null);
              }}
              isVinculando={conciliarMutation.isPending}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
