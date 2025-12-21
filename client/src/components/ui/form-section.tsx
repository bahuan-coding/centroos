import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './badge';

interface FormSectionProps {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  badge?: { text: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' };
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function FormSection({
  title,
  icon,
  description,
  badge,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-xl">{icon}</span>}
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {badge && (
          <Badge variant={badge.variant || 'secondary'} className="text-xs">
            {badge.text}
          </Badge>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

interface FormRowProps {
  children: React.ReactNode;
  className?: string;
}

export function FormRow({ children, className }: FormRowProps) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-4', className)}>
      {children}
    </div>
  );
}

interface FormFieldProps {
  children: React.ReactNode;
  error?: string;
  className?: string;
}

export function FormField({ children, error, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1" role="alert" aria-live="polite">
          <span aria-hidden="true">⚠️</span> {error}
        </p>
      )}
    </div>
  );
}

interface DynamicListProps<T> {
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  addLabel?: string;
  emptyMessage?: string;
  maxItems?: number;
  className?: string;
}

export function DynamicList<T>({
  items,
  onAdd,
  onRemove,
  renderItem,
  addLabel = 'Adicionar',
  emptyMessage = 'Nenhum item cadastrado',
  maxItems,
  className,
}: DynamicListProps<T>) {
  const canAdd = !maxItems || items.length < maxItems;

  return (
    <div className={cn('space-y-3', className)}>
      {items.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="group relative p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              {renderItem(item, index)}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-all"
                aria-label="Remover"
              >
                <span className="text-sm">✕</span>
              </button>
            </div>
          ))}
        </div>
      )}
      {canAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="w-full py-2 border border-dashed rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5 transition-colors"
        >
          + {addLabel}
        </button>
      )}
    </div>
  );
}


