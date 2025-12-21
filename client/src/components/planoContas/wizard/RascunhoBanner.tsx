import { useState } from 'react';
import { usePlanoContasWizard, PlanoContasDraft } from './PlanoContasWizardProvider';
import { Button } from '@/components/ui/button';
import { Clock, List, X, Layers } from 'lucide-react';
import { RascunhosList } from './RascunhosList';

export function RascunhoBanner() {
  const { hasPendingDraft, pendingDraft, loadDraft, discardCurrentDraft, drafts } = usePlanoContasWizard();
  const [showList, setShowList] = useState(false);
  
  if (!hasPendingDraft || !pendingDraft) return null;
  
  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `há ${days} dia(s)`;
  };
  
  const handleRetomar = () => {
    loadDraft(pendingDraft);
  };
  
  const handleSelectDraft = (draft: PlanoContasDraft) => {
    loadDraft(draft);
    setShowList(false);
  };
  
  return (
    <>
      <div className="rounded-xl border-2 p-4 mb-6 bg-violet-50 border-violet-200">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 bg-violet-100">
            <Layers className="h-5 w-5 text-violet-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-violet-800">
                Rascunho encontrado
              </p>
            </div>
            
            <p className="text-sm text-violet-700 truncate">
              {pendingDraft.codigo || 'Sem código'} — {pendingDraft.nome || 'Sem nome'}
            </p>
            
            <div className="flex items-center gap-4 mt-2 text-xs text-violet-600">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Salvo {formatTimeAgo(pendingDraft.updatedAt)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowList(true)}
              className="hidden sm:flex border-violet-300 text-violet-700 hover:bg-violet-100"
            >
              <List className="h-4 w-4 mr-1" />
              Ver todos ({drafts.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={discardCurrentDraft}
              className="border-violet-300 text-violet-700 hover:bg-violet-100"
            >
              <X className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Descartar</span>
            </Button>
            <Button
              size="sm"
              onClick={handleRetomar}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Retomar
            </Button>
          </div>
        </div>
      </div>
      
      {showList && (
        <RascunhosList 
          onClose={() => setShowList(false)} 
          onSelect={handleSelectDraft}
        />
      )}
    </>
  );
}
