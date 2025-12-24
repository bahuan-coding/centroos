import { useState } from 'react';
import { AlertTriangle, Loader2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { getOrgCode } from '@/lib/org';

interface NfseCancelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroNFe: string;
  onSuccess: () => void;
}

export function NfseCancelModal({ open, onOpenChange, numeroNFe, onSuccess }: NfseCancelModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  const cancelMutation = trpc.nfse.spCancelar.useMutation({
    onSuccess: (data) => {
      if (data.sucesso) {
        toast.success('NFS-e cancelada com sucesso');
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(data.mensagem || 'Erro ao cancelar NFS-e');
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  
  const handleCancel = () => {
    if (!isConfirmed) {
      setIsConfirmed(true);
      return;
    }
    
    const orgCode = getOrgCode();
    cancelMutation.mutate({ numeroNFe, orgCode });
  };
  
  const handleClose = () => {
    setIsConfirmed(false);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <DialogTitle>Cancelar NFS-e {numeroNFe}</DialogTitle>
              <DialogDescription>
                Esta ação é irreversível
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Atenção</p>
              <ul className="mt-2 space-y-1 text-amber-700">
                <li>• O cancelamento será enviado à Prefeitura de São Paulo</li>
                <li>• A NFS-e ficará marcada como cancelada no sistema</li>
                <li>• Esta operação não pode ser desfeita</li>
                <li>• A NFS-e só pode ser cancelada no prazo legal</li>
              </ul>
            </div>
          </div>
          
          {isConfirmed && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-800 font-medium">
                Você tem certeza? Clique novamente para confirmar o cancelamento.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={cancelMutation.isPending}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelando...
              </>
            ) : isConfirmed ? (
              'Confirmar Cancelamento'
            ) : (
              'Cancelar NFS-e'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

