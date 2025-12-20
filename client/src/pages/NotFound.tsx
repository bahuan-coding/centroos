import { Link } from 'wouter';
import { Home, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-4 rounded-full bg-amber-100 text-amber-600 mb-6">
        <AlertTriangle className="h-12 w-12" />
      </div>
      <h1 className="text-5xl font-bold text-foreground mb-2">404</h1>
      <p className="text-lg text-muted-foreground mb-6">Página não encontrada</p>
      <p className="text-sm text-muted-foreground mb-8 max-w-md">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link href="/">
        <Button>
          <Home className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>
      </Link>
    </div>
  );
}

