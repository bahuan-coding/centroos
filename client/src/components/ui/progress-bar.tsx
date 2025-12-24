import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  variant = 'default',
  className,
}: ProgressBarProps) {
  const percent = Math.min(Math.round((value / max) * 100), 100);
  const isComplete = percent === 100;

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2.5',
  };

  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
  };

  const effectiveVariant = isComplete ? 'success' : variant;

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Progresso</span>
          <span className={cn('font-medium', isComplete && 'text-emerald-600')}>
            {value}/{max} ({percent}%)
          </span>
        </div>
      )}
      <div className={cn('bg-muted rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            variantClasses[effectiveVariant]
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

interface ConciliacaoProgressProps {
  conciliados: number;
  total: number;
  pendentes?: number;
  ignorados?: number;
}

export function ConciliacaoProgress({ conciliados, total, pendentes, ignorados }: ConciliacaoProgressProps) {
  const percent = total > 0 ? Math.round((conciliados / total) * 100) : 0;
  const isComplete = percent === 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {conciliados} de {total} conciliados
          </span>
          <span className={cn(
            'text-sm font-bold',
            isComplete ? 'text-emerald-600' : 'text-muted-foreground'
          )}>
            ({percent}%)
          </span>
        </div>
        {pendentes !== undefined && pendentes > 0 && (
          <span className="text-xs text-amber-600 font-medium">
            {pendentes} pendente{pendentes !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <ProgressBar value={conciliados} max={total} size="lg" />
      {ignorados !== undefined && ignorados > 0 && (
        <p className="text-xs text-muted-foreground">
          {ignorados} linha{ignorados !== 1 ? 's' : ''} ignorada{ignorados !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}













