import { useState } from 'react';
import { FileText, Clock, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatTimeAgo } from '@/lib/utils';

export interface DraftItem {
  id: string;
  label: string;
  description?: string;
  updatedAt: string;
}

interface DraftBannerProps {
  draft: DraftItem;
  onResume: () => void;
  onDiscard: () => void;
  onViewAll?: () => void;
  draftsCount?: number;
  icon?: React.ReactNode;
  accentColor?: 'emerald' | 'rose' | 'blue' | 'violet' | 'amber';
  className?: string;
}

export function DraftBanner({
  draft,
  onResume,
  onDiscard,
  onViewAll,
  draftsCount = 1,
  icon,
  accentColor = 'blue',
  className,
}: DraftBannerProps) {
  const colorConfig = {
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-100',
      iconText: 'text-emerald-600',
      text: 'text-emerald-800',
      textMuted: 'text-emerald-700',
      textSmall: 'text-emerald-600',
      btnOutline: 'border-emerald-300 text-emerald-700 hover:bg-emerald-100',
      btnPrimary: 'bg-emerald-600 hover:bg-emerald-700',
    },
    rose: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      iconBg: 'bg-rose-100',
      iconText: 'text-rose-600',
      text: 'text-rose-800',
      textMuted: 'text-rose-700',
      textSmall: 'text-rose-600',
      btnOutline: 'border-rose-300 text-rose-700 hover:bg-rose-100',
      btnPrimary: 'bg-rose-600 hover:bg-rose-700',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      text: 'text-blue-800',
      textMuted: 'text-blue-700',
      textSmall: 'text-blue-600',
      btnOutline: 'border-blue-300 text-blue-700 hover:bg-blue-100',
      btnPrimary: 'bg-blue-600 hover:bg-blue-700',
    },
    violet: {
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      iconBg: 'bg-violet-100',
      iconText: 'text-violet-600',
      text: 'text-violet-800',
      textMuted: 'text-violet-700',
      textSmall: 'text-violet-600',
      btnOutline: 'border-violet-300 text-violet-700 hover:bg-violet-100',
      btnPrimary: 'bg-violet-600 hover:bg-violet-700',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-600',
      text: 'text-amber-800',
      textMuted: 'text-amber-700',
      textSmall: 'text-amber-600',
      btnOutline: 'border-amber-300 text-amber-700 hover:bg-amber-100',
      btnPrimary: 'bg-amber-600 hover:bg-amber-700',
    },
  };

  const colors = colorConfig[accentColor];

  return (
    <div className={cn('rounded-xl border-2 p-4 mb-6', colors.bg, colors.border, className)}>
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
            colors.iconBg
          )}
        >
          {icon || <FileText className={cn('h-5 w-5', colors.iconText)} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={cn('font-semibold', colors.text)}>Rascunho encontrado</p>
          </div>

          <p className={cn('text-sm truncate', colors.textMuted)}>
            {draft.label}
            {draft.description && ` - ${draft.description}`}
          </p>

          <div className={cn('flex items-center gap-4 mt-2 text-xs', colors.textSmall)}>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Salvo {formatTimeAgo(draft.updatedAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onViewAll && draftsCount > 1 && (
            <Button variant="outline" size="sm" onClick={onViewAll} className="hidden sm:flex">
              <List className="h-4 w-4 mr-1" />
              Ver todos ({draftsCount})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onDiscard} className={colors.btnOutline}>
            <X className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Descartar</span>
          </Button>
          <Button size="sm" onClick={onResume} className={colors.btnPrimary}>
            Retomar
          </Button>
        </div>
      </div>
    </div>
  );
}
