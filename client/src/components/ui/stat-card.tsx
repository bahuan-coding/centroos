import * as React from 'react';
import { cn } from '@/lib/utils';
import { GlassCard } from './glass-card';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: number;
    label?: string;
  };
  icon?: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  className?: string;
  delay?: number; // animation delay index
  accentColor?: 'primary' | 'success' | 'warning' | 'danger' | 'violet' | 'gold';
}

const accentColors = {
  primary: 'from-primary/20 to-primary/5 border-l-primary',
  success: 'from-success/20 to-success/5 border-l-success',
  warning: 'from-warning/20 to-warning/5 border-l-warning',
  danger: 'from-destructive/20 to-destructive/5 border-l-destructive',
  violet: 'from-violet/20 to-violet/5 border-l-violet',
  gold: 'from-gold/20 to-gold/5 border-l-gold',
};

const iconColors = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  violet: 'text-violet',
  gold: 'text-gold',
};

export function StatCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  trend,
  loading = false,
  className,
  delay = 0,
  accentColor = 'primary',
}: StatCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  const changeClass = 
    (change?.value ?? 0) > 0 ? 'kpi-change-positive' :
    (change?.value ?? 0) < 0 ? 'kpi-change-negative' : 
    'kpi-change-neutral';

  if (loading) {
    return (
      <GlassCard className={cn('relative overflow-hidden', className)} padding="md">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-8 w-8 rounded-lg" />
          </div>
          <div className="skeleton h-8 w-32 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard 
      className={cn(
        'relative overflow-hidden border-l-4 animate-fade-in-up opacity-0',
        `bg-gradient-to-br ${accentColors[accentColor]}`,
        className
      )} 
      padding="md"
      style={{ animationDelay: `${delay * 50}ms`, animationFillMode: 'forwards' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="kpi-label">{title}</span>
        {Icon && (
          <div className={cn(
            'p-2 rounded-xl bg-white/50',
            iconColors[accentColor]
          )}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      
      {/* Value */}
      <div className="kpi-value text-foreground animate-count-up">
        {value}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        {subtitle && (
          <span className="text-fluid-xs text-muted-foreground">{subtitle}</span>
        )}
        
        {change !== undefined && (
          <span className={cn('kpi-change', changeClass)}>
            <TrendIcon className="h-3 w-3" />
            {Math.abs(change.value).toFixed(1)}%
            {change.label && <span className="ml-1 opacity-80">{change.label}</span>}
          </span>
        )}
      </div>
    </GlassCard>
  );
}

// Skeleton version for loading states
export function StatCardSkeleton() {
  return (
    <GlassCard className="relative overflow-hidden" padding="md">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-8 w-8 rounded-lg" />
        </div>
        <div className="skeleton h-8 w-32 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
    </GlassCard>
  );
}












