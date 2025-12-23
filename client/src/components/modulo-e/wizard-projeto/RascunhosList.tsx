import { useProjetoWizard, ProjetoDraft } from './ProjetoWizardProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Trash2, FileText, Clock, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RascunhosListProps {
  onClose: () => void;
  onSelect: (draft: ProjetoDraft) => void;
}

export function RascunhosList({ onClose, onSelect }: RascunhosListProps) {
  const { drafts, deleteDraft, steps, statusConfig } = useProjetoWizard();
  
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-lg">Rascunhos Salvos</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {drafts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum rascunho salvo</p>
            </div>
          ) : (
            drafts.map((draft) => {
              const stepLabel = steps[draft.currentStep]?.label || 'Início';
              const statusInfo = statusConfig[draft.status];
              
              return (
                <button
                  key={draft.id}
                  onClick={() => onSelect(draft)}
                  className="w-full p-4 rounded-lg border hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">
                          {draft.codigo || 'Sem código'}
                        </span>
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          <Layers className="h-3 w-3" /> Projeto
                        </span>
                        {statusInfo && (
                          <Badge className={cn(statusInfo.bg, statusInfo.color, 'border-0 text-xs')}>
                            {statusInfo.label}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground truncate mb-1">
                        {draft.nome || 'Sem nome'}
                      </p>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(draft.updatedAt)}
                        </span>
                        <span>Etapa: {stepLabel}</span>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(e, draft.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </button>
              );
            })
          )}
        </div>
        
        <div className="p-4 border-t bg-zinc-50">
          <Button variant="outline" onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}






