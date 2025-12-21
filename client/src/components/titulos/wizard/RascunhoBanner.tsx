import { useState } from 'react';
import { useTituloWizard, TituloDraft } from './TituloWizardProvider';
import { Button } from '@/components/ui/button';
import { FileText, Clock, ArrowUpRight, ArrowDownRight, List, X } from 'lucide-react';
import { RascunhosList } from './RascunhosList';
import { cn } from '@/lib/utils';

export function RascunhoBanner() {
  const { hasPendingDraft, pendingDraft, loadDraft, discardCurrentDraft, drafts } = useTituloWizard();
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
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  const handleRetomar = () => {
    loadDraft(pendingDraft);
  };
  
  const handleSelectDraft = (draft: TituloDraft) => {
    loadDraft(draft);
    setShowList(false);
  };
  
  return (
    <>
      <div className={cn(
        "rounded-xl border-2 p-4 mb-6",
        pendingDraft.tipo === 'receber' 
          ? "bg-emerald-50 border-emerald-200"
          : "bg-rose-50 border-rose-200"
      )}>
        <div className="flex items-start gap-4">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
            pendingDraft.tipo === 'receber' ? "bg-emerald-100" : "bg-rose-100"
          )}>
            <FileText className={cn(
              "h-5 w-5",
              pendingDraft.tipo === 'receber' ? "text-emerald-600" : "text-rose-600"
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={cn(
                "font-semibold",
                pendingDraft.tipo === 'receber' ? "text-emerald-800" : "text-rose-800"
              )}>
                Rascunho encontrado
              </p>
              <span className={cn(
                "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                pendingDraft.tipo === 'receber' 
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              )}>
                {pendingDraft.tipo === 'receber' ? (
                  <><ArrowUpRight className="h-3 w-3" /> A Receber</>
                ) : (
                  <><ArrowDownRight className="h-3 w-3" /> A Pagar</>
                )}
              </span>
            </div>
            
            <p className={cn(
              "text-sm truncate",
              pendingDraft.tipo === 'receber' ? "text-emerald-700" : "text-rose-700"
            )}>
              {pendingDraft.descricao || 'Sem descrição'}
            </p>
            
            <div className={cn(
              "flex items-center gap-4 mt-2 text-xs",
              pendingDraft.tipo === 'receber' ? "text-emerald-600" : "text-rose-600"
            )}>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Salvo {formatTimeAgo(pendingDraft.updatedAt)}
              </span>
              <span className="font-medium">
                {formatCurrency(pendingDraft.valorLiquido)}
              </span>
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
              className={cn(
                pendingDraft.tipo === 'receber' 
                  ? "border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                  : "border-rose-300 text-rose-700 hover:bg-rose-100"
              )}
            >
              <X className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Descartar</span>
            </Button>
            <Button
              size="sm"
              onClick={handleRetomar}
              className={cn(
                pendingDraft.tipo === 'receber' 
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              )}
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

