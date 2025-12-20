import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface InativarContaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta: {
    id: string;
    nome: string;
    saldo: number;
    extratosPendentes?: number;
  } | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  ok: boolean;
  errorMessage?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function InativarContaModal({
  open,
  onOpenChange,
  conta,
  onConfirm,
  isLoading = false,
}: InativarContaModalProps) {
  const checklist: ChecklistItem[] = useMemo(() => {
    if (!conta) return [];
    return [
      {
        id: 'saldo',
        label: 'Saldo zerado',
        ok: conta.saldo === 0,
        errorMessage: `Saldo atual: R$ ${conta.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        actionLabel: 'Fazer ajuste de saldo',
      },
      {
        id: 'extratos',
        label: 'Sem extratos pendentes',
        ok: (conta.extratosPendentes ?? 0) === 0,
        errorMessage: `${conta.extratosPendentes} extrato${conta.extratosPendentes !== 1 ? 's' : ''} pendente${conta.extratosPendentes !== 1 ? 's' : ''} de conciliação`,
        actionLabel: 'Ver extratos pendentes',
      },
    ];
  }, [conta]);

  const canInactivate = checklist.every(item => item.ok);

  if (!conta) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inativar Conta: {conta.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!canInactivate && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 text-sm">
                  Não é possível inativar esta conta
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Resolva os itens abaixo para continuar.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {checklist.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  item.ok ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
                )}
              >
                {item.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-medium text-sm',
                    item.ok ? 'text-emerald-700' : 'text-rose-700'
                  )}>
                    {item.ok ? item.label : item.errorMessage}
                  </p>
                  {!item.ok && item.actionLabel && (
                    <button className="flex items-center gap-1 text-xs text-rose-600 hover:underline mt-1">
                      <span>{item.actionLabel}</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {canInactivate && (
            <p className="text-sm text-muted-foreground">
              Conta inativa não aceita novos movimentos mas permanece no histórico.
            </p>
          )}
        </div>

        <DialogFooter>
          {canInactivate ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Inativando...
                  </>
                ) : (
                  'Inativar Conta'
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

