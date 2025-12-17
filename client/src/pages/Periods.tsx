import { useState } from 'react';
import { Plus, Lock, Unlock, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { formatCurrency, formatPeriod } from '@/lib/utils';

export default function Periods() {
  const [createOpen, setCreateOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState<number | null>(null);
  const [form, setForm] = useState({ month: '', year: '', openingBalance: '' });
  const [closeForm, setCloseForm] = useState({ closingBalance: '', notes: '' });

  const utils = trpc.useUtils();
  const { data: periods = [] } = trpc.periods.list.useQuery();
  const createMutation = trpc.periods.create.useMutation({ onSuccess: () => { utils.periods.list.invalidate(); setCreateOpen(false); toast.success('Período criado'); } });
  const closeMutation = trpc.periods.close.useMutation({ onSuccess: () => { utils.periods.list.invalidate(); setCloseOpen(null); toast.success('Período fechado'); } });

  const handleCreate = () => {
    const ob = parseFloat(closeForm.closingBalance.replace(',', '.')) * 100 || 0;
    createMutation.mutate({ month: parseInt(form.month), year: parseInt(form.year), openingBalance: Math.round(ob) });
  };

  const handleClose = () => {
    if (!closeOpen) return;
    const cb = parseFloat(closeForm.closingBalance.replace(',', '.')) * 100;
    if (isNaN(cb)) { toast.error('Saldo inválido'); return; }
    closeMutation.mutate({ id: closeOpen, closingBalance: Math.round(cb), notes: closeForm.notes || undefined });
  };

  const openCloseDialog = (id: number) => {
    const period = periods.find(p => p.id === id);
    setCloseForm({ closingBalance: period ? (period.openingBalance / 100).toFixed(2) : '', notes: '' });
    setCloseOpen(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Períodos Contábeis</h1>
          <p className="text-muted-foreground">Gestão de períodos mensais</p>
        </div>
        <Button onClick={() => { setForm({ month: '', year: new Date().getFullYear().toString(), openingBalance: '' }); setCreateOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Período
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {periods.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum período cadastrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Saldo Abertura</TableHead>
                  <TableHead className="text-right">Saldo Fechamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium capitalize">{formatPeriod(p.month, p.year)}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'open' ? 'default' : p.status === 'closed' ? 'secondary' : 'outline'}>
                        {p.status === 'open' ? 'Aberto' : p.status === 'closed' ? 'Fechado' : 'Em Revisão'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(p.openingBalance)}</TableCell>
                    <TableCell className="text-right font-mono">{p.status === 'closed' ? formatCurrency(p.closingBalance) : '-'}</TableCell>
                    <TableCell className="text-right">
                      {p.status === 'open' && (
                        <Button size="sm" variant="outline" onClick={() => openCloseDialog(p.id)}>
                          <Lock className="mr-2 h-4 w-4" />
                          Fechar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Período</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mês</Label>
                <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <SelectItem key={m} value={m.toString()}>{new Date(2000, m - 1).toLocaleDateString('pt-BR', { month: 'long' })}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ano</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Saldo de Abertura (R$)</Label>
              <Input value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} placeholder="0,00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!closeOpen} onOpenChange={() => setCloseOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar Período</DialogTitle>
            <DialogDescription>Esta ação impedirá novos lançamentos neste período.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Saldo de Fechamento (R$)</Label>
              <Input value={closeForm.closingBalance} onChange={(e) => setCloseForm({ ...closeForm, closingBalance: e.target.value })} placeholder="0,00" />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea value={closeForm.notes} onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(null)}>Cancelar</Button>
            <Button onClick={handleClose} disabled={closeMutation.isPending}>Confirmar Fechamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

