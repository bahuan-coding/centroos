import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X, type LucideIcon } from 'lucide-react';

export interface AlertBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  icon?: LucideIcon;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const variantConfig = {
  info: {
    containerClass: 'alert-banner-info',
    icon: Info,
    iconClass: 'text-info',
  },
  success: {
    containerClass: 'alert-banner-success',
    icon: CheckCircle,
    iconClass: 'text-success',
  },
  warning: {
    containerClass: 'alert-banner-warning',
    icon: AlertTriangle,
    iconClass: 'text-warning',
  },
  danger: {
    containerClass: 'alert-banner-danger',
    icon: AlertCircle,
    iconClass: 'text-destructive',
  },
};

export function AlertBanner({
  variant = 'info',
  title,
  icon,
  dismissible = false,
  onDismiss,
  children,
  className,
  ...props
}: AlertBannerProps) {
  const config = variantConfig[variant];
  const Icon = icon || config.icon;

  return (
    <div
      className={cn('alert-banner', config.containerClass, className)}
      role="alert"
      {...props}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.iconClass)} />
        
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-semibold text-sm text-foreground mb-1">{title}</h4>
          )}
          <div className="text-sm text-muted-foreground">{children}</div>
        </div>
        
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
            aria-label="Fechar alerta"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

// Multiple alerts container
export interface AlertStackProps {
  alerts: Array<{
    id: string;
    variant: 'info' | 'success' | 'warning' | 'danger';
    title?: string;
    message: string;
  }>;
  onDismiss?: (id: string) => void;
  maxVisible?: number;
}

export function AlertStack({ alerts, onDismiss, maxVisible = 3 }: AlertStackProps) {
  const visibleAlerts = alerts.slice(0, maxVisible);
  const hiddenCount = alerts.length - maxVisible;

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert, index) => (
        <div
          key={alert.id}
          className="animate-fade-in-up opacity-0"
          style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
        >
          <AlertBanner
            variant={alert.variant}
            title={alert.title}
            dismissible={!!onDismiss}
            onDismiss={() => onDismiss?.(alert.id)}
          >
            {alert.message}
          </AlertBanner>
        </div>
      ))}
      
      {hiddenCount > 0 && (
        <div className="text-center py-2">
          <span className="text-xs text-muted-foreground">
            +{hiddenCount} {hiddenCount === 1 ? 'alerta' : 'alertas'} oculto{hiddenCount > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}






