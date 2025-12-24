import { Building2, Layers, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EntityType } from './ModuloEList';

interface QuickStatsProps {
  centrosCount: number;
  projetosCount: number;
  fundosCount: number;
  activeFilter: EntityType | null;
  onFilterChange: (type: EntityType | null) => void;
}

export function QuickStats({ centrosCount, projetosCount, fundosCount, activeFilter, onFilterChange }: QuickStatsProps) {
  const total = centrosCount + projetosCount + fundosCount;
  
  return (
    <div className="grid grid-cols-4 gap-2">
      <button 
        onClick={() => onFilterChange(null)}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          activeFilter === null 
            ? 'bg-violet-100 ring-2 ring-violet-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">📊</span>
        <p className="text-lg font-bold">{total}</p>
        <p className="text-[10px] text-muted-foreground">Total</p>
      </button>
      
      <button 
        onClick={() => onFilterChange(activeFilter === 'centro' ? null : 'centro')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          activeFilter === 'centro' 
            ? 'bg-blue-100 ring-2 ring-blue-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <Building2 className="h-4 w-4 mx-auto text-blue-600" />
        <p className="text-lg font-bold text-blue-600">{centrosCount}</p>
        <p className="text-[10px] text-muted-foreground">Centros</p>
      </button>
      
      <button 
        onClick={() => onFilterChange(activeFilter === 'projeto' ? null : 'projeto')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          activeFilter === 'projeto' 
            ? 'bg-emerald-100 ring-2 ring-emerald-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <Layers className="h-4 w-4 mx-auto text-emerald-600" />
        <p className="text-lg font-bold text-emerald-600">{projetosCount}</p>
        <p className="text-[10px] text-muted-foreground">Projetos</p>
      </button>
      
      <button 
        onClick={() => onFilterChange(activeFilter === 'fundo' ? null : 'fundo')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          activeFilter === 'fundo' 
            ? 'bg-violet-100 ring-2 ring-violet-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <Wallet className="h-4 w-4 mx-auto text-violet-600" />
        <p className="text-lg font-bold text-violet-600">{fundosCount}</p>
        <p className="text-[10px] text-muted-foreground">Fundos</p>
      </button>
    </div>
  );
}

interface HealthStatsProps {
  ativosPercent: number;
  comSaldoPercent: number;
  projetosEmAndamento: number;
  pendentesAprovacao: number;
}

export function HealthStats({ ativosPercent, comSaldoPercent, projetosEmAndamento, pendentesAprovacao }: HealthStatsProps) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 border">
      <p className="text-xs font-medium text-muted-foreground mb-2">📊 Indicadores</p>
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className={cn(
            'text-sm font-bold',
            ativosPercent > 70 ? 'text-emerald-600' : 'text-rose-500'
          )}>
            {ativosPercent}%
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
            <TrendingUp className="h-3 w-3" /> Ativos
          </p>
        </div>
        <div className="text-center">
          <div className={cn(
            'text-sm font-bold',
            comSaldoPercent > 50 ? 'text-emerald-600' : 'text-amber-500'
          )}>
            {comSaldoPercent}%
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
            <Wallet className="h-3 w-3" /> Com Saldo
          </p>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-blue-600">{projetosEmAndamento}</div>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
            <Layers className="h-3 w-3" /> Em Andamento
          </p>
        </div>
        <div className="text-center">
          <div className={cn(
            'text-sm font-bold',
            pendentesAprovacao > 0 ? 'text-amber-600' : 'text-slate-400'
          )}>
            {pendentesAprovacao}
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
            <AlertTriangle className="h-3 w-3" /> Pendentes
          </p>
        </div>
      </div>
    </div>
  );
}












