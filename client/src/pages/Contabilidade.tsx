import { useState, useMemo } from 'react';
import { 
  BookOpen, Plus, ChevronRight, ChevronDown, Search, Calendar, 
  FileText, CheckCircle2, AlertCircle, Lock, Unlock, RotateCcw,
  BarChart3, Calculator, Eye, EyeOff, Edit2, Trash2, Play, Ban, 
  Layers, ChevronsUpDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader, Pagination } from '@/components/ui/page-header';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

const TABS = [
  { id: 'plano', label: 'Plano de Contas', icon: Layers },
  { id: 'periodos', label: 'Períodos', icon: Calendar },
  { id: 'lancamentos', label: 'Lançamentos', icon: FileText },
  { id: 'balancete', label: 'Balancete', icon: BarChart3 },
] as const;

type TabId = typeof TABS[number]['id'];

const typeLabels: Record<string, string> = {
  ativo: 'Ativo',
  passivo: 'Passivo',
  patrimonio_social: 'Patrimônio',
  receita: 'Receita',
  despesa: 'Despesa',
};

const typeColors: Record<string, { bg: string; text: string; gradient: string }> = {
  ativo: { bg: 'bg-blue-500/10', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' },
  passivo: { bg: 'bg-orange-500/10', text: 'text-orange-600', gradient: 'from-orange-500 to-orange-600' },
  patrimonio_social: { bg: 'bg-purple-500/10', text: 'text-purple-600', gradient: 'from-purple-500 to-purple-600' },
  receita: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-600' },
  despesa: { bg: 'bg-rose-500/10', text: 'text-rose-600', gradient: 'from-rose-500 to-rose-600' },
};

const periodoStatusColors: Record<string, { bg: string; text: string; icon: typeof Lock }> = {
  aberto: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Unlock },
  em_revisao: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Eye },
  fechado: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Lock },
  reaberto: { bg: 'bg-orange-100', text: 'text-orange-700', icon: RotateCcw },
};

