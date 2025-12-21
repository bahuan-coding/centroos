import { ArrowUpRight, ArrowDownRight, ChevronRight, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface TituloItem {
  id: string;
  tipo: 'pagar' | 'receber';
  descricao: string;
  valorLiquido: string | number;
  dataVencimento: string;
  status: string;
  pessoa?: { id: string; nome: string } | null;
}

interface TitulosListProps {
  titulos: TituloItem[];
  selectedId: string | null;
  onSelect: (titulo: TituloItem) => void;
  isLoading: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(value: number | string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getDaysUntilDue(dateStr: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dateStr);
  venc.setHours(0, 0, 0, 0);
  return Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  rascunho: { label: 'Rascunho', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  pendente_aprovacao: { label: 'Aguardando', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  aprovado: { label: 'Aprovado', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  parcial: { label: 'Parcial', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  quitado: { label: 'Quitado', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  cancelado: { label: 'Cancelado', color: 'text-slate-400', bgColor: 'bg-slate-100' },
  vencido: { label: 'Vencido', color: 'text-rose-600', bgColor: 'bg-rose-100' },
};

// ============================================================================
// SKELETON
// ============================================================================

function TituloSkeleton() {
  return (
    <div className="animate-pulse p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
        <div className="h-5 bg-muted rounded w-20" />
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyList() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <span className="text-5xl">📋</span>
      <p className="mt-3 text-sm">Nenhum título encontrado</p>
      <p className="text-xs mt-1">Tente outros filtros ou crie um novo título</p>
    </div>
  );
}

// ============================================================================
// TITULO ITEM
// ============================================================================

function TituloItem({ 
  titulo, 
  isSelected, 
  onSelect 
}: { 
  titulo: TituloItem; 
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isPagar = titulo.tipo === 'pagar';
  const status = statusConfig[titulo.status] || statusConfig.rascunho;
  const daysUntil = getDaysUntilDue(titulo.dataVencimento);
  const isVencido = daysUntil < 0 && !['quitado', 'cancelado'].includes(titulo.status);
  const isUrgente = daysUntil >= 0 && daysUntil <= 3 && !['quitado', 'cancelado'].includes(titulo.status);
  const isHoje = daysUntil === 0;
  const isQuitado = titulo.status === 'quitado';

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
        'hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
        isSelected && 'bg-primary/10 ring-2 ring-primary',
        isVencido && !isSelected && 'bg-rose-50/50',
        isQuitado && 'opacity-70'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
        isPagar ? 'bg-rose-100' : 'bg-emerald-100'
      )}>
        {isPagar ? (
          <ArrowDownRight className="h-5 w-5 text-rose-600" />
        ) : (
          <ArrowUpRight className="h-5 w-5 text-emerald-600" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-sm truncate">{titulo.descricao}</p>
          {isQuitado && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
        </div>
        
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {/* Status Badge */}
          <Badge className={cn(status.bgColor, status.color, 'text-[10px] px-1.5 py-0')}>
            {status.label}
          </Badge>
          
          {/* Urgency Badges */}
          {isVencido && (
            <Badge className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0">
              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
              {Math.abs(daysUntil)}d atraso
            </Badge>
          )}
          {isHoje && !isVencido && (
            <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">
              <Clock className="h-2.5 w-2.5 mr-0.5" />
              Hoje
            </Badge>
          )}
          {isUrgente && !isHoje && (
            <Badge className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0">
              {daysUntil}d
            </Badge>
          )}
          
          {/* Pessoa */}
          {titulo.pessoa && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
              {titulo.pessoa.nome}
            </span>
          )}
        </div>
      </div>

      {/* Value & Date */}
      <div className="text-right shrink-0">
        <p className={cn(
          'font-mono font-bold text-sm',
          isPagar ? 'text-rose-600' : 'text-emerald-600',
          isQuitado && 'text-muted-foreground'
        )}>
          {isPagar ? '-' : '+'}{formatCurrency(titulo.valorLiquido)}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {formatDate(titulo.dataVencimento)}
        </p>
      </div>

      {/* Chevron */}
      <ChevronRight className={cn(
        'h-4 w-4 text-slate-300 shrink-0 transition-transform',
        isSelected && 'text-primary rotate-90'
      )} />
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TitulosList({ titulos, selectedId, onSelect, isLoading }: TitulosListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => <TituloSkeleton key={i} />)}
      </div>
    );
  }

  if (titulos.length === 0) {
    return <EmptyList />;
  }

  return (
    <div className="space-y-1">
      {titulos.map((titulo) => (
        <TituloItem
          key={titulo.id}
          titulo={titulo}
          isSelected={selectedId === titulo.id}
          onSelect={() => onSelect(titulo)}
        />
      ))}
    </div>
  );
}

