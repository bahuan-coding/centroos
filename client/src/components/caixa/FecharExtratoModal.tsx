import { useMemo } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Lock, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface FecharExtratoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extrato: {
    id: string;
    contaNome: string;
    periodo: string;
    totalLinhas: number;
    linhasConciliadas: number;
    linhasIgnoradas: number;
    linhasPendentes: number;
    saldoSistema: number;
    saldoExtrato: number;
  } | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  detail?: string;
  status: 'ok' | 'error' | 'warning';
  actionLabel?: string;
  onAction?: () => void;
}

export function FecharExtratoModal({
  open,
  onOpenChange,
  extrato,
  onConfirm,
  isLoading = false,
}: FecharExtratoModalProps) {
  const saldoDiferenca = extrato ? Math.abs(extrato.saldoSistema - extrato.saldoExtrato) : 0;
  const saldosConferem = saldoDiferenca < 0.01;

  const checklist: ChecklistItem[] = useMemo(() => {
    if (!extrato) return [];
    return [
      {
        id: 'linhas',
        label: `Todas as linhas tratadas (${extrato.totalLinhas}/${extrato.totalLinhas})`,
        detail: `${extrato.linhasConciliadas} conciliadas, ${extrato.linhasIgnoradas} ignoradas`,
        status: extrato.linhasPendentes === 0 ? 'ok' as const : 'error' as const,
        actionLabel: extrato.linhasPendentes > 0 ? `Ver ${extrato.linhasPendentes} pendente${extrato.linhasPendentes !== 1 ? 's' : ''}` : undefined,
      },
      {
        id: 'saldos',
        label: saldosConferem ? 'Saldos conferem' : `Saldos com diferença de R$ ${saldoDiferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        detail: saldosConferem
          ? `Sistema: R$ ${extrato.saldoSistema.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = Extrato: R$ ${extrato.saldoExtrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : `Sistema: R$ ${extrato.saldoSistema.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ≠ Extrato: R$ ${extrato.saldoExtrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        status: saldosConferem ? 'ok' as const : 'warning' as const,
        actionLabel: !saldosConferem ? 'Investigar diferença' : undefined,
      },
      {
        id: 'inconsistencias',
        label: 'Nenhuma inconsistência detectada',
        status: 'ok' as const,
      },
    ];
  }, [extrato, saldosConferem, saldoDiferenca]);

  const canClose = checklist.every(item => item.status !== 'error');
  const hasWarnings = checklist.some(item => item.status === 'warning');

  if (!extrato) return null;

  const getStatusIcon = (status: 'ok' | 'error' | 'warning') => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-rose-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    }
  };

  const getStatusColors = (status: 'ok' | 'error' | 'warning') => {
    switch (status) {
      case 'ok':
        return 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700';
      case 'error':
        return 'bg-rose-500/5 border-rose-500/20 text-rose-700';
      case 'warning':
        return 'bg-amber-500/5 border-amber-500/20 text-amber-700';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Fechar Extrato: {extrato.contaNome} - {extrato.periodo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Checklist de Fechamento:</p>
            
            {checklist.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  getStatusColors(item.status)
                )}
              >
                <div className="shrink-0 mt-0.5">
                  {getStatusIcon(item.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.label}</p>
                  {item.detail && (
                    <p className="text-xs opacity-80 mt-0.5">{item.detail}</p>
                  )}
                  {item.actionLabel && (
                    <button
                      className="flex items-center gap-1 text-xs hover:underline mt-1.5 font-medium"
                      onClick={item.onAction}
                    >
                      <span>{item.actionLabel}</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {canClose && (
            <>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Após fechar:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    Extrato fica somente leitura
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    Conciliações não podem ser desfeitas
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    Relatórios consideram dados como definitivos
                  </li>
                </ul>
              </div>

              {hasWarnings && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700 text-sm">
                      Atenção: existem alertas pendentes
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Você pode fechar mesmo assim, mas recomendamos revisar os alertas.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {!canClose && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-rose-700 text-sm">
                  Não é possível fechar enquanto houver pendências
                </p>
                <p className="text-xs text-rose-600 mt-0.5">
                  Resolva os itens em vermelho para continuar.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {canClose ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button
                onClick={onConfirm}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fechando...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Confirmar Fechamento
                  </>
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

