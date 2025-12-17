import * as React from 'react';
import { cn } from '@/lib/utils';

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
  </div>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)} {...props} />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn('border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)} {...props} />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <th ref={ref} className={cn('h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0', className)} {...props} />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)} {...props} />
));
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
));
TableCaption.displayName = 'TableCaption';

/* ========================================
   RESPONSIVE TABLE WRAPPER
   ======================================== */

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  stickyHeader?: boolean;
  stickyFirstColumn?: boolean;
  density?: 'compact' | 'normal' | 'comfortable';
}

const ResponsiveTable = React.forwardRef<HTMLDivElement, ResponsiveTableProps>(
  ({ className, children, stickyHeader = false, stickyFirstColumn = false, density = 'normal', ...props }, ref) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [scrollState, setScrollState] = React.useState({ left: false, right: false });

    React.useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;

      const updateScroll = () => {
        setScrollState({
          left: el.scrollLeft > 0,
          right: el.scrollLeft < el.scrollWidth - el.clientWidth - 1,
        });
      };

      updateScroll();
      el.addEventListener('scroll', updateScroll);
      window.addEventListener('resize', updateScroll);
      return () => {
        el.removeEventListener('scroll', updateScroll);
        window.removeEventListener('resize', updateScroll);
      };
    }, []);

    const densityClasses = {
      compact: '[&_th]:py-2 [&_th]:px-2 [&_td]:py-1.5 [&_td]:px-2 [&_th]:text-xs [&_td]:text-xs',
      normal: '[&_th]:py-3 [&_th]:px-4 [&_td]:py-2.5 [&_td]:px-4',
      comfortable: '[&_th]:py-4 [&_th]:px-5 [&_td]:py-3.5 [&_td]:px-5',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full rounded-md border',
          scrollState.left && 'before:opacity-100',
          scrollState.right && 'after:opacity-100',
          'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-4 before:bg-gradient-to-r before:from-background before:to-transparent before:z-10 before:opacity-0 before:transition-opacity before:pointer-events-none',
          'after:absolute after:right-0 after:top-0 after:bottom-0 after:w-4 after:bg-gradient-to-l after:from-background after:to-transparent after:z-10 after:opacity-0 after:transition-opacity after:pointer-events-none',
          className
        )}
        {...props}
      >
        <div
          ref={scrollRef}
          className={cn(
            'overflow-auto max-h-[70vh]',
            densityClasses[density],
            stickyHeader && '[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-20 [&_thead]:bg-background',
            stickyFirstColumn && '[&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:bg-background [&_td:first-child]:z-10 [&_th:first-child]:sticky [&_th:first-child]:left-0 [&_th:first-child]:z-30'
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);
ResponsiveTable.displayName = 'ResponsiveTable';

/* ========================================
   MOBILE CARD VIEW FOR TABLES
   ======================================== */

interface TableCardViewProps<T> {
  data: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  className?: string;
}

function TableCardView<T>({ data, renderCard, keyExtractor, className }: TableCardViewProps<T>) {
  return (
    <div className={cn('grid gap-3', className)}>
      {data.map((item, index) => (
        <div key={keyExtractor(item)} className="border rounded-lg p-4 bg-card">
          {renderCard(item, index)}
        </div>
      ))}
    </div>
  );
}

export { 
  Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption,
  ResponsiveTable, TableCardView
};

