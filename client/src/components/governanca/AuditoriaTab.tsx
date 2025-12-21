import { useState } from 'react';
import { FileSearch, RefreshCw, Download, X, User, Clock, Plus, Edit2, Trash2, Lock, Unlock, Check, XCircle, Eye, ChevronRight, ChevronDown, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/page-header';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const acaoConfig: Record<string, { label: string; icon: typeof Plus; color: string; bgColor: string }> = {
  criar: { label: 'Criação', icon: Plus, color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  atualizar: { label: 'Atualização', icon: Edit2, color: 'text-blue-700', bgColor: 'bg-blue-100' },
  excluir: { label: 'Exclusão', icon: Trash2, color: 'text-rose-700', bgColor: 'bg-rose-100' },
  visualizar: { label: 'Visualização', icon: Eye, color: 'text-slate-700', bgColor: 'bg-slate-100' },
  exportar: { label: 'Exportação', icon: Download, color: 'text-purple-700', bgColor: 'bg-purple-100' },
  fechar: { label: 'Fechamento', icon: Lock, color: 'text-amber-700', bgColor: 'bg-amber-100' },
  reabrir: { label: 'Reabertura', icon: Unlock, color: 'text-orange-700', bgColor: 'bg-orange-100' },
  aprovar: { label: 'Aprovação', icon: Check, color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  rejeitar: { label: 'Rejeição', icon: XCircle, color: 'text-rose-700', bgColor: 'bg-rose-100' },
};

const entidadeLabels: Record<string, string> = {
  pessoa: 'Pessoa',
  titulo: 'Título',
  lancamento_contabil: 'Lançamento',
  periodo_contabil: 'Período',
  conta_financeira: 'Conta Financeira',
  papel: 'Papel',
  usuario: 'Usuário',
  usuario_papel: 'Papel de Usuário',
  papel_permissao: 'Permissão de Papel',
  aprovacao: 'Aprovação',
  configuracao_sistema: 'Configuração',
};

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Diff Viewer
function DiffViewer({ antes, depois }: { antes: any; depois: any }) {
  const [expanded, setExpanded] = useState(true);
  
  const renderValue = (val: any): string => {
    if (val === null || val === undefined) return '(vazio)';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  const allKeys = new Set([
    ...Object.keys(antes || {}),
    ...Object.keys(depois || {}),
  ]);

  const changes = Array.from(allKeys).map(key => ({
    key,
    before: antes?.[key],
    after: depois?.[key],
    changed: JSON.stringify(antes?.[key]) !== JSON.stringify(depois?.[key]),
  })).filter(c => c.changed);

  if (changes.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Sem alterações detectadas</p>;
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {changes.length} campo(s) alterado(s)
      </button>
      {expanded && (
        <div className="space-y-3">
          {changes.map(({ key, before, after }) => (
            <div key={key} className="rounded-lg border overflow-hidden">
              <div className="px-3 py-2 bg-slate-100 border-b">
                <span className="font-medium text-sm">{key}</span>
              </div>
              <div className="grid grid-cols-2 divide-x">
                <div className="p-3 bg-rose-50">
                  <span className="text-xs text-rose-600 font-medium block mb-1">Antes</span>
                  <pre className="text-xs whitespace-pre-wrap break-all text-rose-800">{renderValue(before)}</pre>
                </div>
                <div className="p-3 bg-emerald-50">
                  <span className="text-xs text-emerald-600 font-medium block mb-1">Depois</span>
                  <pre className="text-xs whitespace-pre-wrap break-all text-emerald-800">{renderValue(after)}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Timeline Item
function TimelineItem({ 
  evento, 
  isSelected, 
  onClick 
}: { 
  evento: any; 
  isSelected: boolean; 
  onClick: () => void; 
}) {
  const acao = acaoConfig[evento.acao] || { label: evento.acao, icon: Eye, color: 'text-gray-700', bgColor: 'bg-gray-100' };
  const AcaoIcon = acao.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex gap-4 p-3 rounded-lg text-left transition-all',
        'hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1',
        isSelected && 'bg-indigo-100 ring-2 ring-indigo-500'
      )}
    >
      {/* Timeline dot */}
      <div className="flex flex-col items-center shrink-0">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', acao.bgColor)}>
          <AcaoIcon className={cn('h-5 w-5', acao.color)} />
        </div>
        <div className="w-0.5 flex-1 bg-slate-200 mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn(acao.bgColor, acao.color, 'text-xs')}>{acao.label}</Badge>
          <span className="text-xs text-muted-foreground">{entidadeLabels[evento.entidade_tipo] || evento.entidade_tipo}</span>
        </div>
        <p className="font-medium text-sm mt-1 truncate">
          ID: {evento.entidade_id.slice(0, 8)}...
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{evento.usuario_nome || 'Sistema'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(evento.created_at)}</span>
          </div>
        </div>
      </div>

      <ChevronRight className={cn(
        'h-4 w-4 text-slate-300 shrink-0 self-center transition-transform',
        isSelected && 'text-indigo-500 rotate-90'
      )} />
    </button>
  );
}

// Event Detail Panel
function EventoDetail({ evento }: { evento: any }) {
  const acao = acaoConfig[evento.acao] || { label: evento.acao, icon: Eye, color: 'text-gray-700', bgColor: 'bg-gray-100' };
  const AcaoIcon = acao.icon;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={cn('p-6 border-b', acao.bgColor)}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/60 flex items-center justify-center shrink-0">
            <AcaoIcon className={cn('h-7 w-7', acao.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <Badge className={cn(acao.bgColor, acao.color, 'border-0 mb-2')}>{acao.label}</Badge>
            <h2 className="text-lg font-bold">
              {entidadeLabels[evento.entidade_tipo] || evento.entidade_tipo}
            </h2>
            <code className="text-sm bg-white/60 px-2 py-0.5 rounded mt-1 inline-block">
              {evento.entidade_id}
            </code>
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
              <span className="text-xs">Usuário</span>
            </div>
            <p className="font-medium">{evento.usuario_nome || 'Sistema'}</p>
            {evento.usuario_email && (
              <p className="text-xs text-muted-foreground">{evento.usuario_email}</p>
            )}
          </div>
          <div className="p-4 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Data/Hora</span>
            </div>
            <p className="font-medium">{formatDateTime(evento.created_at)}</p>
          </div>
        </div>

        {/* IP e User Agent */}
        <div className="p-4 rounded-lg bg-slate-50 space-y-2">
          <div>
            <span className="text-xs text-muted-foreground">IP de Origem</span>
            <p className="text-sm font-mono">{evento.ip_origem || '(não registrado)'}</p>
          </div>
          {evento.user_agent && (
            <div>
              <span className="text-xs text-muted-foreground">User Agent</span>
              <p className="text-xs font-mono break-all text-muted-foreground">{evento.user_agent}</p>
            </div>
          )}
        </div>

        {/* Diff */}
        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Edit2 className="h-4 w-4 text-indigo-500" />
            Alterações (Diff)
          </h3>
          <DiffViewer 
            antes={evento.dados_anteriores} 
            depois={evento.dados_novos} 
          />
        </div>
      </div>
    </div>
  );
}

// Empty Selection
function EmptySelection() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-6">
        <FileSearch className="h-12 w-12 text-slate-400" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Selecione um evento</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Clique em um registro na timeline para ver os detalhes completos e as alterações realizadas.
      </p>
    </div>
  );
}

// Quick Stats
function QuickStats({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <div className="p-2 rounded-lg bg-muted/50 text-center">
        <p className="text-lg font-bold">{stats.total}</p>
        <p className="text-[10px] text-muted-foreground">Total</p>
      </div>
      <div className="p-2 rounded-lg bg-emerald-50 text-center">
        <p className="text-lg font-bold text-emerald-600">{stats.criacoes}</p>
        <p className="text-[10px] text-muted-foreground">Criações</p>
      </div>
      <div className="p-2 rounded-lg bg-blue-50 text-center">
        <p className="text-lg font-bold text-blue-600">{stats.atualizacoes}</p>
        <p className="text-[10px] text-muted-foreground">Atualizações</p>
      </div>
      <div className="p-2 rounded-lg bg-rose-50 text-center">
        <p className="text-lg font-bold text-rose-600">{stats.exclusoes}</p>
        <p className="text-[10px] text-muted-foreground">Exclusões</p>
      </div>
    </div>
  );
}

export function AuditoriaTab() {
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState({
    entidadeTipo: '',
    usuarioId: '',
    acao: '',
    dataInicio: '',
    dataFim: '',
  });
  const [selectedEvento, setSelectedEvento] = useState<any>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const { data: entidadeTipos } = trpc.auditoria.entidadeTipos.useQuery();
  const { data: usuariosComEventos } = trpc.auditoria.usuariosComEventos.useQuery();
  const { data, isLoading, refetch } = trpc.auditoria.list.useQuery({
    entidadeTipo: filtros.entidadeTipo && filtros.entidadeTipo !== '__all__' ? filtros.entidadeTipo : undefined,
    usuarioId: filtros.usuarioId && filtros.usuarioId !== '__all__' ? filtros.usuarioId : undefined,
    acao: filtros.acao && filtros.acao !== '__all__' ? filtros.acao as any : undefined,
    dataInicio: filtros.dataInicio || undefined,
    dataFim: filtros.dataFim || undefined,
    page,
    limit: 30,
  });
  const { data: statsData } = trpc.auditoria.stats.useQuery({
    dataInicio: filtros.dataInicio || undefined,
    dataFim: filtros.dataFim || undefined,
  });

  const eventos = data?.eventos || [];
  const totalPages = data?.pages || 1;

  const stats = {
    total: data?.total || 0,
    criacoes: Number(statsData?.porAcao?.find((a: any) => a.acao === 'criar')?.total || 0),
    atualizacoes: Number(statsData?.porAcao?.find((a: any) => a.acao === 'atualizar')?.total || 0),
    exclusoes: Number(statsData?.porAcao?.find((a: any) => a.acao === 'excluir')?.total || 0),
  };

  const exportMutation = trpc.auditoria.exportar.useMutation({
    onSuccess: (result) => {
      if (result.formato === 'csv') {
        const blob = new Blob([result.dados as string], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auditoria-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    onError: (e) => console.error('Erro ao exportar:', e),
  });

  const handleExportCSV = () => {
    const dataInicio = filtros.dataInicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dataFim = filtros.dataFim || new Date().toISOString().split('T')[0];
    
    exportMutation.mutate({
      formato: 'csv',
      dataInicio,
      dataFim,
      entidadeTipo: filtros.entidadeTipo || undefined,
      usuarioId: filtros.usuarioId || undefined,
      acao: filtros.acao as any || undefined,
      limit: 5000,
    });
  };

  const handleClearFilters = () => {
    setFiltros({ entidadeTipo: '', usuarioId: '', acao: '', dataInicio: '', dataFim: '' });
    setPage(1);
  };

  const hasFilters = Object.values(filtros).some(v => v);

  // Agrupar eventos por data
  const groupedEventos: { date: string; eventos: any[] }[] = [];
  eventos.forEach((evento: any) => {
    const date = formatDate(evento.created_at);
    const existing = groupedEventos.find(g => g.date === date);
    if (existing) {
      existing.eventos.push(evento);
    } else {
      groupedEventos.push({ date, eventos: [evento] });
    }
  });

  const handleSelectEvento = (evento: any) => {
    setSelectedEvento(evento);
    if (window.innerWidth < 1024) {
      setShowMobileDetail(true);
    }
  };

  const handleCloseMobileDetail = () => {
    setShowMobileDetail(false);
    setSelectedEvento(null);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4">
      {/* Timeline (Master) */}
      <Card className="lg:w-[420px] xl:w-[480px] flex flex-col shrink-0">
        <CardHeader className="py-3 px-4 shrink-0 border-b space-y-3">
          {/* Header com ações */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-indigo-500" />
              Trilha de Auditoria
            </h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportCSV} 
                disabled={eventos.length === 0 || exportMutation.isPending}
              >
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <QuickStats stats={stats} />

          {/* Filtros */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Período início</Label>
              <Input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => { setFiltros({ ...filtros, dataInicio: e.target.value }); setPage(1); }}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Período fim</Label>
              <Input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => { setFiltros({ ...filtros, dataFim: e.target.value }); setPage(1); }}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={filtros.entidadeTipo} onValueChange={(v) => { setFiltros({ ...filtros, entidadeTipo: v }); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {entidadeTipos?.map((t: string) => (
                  <SelectItem key={t} value={t}>{entidadeLabels[t] || t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtros.acao} onValueChange={(v) => { setFiltros({ ...filtros, acao: v }); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {Object.entries(acaoConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="w-full">
              <X className="h-4 w-4 mr-1" />
              Limpar filtros
            </Button>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : eventos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSearch className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum evento encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedEventos.map((group) => (
                <div key={group.date}>
                  <div className="sticky top-0 bg-white/90 backdrop-blur-sm py-2 px-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      {group.date}
                    </Badge>
                  </div>
                  <div className="space-y-0">
                    {group.eventos.map((evento: any) => (
                      <TimelineItem
                        key={evento.id}
                        evento={evento}
                        isSelected={selectedEvento?.id === evento.id}
                        onClick={() => handleSelectEvento(evento)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-3 border-t shrink-0">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={data?.total || 0}
              itemsShown={eventos.length}
              onPageChange={setPage}
              itemLabel="eventos"
            />
          </div>
        )}
      </Card>

      {/* Detalhes (Detail) - Desktop */}
      <Card className="hidden lg:flex flex-1 overflow-hidden">
        {selectedEvento ? (
          <EventoDetail evento={selectedEvento} />
        ) : (
          <EmptySelection />
        )}
      </Card>

      {/* Mobile Detail Overlay */}
      {showMobileDetail && selectedEvento && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background">
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b">
              <Button variant="ghost" size="icon" onClick={handleCloseMobileDetail}>
                <X className="h-5 w-5" />
              </Button>
              <span className="font-medium">Detalhes do Evento</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <EventoDetail evento={selectedEvento} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
