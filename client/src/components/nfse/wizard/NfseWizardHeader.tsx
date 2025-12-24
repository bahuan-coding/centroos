import { X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNfseWizard } from './NfseWizardProvider';

interface NfseWizardHeaderProps {
  onClose: () => void;
}

export function NfseWizardHeader({ onClose }: NfseWizardHeaderProps) {
  const { isDirty, isSubmitting } = useNfseWizard();
  
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-50 to-blue-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Emitir NFS-e</h1>
          <p className="text-xs text-slate-500">Nota Fiscal de Serviço Eletrônica - São Paulo</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {isDirty && !isSubmitting && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
            Alterações não salvas
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-full hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

