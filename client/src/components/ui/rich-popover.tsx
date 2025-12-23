import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { HelpCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichPopoverProps {
  title: string;
  items?: string[];
  footer?: string;
  icon?: 'help' | 'info';
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  triggerClassName?: string;
}

export function RichPopover({
  title,
  items,
  footer,
  icon = 'help',
  side = 'bottom',
  align = 'start',
  className,
  triggerClassName,
}: RichPopoverProps) {
  const Icon = icon === 'info' ? Info : HelpCircle;

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center rounded-full p-0.5',
            'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'transition-colors',
            triggerClassName
          )}
          aria-label="Mais informações"
        >
          <Icon className="h-4 w-4" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={16}
          className={cn(
            'z-50 w-80 max-w-[calc(100vw-32px)] rounded-xl border bg-popover p-4 shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[side=bottom]:slide-in-from-top-2',
            'data-[side=left]:slide-in-from-right-2',
            'data-[side=right]:slide-in-from-left-2',
            'data-[side=top]:slide-in-from-bottom-2',
            className
          )}
        >
          <h4 className="font-semibold text-sm text-foreground mb-2">{title}</h4>
          {items && items.length > 0 && (
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {footer && (
            <p className="mt-3 pt-3 border-t text-xs text-muted-foreground italic">
              {footer}
            </p>
          )}
          <PopoverPrimitive.Arrow className="fill-popover" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

// Simple inline info trigger with popover
interface InfoPopoverProps {
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function InfoPopover({ children, side = 'bottom', align = 'start', className }: InfoPopoverProps) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center rounded-full p-0.5',
            'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'transition-colors'
          )}
          aria-label="Mais informações"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={16}
          className={cn(
            'z-50 w-80 max-w-[calc(100vw-32px)] rounded-xl border bg-popover p-4 shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[side=bottom]:slide-in-from-top-2',
            'data-[side=left]:slide-in-from-right-2',
            'data-[side=right]:slide-in-from-left-2',
            'data-[side=top]:slide-in-from-bottom-2',
            className
          )}
        >
          {children}
          <PopoverPrimitive.Arrow className="fill-popover" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}





