import { useState, useMemo, useEffect } from 'react';
import { Plus, ChevronRight, ChevronDown, Edit2, Search, FolderTree, ChevronsUpDown, TrendingUp, TrendingDown, Activity, CheckCircle2, AlertCircle, Layers, BarChart3, PieChart, Zap, Eye, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader, FilterBar } from '@/components/ui/page-header';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

const typeLabels: Record<string, string> = {
  ativo: 'Ativo',
  passivo: 'Passivo',
  patrimonio_social: 'Patrimônio',
  receita: 'Receita',
  despesa: 'Despesa',
};

const typeColors: Record<string, { bg: string; text: string; gradient: string; hex: string }> = {
  ativo: { bg: 'bg-blue-500/10', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600', hex: '#3b82f6' },
  passivo: { bg: 'bg-orange-500/10', text: 'text-orange-600', gradient: 'from-orange-500 to-orange-600', hex: '#f97316' },
  patrimonio_social: { bg: 'bg-purple-500/10', text: 'text-purple-600', gradient: 'from-purple-500 to-purple-600', hex: '#a855f7' },
  receita: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-600', hex: '#10b981' },
  despesa: { bg: 'bg-rose-500/10', text: 'text-rose-600', gradient: 'from-rose-500 to-rose-600', hex: '#f43f5e' },
};

const typeIcons: Record<string, typeof TrendingUp> = {
  ativo: TrendingUp,
  passivo: TrendingDown,
  patrimonio_social: Scale,
  receita: TrendingUp,
  despesa: TrendingDown,
};

interface PlanoContaItem {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  naturezaSaldo: string;
  classificacao: string;
  nivel: number;
  contaPaiId: string | null;
  aceitaLancamento: boolean;
  ativo: boolean;
  qtdTitulos: number;
  valorTotal: number;
}

// ============================================================================
// KPI CARD COMPONENT
// ============================================================================

function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  color = 'primary',
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: typeof Activity;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const colorClasses = {
    primary: 'from-blue-500 to-indigo-600',
    success: 'from-emerald-500 to-teal-600',
    warning: 'from-amber-500 to-orange-600',
    danger: 'from-rose-500 to-red-600',
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br p-[1px] shadow-lg">
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-20', colorClasses[color])} />
      <div className="relative bg-card rounded-xl p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn('p-2 rounded-lg bg-gradient-to-br', colorClasses[color])}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1">
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3 text-rose-500" />}
            <span className={cn('text-xs font-medium', 
              trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-muted-foreground'
            )}>
              {trend === 'up' ? 'Ativo' : trend === 'down' ? 'Passivo' : 'Neutro'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPLIANCE BADGE
// ============================================================================

function ComplianceBadge({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all',
      passed 
        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
    )}>
      {passed ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {label}
    </div>
  );
}

// ============================================================================
// TREE ITEM WITH PROGRESS
// ============================================================================

function TreeItem({
  conta,
  allContas,
  maxValor,
  level = 0,
  expanded,
  onToggle,
  onEdit,
  searchTerm,
}: {
  conta: PlanoContaItem;
  allContas: PlanoContaItem[];
  maxValor: number;
  level?: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (conta: PlanoContaItem) => void;
  searchTerm: string;
}) {
  const children = allContas.filter(c => c.contaPaiId === conta.id);
  const hasChildren = children.length > 0;
  const isExpanded = expanded.has(conta.id) || !!searchTerm;
  const isSynthetic = conta.classificacao === 'sintetica';
  const colors = typeColors[conta.tipo] || typeColors.ativo;
  
  // Calculate progress for analytic accounts
  const progress = maxValor > 0 ? (conta.valorTotal / maxValor) * 100 : 0;
  
  // Search highlight
  const matchesSearch = searchTerm && (
    conta.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conta.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={cn(level > 0 && 'ml-4 border-l border-border/50 pl-3')}>
      <div 
        className={cn(
          'group flex items-center gap-2 py-1.5 px-2 -ml-2 rounded-lg transition-all hover:bg-accent/50',
          matchesSearch && 'bg-yellow-500/10 ring-1 ring-yellow-500/30'
        )}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button 
            onClick={() => onToggle(conta.id)}
            className="p-0.5 hover:bg-accent rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5 flex justify-center">
            <span className={cn('w-1.5 h-1.5 rounded-full', colors.bg, colors.text.replace('text', 'bg'))} />
          </span>
        )}
        
        {/* Code */}
        <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{conta.codigo}</span>
        
        {/* Name & Progress Bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm truncate',
              isSynthetic ? 'font-semibold' : 'font-medium',
              !conta.ativo && 'line-through text-muted-foreground'
            )}>
              {conta.nome}
            </span>
          </div>
          
          {/* Progress bar for analytic accounts with movement */}
          {!isSynthetic && conta.qtdTitulos > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1 bg-accent rounded-full overflow-hidden max-w-[120px]">
                <div 
                  className={cn('h-full rounded-full bg-gradient-to-r', colors.gradient)}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {conta.qtdTitulos} mov.
              </span>
            </div>
          )}
        </div>
        
        {/* Badges */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Type badge */}
          <Badge variant="outline" className={cn('text-[10px] px-1.5', colors.bg, colors.text)}>
            {typeLabels[conta.tipo]}
          </Badge>
          
          {/* Synthetic badge */}
          {isSynthetic && (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              Σ
            </Badge>
          )}
          
          {/* Hot account indicator */}
          {conta.qtdTitulos >= 10 && (
            <span title="Conta muito movimentada">
              <Zap className="h-3 w-3 text-amber-500" />
            </span>
          )}
          
          {/* Value */}
          {conta.valorTotal > 0 && (
            <span className="text-xs font-medium text-muted-foreground ml-1">
              R$ {conta.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
          
          {/* Edit button */}
          <Button 
            variant="ghost" 
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onEdit(conta)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="mt-0.5">
          {children.map(child => (
            <TreeItem
              key={child.id}
              conta={child}
              allContas={allContas}
              maxValor={maxValor}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Accounts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<PlanoContaItem | null>(null);
  const [form, setForm] = useState({ code: '', name: '', type: 'despesa', parentId: '', description: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'tree' | 'treemap'>('tree');

  const utils = trpc.useUtils();
  
  // Queries
  const { data: stats, isLoading: loadingStats, error: statsError } = trpc.accounts.planoContasStats.useQuery();
  const { data: tree = [], isLoading: loadingTree } = trpc.accounts.planoContasTree.useQuery();
  const { data: insights } = trpc.accounts.planoContasInsights.useQuery();
  const { data: accounts = [] } = trpc.accounts.list.useQuery();

  // #region agent log
  useEffect(() => {
    console.log('[DEBUG] Stats:', { stats, loadingStats, statsError });
  }, [stats, loadingStats, statsError]);
  // #endregion

  const createMutation = trpc.accounts.create.useMutation({ 
    onSuccess: () => { 
      utils.accounts.list.invalidate();
      utils.accounts.planoContasTree.invalidate();
      utils.accounts.planoContasStats.invalidate();
      setDialogOpen(false); 
      toast.success('Conta criada com sucesso'); 
    },
    onError: (error: any) => {
      toast.error('Erro ao criar conta', { description: error?.message });
    }
  });
  
  const updateMutation = trpc.accounts.update.useMutation({ 
    onSuccess: () => { 
      utils.accounts.list.invalidate();
      utils.accounts.planoContasTree.invalidate();
      setDialogOpen(false); 
      toast.success('Conta atualizada'); 
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar conta', { description: error?.message });
    }
  });

  // Filtered tree
  const filteredTree = useMemo(() => {
    return tree.filter(conta => {
      if (typeFilter !== 'all' && conta.tipo !== typeFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return conta.codigo.toLowerCase().includes(term) || 
               conta.nome.toLowerCase().includes(term);
      }
      return true;
    });
  }, [tree, typeFilter, searchTerm]);

  // Root level accounts
  const rootAccounts = useMemo(() => {
    return filteredTree.filter(c => !c.contaPaiId);
  }, [filteredTree]);

  // Max value for progress bars
  const maxValor = useMemo(() => {
    const values = tree.filter(c => c.classificacao === 'analitica').map(c => c.valorTotal);
    return Math.max(...values, 1);
  }, [tree]);

  // Treemap data
  const treemapData = useMemo(() => {
    const byType: Record<string, { name: string; value: number; children: any[] }> = {};
    
    tree.filter(c => c.nivel === 0).forEach(root => {
      const typeContas = tree.filter(c => c.tipo === root.tipo && c.classificacao === 'analitica');
      const totalValue = typeContas.reduce((sum, c) => sum + c.valorTotal, 0);
      
      byType[root.tipo] = {
        name: typeLabels[root.tipo] || root.tipo,
        value: totalValue || 1,
        children: typeContas.slice(0, 10).map(c => ({
          name: c.nome,
          value: c.valorTotal || 1,
          codigo: c.codigo,
        })),
      };
    });

    return Object.values(byType);
  }, [tree]);

  // Handlers
  const handleNew = () => { 
    setEditAccount(null); 
    setForm({ code: '', name: '', type: 'despesa', parentId: '', description: '' }); 
    setDialogOpen(true); 
  };

  const handleEdit = (conta: PlanoContaItem) => {
    setEditAccount(conta);
    setForm({ 
      code: conta.codigo, 
      name: conta.nome, 
      type: conta.tipo,
      parentId: conta.contaPaiId || '',
      description: ''
    }); 
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    
    if (editAccount) {
      updateMutation.mutate({ id: Number(editAccount.id), name: form.name, description: form.description });
    } else {
      createMutation.mutate({ 
        code: form.code, 
        name: form.name, 
        type: form.type as any, 
        parentId: form.parentId ? parseInt(form.parentId) : undefined, 
        description: form.description || undefined 
      });
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpanded(new Set(tree.map(c => c.id)));
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  const isLoading = loadingStats || loadingTree;

  return (
    <div className="space-y-6">
      {/* ========== HEADER ========== */}
      <PageHeader
        title="Plano de Contas"
        description="Estrutura contábil ITG 2002 para entidades sem fins lucrativos"
        icon={<FolderTree className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border bg-muted/30 p-0.5">
              <button
                onClick={() => setViewMode('tree')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-all',
                  viewMode === 'tree' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Layers className="h-3.5 w-3.5 inline mr-1" />
                Árvore
              </button>
              <button
                onClick={() => setViewMode('treemap')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-all',
                  viewMode === 'treemap' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <PieChart className="h-3.5 w-3.5 inline mr-1" />
                Mapa
              </button>
            </div>
            <Button onClick={handleNew} size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Nova Conta
            </Button>
          </div>
        }
      />

      {/* #region agent log - DEBUG VISUAL */}
      {process.env.NODE_ENV !== 'production' || true ? (
        <div className="bg-yellow-100 text-yellow-900 p-2 rounded text-xs font-mono mb-4">
          <strong>DEBUG:</strong> loading={String(loadingStats)} | 
          ativos={stats?.equacaoPatrimonial?.ativos ?? 'null'} | 
          totals={stats?.totals?.total ?? 'null'} |
          error={statsError?.message ?? 'none'}
        </div>
      ) : null}
      {/* #endregion */}

      {/* ========== KPIs CONTÁBEIS ========== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total de Contas"
          value={stats?.totals.total || 0}
          subtitle={`${stats?.totals.analiticas || 0} analíticas · ${stats?.totals.sinteticas || 0} sintéticas`}
          icon={Layers}
          color="primary"
        />
        <KPICard
          title="Ativos"
          value={`R$ ${(stats?.equacaoPatrimonial.ativos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle={`${stats?.byType.find(t => t.tipo === 'ativo')?.analiticas || 0} contas`}
          icon={TrendingUp}
          color="success"
          trend="up"
        />
        <KPICard
          title="Passivos + PL"
          value={`R$ ${((stats?.equacaoPatrimonial.passivos || 0) + (stats?.equacaoPatrimonial.patrimonio || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle={stats?.equacaoPatrimonial.balanceado ? 'Balanceado ✓' : 'Verificar'}
          icon={Scale}
          color={stats?.equacaoPatrimonial.balanceado ? 'success' : 'warning'}
        />
        <KPICard
          title="Resultado"
          value={`R$ ${((stats?.movimentos.find(m => m.tipo === 'receita')?.valorTotal || 0) - (stats?.movimentos.find(m => m.tipo === 'despesa')?.valorTotal || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Receitas - Despesas"
          icon={BarChart3}
          color={(stats?.movimentos.find(m => m.tipo === 'receita')?.valorTotal || 0) >= (stats?.movimentos.find(m => m.tipo === 'despesa')?.valorTotal || 0) ? 'success' : 'danger'}
        />
      </div>

      {/* ========== ITG 2002 COMPLIANCE ========== */}
      <Card className="border-dashed">
        <CardContent className="py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">ITG 2002 Compliance</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <ComplianceBadge passed={insights?.compliance.temAtivo || false} label="Ativo" />
              <ComplianceBadge passed={insights?.compliance.temPassivo || false} label="Passivo" />
              <ComplianceBadge passed={insights?.compliance.temPatrimonio || false} label="Patrimônio" />
              <ComplianceBadge passed={insights?.compliance.temReceita || false} label="Receita" />
              <ComplianceBadge passed={insights?.compliance.temDespesa || false} label="Despesa" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ========== MAIN CONTENT ========== */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="py-3">
              <FilterBar>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código ou nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" onClick={expandAll} title="Expandir tudo">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={collapseAll} title="Recolher tudo">
                    <ChevronsUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </FilterBar>
            </CardContent>
          </Card>

          {/* Tree or Treemap View */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {viewMode === 'tree' ? (
                  <>
                    <Layers className="h-4 w-4" />
                    Estrutura Hierárquica
                  </>
                ) : (
                  <>
                    <PieChart className="h-4 w-4" />
                    Visualização por Volume
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : viewMode === 'tree' ? (
                <div className="max-h-[60vh] overflow-auto">
                  {rootAccounts.map(conta => (
                    <TreeItem
                      key={conta.id}
                      conta={conta}
                      allContas={filteredTree}
                      maxValor={maxValor}
                      expanded={expanded}
                      onToggle={toggleExpand}
                      onEdit={handleEdit}
                      searchTerm={searchTerm}
                    />
                  ))}
                </div>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={treemapData}
                      dataKey="value"
                      aspectRatio={4/3}
                      stroke="#fff"
                      fill="#8884d8"
                      content={({ x, y, width, height, name, value }: any) => {
                        if (width < 30 || height < 20) return null;
                        const tipo = Object.keys(typeLabels).find(k => typeLabels[k] === name);
                        const color = tipo ? typeColors[tipo]?.hex : '#6366f1';
                        return (
                          <g>
                            <rect x={x} y={y} width={width} height={height} fill={color} rx={4} opacity={0.85} />
                            {width > 60 && height > 30 && (
                              <text x={x + 6} y={y + 16} fill="#fff" fontSize={11} fontWeight={600}>
                                {name}
                              </text>
                            )}
                            {width > 80 && height > 45 && (
                              <text x={x + 6} y={y + 30} fill="rgba(255,255,255,0.8)" fontSize={10}>
                                R$ {Number(value).toLocaleString('pt-BR')}
                              </text>
                            )}
                          </g>
                        );
                      }}
                    >
                      <Tooltip
                        content={({ payload }: any) => {
                          if (!payload?.[0]) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border rounded-lg shadow-lg p-2 text-sm">
                              <p className="font-medium">{data.name}</p>
                              <p className="text-muted-foreground">
                                R$ {Number(data.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          );
                        }}
                      />
                    </Treemap>
                  </ResponsiveContainer>
                </div>
              )}
              
              {/* Footer stats */}
              <div className="mt-4 pt-3 border-t text-xs text-muted-foreground flex items-center justify-between">
                <span>{filteredTree.length} contas exibidas</span>
                <div className="flex gap-3">
                  {Object.entries(typeLabels).map(([tipo, label]) => {
                    const count = filteredTree.filter(c => c.tipo === tipo).length;
                    if (count === 0) return null;
                    const colors = typeColors[tipo];
                    return (
                      <span key={tipo} className="flex items-center gap-1">
                        <span className={cn('w-2 h-2 rounded-full', colors.text.replace('text', 'bg'))} />
                        {label}: {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========== INSIGHTS SIDEBAR ========== */}
        <div className="space-y-4">
          {/* Top movers */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Mais Movimentadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights?.maisMovimentadas.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum movimento registrado</p>
              ) : (
                insights?.maisMovimentadas.map((conta, i) => (
                  <div key={conta.id} className="flex items-center gap-2 py-1">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{conta.nome}</p>
                      <p className="text-[10px] text-muted-foreground">{conta.codigo}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {conta.qtdTitulos}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Idle accounts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                Sem Movimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insights?.semMovimento.length === 0 ? (
                <p className="text-xs text-muted-foreground">Todas as contas têm movimento</p>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-auto">
                  {insights?.semMovimento.slice(0, 10).map(conta => (
                    <div key={conta.id} className="text-xs py-1 flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">{conta.codigo}</span>
                      <span className="truncate">{conta.nome}</span>
                    </div>
                  ))}
                  {(insights?.semMovimento.length || 0) > 10 && (
                    <p className="text-[10px] text-muted-foreground pt-1">
                      +{(insights?.semMovimento.length || 0) - 10} outras
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Type distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Distribuição
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats?.byType.map(t => {
                const colors = typeColors[t.tipo] || typeColors.ativo;
                const percent = stats.totals.total > 0 ? (t.total / stats.totals.total) * 100 : 0;
                return (
                  <div key={t.tipo}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={cn('font-medium', colors.text)}>{typeLabels[t.tipo]}</span>
                      <span className="text-muted-foreground">{t.total}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn('h-full rounded-full bg-gradient-to-r', colors.gradient)}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========== DIALOG ========== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
            <DialogDescription>
              {editAccount ? 'Altere as informações da conta.' : 'Preencha os dados para criar uma nova conta.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input 
                  id="code"
                  value={form.code} 
                  onChange={(e) => setForm({ ...form, code: e.target.value })} 
                  disabled={!!editAccount} 
                  placeholder="1.1.1.001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })} disabled={!!editAccount}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input 
                id="name"
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                placeholder="Nome da conta"
              />
            </div>
            {!editAccount && (
              <div className="space-y-2">
                <Label htmlFor="parentId">Conta Pai (opcional)</Label>
                <Select value={form.parentId || 'none'} onValueChange={(v) => setForm({ ...form, parentId: v === 'none' ? '' : v })}>
                  <SelectTrigger id="parentId">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea 
                id="description"
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })} 
                placeholder="Observações..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : (editAccount ? 'Salvar' : 'Criar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
