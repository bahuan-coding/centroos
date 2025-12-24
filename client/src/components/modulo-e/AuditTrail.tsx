import { History, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  createdAt: string;
  user?: { email: string; name?: string } | null;
}

interface AuditTrailProps {
  entityType: string;
  entityId: string | null;
  className?: string;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  criar: { label: 'Criado', color: 'bg-emerald-100 text-emerald-700' },
  create: { label: 'Criado', color: 'bg-emerald-100 text-emerald-700' },
  atualizar: { label: 'Atualizado', color: 'bg-blue-100 text-blue-700' },
  update: { label: 'Atualizado', color: 'bg-blue-100 text-blue-700' },
  excluir: { label: 'Excluído', color: 'bg-rose-100 text-rose-700' },
  delete: { label: 'Excluído', color: 'bg-rose-100 text-rose-700' },
  aprovar: { label: 'Aprovado', color: 'bg-purple-100 text-purple-700' },
  rejeitar: { label: 'Rejeitado', color: 'bg-amber-100 text-amber-700' },
};

function formatDate(date: string) {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatChange(oldVal: any, newVal: any): string {
  if (oldVal === undefined || oldVal === null) return `→ "${newVal}"`;
  if (newVal === undefined || newVal === null) return `"${oldVal}" → (removido)`;
  return `"${oldVal}" → "${newVal}"`;
}

export function AuditTrail({ entityType, entityId, className }: AuditTrailProps) {
  // For now, we'll show a placeholder since the backend doesn't have a specific query for entity audit
  // In production, this would call trpc.audit.byEntity.useQuery({ entityType, entityId })
  
  // Simulated audit events based on entity timestamps
  const events: AuditEvent[] = [];

  if (!entityId) {
    return null;
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico de Alterações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Histórico disponível após a primeira edição</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-auto">
            {events.map((event) => {
              const actionInfo = actionLabels[event.action.toLowerCase()] || { label: event.action, color: 'bg-gray-100 text-gray-700' };
              
              return (
                <div key={event.id} className="flex gap-3 text-sm">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5" />
                    <div className="flex-1 w-px bg-border" />
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className={cn('text-xs', actionInfo.color)}>
                        {actionInfo.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(event.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{event.user?.name || event.user?.email || 'Sistema'}</span>
                    </div>
                    {event.oldValues && event.newValues && (
                      <div className="mt-1 text-xs">
                        {Object.keys(event.newValues)
                          .filter(key => event.oldValues![key] !== event.newValues![key])
                          .slice(0, 3)
                          .map(key => (
                            <div key={key} className="text-muted-foreground">
                              <span className="font-medium">{key}:</span>{' '}
                              {formatChange(event.oldValues![key], event.newValues![key])}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simplified inline audit info for cards/rows
interface AuditInfoProps {
  createdAt?: string | Date | null;
  createdBy?: string | null;
  updatedAt?: string | Date | null;
  updatedBy?: string | null;
}

export function AuditInfo({ createdAt, createdBy, updatedAt, updatedBy }: AuditInfoProps) {
  if (!createdAt && !updatedAt) return null;

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="text-xs text-muted-foreground space-y-0.5">
      {createdAt && (
        <div className="flex items-center gap-1">
          <span className="opacity-60">Criado:</span>
          <span>{formatDateTime(createdAt)}</span>
        </div>
      )}
      {updatedAt && updatedAt !== createdAt && (
        <div className="flex items-center gap-1">
          <span className="opacity-60">Atualizado:</span>
          <span>{formatDateTime(updatedAt)}</span>
        </div>
      )}
    </div>
  );
}
















