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

  return (
    <div className={cn(level > 0 && 'ml-6 border-l border-gray-200 dark:border-gray-700 pl-4')}>
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
                "flex items-center gap-2 group hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-2 -ml-2 transition-colors",
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
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <span className="w-5 flex justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                </span>
              )}
              <span className="font-mono text-sm text-muted-foreground min-w-[80px]">{account.code}</span>
              <span className={cn(
                'flex-1 text-sm',
                !account.active && 'text-muted-foreground line-through',
                isSynthetic && 'font-medium'
              )}>
                {account.name}
              </span>
              <Badge variant="outline" className={cn('text-xs', typeColors[account.type])}>
                {typeLabels[account.type]}
              </Badge>
              {isSynthetic && (
                <Badge variant="secondary" className="text-xs">
                  Sintética
                </Badge>
              )}
              {!account.active && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Inativa
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 h-8 w-8 transition-opacity" 
                onClick={() => onEdit(account)}
                aria-label="Editar conta"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
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
    onError: (error) => {
      toast.error('Erro ao criar conta', { description: error.message });
    }
  });
  const updateMutation = trpc.accounts.update.useMutation({ 
    onSuccess: () => { 
      utils.accounts.list.invalidate(); 
      setDialogOpen(false); 
      toast.success('Conta atualizada'); 
    },
    onError: (error) => {
      toast.error('Erro ao atualizar conta', { description: error.message });
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plano de Contas</h1>
          <p className="text-muted-foreground">Estrutura hierárquica de contas contábeis</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Filtro Status */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[140px]">
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
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
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
            >
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Limpar filtros */}
          {hasActiveFilters && (
            <div className="mt-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Mostrando {filteredAccounts.length} de {accounts.length} contas
              </span>
              <Button variant="link" size="sm" onClick={clearFilters} className="text-primary">
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Contas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Contas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            // Estado vazio inicial
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma conta cadastrada</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Crie a primeira conta para começar a organizar seu plano de contas contábil.
              </p>
              <Button onClick={handleNew}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            </div>
          ) : filteredAccounts.length === 0 ? (
            // Estado sem resultados após filtro
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma conta encontrada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tente alterar os filtros ou o termo de busca.
              </p>
              <Button variant="link" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            <>
              <AccountTree 
                accounts={filteredAccounts} 
                onEdit={handleEdit} 
                expandedAll={expandedAll}
                searchTerm={searchTerm}
              />
              {/* Rodapé com estatísticas */}
              <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                Mostrando {filteredAccounts.length} contas ({stats.analytic} analíticas, {stats.synthetic} sintéticas)
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
            <DialogDescription>
              {editAccount 
                ? 'Altere as informações da conta contábil.'
                : 'Preencha os dados para criar uma nova conta no plano de contas.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">
                  Código <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="code"
                  value={form.code} 
                  onChange={(e) => setForm({ ...form, code: e.target.value })} 
                  disabled={!!editAccount} 
                  placeholder="1.1.1.001" 
                />
                <p className="text-xs text-muted-foreground">
                  Ex: 1.1.1.001 (números separados por ponto)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select 
                  value={form.type} 
                  onValueChange={(v) => setForm({ ...form, type: v })} 
                  disabled={!!editAccount}
                >
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
              <Label htmlFor="name">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="name"
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                placeholder="Nome da conta" 
              />
              <p className="text-xs text-muted-foreground">
                Nome que aparecerá nos relatórios
              </p>
            </div>
            
            {!editAccount && (
              <div className="space-y-2">
                <Label htmlFor="parentId">Conta Pai (opcional)</Label>
                <Select 
                  value={form.parentId} 
                  onValueChange={(v) => setForm({ ...form, parentId: v })}
                >
                  <SelectTrigger id="parentId">
                    <SelectValue placeholder="Selecionar conta pai..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma (conta de primeiro nível)</SelectItem>
                    {parentableAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para criar uma conta de primeiro nível
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea 
                id="description"
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })} 
                placeholder="Observações sobre esta conta..." 
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : (editAccount ? 'Salvar' : 'Criar Conta')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
