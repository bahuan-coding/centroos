import { Check, X, Eye, LinkIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LinhaExtrato {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'credito' | 'debito';
}

interface TituloSugerido {
  id: string;
  descricao: string;
  pessoa?: string;
  valor: number;
  dataVencimento: string;
  tipo: 'pagar' | 'receber';
}

interface MatchSugestao {
  linha: LinhaExtrato;
  titulo: TituloSugerido;
  score: number; // 0-100
}

interface MatchCardProps {
  match: MatchSugestao;
  onConfirm: () => void;
  onReject: () => void;
  onViewDetails?: () => void;
  isLoading?: boolean;
}

function getScoreColor(score: number): { bg: string; text: string; label: string } {
  if (score >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-600', label: 'Alta' };
  if (score >= 50) return { bg: 'bg-amber-500', text: 'text-amber-600', label: 'Média' };
  return { bg: 'bg-rose-500', text: 'text-rose-600', label: 'Baixa' };
}

export function MatchCard({ match, onConfirm, onReject, onViewDetails, isLoading }: MatchCardProps) {
  const { linha, titulo, score } = match;
  const scoreInfo = getScoreColor(score);
  const valorDiff = Math.abs(linha.valor - titulo.valor);
  const hasValueDiff = valorDiff > 0.01;

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
      {/* Score Badge */}
      <div className="absolute top-2 right-2 z-10">
        <Badge 
          variant="secondary" 
          className={cn('font-mono text-xs', scoreInfo.text, 'bg-opacity-20')}
        >
          {score}% {scoreInfo.label}
        </Badge>
      </div>

      {/* Score Bar */}
      <div className="h-1 w-full bg-muted">
        <div 
          className={cn('h-full transition-all', scoreInfo.bg)} 
          style={{ width: `${score}%` }} 
        />
      </div>

      <div className="p-4">
        {/* Match Visual */}
        <div className="flex items-center gap-3">
          {/* Linha do Extrato */}
          <div className="flex-1 min-w-0 p-3 rounded-lg bg-muted/50 border border-dashed">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px]">Extrato</Badge>
              <span className="text-[10px] text-muted-foreground font-mono">{linha.data}</span>
            </div>
            <p className="text-sm font-medium truncate">{linha.descricao}</p>
            <p className={cn(
              'font-mono font-bold text-sm mt-1',
              linha.tipo === 'credito' ? 'text-emerald-600' : 'text-rose-600'
            )}>
              {linha.tipo === 'credito' ? '+' : '-'}R$ {linha.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            <ArrowRight className="h-4 w-4 text-primary" />
          </div>

          {/* Título Sugerido */}
          <div className="flex-1 min-w-0 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="default" className="text-[10px] bg-primary">Título</Badge>
              <span className="text-[10px] text-muted-foreground">
                {titulo.tipo === 'receber' ? 'A Receber' : 'A Pagar'}
              </span>
            </div>
            <p className="text-sm font-medium truncate">{titulo.descricao}</p>
            {titulo.pessoa && (
              <p className="text-xs text-muted-foreground truncate">{titulo.pessoa}</p>
            )}
            <p className={cn(
              'font-mono font-bold text-sm mt-1',
              titulo.tipo === 'receber' ? 'text-emerald-600' : 'text-rose-600'
            )}>
              R$ {titulo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Value Difference Warning */}
        {hasValueDiff && (
          <div className="mt-3 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-2">
            <span className="text-amber-600">⚠️</span>
            <span className="text-amber-700">
              Diferença de valor: R$ {valorDiff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={isLoading}
            className="flex-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            <X className="h-4 w-4 mr-1" />
            Rejeitar
          </Button>
          
          {onViewDetails && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onViewDetails}
              disabled={isLoading}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}

          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            <Check className="h-4 w-4 mr-1" />
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}

// Compact version for list views
interface MatchRowProps {
  match: MatchSugestao;
  onConfirm: () => void;
  onReject: () => void;
  selected?: boolean;
  onClick?: () => void;
}

export function MatchRow({ match, onConfirm, onReject, selected, onClick }: MatchRowProps) {
  const { linha, titulo, score } = match;
  const scoreInfo = getScoreColor(score);

  return (
    <div 
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
        selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
      )}
      onClick={onClick}
    >
      {/* Score */}
      <div className={cn('w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white', scoreInfo.bg)}>
        <span className="font-bold text-sm">{score}%</span>
      </div>

      {/* Linha */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-mono">{linha.data}</p>
        <p className="text-sm truncate">{linha.descricao}</p>
        <p className={cn('text-xs font-mono', linha.tipo === 'credito' ? 'text-emerald-600' : 'text-rose-600')}>
          {linha.tipo === 'credito' ? '+' : '-'}R$ {linha.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

      {/* Título */}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{titulo.descricao}</p>
        {titulo.pessoa && (
          <p className="text-xs text-muted-foreground truncate">{titulo.pessoa}</p>
        )}
        <p className="text-xs font-mono text-muted-foreground">
          R$ {titulo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button size="icon" variant="ghost" onClick={onReject} className="h-8 w-8 text-rose-600 hover:bg-rose-50">
          <X className="h-4 w-4" />
        </Button>
        <Button size="icon" onClick={onConfirm} className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700">
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}


