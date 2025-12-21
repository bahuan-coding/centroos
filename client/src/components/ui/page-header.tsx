import * as React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  description, 
  icon, 
  actions, 
  className, 
  ...props 
}: PageHeaderProps) {
  return (
    <div 
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        className
      )} 
      {...props}
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3 flex-wrap">
          {icon}
          <span className="truncate">{title}</span>
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm sm:text-base mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

/* ========================================
   RESPONSIVE FILTER BAR
   ======================================== */

interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onClear?: () => void;
  showClear?: boolean;
}

export function FilterBar({ 
  children, 
  onClear, 
  showClear = false, 
  className, 
  ...props 
}: FilterBarProps) {
  return (
    <div 
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center',
        className
      )} 
      {...props}
    >
      {children}
      {showClear && onClear && (
        <button 
          onClick={onClear}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors self-start sm:self-center"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

/* ========================================
   RESPONSIVE STATS GRID
   ======================================== */

interface StatsGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export function StatsGrid({ 
  children, 
  columns = 4, 
  className, 
  ...props 
}: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 xs:grid-cols-2',
    3: 'grid-cols-1 xs:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 xs:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div 
      className={cn('grid gap-3 sm:gap-4', gridCols[columns], className)} 
      {...props}
    >
      {children}
    </div>
  );
}

/* ========================================
   RESPONSIVE PAGINATION
   ======================================== */

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  itemsShown: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  itemsShown,
  onPageChange,
  itemLabel = 'itens',
}: PaginationProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t">
      <p className="text-sm text-muted-foreground order-2 sm:order-1">
        <span className="hidden xs:inline">Mostrando </span>
        {itemsShown} de {totalItems} {itemLabel}
      </p>
      <div className="flex items-center gap-2 order-1 sm:order-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="inline-flex items-center justify-center h-9 px-3 rounded-md border text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50 disabled:pointer-events-none touch-target"
          aria-label="Página anterior"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline ml-1">Anterior</span>
        </button>
        <span className="text-sm px-2 min-w-[4rem] text-center">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="inline-flex items-center justify-center h-9 px-3 rounded-md border text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50 disabled:pointer-events-none touch-target"
          aria-label="Próxima página"
        >
          <span className="hidden sm:inline mr-1">Próxima</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}















