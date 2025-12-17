import { FileText, User, Calendar, Clock, RefreshCw, Plus, Edit2, Trash2, Lock, Unlock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const { data: logs = [], isLoading } = trpc.audit.list.useQuery({ limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Auditoria</h1>
        <p className="text-muted-foreground">Registro de todas as ações do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Atividades
          </CardTitle>
          <CardDescription>Últimas 100 ações registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum registro encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => {
                  const action = actionLabels[log.action] || { label: log.action, icon: FileText, color: 'bg-gray-100 text-gray-700' };
                  const ActionIcon = action.icon;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-3 w-3 text-gray-500" />
                          </div>
                          <span className="text-sm">{log.user?.name || `Usuário #${log.userId}`}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${action.color} gap-1`}>
                          <ActionIcon className="h-3 w-3" />
                          {action.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{entityLabels[log.entityType] || log.entityType}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">#{log.entityId}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{logs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Criações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{logs.filter((l: any) => l.action === 'create').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atualizações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{logs.filter((l: any) => l.action === 'update').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Exclusões</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{logs.filter((l: any) => l.action === 'delete').length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

