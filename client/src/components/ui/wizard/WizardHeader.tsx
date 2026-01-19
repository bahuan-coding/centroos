import { X, Save, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatTimeAgo } from '@/lib/utils';

interface WizardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
  isDirty?: boolean;
  className?: string;
  accentColor?: 'emerald' | 'rose' | 'blue' | 'violet' | 'amber';
}

export function WizardHeader({
  title,
  subtitle,
  icon,
  onClose,
  onSave,
  isSaving,
  lastSaved,
  isDirty,
  className,
  accentColor = 'blue',
}: WizardHeaderProps) {
  const colorClasses = {
    emerald: 'from-emerald-500 to-teal-600',
    rose: 'from-rose-500 to-red-600',
    blue: 'from-blue-500 to-indigo-600',
    violet: 'from-violet-500 to-purple-600',
    amber: 'from-amber-500 to-orange-600',
  };

  return (
    <div
      className={cn(
        'text-white p-4 sm:p-6 relative bg-gradient-to-br',
        colorClasses[accentColor],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="text-sm text-white/70">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-save indicator */}
          {lastSaved && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-white/60">
              <Clock className="h-3 w-3" />
              Salvo {formatTimeAgo(lastSaved)}
            </span>
          )}

          {/* Manual save button */}
          {onSave && isDirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="text-white hover:bg-white/20"
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          )}

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
