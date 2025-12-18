import * as React from 'react';
import { cn } from '@/lib/utils';
import { GlassCard } from './glass-card';
import type { LucideIcon } from 'lucide-react';

export interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  loading?: boolean;
  minHeight?: string;
  delay?: number;
}

export function ChartContainer({
  title,
  subtitle,
  icon: Icon,
  action,
  loading = false,
  minHeight = '280px',
  delay = 0,
  children,
  className,
  ...props
}: ChartContainerProps) {
  if (loading) {
    return (
      <GlassCard className={cn('overflow-hidden', className)} padding="md" {...props}>
        <div className="chart-header">
          <div className="space-y-2">
            <div className="skeleton h-5 w-40 rounded" />
            <div className="skeleton h-3 w-28 rounded" />
          </div>
          <div className="skeleton h-8 w-24 rounded-lg" />
        </div>
        <div className="skeleton rounded-xl" style={{ height: minHeight }} />
      </GlassCard>
    );
  }

  return (
    <GlassCard 
      className={cn('overflow-hidden animate-fade-in-up opacity-0', className)} 
      padding="md"
      style={{ animationDelay: `${delay * 50}ms`, animationFillMode: 'forwards' }}
      {...props}
    >
      <div className="chart-header">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <h3 className="chart-title">{title}</h3>
            {subtitle && <p className="chart-subtitle">{subtitle}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      
      <div style={{ minHeight }}>
        {children}
      </div>
    </GlassCard>
  );
}

// Skeleton for chart loading
export function ChartContainerSkeleton({ minHeight = '280px' }: { minHeight?: string }) {
  return (
    <GlassCard className="overflow-hidden" padding="md">
      <div className="chart-header">
        <div className="space-y-2">
          <div className="skeleton h-5 w-40 rounded" />
          <div className="skeleton h-3 w-28 rounded" />
        </div>
      </div>
      <div className="skeleton rounded-xl" style={{ height: minHeight }} />
    </GlassCard>
  );
}