const lancamentoStatusColors: Record<string, { bg: string; text: string }> = {
  rascunho: { bg: 'bg-slate-100', text: 'text-slate-600' },
  efetivado: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  estornado: { bg: 'bg-rose-100', text: 'text-rose-700' },
};

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatMonth = (mes: number, ano: number) => {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[mes - 1]}/${ano}`;
};

// ============================================================================
// TAB: PLANO DE CONTAS
// ============================================================================

function PlanoContasTab() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editConta, setEditConta] = useState<any>(null);
  const [form, setForm] = useState({ codigo: '', nome: '', tipo: 'despesa', naturezaSaldo: 'devedora', classificacao: 'analitica', contaPaiId: '', descricao: '' });

  const utils = trpc.useUtils();
  const { data: tree = [], isLoading } = trpc.accounts.planoContasTree.useQuery();
  const { data: hierarchy = [] } = trpc.accounts.planoContasHierarchy.useQuery();
  const createMutation = trpc.accounts.planoContasCreate.useMutation({
    onSuccess: () => { utils.accounts.planoContasTree.invalidate(); setDialogOpen(false); toast.success('Conta criada'); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.accounts.planoContasUpdate.useMutation({
    onSuccess: () => { utils.accounts.planoContasTree.invalidate(); setDialogOpen(false); toast.success('Conta atualizada'); },
    onError: (e) => toast.error(e.message),
  });
  const toggleAtivoMutation = trpc.accounts.planoContasToggleAtivo.useMutation({
    onSuccess: (data) => { utils.accounts.planoContasTree.invalidate(); toast.success(data.ativo ? 'Conta ativada' : 'Conta desativada'); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => tree.filter(c => {
    if (typeFilter !== 'all' && c.tipo !== typeFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      return c.codigo.toLowerCase().includes(term) || c.nome.toLowerCase().includes(term);
    }
    return true;
  }), [tree, typeFilter, search]);

  const roots = useMemo(() => filtered.filter(c => !c.contaPaiId), [filtered]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleNew = () => {
    setEditConta(null);
    const nat = ['ativo', 'despesa'].includes('despesa') ? 'devedora' : 'credora';
    setForm({ codigo: '', nome: '', tipo: 'despesa', naturezaSaldo: nat, classificacao: 'analitica', contaPaiId: '', descricao: '' });
    setDialogOpen(true);
  };

  const handleEdit = (conta: any) => {
    setEditConta(conta);
    setForm({ codigo: conta.codigo, nome: conta.nome, tipo: conta.tipo, naturezaSaldo: conta.naturezaSaldo, classificacao: conta.classificacao, contaPaiId: conta.contaPaiId || '', descricao: '' });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.codigo.trim() || !form.nome.trim()) { toast.error('Preencha os campos obrigatórios'); return; }
    if (editConta) {
      updateMutation.mutate({ id: editConta.id, nome: form.nome, descricao: form.descricao || undefined });
    } else {
      createMutation.mutate({
        codigo: form.codigo,
        nome: form.nome,
        tipo: form.tipo as any,
        naturezaSaldo: form.naturezaSaldo as any,
        classificacao: form.classificacao as any,
        contaPaiId: form.contaPaiId || undefined,
        descricao: form.descricao || undefined,
      });
    }
  };

  const handleTypeChange = (tipo: string) => {
    const nat = ['ativo', 'despesa'].includes(tipo) ? 'devedora' : 'credora';
    setForm(f => ({ ...f, tipo, naturezaSaldo: nat }));
  };

  const renderTree = (conta: any, level = 0) => {
    const children = filtered.filter(c => c.contaPaiId === conta.id);
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(conta.id) || !!search;
    const colors = typeColors[conta.tipo] || typeColors.ativo;

    return (
      <div key={conta.id} className={cn(level > 0 && 'ml-4 border-l border-border/40 pl-3')}>
        <div className="group flex items-center gap-2 py-1.5 px-2 -ml-2 rounded-lg hover:bg-accent/50 transition-all">
          {hasChildren ? (
            <button onClick={() => toggleExpand(conta.id)} className="p-0.5 hover:bg-accent rounded">
              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
          ) : (
            <span className="w-5 flex justify-center"><span className={cn('w-1.5 h-1.5 rounded-full', colors.text.replace('text', 'bg'))} /></span>
          )}
          <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{conta.codigo}</span>
          <span className={cn('text-sm flex-1 truncate', conta.classificacao === 'sintetica' ? 'font-semibold' : 'font-medium', !conta.ativo && 'line-through text-muted-foreground')}>
            {conta.nome}
          </span>
          <Badge variant="outline" className={cn('text-[10px] px-1.5', colors.bg, colors.text)}>{typeLabels[conta.tipo]}</Badge>
          {conta.classificacao === 'sintetica' && <Badge variant="secondary" className="text-[10px] px-1.5">Σ</Badge>}
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleEdit(conta)} title="Editar"><Edit2 className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => toggleAtivoMutation.mutate({ id: conta.id })} title={conta.ativo ? 'Desativar' : 'Ativar'} disabled={toggleAtivoMutation.isPending}>
            {conta.ativo ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-emerald-600" />}
          </Button>
        </div>
        {isExpanded && hasChildren && children.map(c => renderTree(c, level + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar código ou nome..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setExpanded(new Set(tree.map(c => c.id)))} title="Expandir"><Eye className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => setExpanded(new Set())} title="Recolher"><ChevronsUpDown className="h-4 w-4" /></Button>
            <Button onClick={handleNew}><Plus className="h-4 w-4 mr-1" />Nova Conta</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" />Estrutura Hierárquica ITG 2002</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}</div>
          ) : (
            <div className="max-h-[60vh] overflow-auto">{roots.map(c => renderTree(c))}</div>
          )}
          <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">{filtered.length} contas exibidas</div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editConta ? 'Editar Conta' : 'Nova Conta Contábil'}</DialogTitle>
            <DialogDescription>{editConta ? 'Altere nome e descrição da conta.' : 'Preencha os dados conforme ITG 2002.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormSection title="Identificação" icon="🔢">
              <FormRow>
                <FormField>
                  <LabelWithHelp label="Código" help="Código hierárquico. Ex: 1.1.1.01" required />
                  <Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} disabled={!!editConta} placeholder="1.1.1.01" />
                </FormField>
                <FormField>
                  <LabelWithHelp label="Nome" help="Nome descritivo da conta" required />
                  <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome da conta" />
                </FormField>
              </FormRow>
            </FormSection>

            <FormSection title="Classificação" icon="📊">
              <FormRow>
                <FormField>
                  <LabelWithHelp label="Tipo" help="Grupo principal a que pertence" required />
                  <Select value={form.tipo} onValueChange={handleTypeChange} disabled={!!editConta}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField>
                  <LabelWithHelp label="Natureza" help="Devedora = aumenta com débitos (Ativo, Despesa)" required />
                  <Select value={form.naturezaSaldo} onValueChange={v => setForm(f => ({ ...f, naturezaSaldo: v }))} disabled>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="devedora">Devedora</SelectItem>
                      <SelectItem value="credora">Credora</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </FormRow>
              <FormRow>
                <FormField>
                  <LabelWithHelp label="Classificação" help="Sintética agrupa, Analítica recebe lançamentos" required />
                  <Select value={form.classificacao} onValueChange={v => setForm(f => ({ ...f, classificacao: v }))} disabled={!!editConta}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sintetica">Sintética (agrupa)</SelectItem>
                      <SelectItem value="analitica">Analítica (lançamentos)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                {!editConta && (
                  <FormField>
                    <LabelWithHelp label="Conta Pai" help="Conta de nível superior (opcional)" />
                    <Select value={form.contaPaiId || 'none'} onValueChange={v => setForm(f => ({ ...f, contaPaiId: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                        {hierarchy.filter(h => h.classificacao === 'sintetica' && h.tipo === form.tipo).map(h => (
                          <SelectItem key={h.id} value={h.id}>{h.codigo} - {h.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}
              </FormRow>
            </FormSection>

            <FormSection title="Observações" icon="📝">
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhamento de quando usar esta conta..." rows={2} />
            </FormSection>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : editConta ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// TAB: PERÍODOS CONTÁBEIS
// ============================================================================

function PeriodosTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'fechar' | 'reabrir'>('create');
  const [selectedPeriodo, setSelectedPeriodo] = useState<any>(null);
  const [formCreate, setFormCreate] = useState({ ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 });
  const [formObs, setFormObs] = useState('');
  const [formMotivo, setFormMotivo] = useState('');

  const utils = trpc.useUtils();
  const { data: periodos = [], isLoading } = trpc.periodosContabeis.list.useQuery();
  const { data: stats } = trpc.periodosContabeis.stats.useQuery();

  const createMutation = trpc.periodosContabeis.create.useMutation({
    onSuccess: () => { utils.periodosContabeis.list.invalidate(); utils.periodosContabeis.stats.invalidate(); setDialogOpen(false); toast.success('Período criado'); },
    onError: (e) => toast.error(e.message),
  });
  const fecharMutation = trpc.periodosContabeis.fechar.useMutation({
    onSuccess: () => { utils.periodosContabeis.list.invalidate(); setDialogOpen(false); toast.success('Período fechado. Saldos calculados.'); },
    onError: (e) => toast.error(e.message),
  });
  const reabrirMutation = trpc.periodosContabeis.reabrir.useMutation({
    onSuccess: () => { utils.periodosContabeis.list.invalidate(); setDialogOpen(false); toast.success('Período reaberto'); },
    onError: (e) => toast.error(e.message),
  });

  const handleNew = () => {
    setDialogMode('create');
    setFormCreate({ ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 });
    setDialogOpen(true);
  };

  const handleFechar = (p: any) => {
    setSelectedPeriodo(p);
    setDialogMode('fechar');
    setFormObs('');
    setDialogOpen(true);
  };

  const handleReabrir = (p: any) => {
    setSelectedPeriodo(p);
    setDialogMode('reabrir');
    setFormMotivo('');
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (dialogMode === 'create') createMutation.mutate({ ano: formCreate.ano, mes: formCreate.mes });
    else if (dialogMode === 'fechar') fecharMutation.mutate({ id: selectedPeriodo.id, observacoes: formObs || undefined });
    else if (dialogMode === 'reabrir') reabrirMutation.mutate({ id: selectedPeriodo.id, motivoReabertura: formMotivo });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-violet-100 text-violet-700">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">{stats?.abertos || 0} abertos</p>
          </div>
        </div>
        <Button onClick={handleNew}><Plus className="h-4 w-4 mr-1" />Novo Período</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="h-32" /></Card>)
        ) : periodos.length === 0 ? (
          <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">Nenhum período cadastrado. Crie o primeiro período para começar.</CardContent></Card>
        ) : periodos.map(p => {
          const st = periodoStatusColors[p.status] || periodoStatusColors.aberto;
          const Icon = st.icon;
          return (
            <Card key={p.id} className={cn('transition-all hover:shadow-md', p.status === 'fechado' && 'opacity-75')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold">{formatMonth(p.mes, p.ano)}</span>
                  <Badge className={cn(st.bg, st.text, 'gap-1')}><Icon className="h-3 w-3" />{p.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>{p.dataInicio} a {p.dataFim}</p>
                  {p.fechadoEm && <p>Fechado em {new Date(p.fechadoEm).toLocaleDateString('pt-BR')}</p>}
                  {p.motivoReabertura && <p className="text-orange-600">Reaberto: {p.motivoReabertura.slice(0, 30)}...</p>}
                </div>
                <div className="flex gap-2 mt-4">
                  {(p.status === 'aberto' || p.status === 'reaberto') && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleFechar(p)}><Lock className="h-3 w-3 mr-1" />Fechar</Button>
                  )}
                  {p.status === 'fechado' && (
                    <Button size="sm" variant="outline" className="flex-1 text-orange-600" onClick={() => handleReabrir(p)}><Unlock className="h-3 w-3 mr-1" />Reabrir</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' && 'Novo Período Contábil'}
              {dialogMode === 'fechar' && `Fechar ${selectedPeriodo ? formatMonth(selectedPeriodo.mes, selectedPeriodo.ano) : ''}`}
              {dialogMode === 'reabrir' && `Reabrir ${selectedPeriodo ? formatMonth(selectedPeriodo.mes, selectedPeriodo.ano) : ''}`}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create' && 'Crie um novo período mensal para lançamentos.'}
              {dialogMode === 'fechar' && 'O fechamento calcula os saldos de todas as contas e impede novos lançamentos.'}
              {dialogMode === 'reabrir' && 'A reabertura é excepcional e requer justificativa para auditoria.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {dialogMode === 'create' && (
              <FormRow>
                <FormField>
                  <LabelWithHelp label="Ano" help="Ano do período (ex: 2025)" required />
                  <Input type="number" value={formCreate.ano} onChange={e => setFormCreate(f => ({ ...f, ano: +e.target.value }))} min={2000} max={2100} />
                </FormField>
                <FormField>
                  <LabelWithHelp label="Mês" help="Mês do período (1 a 12)" required />
                  <Select value={String(formCreate.mes)} onValueChange={v => setFormCreate(f => ({ ...f, mes: +v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <SelectItem key={m} value={String(m)}>{formatMonth(m, formCreate.ano)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
              </FormRow>
            )}
            {dialogMode === 'fechar' && (
              <FormField>
                <LabelWithHelp label="Observações" help="Comentários opcionais sobre o fechamento" />
                <Textarea value={formObs} onChange={e => setFormObs(e.target.value)} placeholder="Observações do fechamento..." rows={3} />
              </FormField>
            )}
            {dialogMode === 'reabrir' && (
              <FormField error={formMotivo.length > 0 && formMotivo.length < 20 ? 'Mínimo 20 caracteres' : undefined}>
                <LabelWithHelp label="Motivo da Reabertura" help="Justifique a reabertura. Será registrado para auditoria." required />
                <Textarea value={formMotivo} onChange={e => setFormMotivo(e.target.value)} placeholder="Descreva detalhadamente o motivo..." rows={3} />
                <p className="text-xs text-muted-foreground">{formMotivo.length}/20 caracteres</p>
              </FormField>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || fecharMutation.isPending || reabrirMutation.isPending || (dialogMode === 'reabrir' && formMotivo.length < 20)}>
              {dialogMode === 'create' && 'Criar Período'}
              {dialogMode === 'fechar' && 'Fechar Período'}
              {dialogMode === 'reabrir' && 'Reabrir Período'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// TAB: LANÇAMENTOS
// ============================================================================

interface LinhaForm { contaId: string; tipo: 'debito' | 'credito'; valor: number; historicoComplementar?: string }

function LancamentosTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [estornoDialogOpen, setEstornoDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedLancamento, setSelectedLancamento] = useState<any>(null);
  const [estornoMotivo, setEstornoMotivo] = useState('');
  const [form, setForm] = useState({
    periodoId: '',
    dataLancamento: new Date().toISOString().split('T')[0],
    dataCompetencia: new Date().toISOString().split('T')[0],
    historico: '',
    efetivar: false,
    linhas: [{ contaId: '', tipo: 'debito' as const, valor: 0 }, { contaId: '', tipo: 'credito' as const, valor: 0 }],
  });

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.lancamentosContabeis.list.useQuery({ page, limit: 20, status: statusFilter !== 'all' ? statusFilter as any : undefined });
  const { data: stats } = trpc.lancamentosContabeis.stats.useQuery();
  const { data: periodos = [] } = trpc.periodosContabeis.list.useQuery();
  const { data: contas = [] } = trpc.accounts.planoContasHierarchy.useQuery();
  const { data: lancamentoDetalhes, isLoading: loadingDetalhes } = trpc.lancamentosContabeis.getById.useQuery(selectedLancamento?.id, { enabled: viewDialogOpen && !!selectedLancamento?.id });

  const createMutation = trpc.lancamentosContabeis.create.useMutation({
    onSuccess: () => { utils.lancamentosContabeis.list.invalidate(); utils.lancamentosContabeis.stats.invalidate(); setDialogOpen(false); toast.success('Lançamento criado'); },
    onError: (e) => toast.error(e.message),
  });
  const efetivarMutation = trpc.lancamentosContabeis.efetivar.useMutation({
    onSuccess: () => { utils.lancamentosContabeis.list.invalidate(); utils.lancamentosContabeis.stats.invalidate(); toast.success('Lançamento efetivado'); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.lancamentosContabeis.delete.useMutation({
    onSuccess: () => { utils.lancamentosContabeis.list.invalidate(); utils.lancamentosContabeis.stats.invalidate(); toast.success('Lançamento excluído'); },
    onError: (e) => toast.error(e.message),
  });
  const estornarMutation = trpc.lancamentosContabeis.estornar.useMutation({
    onSuccess: (data) => { utils.lancamentosContabeis.list.invalidate(); utils.lancamentosContabeis.stats.invalidate(); setEstornoDialogOpen(false); setEstornoMotivo(''); toast.success(`Lançamento estornado. Novo lançamento nº ${data.numero}`); },
    onError: (e) => toast.error(e.message),
  });

  const handleEstornar = (l: any) => { setSelectedLancamento(l); setEstornoMotivo(''); setEstornoDialogOpen(true); };
  const handleView = (l: any) => { setSelectedLancamento(l); setViewDialogOpen(true); };
  const submitEstorno = () => { if (estornoMotivo.length >= 10) estornarMutation.mutate({ id: selectedLancamento.id, motivo: estornoMotivo }); };

  const lancamentos = data?.lancamentos || [];
  const totalPages = data?.pages || 1;

  const periodosAbertos = periodos.filter(p => p.status === 'aberto' || p.status === 'reaberto');
  const contasAnaliticas = contas.filter(c => c.aceitaLancamento);

  const totalDebitos = form.linhas.filter(l => l.tipo === 'debito').reduce((s, l) => s + (l.valor || 0), 0);
  const totalCreditos = form.linhas.filter(l => l.tipo === 'credito').reduce((s, l) => s + (l.valor || 0), 0);
  const isBalanced = Math.abs(totalDebitos - totalCreditos) < 0.01;

  const handleNew = () => {
    setForm({
      periodoId: periodosAbertos[0]?.id || '',
      dataLancamento: new Date().toISOString().split('T')[0],
      dataCompetencia: new Date().toISOString().split('T')[0],
      historico: '',
      efetivar: false,
      linhas: [{ contaId: '', tipo: 'debito', valor: 0 }, { contaId: '', tipo: 'credito', valor: 0 }],
    });
    setDialogOpen(true);
  };

  const addLinha = () => setForm(f => ({ ...f, linhas: [...f.linhas, { contaId: '', tipo: 'debito', valor: 0 }] }));
  const removeLinha = (idx: number) => setForm(f => ({ ...f, linhas: f.linhas.filter((_, i) => i !== idx) }));
  const updateLinha = (idx: number, field: keyof LinhaForm, value: any) => {
    setForm(f => ({ ...f, linhas: f.linhas.map((l, i) => i === idx ? { ...l, [field]: value } : l) }));
  };

  const handleSubmit = () => {
    if (!form.periodoId) { toast.error('Selecione um período'); return; }
    if (form.historico.length < 10) { toast.error('Histórico deve ter no mínimo 10 caracteres'); return; }
    if (!isBalanced) { toast.error('Débitos e créditos devem ser iguais'); return; }
    if (form.linhas.some(l => !l.contaId || l.valor <= 0)) { toast.error('Preencha todas as linhas corretamente'); return; }

    createMutation.mutate({
      periodoId: form.periodoId,
      dataLancamento: form.dataLancamento,
      dataCompetencia: form.dataCompetencia,
      historico: form.historico,
      efetivar: form.efetivar,
      linhas: form.linhas.map(l => ({ ...l, valor: l.valor })),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></div>
            <div><p className="text-xl font-bold">{stats?.efetivados || 0}</p><p className="text-xs text-muted-foreground">Efetivados</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-slate-100 text-slate-600"><FileText className="h-5 w-5" /></div>
            <div><p className="text-xl font-bold">{stats?.rascunhos || 0}</p><p className="text-xs text-muted-foreground">Rascunhos</p></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="efetivado">Efetivado</SelectItem>
              <SelectItem value="estornado">Estornado</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleNew} disabled={periodosAbertos.length === 0}>
            <Plus className="h-4 w-4 mr-1" />Novo Lançamento
          </Button>
        </div>
      </div>

      {periodosAbertos.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800">Não há períodos abertos. Crie ou reabra um período para fazer lançamentos.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Nº</th>
                  <th className="text-left p-3 font-medium">Data</th>
                  <th className="text-left p-3 font-medium">Período</th>
                  <th className="text-left p-3 font-medium">Histórico</th>
                  <th className="text-right p-3 font-medium">Débito</th>
                  <th className="text-right p-3 font-medium">Crédito</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => <tr key={i}><td colSpan={8} className="p-3"><div className="h-6 bg-muted rounded animate-pulse" /></td></tr>)
                ) : lancamentos.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum lançamento encontrado</td></tr>
                ) : lancamentos.map(l => {
                  const st = lancamentoStatusColors[l.status] || lancamentoStatusColors.rascunho;
                  return (
                    <tr key={l.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{l.numero}</td>
                      <td className="p-3">{new Date(l.dataLancamento).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3">{l.periodo ? formatMonth(l.periodo.mes, l.periodo.ano) : '-'}</td>
                      <td className="p-3 max-w-[200px] truncate" title={l.historico}>{l.historico}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(Number(l.totalDebito))}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(Number(l.totalCredito))}</td>
                      <td className="p-3 text-center"><Badge className={cn(st.bg, st.text)}>{l.status}</Badge></td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(l)} title="Ver detalhes"><Eye className="h-3 w-3 text-violet-600" /></Button>
                          {l.status === 'rascunho' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => efetivarMutation.mutate({ id: l.id })} title="Efetivar"><Play className="h-3 w-3 text-emerald-600" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate({ id: l.id })} title="Excluir"><Trash2 className="h-3 w-3 text-rose-600" /></Button>
                            </>
                          )}
                          {l.status === 'efetivado' && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEstornar(l)} title="Estornar"><Ban className="h-3 w-3 text-orange-600" /></Button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-3 border-t">
              <Pagination page={page} totalPages={totalPages} totalItems={data?.total || 0} itemsShown={lancamentos.length} onPageChange={setPage} itemLabel="lançamentos" />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Novo Lançamento Contábil</DialogTitle>
            <DialogDescription>Registre um lançamento pelo método das partidas dobradas. Débitos devem ser iguais aos créditos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormSection title="Cabeçalho" icon="📋">
              <FormRow>
                <FormField>
                  <LabelWithHelp label="Período" help="Mês de competência do lançamento" required />
                  <Select value={form.periodoId} onValueChange={v => setForm(f => ({ ...f, periodoId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {periodosAbertos.map(p => <SelectItem key={p.id} value={p.id}>{formatMonth(p.mes, p.ano)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField>
                  <LabelWithHelp label="Data Lançamento" help="Data de registro no sistema" required />
                  <Input type="date" value={form.dataLancamento} onChange={e => setForm(f => ({ ...f, dataLancamento: e.target.value }))} />
                </FormField>
              </FormRow>
              <FormField>
                <LabelWithHelp label="Histórico" help="Descrição do fato contábil. Mínimo 10 caracteres." required />
                <Textarea value={form.historico} onChange={e => setForm(f => ({ ...f, historico: e.target.value }))} placeholder="Ex: Pagto conta luz Jan/2025 - NF 12345" rows={2} />
                <p className="text-xs text-muted-foreground">{form.historico.length}/10 caracteres mínimos</p>
              </FormField>
            </FormSection>

            <FormSection title="Partidas (Débito/Crédito)" icon="⚖️" badge={{ text: isBalanced ? '✓ Balanceado' : '✗ Desbalanceado', variant: isBalanced ? 'default' : 'destructive' }}>
              <div className="space-y-2">
                {form.linhas.map((linha, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <Select value={linha.tipo} onValueChange={v => updateLinha(idx, 'tipo', v)}>
                      <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debito">Débito</SelectItem>
                        <SelectItem value="credito">Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={linha.contaId} onValueChange={v => updateLinha(idx, 'contaId', v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione a conta..." /></SelectTrigger>
                      <SelectContent>
                        {contasAnaliticas.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" className="w-[120px]" placeholder="0,00" value={linha.valor || ''} onChange={e => updateLinha(idx, 'valor', parseFloat(e.target.value) || 0)} min={0} step={0.01} />
                    {form.linhas.length > 2 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => removeLinha(idx)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={addLinha}><Plus className="h-3 w-3 mr-1" />Adicionar Linha</Button>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 mt-3">
                <div className="flex items-center gap-4">
                  <span className="text-sm"><span className="text-muted-foreground">Débitos:</span> <strong className="text-blue-600">{formatCurrency(totalDebitos)}</strong></span>
                  <span className="text-sm"><span className="text-muted-foreground">Créditos:</span> <strong className="text-emerald-600">{formatCurrency(totalCreditos)}</strong></span>
                </div>
                {isBalanced ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
              </div>
            </FormSection>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <input type="checkbox" id="efetivar" checked={form.efetivar} onChange={e => setForm(f => ({ ...f, efetivar: e.target.checked }))} className="h-4 w-4" />
              <label htmlFor="efetivar" className="text-sm">Efetivar imediatamente (não ficará como rascunho)</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || !isBalanced}>{createMutation.isPending ? 'Salvando...' : 'Criar Lançamento'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Estorno */}
      <Dialog open={estornoDialogOpen} onOpenChange={setEstornoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600"><Ban className="h-5 w-5" />Estornar Lançamento</DialogTitle>
            <DialogDescription>O estorno cria um lançamento inverso para anular o efeito contábil. Lançamento nº {selectedLancamento?.numero}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField error={estornoMotivo.length > 0 && estornoMotivo.length < 10 ? 'Mínimo 10 caracteres' : undefined}>
              <LabelWithHelp label="Motivo do Estorno" help="Justifique o estorno. Será registrado no histórico." required />
              <Textarea value={estornoMotivo} onChange={e => setEstornoMotivo(e.target.value)} placeholder="Descreva o motivo do estorno..." rows={3} />
              <p className="text-xs text-muted-foreground">{estornoMotivo.length}/10 caracteres mínimos</p>
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEstornoDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={submitEstorno} disabled={estornarMutation.isPending || estornoMotivo.length < 10}>
              {estornarMutation.isPending ? 'Estornando...' : 'Confirmar Estorno'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar Detalhes */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-violet-600" />Lançamento nº {selectedLancamento?.numero}</DialogTitle>
            <DialogDescription>{selectedLancamento?.historico}</DialogDescription>
          </DialogHeader>
          {loadingDetalhes ? (
            <div className="py-8 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-6 bg-muted rounded animate-pulse" />)}</div>
          ) : lancamentoDetalhes ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Data:</span> {new Date(lancamentoDetalhes.dataLancamento).toLocaleDateString('pt-BR')}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={cn(lancamentoStatusColors[lancamentoDetalhes.status]?.bg, lancamentoStatusColors[lancamentoDetalhes.status]?.text)}>{lancamentoDetalhes.status}</Badge></div>
                <div><span className="text-muted-foreground">Origem:</span> {lancamentoDetalhes.origem}</div>
                <div><span className="text-muted-foreground">Competência:</span> {new Date(lancamentoDetalhes.dataCompetencia).toLocaleDateString('pt-BR')}</div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr><th className="p-2 text-left">D/C</th><th className="p-2 text-left">Conta</th><th className="p-2 text-right">Valor</th></tr></thead>
                  <tbody>
                    {lancamentoDetalhes.linhas.map((linha: any) => (
                      <tr key={linha.id} className="border-t">
                        <td className="p-2"><Badge className={linha.tipo === 'debito' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}>{linha.tipo === 'debito' ? 'D' : 'C'}</Badge></td>
                        <td className="p-2">{linha.conta?.codigo} - {linha.conta?.nome}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(Number(linha.valor))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 font-medium">
                    <tr><td colSpan={2} className="p-2 text-right">Total</td><td className="p-2 text-right font-mono">{formatCurrency(Number(lancamentoDetalhes.totalDebito))}</td></tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : null}
          <DialogFooter><Button variant="outline" onClick={() => setViewDialogOpen(false)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// TAB: BALANCETE
// ============================================================================

function BalanceteTab() {
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('');

  const { data: periodos = [] } = trpc.periodosContabeis.list.useQuery();
  const { data: balancete, isLoading } = trpc.saldosContabeis.getBalancete.useQuery(selectedPeriodo, { enabled: !!selectedPeriodo });

  const periodosFechados = periodos.filter(p => p.status === 'fechado');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-violet-600" />
          <span className="font-medium">Balancete de Verificação</span>
        </div>
        <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Selecione um período..." /></SelectTrigger>
          <SelectContent>
            {periodosFechados.length === 0 ? (
              <SelectItem value="" disabled>Nenhum período fechado</SelectItem>
            ) : periodosFechados.map(p => (
              <SelectItem key={p.id} value={p.id}>{formatMonth(p.mes, p.ano)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedPeriodo ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Selecione um período fechado para visualizar o balancete.</CardContent></Card>
      ) : isLoading ? (
        <Card><CardContent className="py-8"><div className="space-y-2">{[...Array(10)].map((_, i) => <div key={i} className="h-6 bg-muted rounded animate-pulse" />)}</div></CardContent></Card>
      ) : balancete ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="py-4 text-center"><p className="text-sm text-muted-foreground">Total Débitos</p><p className="text-xl font-bold text-blue-600">{formatCurrency(balancete.totais.debitos)}</p></CardContent></Card>
            <Card><CardContent className="py-4 text-center"><p className="text-sm text-muted-foreground">Total Créditos</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(balancete.totais.creditos)}</p></CardContent></Card>
            <Card><CardContent className="py-4 text-center"><p className="text-sm text-muted-foreground">Saldos Devedores</p><p className="text-xl font-bold">{formatCurrency(balancete.totais.saldosDevedores)}</p></CardContent></Card>
            <Card className={cn(balancete.totais.balanceado ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50')}>
              <CardContent className="py-4 text-center">
                <p className="text-sm text-muted-foreground">Saldos Credores</p>
                <p className="text-xl font-bold">{formatCurrency(balancete.totais.saldosCredores)}</p>
                {balancete.totais.balanceado && <Badge className="mt-1 bg-emerald-600">Balanceado ✓</Badge>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Código</th>
                      <th className="text-left p-3 font-medium">Conta</th>
                      <th className="text-center p-3 font-medium">Tipo</th>
                      <th className="text-right p-3 font-medium">Saldo Anterior</th>
                      <th className="text-right p-3 font-medium">Débitos</th>
                      <th className="text-right p-3 font-medium">Créditos</th>
                      <th className="text-right p-3 font-medium">Saldo Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balancete.linhas.filter(l => l.classificacao === 'analitica' && (l.debitos > 0 || l.creditos > 0 || l.saldoFinal !== 0)).map(l => {
                      const colors = typeColors[l.tipo] || typeColors.ativo;
                      return (
                        <tr key={l.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{l.codigo}</td>
                          <td className="p-3">{l.nome}</td>
                          <td className="p-3 text-center"><Badge className={cn('text-[10px]', colors.bg, colors.text)}>{typeLabels[l.tipo]}</Badge></td>
                          <td className="p-3 text-right font-mono">{formatCurrency(l.saldoAnterior)}</td>
                          <td className="p-3 text-right font-mono text-blue-600">{l.debitos > 0 ? formatCurrency(l.debitos) : '-'}</td>
                          <td className="p-3 text-right font-mono text-emerald-600">{l.creditos > 0 ? formatCurrency(l.creditos) : '-'}</td>
                          <td className={cn('p-3 text-right font-mono font-medium', l.saldoFinal < 0 && 'text-rose-600')}>{formatCurrency(l.saldoFinal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-muted/30 font-medium">
                    <tr>
                      <td colSpan={4} className="p-3 text-right">TOTAIS</td>
                      <td className="p-3 text-right font-mono text-blue-700">{formatCurrency(balancete.totais.debitos)}</td>
                      <td className="p-3 text-right font-mono text-emerald-700">{formatCurrency(balancete.totais.creditos)}</td>
                      <td className="p-3 text-right font-mono">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Contabilidade() {
  const [activeTab, setActiveTab] = useState<TabId>('plano');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contabilidade"
        description="Plano de Contas, Lançamentos e Demonstrações Contábeis conforme ITG 2002"
        icon={<BookOpen className="h-8 w-8 text-violet-600" />}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                activeTab === tab.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'plano' && <PlanoContasTab />}
        {activeTab === 'periodos' && <PeriodosTab />}
        {activeTab === 'lancamentos' && <LancamentosTab />}
        {activeTab === 'balancete' && <BalanceteTab />}
      </div>
    </div>
  );
}

