import { useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/page-header';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { formatCurrency, formatDate, formatPeriod } from '@/lib/utils';

export default function Entries() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ periodId: '', accountId: '', type: 'debit' as 'debit' | 'credit', amountCents: '', transactionDate: '', description: '', isNfc: false, nfcCategory: '' as '' | 'project_70' | 'operating_30', notes: '' });

  const utils = trpc.useUtils();
  const { data: periods = [] } = trpc.periods.list.useQuery();
  const { data: accounts = [] } = trpc.accounts.list.useQuery();
  const { data: entriesData } = trpc.entries.list.useQuery({ 
    periodId: periodFilter ? parseInt(periodFilter) : undefined,
    page,
    limit: 20,
  });
  const createMutation = trpc.entries.create.useMutation({ onSuccess: () => { utils.entries.list.invalidate(); setDialogOpen(false); toast.success('Lançamento criado'); } });
  const exportMutation = trpc.entries.exportCSV.useMutation();

  const analyticAccounts = accounts.filter((a) => !accounts.some((c) => c.parentId === a.id) && a.active);
  const openPeriods = periods.filter((p) => p.status === 'open');

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({ periodId: periodFilter ? parseInt(periodFilter) : undefined });
      
      // Download CSV
      const blob = new Blob(['\ufeff' + result.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lancamentos_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`${result.count} lançamentos exportados`);
    } catch (error: any) {
      toast.error('Erro ao exportar dados', {
        description: error?.message || 'Tente novamente'
      });
    }
  };

  const handleNew = () => {
    const today = new Date().toISOString().split('T')[0];
    const currentPeriod = periods.find((p) => p.status === 'open');
    setForm({ periodId: currentPeriod?.id.toString() || '', accountId: '', type: 'debit', amountCents: '', transactionDate: today, description: '', isNfc: false, nfcCategory: '', notes: '' });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const amount = parseFloat(form.amountCents.replace(',', '.')) * 100;
    if (isNaN(amount) || amount <= 0) { toast.error('Valor inválido'); return; }
    
    createMutation.mutate({
      periodId: parseInt(form.periodId),
      accountId: parseInt(form.accountId),
      type: form.type,
      amountCents: Math.round(amount),
      transactionDate: form.transactionDate,
      description: form.description,
      isNfc: form.isNfc,
      nfcCategory: form.isNfc && form.type === 'debit' ? (form.nfcCategory as any) : undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Lançamentos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Registro de receitas e despesas</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExport} disabled={exportMutation.isPending} size="sm" className="flex-1 sm:flex-none">
            <Download className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Exportar </span>CSV
          </Button>
          <Button onClick={handleNew} size="sm" className="flex-1 sm:flex-none">
            <Plus className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Novo </span>Lançamento
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-full sm:w-64">
              <Label className="text-sm">Período</Label>
              <Select value={periodFilter || 'all'} onValueChange={(v) => { setPeriodFilter(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {periods.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{formatPeriod(p.month, p.year)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 sm:p-6 sm:pt-6">
          {!entriesData?.entries.length ? (
            <p className="text-center text-muted-foreground py-8 text-sm px-4">Nenhum lançamento encontrado</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Data</TableHead>
                      <TableHead className="text-xs sm:text-sm">Descrição</TableHead>
                      <TableHead className="text-xs sm:text-sm">Conta</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm">Valor</TableHead>
                      <TableHead className="text-xs sm:text-sm">Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entriesData.entries.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs sm:text-sm whitespace-nowrap">{formatDate(e.transactionDate)}</TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[150px] sm:max-w-none">{e.description}</span>
                            {e.isNfc === 1 && <Badge variant="nfc" className="text-[10px] shrink-0">NFC</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm max-w-[150px] truncate">{e.account?.code} - {e.account?.name}</TableCell>
                        <TableCell className="text-right font-mono text-xs sm:text-sm whitespace-nowrap">{formatCurrency(e.amountCents)}</TableCell>
                        <TableCell><Badge variant={e.type === 'credit' ? 'revenue' : 'expense'} className="text-[10px] sm:text-xs">{e.type === 'credit' ? 'Crédito' : 'Débito'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="px-4 sm:px-0 mt-4">
                <Pagination
                  page={page}
                  totalPages={entriesData?.pages || 1}
                  totalItems={entriesData?.total || 0}
                  itemsShown={entriesData?.entries.length || 0}
                  onPageChange={setPage}
                  itemLabel="lançamentos"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Lançamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Período</Label>
                <Select value={form.periodId} onValueChange={(v) => setForm({ ...form, periodId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {openPeriods.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{formatPeriod(p.month, p.year)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Conta</Label>
              <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>
                  {analyticAccounts.map((a) => <SelectItem key={a.id} value={a.id.toString()}>{a.code} - {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Débito (Despesa)</SelectItem>
                    <SelectItem value="credit">Crédito (Receita)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input value={form.amountCents} onChange={(e) => setForm({ ...form, amountCents: e.target.value })} placeholder="0,00" />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição do lançamento" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.isNfc} onCheckedChange={(c) => setForm({ ...form, isNfc: !!c })} id="isNfc" />
              <Label htmlFor="isNfc">Recurso da Nota Fiscal Cidadã</Label>
            </div>
            {form.isNfc && form.type === 'debit' && (
              <div>
                <Label>Categoria NFC</Label>
                <Select value={form.nfcCategory} onValueChange={(v) => setForm({ ...form, nfcCategory: v as any })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project_70">70% Projeto</SelectItem>
                    <SelectItem value="operating_30">30% Custeio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

