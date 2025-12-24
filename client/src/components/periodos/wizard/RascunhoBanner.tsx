import { useState } from 'react';
import { usePeriodoWizard, PeriodoDraft } from './PeriodoWizardProvider';
import { Button } from '@/components/ui/button';
import { Clock, List, X, Calendar, AlertCircle } from 'lucide-react';
import { RascunhosList } from './RascunhosList';

const MESES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export function RascunhoBanner() {
  const { hasPendingDraft, pendingDraft, loadDraft, discardCurrentDraft, drafts } = usePeriodoWizard();
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
  
  const formatPeriodo = (mes: number | null, ano: number) => {
    if (!mes) return `${ano} (mês não selecionado)`;
    return `${MESES[mes - 1]}/${ano}`;
  };
  
  const getPendencias = () => {
    const pendencias: string[] = [];
    if (!pendingDraft.data.mes) pendencias.push('Mês não selecionado');
    return pendencias;
  };
  
  const handleRetomar = () => {
    loadDraft(pendingDraft);
  };
  
  const handleSelectDraft = (draft: PeriodoDraft) => {
    loadDraft(draft);
    setShowList(false);
  };
  
  const pendencias = getPendencias();
  
  return (
    <>
      <div className="rounded-xl border-2 p-4 mb-6 bg-emerald-50 border-emerald-200">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 bg-emerald-100">
            <Calendar className="h-5 w-5 text-emerald-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-emerald-800">
                Rascunho encontrado
              </p>
            </div>
            
            <p className="text-sm text-emerald-700 truncate">
              Período: {formatPeriodo(pendingDraft.mes, pendingDraft.ano)}
            </p>
            
            <div className="flex items-center gap-4 mt-2 text-xs text-emerald-600">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Salvo {formatTimeAgo(pendingDraft.updatedAt)}
              </span>
              <span>•</span>
              <span>Etapa {pendingDraft.etapa + 1}/3</span>
            </div>
            
            {pendencias.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Pendências: {pendencias.join(', ')}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowList(true)}
              className="hidden sm:flex border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              aria-label="Ver todos os rascunhos salvos"
            >
              <List className="h-4 w-4 mr-1" />
              Ver rascunhos ({drafts.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={discardCurrentDraft}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              aria-label="Descartar este rascunho"
            >
              <X className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Descartar</span>
            </Button>
            <Button
              size="sm"
              onClick={handleRetomar}
              className="bg-emerald-600 hover:bg-emerald-700"
              aria-label="Retomar edição do rascunho"
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









