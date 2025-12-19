import * as React from 'react';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'strong' | 'subtle';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-3 md:p-4',
  md: 'p-4 md:p-6',
  lg: 'p-6 md:p-8',
};

const variantClasses = {
  default: 'glass',
  strong: 'glass-strong',
  subtle: 'glass-subtle',
};

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', hover = false, padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl',
          variantClasses[variant],
          hover && 'glass-hover cursor-pointer',
          paddingClasses[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassCard.displayName = 'GlassCard';

// Header for GlassCard
export interface GlassCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode;
}

const GlassCardHeader = React.forwardRef<HTMLDivElement, GlassCardHeaderProps>(
  ({ className, children, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-between mb-4', className)}
        {...props}
      >
        <div>{children}</div>
        {action && <div>{action}</div>}
      </div>
    );
  }
);
GlassCardHeader.displayName = 'GlassCardHeader';

// Title for GlassCard
const GlassCardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn('text-fluid-lg font-semibold text-foreground', className)}
        {...props}
      />
    );
  }
);
GlassCardTitle.displayName = 'GlassCardTitle';

// Description for GlassCard
const GlassCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-fluid-sm text-muted-foreground mt-0.5', className)}
        {...props}
      />
    );
  }
);
GlassCardDescription.displayName = 'GlassCardDescription';

// Content wrapper
const GlassCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('', className)} {...props} />
    );
  }
);
GlassCardContent.displayName = 'GlassCardContent';

// Footer for GlassCard
const GlassCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('mt-4 pt-4 border-t border-border/50 flex items-center justify-between', className)}
        {...props}
      />
    );
  }
);
GlassCardFooter.displayName = 'GlassCardFooter';

export { 
  GlassCard, 
  GlassCardHeader, 
  GlassCardTitle, 
  GlassCardDescription, 
  GlassCardContent, 
  GlassCardFooter 
};








