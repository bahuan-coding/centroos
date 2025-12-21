import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12 px-4', className)}>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <div className="text-muted-foreground opacity-60">{icon}</div>
      </div>
      <h3 className="font-medium text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

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





