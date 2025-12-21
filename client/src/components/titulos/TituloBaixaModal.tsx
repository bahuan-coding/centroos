import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BaixaForm from './BaixaForm';

interface TituloBaixaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tituloId: string | null;
  onSuccess: () => void;
}

export function TituloBaixaModal({ open, onOpenChange, tituloId, onSuccess }: TituloBaixaModalProps) {
  if (!tituloId) return null;

  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💳 Registrar Baixa
          </DialogTitle>
        </DialogHeader>
        <BaixaForm 
          tituloId={tituloId} 
          onSuccess={handleSuccess} 
          onCancel={() => onOpenChange(false)} 
        />
      </DialogContent>
    </Dialog>
  );
}

