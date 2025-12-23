import { Building2, Layers, Wallet, ChevronRight, AlertTriangle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type EntityType = 'centro' | 'projeto' | 'fundo';

export interface UnifiedItem {
  id: string;
  tipo: EntityType;
  codigo: string;
  nome: string;
  ativo: boolean;
  status?: string;
  saldo?: number | string | null;
  projetosCount?: number;
  parceriaMrosc?: boolean;
}

const typeConfig: Record<EntityType, { icon: React.ReactNode; bgClass: string; label: string }> = {
  centro: { 
    icon: <Building2 className="h-4 w-4" />, 
    bgClass: 'bg-gradient-to-br from-blue-100 to-indigo-100', 
    label: 'Centro' 
  },
  projeto: { 
    icon: <Layers className="h-4 w-4" />, 
    bgClass: 'bg-gradient-to-br from-emerald-100 to-teal-100', 
    label: 'Projeto' 
  },
  fundo: { 
    icon: <Wallet className="h-4 w-4" />, 
    bgClass: 'bg-gradient-to-br from-violet-100 to-purple-100', 
    label: 'Fundo' 
  },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  planejamento: { bg: 'bg-slate-100', text: 'text-slate-600' },
  em_andamento: { bg: 'bg-blue-100', text: 'text-blue-700' },
  suspenso: { bg: 'bg-amber-100', text: 'text-amber-700' },
  concluido: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelado: { bg: 'bg-rose-100', text: 'text-rose-700' },
  restrito: { bg: 'bg-rose-100', text: 'text-rose-700' },
  designado: { bg: 'bg-amber-100', text: 'text-amber-700' },
  livre: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

const statusLabels: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  suspenso: 'Suspenso',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  restrito: 'Restrito',
  designado: 'Designado',
  livre: 'Livre',
};

function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  if (num >= 1000000) return `R$ ${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `R$ ${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface ModuloEListProps {
  items: UnifiedItem[];
  selectedId: string | null;
  onSelect: (item: UnifiedItem) => void;
  isLoading: boolean;
}

export function ModuloEList({ items, selectedId, onSelect, isLoading }: ModuloEListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-3">
          <Search className="h-8 w-8 opacity-40" />
        </div>
        <p className="text-sm font-medium">Nenhum item encontrado</p>
        <p className="text-xs mt-1">Tente outros termos ou limpe os filtros</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const config = typeConfig[item.tipo];
        const isInativo = !item.ativo;
        const statusStyle = item.status ? statusColors[item.status] : null;
        
        return (
          <button
            key={`${item.tipo}-${item.id}`}
            onClick={() => onSelect(item)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
              'hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1',
              selectedId === item.id && 'bg-violet-100 ring-2 ring-violet-500',
              isInativo && 'opacity-60'
            )}
          >
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', config.bgClass)}>
              {config.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">{item.codigo}</code>
                {item.parceriaMrosc && (
                  <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1 py-0">MROSC</Badge>
                )}
                {isInativo && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-slate-300">Inativo</Badge>
                )}
              </div>
              <p className="font-medium text-sm truncate mt-0.5">{item.nome}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {config.label}
                </Badge>
                {statusStyle && item.status && (
                  <Badge className={cn(statusStyle.bg, statusStyle.text, 'text-[10px] px-1.5 py-0 border-0')}>
                    {statusLabels[item.status]}
                  </Badge>
                )}
                {item.tipo === 'centro' && item.projetosCount !== undefined && item.projetosCount > 0 && (
                  <span className="text-[10px] text-muted-foreground">{item.projetosCount} proj.</span>
                )}
                {(item.tipo === 'fundo' || item.tipo === 'projeto') && item.saldo && (
                  <span className="text-[10px] font-medium text-emerald-600">
                    {formatCurrency(item.saldo)}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className={cn('h-4 w-4 text-slate-300 shrink-0 transition-transform', 
              selectedId === item.id && 'text-violet-500 rotate-90')} />
          </button>
        );
      })}
    </div>
  );
}





