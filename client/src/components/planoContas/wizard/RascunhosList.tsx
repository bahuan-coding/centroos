import { usePlanoContasWizard, PlanoContasDraft } from './PlanoContasWizardProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Clock, Trash2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RascunhosListProps {
  onClose: () => void;
  onSelect: (draft: PlanoContasDraft) => void;
}

export function RascunhosList({ onClose, onSelect }: RascunhosListProps) {
  const { drafts, deleteDraft } = usePlanoContasWizard();
  
  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `há ${days} dia(s)`;
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
            <Layers className="h-5 w-5 text-violet-600" />
            Rascunhos salvos
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
            {drafts.map((draft: PlanoContasDraft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => onSelect(draft)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left",
                  "hover:bg-muted/50 border-violet-100 hover:border-violet-200"
                )}
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-violet-100">
                  <Layers className="h-4 w-4 text-violet-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {draft.codigo || 'Sem código'} — {draft.nome || 'Sem nome'}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(draft.updatedAt)}
                    </span>
                  </div>
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
            ))}
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
