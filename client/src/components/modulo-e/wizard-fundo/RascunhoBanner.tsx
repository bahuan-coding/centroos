import { useState } from 'react';
import { useFundoWizard, FundoDraft } from './FundoWizardProvider';
import { Button } from '@/components/ui/button';
import { FileText, Clock, List, X, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RascunhosList } from './RascunhosList';
import { cn } from '@/lib/utils';

export function RascunhoBanner() {
  const { hasPendingDraft, pendingDraft, loadDraft, discardCurrentDraft, drafts, steps, tipoConfig } = useFundoWizard();
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
  
  const handleSelectDraft = (draft: FundoDraft) => {
    loadDraft(draft);
    setShowList(false);
  };
  
  const stepLabel = steps[pendingDraft.currentStep]?.label || 'Início';
  const tipoInfo = tipoConfig[pendingDraft.tipo];
  
  return (
    <>
      <div className="rounded-xl border-2 p-4 mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 bg-blue-100">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-semibold text-blue-800">
                Rascunho encontrado
              </p>
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                <Wallet className="h-3 w-3" /> Fundo
              </span>
              {tipoInfo && (
                <Badge className={cn(tipoInfo.bg, tipoInfo.color, 'border-0 text-xs')}>
                  {tipoInfo.label}
                </Badge>
              )}
            </div>
            
            <p className="text-sm truncate text-blue-700">
              {pendingDraft.codigo || 'Sem código'} — {pendingDraft.nome || 'Sem nome'}
            </p>
            
            <div className="flex items-center gap-4 mt-2 text-xs text-blue-600">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Salvo {formatTimeAgo(pendingDraft.updatedAt)}
              </span>
              <span>Etapa: {stepLabel}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowList(true)}
              className="hidden sm:flex"
            >
              <List className="h-4 w-4 mr-1" />
              Ver todos ({drafts.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={discardCurrentDraft}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <X className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Descartar</span>
            </Button>
            <Button
              size="sm"
              onClick={handleRetomar}
              className="bg-blue-600 hover:bg-blue-700"
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

