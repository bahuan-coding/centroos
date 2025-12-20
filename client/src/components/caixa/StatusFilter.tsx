import { ReactNode } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusLinha = 'pendente' | 'conciliado' | 'ignorado' | 'duplicado';

interface StatusFilterProps {
  value: StatusLinha | 'all' | 'sugestoes';
  onChange: (value: StatusLinha | 'all' | 'sugestoes') => void;
  counts?: {
    all?: number;
    pendentes?: number;
    sugestoes?: number;
    conciliados?: number;
    ignorados?: number;
    duplicados?: number;
  };
}

const FILTER_OPTIONS = [
  { value: 'pendentes' as const, label: 'Pendentes', icon: Clock, color: 'amber' },
  { value: 'sugestoes' as const, label: 'Sugestões', icon: Sparkles, color: 'primary' },
  { value: 'conciliados' as const, label: 'Conciliados', icon: CheckCircle2, color: 'emerald' },
  { value: 'ignorados' as const, label: 'Ignorados', icon: XCircle, color: 'gray' },
];

export function StatusFilter({ value, onChange, counts }: StatusFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_OPTIONS.map((opt) => {
        const count = counts?.[opt.value] ?? 0;
        const isActive = value === opt.value.replace('s', '').replace('pendente', 'pendente');
        
        // Map plural keys to singular status values
        const statusValue: StatusLinha | 'all' | 'sugestoes' = 
          opt.value === 'pendentes' ? 'pendente' 
          : opt.value === 'conciliados' ? 'conciliado'
          : opt.value === 'ignorados' ? 'ignorado'
          : 'sugestoes';
        
        const Icon = opt.icon;
        
        return (
          <button
            key={opt.value}
            onClick={() => onChange(statusValue as any)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              value === statusValue
                ? opt.color === 'amber' ? 'bg-amber-500/20 text-amber-700 ring-1 ring-amber-500/30'
                : opt.color === 'primary' ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                : opt.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-700 ring-1 ring-emerald-500/30'
                : 'bg-muted text-muted-foreground ring-1 ring-border'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{opt.label}</span>
            {count > 0 && (
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px]',
                value === statusValue ? 'bg-white/50' : 'bg-muted'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface QuickFilterButtonProps {
  label: string;
  count?: number;
  isActive?: boolean;
  onClick: () => void;
  variant?: 'amber' | 'primary' | 'emerald' | 'gray' | 'rose';
  icon?: ReactNode;
}

export function QuickFilterButton({ 
  label, 
  count, 
  isActive, 
  onClick, 
  variant = 'gray',
  icon 
}: QuickFilterButtonProps) {
  const variantClasses = {
    amber: isActive ? 'bg-amber-500/20 text-amber-700 ring-1 ring-amber-500/30' : '',
    primary: isActive ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : '',
    emerald: isActive ? 'bg-emerald-500/20 text-emerald-700 ring-1 ring-emerald-500/30' : '',
    gray: isActive ? 'bg-muted text-foreground ring-1 ring-border' : '',
    rose: isActive ? 'bg-rose-500/20 text-rose-700 ring-1 ring-rose-500/30' : '',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
        isActive ? variantClasses[variant] : 'bg-muted/50 text-muted-foreground hover:bg-muted'
      )}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn(
          'px-1.5 py-0.5 rounded-full text-[10px]',
          isActive ? 'bg-white/50' : 'bg-muted'
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

