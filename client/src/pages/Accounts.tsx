import { useState, useMemo } from 'react';
import { Plus, ChevronRight, ChevronDown, Search, FolderTree, CheckCircle2, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { ContaDetail } from '@/components/accounts';
import { PlanoContasWizard } from '@/components/planoContas';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  ativo: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' },
  passivo: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-500' },
  patrimonio_social: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-500' },
  receita: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-500' },
  despesa: { bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-500' },
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

// Quick Stats Filtros
function QuickStats({ 
  stats, 
  filtroTipo, 
  setFiltroTipo 
}: { 
  stats: any; 
  filtroTipo: string | undefined;
  setFiltroTipo: (v: string | undefined) => void;
}) {
  const tipos = [
    { key: undefined, label: 'Total', emoji: '📊', count: stats?.totals?.total || 0 },
    { key: 'ativo', label: 'Ativo', emoji: '📈', count: stats?.byType?.find((t: any) => t.tipo === 'ativo')?.total || 0 },
    { key: 'passivo', label: 'Passivo', emoji: '📉', count: stats?.byType?.find((t: any) => t.tipo === 'passivo')?.total || 0 },
    { key: 'patrimonio_social', label: 'Patrim.', emoji: '⚖️', count: stats?.byType?.find((t: any) => t.tipo === 'patrimonio_social')?.total || 0 },
    { key: 'receita', label: 'Receita', emoji: '💰', count: stats?.byType?.find((t: any) => t.tipo === 'receita')?.total || 0 },
    { key: 'despesa', label: 'Despesa', emoji: '💸', count: stats?.byType?.find((t: any) => t.tipo === 'despesa')?.total || 0 },
  ];

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {tipos.map(t => (
        <button 
          key={t.key || 'total'}
          onClick={() => setFiltroTipo(filtroTipo === t.key ? undefined : t.key)}
          className={cn(
            'p-2 rounded-lg text-center transition-all',
            filtroTipo === t.key 
              ? 'bg-violet-100 ring-2 ring-violet-500' 
              : 'bg-muted/50 hover:bg-muted'
          )}
        >
          <span className="text-base">{t.emoji}</span>
          <p className="text-sm font-bold">{t.count}</p>
          <p className="text-[9px] text-muted-foreground truncate">{t.label}</p>
        </button>
      ))}
    </div>
  );
}

// Compliance Badge compacto
function ComplianceBadgeRow({ insights }: { insights: any }) {
  if (!insights) return null;
  
  const items = [
    { key: 'temAtivo', label: 'Ativo', passed: insights.compliance?.temAtivo },
    { key: 'temPassivo', label: 'Passivo', passed: insights.compliance?.temPassivo },
    { key: 'temPatrimonio', label: 'Patrim.', passed: insights.compliance?.temPatrimonio },
    { key: 'temReceita', label: 'Receita', passed: insights.compliance?.temReceita },
    { key: 'temDespesa', label: 'Despesa', passed: insights.compliance?.temDespesa },
  ];

  return (
    <div className="p-3 rounded-lg bg-slate-50 border">
      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" /> ITG 2002
      </p>
      <div className="flex gap-1 flex-wrap">
        {items.map(item => (
          <Badge 
            key={item.key} 
            variant="outline" 
            className={cn('text-[9px] px-1.5',
              item.passed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            )}
          >
            {item.passed ? '✓' : '✗'} {item.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// Tree Item para lista
function TreeItemRow({
  conta,
  allContas,
  level = 0,
  expanded,
  onToggle,
  onSelect,
  selectedId,
  searchTerm,
}: {
  conta: PlanoContaItem;
  allContas: PlanoContaItem[];
  level?: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (conta: PlanoContaItem) => void;
  selectedId: string | null;
  searchTerm: string;
}) {
  const children = allContas.filter(c => c.contaPaiId === conta.id);
  const hasChildren = children.length > 0;
  const isExpanded = expanded.has(conta.id) || !!searchTerm;
  const colors = typeColors[conta.tipo] || typeColors.ativo;
  const isSelected = selectedId === conta.id;
  
  const matchesSearch = searchTerm && (
    conta.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conta.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={cn(level > 0 && 'ml-4 border-l border-border/40 pl-2')}>
      <button
        onClick={() => onSelect(conta)}
        className={cn(
          'w-full flex items-center gap-2 py-2 px-2 rounded-lg text-left transition-all',
          'hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1',
          isSelected && 'bg-violet-100 ring-2 ring-violet-500',
          matchesSearch && 'bg-yellow-50',
          !conta.ativo && 'opacity-60'
        )}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <span 
            onClick={(e) => { e.stopPropagation(); onToggle(conta.id); }}
            className="p-0.5 hover:bg-accent rounded cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
        ) : (
          <span className="w-5 flex justify-center">
            <span className={cn('w-1.5 h-1.5 rounded-full', colors.bg, colors.text.replace('text', 'bg'))} />
          </span>
        )}
        
        {/* Code */}
        <span className="font-mono text-[10px] text-muted-foreground w-16 shrink-0">{conta.codigo}</span>
        
        {/* Name */}
        <div className="flex-1 min-w-0">
          <span className={cn(
            'text-sm truncate block',
            conta.classificacao === 'sintetica' ? 'font-semibold' : 'font-medium'
          )}>
            {conta.nome}
          </span>
        </div>
        
        {/* Badges */}
        <div className="flex items-center gap-1 shrink-0">
          {conta.qtdTitulos > 0 && (
            <Badge variant="secondary" className="text-[9px] px-1">{conta.qtdTitulos}</Badge>
          )}
        </div>
        
        <ChevronRight className={cn('h-4 w-4 text-slate-300 shrink-0 transition-transform', 
          isSelected && 'text-violet-500 rotate-90')} />
      </button>
      
      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="mt-0.5">
          {children.map(child => (
            <TreeItemRow
              key={child.id}
              conta={child}
              allContas={allContas}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedId={selectedId}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Lista de Contas
function ContasList({ 
  contas, 
  selectedId, 
  onSelect,
  expanded,
  onToggle,
  searchTerm,
  isLoading 
}: { 
  contas: PlanoContaItem[]; 
  selectedId: string | null;
  onSelect: (conta: PlanoContaItem) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  searchTerm: string;
  isLoading: boolean;
}) {
  const rootContas = contas.filter(c => !c.contaPaiId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (rootContas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <span className="text-5xl">🔍</span>
        <p className="mt-3 text-sm">Nenhuma conta encontrada</p>
        <p className="text-xs mt-1">Tente outros termos de busca ou limpe os filtros</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {rootContas.map(conta => (
        <TreeItemRow
          key={conta.id}
          conta={conta}
          allContas={contas}
          expanded={expanded}
          onToggle={onToggle}
          onSelect={onSelect}
          selectedId={selectedId}
          searchTerm={searchTerm}
        />
      ))}
    </div>
  );
}

// Estado vazio
function EmptySelection({ onNewConta }: { onNewConta: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-6">
        <FolderTree className="h-12 w-12 text-blue-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Selecione uma conta</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Clique em uma conta na árvore ao lado para ver seus detalhes, subcontas e movimentações.
      </p>
      <Button onClick={onNewConta} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="h-4 w-4 mr-2" />
        Nova Conta
      </Button>
    </div>
  );
}

// Main Component
export default function Accounts() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string | undefined>(undefined);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedContaId, setSelectedContaId] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const utils = trpc.useUtils();
  
  const { data: stats } = trpc.accounts.planoContasStats.useQuery();
  const { data: tree = [], isLoading } = trpc.accounts.planoContasTree.useQuery();
  const { data: insights } = trpc.accounts.planoContasInsights.useQuery();

  // Filtered tree
  const filteredTree = useMemo(() => {
    return tree.filter(conta => {
      if (filtroTipo && conta.tipo !== filtroTipo) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return conta.codigo.toLowerCase().includes(term) || 
               conta.nome.toLowerCase().includes(term);
      }
      return true;
    });
  }, [tree, filtroTipo, searchTerm]);

  const handleNew = () => setWizardOpen(true);
  
  const handleWizardSuccess = () => {
    utils.accounts.planoContasTree.invalidate();
    utils.accounts.planoContasStats.invalidate();
    utils.accounts.planoContasInsights.invalidate();
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectConta = (conta: PlanoContaItem) => {
    setSelectedContaId(conta.id);
    if (window.innerWidth < 1024) {
      setShowMobileDetail(true);
    }
  };

  const handleCloseMobileDetail = () => {
    setShowMobileDetail(false);
    setSelectedContaId(null);
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] lg:h-[calc(100vh-theme(spacing.8))] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <PageHeader
          title="Plano de Contas"
          description="Estrutura contábil ITG 2002 para entidades sem fins lucrativos"
          icon={<FolderTree className="h-8 w-8 text-blue-600" />}
        />
        <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Conta</span>
        </Button>
      </div>

      {/* Master-Detail Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Lista (Master) */}
        <Card className="lg:col-span-5 xl:col-span-4 flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 shrink-0 border-b">
            <div className="space-y-3">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Quick Stats */}
              <QuickStats 
                stats={stats} 
                filtroTipo={filtroTipo} 
                setFiltroTipo={setFiltroTipo} 
              />

              {/* Compliance */}
              <ComplianceBadgeRow insights={insights} />
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-2">
            <ContasList 
              contas={filteredTree} 
              selectedId={selectedContaId} 
              onSelect={handleSelectConta}
              expanded={expanded}
              onToggle={toggleExpand}
              searchTerm={searchTerm}
              isLoading={isLoading}
            />
          </CardContent>

          {/* Footer */}
          <div className="p-3 border-t shrink-0 text-xs text-muted-foreground text-center">
            {filteredTree.length} contas exibidas
          </div>
        </Card>

        {/* Detalhes (Detail) - Desktop */}
        <Card className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col overflow-hidden">
          {selectedContaId ? (
            <ContaDetail 
              contaId={selectedContaId} 
              onClose={() => setSelectedContaId(null)}
              onUpdated={() => {}}
            />
          ) : (
            <EmptySelection onNewConta={handleNew} />
          )}
        </Card>
      </div>

      {/* Detail Mobile Overlay */}
      {showMobileDetail && selectedContaId && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end pt-16">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseMobileDetail} />
          <div className="relative w-full max-w-2xl bg-background shadow-2xl animate-in slide-in-from-right duration-300">
            <ContaDetail 
              contaId={selectedContaId} 
              onClose={handleCloseMobileDetail}
              onUpdated={() => {}}
            />
          </div>
        </div>
      )}

      {/* Wizard Nova Conta */}
      <PlanoContasWizard 
        open={wizardOpen} 
        onOpenChange={setWizardOpen}
        onSuccess={handleWizardSuccess}
      />
    </div>
  );
}
