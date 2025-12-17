import { useState, useMemo } from 'react';
import { Plus, ChevronRight, ChevronDown, Edit2, Search, FolderTree, ChevronsUpDown, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader, FilterBar } from '@/components/ui/page-header';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const typeLabels: Record<string, string> = {
  asset: 'Ativo',
  liability: 'Passivo',
  equity: 'Patrimônio Social',
  revenue: 'Receita',
  expense: 'Despesa',
  fixed_asset: 'Imobilizado',
};

const typeColors: Record<string, string> = {
  asset: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  liability: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  equity: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  revenue: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  expense: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  fixed_asset: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

interface Account {
  id: number;
  code: string;
  name: string;
  type: string;
  parentId: number | null;
  level: number;
  active: number;
  description: string | null;
}

function AccountTree({ 
  accounts, 
  parentId = null, 
  level = 0, 
  onEdit,
  expandedAll,
  searchTerm,
}: { 
  accounts: Account[]; 
  parentId?: number | null; 
  level?: number; 
  onEdit: (a: Account) => void;
  expandedAll: boolean;
  searchTerm: string;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const children = accounts.filter((a) => a.parentId === parentId);

  // Auto-expand when searching
  const shouldExpand = (accountId: number) => {
    if (searchTerm) return true;
    if (expandedAll) return true;
    return expanded.has(accountId);
  };

  if (children.length === 0) return null;

  // Responsive indent: smaller on mobile
  const indentClass = level > 0 ? 'ml-3 sm:ml-6 border-l border-gray-200 dark:border-gray-700 pl-2 sm:pl-4' : '';

  return (
    <div className={indentClass}>
      {children.map((account) => {
        const hasChildren = accounts.some((a) => a.parentId === account.id);
        const isExpanded = shouldExpand(account.id);
        const isSynthetic = hasChildren;

        // Highlight search match
        const matchesSearch = searchTerm && (
          account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
          <div key={account.id} className="py-0.5">
            <div 
              className={cn(
                "flex items-center gap-1 sm:gap-2 group hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-1.5 sm:p-2 -ml-1 sm:-ml-2 transition-colors touch-target",
                matchesSearch && "bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-yellow-200 dark:ring-yellow-800"
              )}
            >
              {hasChildren ? (
                <button 
                  onClick={() => setExpanded((s) => { 
                    const n = new Set(s); 
                    isExpanded && !searchTerm ? n.delete(account.id) : n.add(account.id); 
                    return n; 
                  })} 
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-target shrink-0"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <span className="w-6 flex justify-center shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                </span>
              )}
              <span className="font-mono text-[10px] sm:text-sm text-muted-foreground min-w-[50px] sm:min-w-[80px] shrink-0">{account.code}</span>
              <span className={cn(
                'flex-1 text-xs sm:text-sm truncate min-w-0',
                !account.active && 'text-muted-foreground line-through',
                isSynthetic && 'font-medium'
              )}>
                {account.name}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="outline" className={cn('text-[10px] sm:text-xs hidden xs:inline-flex', typeColors[account.type])}>
                  {typeLabels[account.type]}
                </Badge>
                {isSynthetic && (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs hidden sm:inline-flex">
                    Sintética
                  </Badge>
                )}
                {!account.active && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline-flex">
                    Inativa
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 h-7 w-7 sm:h-8 sm:w-8 transition-opacity shrink-0 touch-target" 
                  onClick={() => onEdit(account)}
                  aria-label={`Editar conta ${account.name}`}
                >
                  <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
            {isExpanded && hasChildren && (
              <AccountTree 
                accounts={accounts} 
                parentId={account.id} 
                level={level + 1} 
                onEdit={onEdit} 
                expandedAll={expandedAll}
                searchTerm={searchTerm}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Accounts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [form, setForm] = useState({ code: '', name: '', type: 'expense' as string, parentId: '', description: '' });
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedAll, setExpandedAll] = useState(false);

  const utils = trpc.useUtils();
  const { data: accounts = [], isLoading } = trpc.accounts.list.useQuery();
  const createMutation = trpc.accounts.create.useMutation({ 
    onSuccess: () => { 
      utils.accounts.list.invalidate(); 
      setDialogOpen(false); 
      toast.success('Conta criada com sucesso'); 
    },
    onError: (error: any) => {
      toast.error('Erro ao criar conta', { 
        description: error?.message || 'Verifique os dados e tente novamente'
      });
    }
  });
  const updateMutation = trpc.accounts.update.useMutation({ 
    onSuccess: () => { 
      utils.accounts.list.invalidate(); 
      setDialogOpen(false); 
      toast.success('Conta atualizada'); 
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar conta', { 
        description: error?.message || 'Verifique os dados e tente novamente'
      });
    }
  });

  // Filtrar contas
  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      // Filtro de busca
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matches = account.code.toLowerCase().includes(term) || 
                       account.name.toLowerCase().includes(term);
        if (!matches) {
          // Check if any child matches
          const hasMatchingChild = accounts.some(child => 
            child.parentId === account.id && (
              child.code.toLowerCase().includes(term) ||
              child.name.toLowerCase().includes(term)
            )
          );
          if (!hasMatchingChild) return false;
        }
      }
      
      // Filtro de status
      if (statusFilter === 'active' && !account.active) return false;
      if (statusFilter === 'inactive' && account.active) return false;
      
      // Filtro de tipo
      if (typeFilter !== 'all' && account.type !== typeFilter) return false;
      
      return true;
    });
  }, [accounts, searchTerm, statusFilter, typeFilter]);

  // Estatísticas
  const stats = useMemo(() => {
    const synthetic = accounts.filter(a => accounts.some(c => c.parentId === a.id)).length;
    const analytic = accounts.length - synthetic;
    return { total: accounts.length, synthetic, analytic };
  }, [accounts]);

  const handleNew = () => { 
    setEditAccount(null); 
    setForm({ code: '', name: '', type: 'expense', parentId: '', description: '' }); 
    setDialogOpen(true); 
  };
  
  const handleEdit = (a: Account) => { 
    setEditAccount(a); 
    setForm({ 
      code: a.code, 
      name: a.name, 
      type: a.type, 
      parentId: a.parentId?.toString() || '', 
      description: a.description || '' 
    }); 
    setDialogOpen(true); 
  };

  const handleSubmit = () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    
    if (editAccount) {
      updateMutation.mutate({ id: editAccount.id, name: form.name, description: form.description });
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

  // Contas disponíveis para seleção como pai
  const parentableAccounts = accounts
    .filter(a => !editAccount || a.id !== editAccount.id)
    .sort((a, b) => a.code.localeCompare(b.code));

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || typeFilter !== 'all';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <PageHeader
        title="Plano de Contas"
        description="Estrutura hierárquica de contas contábeis"
        icon={<FolderTree className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />}
        actions={
          <Button onClick={handleNew} size="sm" className="touch-target">
            <Plus className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Nova </span>Conta
          </Button>
        }
      />

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <FilterBar showClear={hasActiveFilters} onClear={clearFilters}>
            {/* Busca */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {/* Filtro Status */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[100px] sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Filtro Tipo */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px] sm:w-[160px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(typeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Expandir/Recolher */}
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setExpandedAll(!expandedAll)}
                title={expandedAll ? 'Recolher tudo' : 'Expandir tudo'}
                className="touch-target shrink-0"
              >
                <ChevronsUpDown className="h-4 w-4" />
              </Button>
            </div>
          </FilterBar>
          
          {/* Info filtros */}
          {hasActiveFilters && (
            <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{filteredAccounts.length} de {accounts.length} contas</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Contas */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Contas</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 sm:h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            // Estado vazio inicial
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
              <FolderTree className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold">Nenhuma conta cadastrada</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 max-w-sm">
                Crie a primeira conta para organizar seu plano de contas.
              </p>
              <Button onClick={handleNew} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            </div>
          ) : filteredAccounts.length === 0 ? (
            // Estado sem resultados após filtro
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
              <Search className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold">Nenhuma conta encontrada</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Tente alterar os filtros.
              </p>
              <Button variant="link" onClick={clearFilters} size="sm">
                Limpar filtros
              </Button>
            </div>
          ) : (
            <>
              <div className="max-h-[60vh] overflow-auto">
                <AccountTree 
                  accounts={filteredAccounts} 
                  onEdit={handleEdit} 
                  expandedAll={expandedAll}
                  searchTerm={searchTerm}
                />
              </div>
              {/* Rodapé com estatísticas */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t text-xs sm:text-sm text-muted-foreground">
                {filteredAccounts.length} contas ({stats.analytic} analíticas, {stats.synthetic} sintéticas)
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{editAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editAccount 
                ? 'Altere as informações da conta contábil.'
                : 'Preencha os dados para criar uma nova conta.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm">
                  Código <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="code"
                  value={form.code} 
                  onChange={(e) => setForm({ ...form, code: e.target.value })} 
                  disabled={!!editAccount} 
                  placeholder="1.1.1.001" 
                  className="text-sm"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Ex: 1.1.1.001
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm">Tipo</Label>
                <Select 
                  value={form.type} 
                  onValueChange={(v) => setForm({ ...form, type: v })} 
                  disabled={!!editAccount}
                >
                  <SelectTrigger id="type" className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-sm">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="name"
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                placeholder="Nome da conta" 
                className="text-sm"
              />
            </div>
            
            {!editAccount && (
              <div className="space-y-2">
                <Label htmlFor="parentId" className="text-sm">Conta Pai (opcional)</Label>
                <Select 
                  value={form.parentId} 
                  onValueChange={(v) => setForm({ ...form, parentId: v })}
                >
                  <SelectTrigger id="parentId" className="text-sm">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" className="text-sm">Nenhuma</SelectItem>
                    {parentableAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id.toString()} className="text-sm">
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm">Descrição (opcional)</Label>
              <Textarea 
                id="description"
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })} 
                placeholder="Observações..." 
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : (editAccount ? 'Salvar' : 'Criar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
