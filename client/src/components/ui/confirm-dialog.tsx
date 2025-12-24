import { ReactNode, useState } from 'react';
import { AlertTriangle, Trash2, Info, AlertCircle } from 'lucide-react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { cn } from '@/lib/utils';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void | Promise<void>;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconClass: 'text-destructive bg-destructive/10',
    buttonVariant: 'destructive' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    buttonVariant: 'warning' as const,
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    buttonVariant: 'default' as const,
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  onConfirm,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn('p-3 rounded-full', config.iconClass)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription className="mt-2">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={config.buttonVariant} onClick={handleConfirm} loading={loading}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easier usage
export function useConfirmDialog() {
  const [state, setState] = useState<{
    open: boolean;
    props: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'> | null;
  }>({ open: false, props: null });

  const confirm = (props: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>) => {
    setState({ open: true, props });
  };

  const close = () => setState({ open: false, props: null });

  const ConfirmDialogComponent = state.props ? (
    <ConfirmDialog {...state.props} open={state.open} onOpenChange={(open) => !open && close()} />
  ) : null;

  return { confirm, ConfirmDialogComponent };
}

