import { FileText, User, Calendar, Clock, RefreshCw, Plus, Edit2, Trash2, Lock, Unlock, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ResponsiveTable, TableCardView } from '@/components/ui/table';
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
import { trpc } from '@/lib/trpc';

const actionLabels: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  create: { label: 'Criação', icon: Plus, color: 'bg-green-100 text-green-700' },
  update: { label: 'Atualização', icon: Edit2, color: 'bg-blue-100 text-blue-700' },
  delete: { label: 'Exclusão', icon: Trash2, color: 'bg-red-100 text-red-700' },
  close: { label: 'Fechamento', icon: Lock, color: 'bg-purple-100 text-purple-700' },
  reopen: { label: 'Reabertura', icon: Unlock, color: 'bg-yellow-100 text-yellow-700' },
};

const entityLabels: Record<string, string> = {
  entry: 'Lançamento',
  account: 'Conta',
  period: 'Período',
  import: 'Importação',
  rule: 'Regra',
  setting: 'Configuração',
};

function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function Audit() {
  const { data: logs = [], isLoading, isError, error, refetch } = trpc.audit.list.useQuery({ limit: 100 });

  if (isError) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Auditoria"
          description="Registro de todas as ações do sistema"
          icon={<Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />}
        />
        <QueryError error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Auditoria"
        description="Registro de todas as ações do sistema"
        icon={<Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />}
      />

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            Histórico de Atividades
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Últimas 100 ações registradas</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm px-4">Nenhum registro encontrado</p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <ResponsiveTable stickyHeader density="normal">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead className="col-priority-low">Entidade</TableHead>
                        <TableHead className="col-priority-low">ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log: any) => {
                        const action = actionLabels[log.action] || { label: log.action, icon: FileText, color: 'bg-gray-100 text-gray-700' };
                        const ActionIcon = action.icon;
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                                  <User className="h-3 w-3 text-gray-500" />
                                </div>
                                <span className="text-sm truncate">{log.user?.name || `Usuário #${log.userId}`}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${action.color} gap-1 text-xs`}>
                                <ActionIcon className="h-3 w-3" />
                                {action.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="col-priority-low text-sm">{entityLabels[log.entityType] || log.entityType}</TableCell>
                            <TableCell className="col-priority-low font-mono text-xs text-muted-foreground">#{log.entityId}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ResponsiveTable>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden px-4">
                <TableCardView
                  data={logs}
                  keyExtractor={(log: any) => log.id}
                  renderCard={(log: any) => {
                    const action = actionLabels[log.action] || { label: log.action, icon: FileText, color: 'bg-gray-100 text-gray-700' };
                    const ActionIcon = action.icon;
                    return (
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                              <User className="h-3 w-3 text-gray-500" />
                            </div>
                            <span className="text-sm font-medium truncate">{log.user?.name || `Usuário #${log.userId}`}</span>
                          </div>
                          <Badge className={`${action.color} gap-1 text-[10px] shrink-0`}>
                            <ActionIcon className="h-3 w-3" />
                            {action.label}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatDateTime(log.createdAt)}</span>
                          <span>{entityLabels[log.entityType] || log.entityType} #{log.entityId}</span>
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total de Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold">{logs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Criações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{logs.filter((l: any) => l.action === 'create').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Atualizações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{logs.filter((l: any) => l.action === 'update').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Exclusões</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold text-red-600">{logs.filter((l: any) => l.action === 'delete').length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

