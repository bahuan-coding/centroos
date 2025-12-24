import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { 
  FileX, Users, Wallet, Receipt, Building2, 
  ClipboardList, FileText, Search, Database 
} from 'lucide-react';

type EmptyStateVariant = 'default' | 'compact' | 'card';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
  variant?: EmptyStateVariant;
}

export function EmptyState({ icon, title, description, action, secondaryAction, className, variant = 'default' }: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-3 py-6 px-4', className)}>
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          <div className="text-muted-foreground opacity-60">{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('border rounded-lg p-6 text-center bg-muted/20', className)}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
          <div className="text-muted-foreground opacity-60">{icon}</div>
        </div>
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }

  return (
    <div className={cn('text-center py-12 px-4', className)}>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <div className="text-muted-foreground opacity-60">{icon}</div>
      </div>
      <h3 className="font-medium text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-5 flex items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

// Pre-built empty state icons
export const EmptyStateIcons = {
  file: <FileX className="h-6 w-6" />,
  users: <Users className="h-6 w-6" />,
  wallet: <Wallet className="h-6 w-6" />,
  receipt: <Receipt className="h-6 w-6" />,
  building: <Building2 className="h-6 w-6" />,
  list: <ClipboardList className="h-6 w-6" />,
  document: <FileText className="h-6 w-6" />,
  search: <Search className="h-6 w-6" />,
  database: <Database className="h-6 w-6" />,
};

// Pre-defined empty states with microcopy
export const EMPTY_STATES = {
  contas: {
    title: 'Nenhuma conta cadastrada',
    description: 'Crie sua primeira conta para começar a controlar o caixa e os bancos.',
  },
  extratos: {
    title: 'Nenhum extrato importado',
    description: 'Baixe o OFX do seu banco e importe aqui para começar a conciliação.',
  },
  linhasConciliadas: {
    title: 'Todas as linhas conciliadas',
    description: 'Parabéns! Todas as linhas deste extrato estão conciliadas.',
  },
  semSugestoes: {
    title: 'Nenhuma sugestão automática',
    description: 'Concilie manualmente as linhas pendentes selecionando o título correspondente.',
  },
  titulosQuitados: {
    title: 'Todos os títulos quitados',
    description: 'Não há títulos pendentes para vincular. Crie um novo título se necessário.',
  },
  linhasNaoEncontradas: {
    title: 'Nenhuma linha encontrada',
    description: 'Tente ajustar os filtros ou a busca para encontrar o que procura.',
  },
} as const;
















