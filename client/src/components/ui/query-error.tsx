import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface QueryErrorProps {
  error: Error | null;
  onRetry?: () => void;
  title?: string;
}

export function QueryError({ error, onRetry, title = 'Erro ao carregar dados' }: QueryErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="p-4 rounded-full bg-red-100 text-red-600 mb-4">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
        {error?.message || 'Ocorreu um erro ao carregar os dados. Verifique sua conexão e tente novamente.'}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}








