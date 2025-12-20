import { useState } from 'react';
import { FileSearch, RefreshCw, Download, Filter, X, User, Clock, Plus, Edit2, Trash2, Lock, Unlock, Check, XCircle, Eye, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ResponsiveTable } from '@/components/ui/table';
import { Pagination } from '@/components/ui/page-header';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const acaoConfig: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  criar: { label: 'Criação', icon: Plus, color: 'bg-green-100 text-green-700' },
  atualizar: { label: 'Atualização', icon: Edit2, color: 'bg-blue-100 text-blue-700' },
  excluir: { label: 'Exclusão', icon: Trash2, color: 'bg-red-100 text-red-700' },
  visualizar: { label: 'Visualização', icon: Eye, color: 'bg-slate-100 text-slate-700' },
  exportar: { label: 'Exportação', icon: Download, color: 'bg-purple-100 text-purple-700' },
  fechar: { label: 'Fechamento', icon: Lock, color: 'bg-amber-100 text-amber-700' },
  reabrir: { label: 'Reabertura', icon: Unlock, color: 'bg-orange-100 text-orange-700' },
  aprovar: { label: 'Aprovação', icon: Check, color: 'bg-emerald-100 text-emerald-700' },
  rejeitar: { label: 'Rejeição', icon: XCircle, color: 'bg-rose-100 text-rose-700' },
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

function DiffViewer({ antes, depois }: { antes: any; depois: any }) {
  const [expanded, setExpanded] = useState(false);
  
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
    return <p className="text-sm text-muted-foreground">Sem alterações detectadas</p>;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {changes.length} campo(s) alterado(s)
      </button>
      {expanded && (
        <div className="space-y-2 pl-4 border-l-2 border-muted">
          {changes.map(({ key, before, after }) => (
            <div key={key} className="text-sm">
              <span className="font-medium">{key}</span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="p-2 rounded bg-red-50 border border-red-200">
                  <span className="text-xs text-red-600 font-medium">Antes:</span>
                  <pre className="text-xs mt-1 whitespace-pre-wrap break-all">{renderValue(before)}</pre>
                </div>
                <div className="p-2 rounded bg-green-50 border border-green-200">
                  <span className="text-xs text-green-600 font-medium">Depois:</span>
                  <pre className="text-xs mt-1 whitespace-pre-wrap break-all">{renderValue(after)}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
  const [showDetailDialog, setShowDetailDialog] = useState(false);

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
  const { data: stats } = trpc.auditoria.stats.useQuery({
    dataInicio: filtros.dataInicio || undefined,
    dataFim: filtros.dataFim || undefined,
  });

  const eventos = data?.eventos || [];
  const totalPages = data?.pages || 1;

  const handleOpenDetail = (evento: any) => {
    setSelectedEvento(evento);
    setShowDetailDialog(true);
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
    // Usar datas padrão se não definidas
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Trilha de Auditoria
          </h2>
          <p className="text-sm text-muted-foreground">Registro imutável de todas as operações</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={eventos.length === 0 || exportMutation.isPending}>
            <Download className="h-4 w-4 mr-2" />
            {exportMutation.isPending ? 'Exportando...' : 'Exportar CSV'}
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-bold">{data?.total || 0}</div>
          <div className="text-xs text-muted-foreground">Total de eventos</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">
            {String(stats?.porAcao?.find((a: any) => a.acao === 'criar')?.total || 0)}
          </div>
          <div className="text-xs text-muted-foreground">Criações</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">
            {String(stats?.porAcao?.find((a: any) => a.acao === 'atualizar')?.total || 0)}
          </div>
          <div className="text-xs text-muted-foreground">Atualizações</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">
            {String(stats?.porAcao?.find((a: any) => a.acao === 'excluir')?.total || 0)}
          </div>
          <div className="text-xs text-muted-foreground">Exclusões</div>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Período início</Label>
              <Input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => { setFiltros({ ...filtros, dataInicio: e.target.value }); setPage(1); }}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Período fim</Label>
              <Input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => { setFiltros({ ...filtros, dataFim: e.target.value }); setPage(1); }}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Entidade</Label>
              <Select value={filtros.entidadeTipo} onValueChange={(v) => { setFiltros({ ...filtros, entidadeTipo: v }); setPage(1); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {entidadeTipos?.map((t: string) => (
                    <SelectItem key={t} value={t}>{entidadeLabels[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Usuário</Label>
              <Select value={filtros.usuarioId} onValueChange={(v) => { setFiltros({ ...filtros, usuarioId: v }); setPage(1); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {usuariosComEventos?.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ação</Label>
              <Select value={filtros.acao} onValueChange={(v) => { setFiltros({ ...filtros, acao: v }); setPage(1); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {Object.entries(acaoConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3 flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
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
            <ResponsiveTable stickyHeader density="normal">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventos.map((evento: any) => {
                    const acao = acaoConfig[evento.acao] || { label: evento.acao, icon: Eye, color: 'bg-gray-100 text-gray-700' };
                    const AcaoIcon = acao.icon;
                    return (
                      <TableRow key={evento.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenDetail(evento)}>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDateTime(evento.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                              <User className="h-3 w-3 text-slate-400" />
                            </div>
                            <span className="text-sm">{evento.usuario_nome || 'Sistema'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(acao.color, 'gap-1')}>
                            <AcaoIcon className="h-3 w-3" />
                            {acao.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {entidadeLabels[evento.entidade_tipo] || evento.entidade_tipo}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {evento.entidade_id.slice(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ResponsiveTable>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="p-4 border-t">
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

      {/* Dialog: Detalhe do Evento */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              Detalhes do Evento
            </DialogTitle>
            <DialogDescription>
              Registro completo da operação
            </DialogDescription>
          </DialogHeader>
          {selectedEvento && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Data/Hora</Label>
                  <p className="font-medium">{formatDateTime(selectedEvento.created_at)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Usuário</Label>
                  <p className="font-medium">{selectedEvento.usuario_nome || 'Sistema'}</p>
                  {selectedEvento.usuario_email && (
                    <p className="text-xs text-muted-foreground">{selectedEvento.usuario_email}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ação</Label>
                  <Badge className={cn(acaoConfig[selectedEvento.acao]?.color || 'bg-gray-100')}>
                    {acaoConfig[selectedEvento.acao]?.label || selectedEvento.acao}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Entidade</Label>
                  <p className="font-medium">{entidadeLabels[selectedEvento.entidade_tipo] || selectedEvento.entidade_tipo}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">ID da Entidade</Label>
                  <code className="text-sm bg-muted px-2 py-0.5 rounded">{selectedEvento.entidade_id}</code>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">IP de Origem</Label>
                  <p className="text-sm">{selectedEvento.ip_origem || '(não registrado)'}</p>
                </div>
              </div>

              {selectedEvento.user_agent && (
                <div>
                  <Label className="text-xs text-muted-foreground">User Agent</Label>
                  <p className="text-xs text-muted-foreground mt-1 break-all">{selectedEvento.user_agent}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <Label className="text-sm font-medium">Alterações (Diff)</Label>
                <div className="mt-2">
                  <DiffViewer 
                    antes={selectedEvento.dados_anteriores} 
                    depois={selectedEvento.dados_novos} 
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

