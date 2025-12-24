import { usePeriodoWizard, PeriodoDraft } from './PeriodoWizardProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Clock, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const STEP_LABELS = ['Competência', 'Saldos', 'Revisão'];

interface RascunhosListProps {
  onClose: () => void;
  onSelect: (draft: PeriodoDraft) => void;
}

export function RascunhosList({ onClose, onSelect }: RascunhosListProps) {
  const { drafts, deleteDraft } = usePeriodoWizard();
  
  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `há ${days} dia(s)`;
  };
  
  const formatPeriodo = (mes: number | null, ano: number) => {
    if (!mes) return `${ano}`;
    return `${MESES[mes - 1]} de ${ano}`;
  };
  
  const formatSaldo = (saldo: string) => {
    const num = parseFloat(saldo.replace(',', '.')) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };
  
  const handleDelete = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    deleteDraft(draftId);
  };
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-600" />
            Rascunhos de Períodos
          </DialogTitle>
        </DialogHeader>
        
        {drafts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum rascunho salvo</p>
            <p className="text-sm mt-1">Os rascunhos são salvos automaticamente enquanto você preenche.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {drafts.map((draft: PeriodoDraft) => {
              const hasPendencias = !draft.data.mes;
              
              return (
                <button
                  key={draft.id}
                  type="button"
                  onClick={() => onSelect(draft)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left",
                    "hover:bg-muted/50 border-emerald-100 hover:border-emerald-200"
                  )}
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-emerald-100">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {draft.mes ? formatPeriodo(draft.mes, draft.ano) : `${draft.ano} (sem mês)`}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(draft.updatedAt)}
                      </span>
                      <span>•</span>
                      <span>Etapa: {STEP_LABELS[draft.etapa] || 'Início'}</span>
                    </div>
                    {draft.data.saldoAbertura && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Saldo: {formatSaldo(draft.data.saldoAbertura)}
                      </p>
                    )}
                    {hasPendencias && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-600">
                        <AlertCircle className="h-3 w-3" />
                        <span>Mês não selecionado</span>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(e, draft.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Excluir rascunho"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </button>
              );
            })}
          </div>
        )}
        
        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}










