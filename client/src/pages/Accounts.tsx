import { useState } from 'react';
import { Plus, ChevronRight, ChevronDown, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  asset: 'bg-blue-100 text-blue-700',
  liability: 'bg-orange-100 text-orange-700',
  equity: 'bg-gray-100 text-gray-700',
  revenue: 'bg-green-100 text-green-700',
  expense: 'bg-red-100 text-red-700',
  fixed_asset: 'bg-purple-100 text-purple-700',
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

function AccountTree({ accounts, parentId = null, level = 0, onEdit }: { accounts: Account[]; parentId?: number | null; level?: number; onEdit: (a: Account) => void }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const children = accounts.filter((a) => a.parentId === parentId);

  if (children.length === 0) return null;

  return (
    <div className={cn(level > 0 && 'ml-6 border-l pl-4')}>
      {children.map((account) => {
        const hasChildren = accounts.some((a) => a.parentId === account.id);
        const isExpanded = expanded.has(account.id);

        return (
          <div key={account.id} className="py-1">
            <div className="flex items-center gap-2 group hover:bg-gray-50 rounded-lg p-2 -ml-2">
              {hasChildren ? (
                <button onClick={() => setExpanded((s) => { const n = new Set(s); isExpanded ? n.delete(account.id) : n.add(account.id); return n; })} className="p-0.5">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <span className="w-5" />
              )}
              <span className="font-mono text-sm text-muted-foreground">{account.code}</span>
              <span className={cn('flex-1', !account.active && 'text-muted-foreground line-through')}>{account.name}</span>
              <Badge className={cn('text-xs', typeColors[account.type])}>{typeLabels[account.type]}</Badge>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => onEdit(account)}>
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
            {isExpanded && hasChildren && <AccountTree accounts={accounts} parentId={account.id} level={level + 1} onEdit={onEdit} />}
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

  const utils = trpc.useUtils();
  const { data: accounts = [] } = trpc.accounts.list.useQuery();
  const createMutation = trpc.accounts.create.useMutation({ onSuccess: () => { utils.accounts.list.invalidate(); setDialogOpen(false); toast.success('Conta criada'); } });
  const updateMutation = trpc.accounts.update.useMutation({ onSuccess: () => { utils.accounts.list.invalidate(); setDialogOpen(false); toast.success('Conta atualizada'); } });

  const handleNew = () => { setEditAccount(null); setForm({ code: '', name: '', type: 'expense', parentId: '', description: '' }); setDialogOpen(true); };
  const handleEdit = (a: Account) => { setEditAccount(a); setForm({ code: a.code, name: a.name, type: a.type, parentId: a.parentId?.toString() || '', description: a.description || '' }); setDialogOpen(true); };

  const handleSubmit = () => {
    if (editAccount) {
      updateMutation.mutate({ id: editAccount.id, name: form.name, description: form.description });
    } else {
      createMutation.mutate({ code: form.code, name: form.name, type: form.type as any, parentId: form.parentId ? parseInt(form.parentId) : undefined, description: form.description || undefined });
    }
  };

  const syntheticAccounts = accounts.filter((a) => accounts.some((c) => c.parentId === a.id));

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Contas</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma conta cadastrada</p>
          ) : (
            <AccountTree accounts={accounts} onEdit={handleEdit} />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Código</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editAccount} placeholder="1.1.1.001" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })} disabled={!!editAccount}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome da conta" />
            </div>
            {!editAccount && (
              <div>
                <Label>Conta Pai (opcional)</Label>
                <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {syntheticAccounts.concat(accounts.filter(a => !accounts.some(c => c.parentId === a.id))).sort((a,b) => a.code.localeCompare(b.code)).map((a) => <SelectItem key={a.id} value={a.id.toString()}>{a.code} - {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editAccount ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

