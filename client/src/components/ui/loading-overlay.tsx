import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
  className?: string;
  fullPage?: boolean;
}

export function LoadingOverlay({ message = 'Carregando...', className, fullPage = false }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        fullPage ? 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm' : 'py-12',
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
    </div>
  );
}

export function LoadingSpinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };
  return <Loader2 className={cn('animate-spin text-primary', sizeClasses[size], className)} />;
}

// Page loading skeleton
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4 p-6 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded-md" />
      <div className="h-4 w-72 bg-muted rounded-md" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 w-full bg-muted rounded-md" />
        ))}
      </div>
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ columns = 4, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="flex gap-3 mb-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 flex-1 bg-muted rounded" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-10 flex-1 bg-muted/50 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

