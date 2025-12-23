import { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Building2, Car, Monitor, Armchair, Cpu, Package, 
  Edit2, ArrowRightLeft, XCircle, Calculator,
  TrendingDown, DollarSign, Boxes, ChevronDown, X, Lock, Info,
  MapPin, FileText, Calendar, AlertTriangle, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader, Pagination } from '@/components/ui/page-header';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { PatrimonioWizard } from '@/components/patrimonio';

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface BemPatrimonial {
  id: string;
  codigo: string;
  descricao: string;
  categoria: 'imovel' | 'veiculo' | 'equipamento' | 'mobiliario' | 'informatica' | 'outro';
  dataAquisicao: string;
  valorAquisicao: number;
  valorResidual: number;
  vidaUtilMeses: number;
  metodoDepreciacao: 'linear' | 'nenhum';
  contaAtivoId: string | null;
  contaDepreciacaoId: string | null;
  contaDepreciacaoAcumId: string | null;
  fornecedorId: string | null;
  fornecedorNome: string | null;
  numeroNotaFiscal: string | null;
  localizacao: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  projetoId: string | null;
  projetoNome: string | null;
  fundoId: string | null;
  fundoNome: string | null;
  status: 'em_uso' | 'em_manutencao' | 'baixado' | 'alienado' | 'perdido';
  dataBaixa: string | null;
  motivoBaixa: string | null;
  valorBaixa: number | null;
  depreciacaoAcumulada: number;
  valorContabil: number;
}

interface TimelineEvent {
  id: string;
  tipo: 'cadastro' | 'edicao' | 'transferencia' | 'depreciacao' | 'baixa';
  data: string;
  usuario: string;
  descricao: string;
  detalhes?: Record<string, any>;
}

const categoriaConfig: Record<string, { label: string; icon: typeof Building2; vidaUtilPadrao: number; color: string }> = {
  imovel: { label: 'Imóvel', icon: Building2, vidaUtilPadrao: 300, color: 'bg-blue-500' },
  veiculo: { label: 'Veículo', icon: Car, vidaUtilPadrao: 60, color: 'bg-emerald-500' },
  equipamento: { label: 'Equipamento', icon: Monitor, vidaUtilPadrao: 120, color: 'bg-amber-500' },
  mobiliario: { label: 'Mobiliário', icon: Armchair, vidaUtilPadrao: 120, color: 'bg-purple-500' },
  informatica: { label: 'Informática', icon: Cpu, vidaUtilPadrao: 60, color: 'bg-rose-500' },
  outro: { label: 'Outro', icon: Package, vidaUtilPadrao: 60, color: 'bg-gray-500' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  em_uso: { label: 'Em uso', color: 'bg-emerald-500' },
  em_manutencao: { label: 'Em manutenção', color: 'bg-amber-500' },
  baixado: { label: 'Baixado', color: 'bg-gray-500' },
  alienado: { label: 'Alienado', color: 'bg-blue-500' },
  perdido: { label: 'Perdido', color: 'bg-rose-500' },
};

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatCurrencyCompact = (value: number): string => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
};

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR');
const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

// Mock data
const mockBens: BemPatrimonial[] = [
  {
    id: '1', codigo: 'VEI-001', descricao: 'Van Mercedes Sprinter 2020 15 lugares', categoria: 'veiculo',
    dataAquisicao: '2020-03-15', valorAquisicao: 180000, valorResidual: 30000, vidaUtilMeses: 60,
    metodoDepreciacao: 'linear', contaAtivoId: '1', contaDepreciacaoId: '2', contaDepreciacaoAcumId: '3',
    fornecedorId: '1', fornecedorNome: 'Concessionária Mercedes', numeroNotaFiscal: '123456',
    localizacao: 'Garagem Principal', responsavelId: '1', responsavelNome: 'João Silva',
    projetoId: '1', projetoNome: 'Projeto Van Social', fundoId: '1', fundoNome: 'Fundo Restrito Doações',
    status: 'em_uso', dataBaixa: null, motivoBaixa: null, valorBaixa: null,
    depreciacaoAcumulada: 45000, valorContabil: 135000,
  },
  {
    id: '2', codigo: 'IMO-001', descricao: 'Templo Principal - Rua das Flores, 100 - Centro', categoria: 'imovel',
    dataAquisicao: '2015-01-10', valorAquisicao: 800000, valorResidual: 200000, vidaUtilMeses: 300,
    metodoDepreciacao: 'linear', contaAtivoId: '4', contaDepreciacaoId: '5', contaDepreciacaoAcumId: '6',
    fornecedorId: null, fornecedorNome: null, numeroNotaFiscal: null, localizacao: 'Centro',
    responsavelId: '2', responsavelNome: 'Maria Santos', projetoId: null, projetoNome: null,
    fundoId: null, fundoNome: null, status: 'em_uso', dataBaixa: null, motivoBaixa: null, valorBaixa: null,
    depreciacaoAcumulada: 240000, valorContabil: 560000,
  },
  {
    id: '3', codigo: 'SOM-001', descricao: 'Mesa de Som Yamaha 32 canais', categoria: 'equipamento',
    dataAquisicao: '2022-06-20', valorAquisicao: 15000, valorResidual: 0, vidaUtilMeses: 120,
    metodoDepreciacao: 'linear', contaAtivoId: '7', contaDepreciacaoId: '8', contaDepreciacaoAcumId: '9',
    fornecedorId: '2', fornecedorNome: 'Audio Pro LTDA', numeroNotaFiscal: '789012',
    localizacao: 'Salão Principal', responsavelId: '3', responsavelNome: 'Pedro Oliveira',
    projetoId: null, projetoNome: null, fundoId: null, fundoNome: null, status: 'em_uso',
    dataBaixa: null, motivoBaixa: null, valorBaixa: null, depreciacaoAcumulada: 3750, valorContabil: 11250,
  },
];

const mockTimeline: TimelineEvent[] = [
  { id: '1', tipo: 'depreciacao', data: '2024-11-01T10:30:00', usuario: 'Sistema', descricao: 'Depreciação Nov/2024: R$ 2.500,00' },
  { id: '2', tipo: 'depreciacao', data: '2024-10-01T10:30:00', usuario: 'Sistema', descricao: 'Depreciação Out/2024: R$ 2.500,00' },
  { id: '3', tipo: 'transferencia', data: '2024-06-15T14:22:00', usuario: 'Maria Santos', descricao: 'Transferência de local', detalhes: { de: 'Estacionamento', para: 'Garagem' } },
  { id: '4', tipo: 'cadastro', data: '2020-03-15T09:00:00', usuario: 'Admin', descricao: 'Cadastro inicial' },
];

// ============================================================================
// QUICK STATS (Clicáveis)
// ============================================================================

function QuickStats({ stats, statusFilter, setStatusFilter }: { 
  stats: { total: number; ativos: number; inativos: number };
  statusFilter: 'all' | 'ativos' | 'inativos';
  setStatusFilter: (v: 'all' | 'ativos' | 'inativos') => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <button 
        onClick={() => setStatusFilter('all')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          statusFilter === 'all' ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">📦</span>
        <p className="text-lg font-bold">{stats.total}</p>
        <p className="text-[10px] text-muted-foreground">Total</p>
      </button>
      <button 
        onClick={() => setStatusFilter(statusFilter === 'ativos' ? 'all' : 'ativos')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          statusFilter === 'ativos' ? 'bg-emerald-100 ring-2 ring-emerald-500' : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">✅</span>
        <p className="text-lg font-bold text-emerald-600">{stats.ativos}</p>
        <p className="text-[10px] text-muted-foreground">Em Uso</p>
      </button>
      <button 
        onClick={() => setStatusFilter(statusFilter === 'inativos' ? 'all' : 'inativos')}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          statusFilter === 'inativos' ? 'bg-slate-200 ring-2 ring-slate-500' : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">📋</span>
        <p className="text-lg font-bold text-slate-600">{stats.inativos}</p>
        <p className="text-[10px] text-muted-foreground">Baixados</p>
      </button>
    </div>
  );
}

// ============================================================================
// KPIs COMPACTOS
// ============================================================================

function KPIsCompact({ stats }: { stats: { valorAquisicao: number; deprecAcum: number; valorContabil: number } }) {
  const percentDeprec = stats.valorAquisicao > 0 ? stats.deprecAcum / stats.valorAquisicao : 0;
  return (
    <div className="p-3 rounded-lg bg-slate-50 border space-y-2">
      <p className="text-xs font-medium text-muted-foreground">💰 Resumo Financeiro</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-sm font-bold text-slate-700">{formatCurrencyCompact(stats.valorAquisicao)}</p>
          <p className="text-[10px] text-muted-foreground">Aquisição</p>
        </div>
        <div>
          <p className="text-sm font-bold text-amber-600">{formatCurrencyCompact(stats.deprecAcum)}</p>
          <p className="text-[10px] text-muted-foreground">Depreciado</p>
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-600">{formatCurrencyCompact(stats.valorContabil)}</p>
          <p className="text-[10px] text-muted-foreground">Contábil</p>
        </div>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${percentDeprec * 100}%` }} />
      </div>
      <p className="text-[10px] text-center text-muted-foreground">{formatPercent(percentDeprec)} depreciado</p>
    </div>
  );
}

// ============================================================================
// BENS LIST (Cards clicáveis)
// ============================================================================

function BensList({ bens, selectedId, onSelect, isLoading }: { 
  bens: BemPatrimonial[]; 
  selectedId: string | null;
  onSelect: (bem: BemPatrimonial) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (bens.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-3">
          <Search className="h-8 w-8 opacity-40" />
        </div>
        <p className="text-sm font-medium">Nenhum bem encontrado</p>
        <p className="text-xs mt-1">Tente outros termos de busca</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {bens.map((bem) => {
        const cat = categoriaConfig[bem.categoria];
        const st = statusConfig[bem.status];
        const CatIcon = cat.icon;
        const isInativo = ['baixado', 'alienado', 'perdido'].includes(bem.status);
        
        return (
          <button
            key={bem.id}
            onClick={() => onSelect(bem)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
              'hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
              selectedId === bem.id && 'bg-blue-100 ring-2 ring-blue-500',
              isInativo && 'opacity-60'
            )}
          >
            <div className={cn('p-2 rounded-lg shrink-0', cat.color)}>
              <CatIcon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-muted-foreground">{bem.codigo}</span>
                <Badge className={cn('text-white text-[10px] px-1.5 py-0', st.color)}>{st.label}</Badge>
              </div>
              <p className="font-medium text-sm truncate mt-0.5">{bem.descricao}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium text-emerald-600">{formatCurrencyCompact(bem.valorContabil)}</span>
                {(bem.projetoNome || bem.fundoNome) && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {bem.projetoNome || bem.fundoNome}
                  </Badge>
                )}
              </div>
            </div>
            <ChevronRight className={cn('h-4 w-4 text-slate-300 shrink-0 transition-transform', 
              selectedId === bem.id && 'text-blue-500 rotate-90')} />
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// EMPTY SELECTION STATE
// ============================================================================

function EmptySelection({ onNewBem }: { onNewBem: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-6">
        <Boxes className="h-12 w-12 text-blue-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Selecione um bem</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Clique em um bem na lista ao lado para ver detalhes, editar informações, transferir ou registrar baixa.
      </p>
      <Button onClick={onNewBem} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="h-4 w-4 mr-2" />
        Novo Bem
      </Button>
    </div>
  );
}

// ============================================================================
// DETAIL PANEL (Inline, não slide-in)
// ============================================================================

function DetailPanel({ bem, timeline, onEdit, onTransfer, onBaixa }: { 
  bem: BemPatrimonial;
  timeline: TimelineEvent[];
  onEdit: () => void;
  onTransfer: () => void;
  onBaixa: () => void;
}) {
  const cat = categoriaConfig[bem.categoria];
  const st = statusConfig[bem.status];
  const CatIcon = cat.icon;
  const percentDepreciado = bem.valorAquisicao > 0 ? bem.depreciacaoAcumulada / bem.valorAquisicao : 0;
  const percentContabil = bem.valorAquisicao > 0 ? bem.valorContabil / bem.valorAquisicao : 0;
  const isAtivo = !['baixado', 'alienado', 'perdido'].includes(bem.status);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b shrink-0">
        <div className="flex items-start gap-4">
          <div className={cn('p-3 rounded-lg', cat.color)}>
            <CatIcon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground">{bem.codigo}</span>
              <Badge className={cn('text-white', st.color)}>{st.label}</Badge>
            </div>
            <h2 className="text-lg font-bold mt-1 line-clamp-2">{bem.descricao}</h2>
          </div>
        </div>
        {isAtivo && (
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={onEdit}><Edit2 className="h-4 w-4 mr-1" /> Editar</Button>
            <Button variant="outline" size="sm" onClick={onTransfer}><ArrowRightLeft className="h-4 w-4 mr-1" /> Transferir</Button>
            <Button variant="destructive" size="sm" onClick={onBaixa}><XCircle className="h-4 w-4 mr-1" /> Baixar</Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Aquisição</p>
            <p className="text-lg font-bold">{formatCurrency(bem.valorAquisicao)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Deprec. Acumulada</p>
            <p className="text-lg font-bold text-amber-600">{formatCurrency(bem.depreciacaoAcumulada)}</p>
            <p className="text-xs text-muted-foreground">({formatPercent(percentDepreciado)})</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Valor Contábil</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(bem.valorContabil)}</p>
            <p className="text-xs text-muted-foreground">({formatPercent(percentContabil)})</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Residual</p>
            <p className="text-lg font-bold">{formatCurrency(bem.valorResidual)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Vida Útil</p>
            <p className="text-lg font-bold">{bem.vidaUtilMeses} meses</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Método</p>
            <p className="text-lg font-bold">{bem.metodoDepreciacao === 'linear' ? 'Linear' : 'Não deprecia'}</p>
          </Card>
        </div>

        {/* Identification Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" /> Identificação e Aquisição
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Categoria:</span><span>{cat.label}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Data Aquisição:</span><span>{formatDate(bem.dataAquisicao)}</span></div>
            {bem.fornecedorNome && <div className="flex justify-between"><span className="text-muted-foreground">Fornecedor:</span><span>{bem.fornecedorNome}</span></div>}
            {bem.numeroNotaFiscal && <div className="flex justify-between"><span className="text-muted-foreground">Nota Fiscal:</span><span>{bem.numeroNotaFiscal}</span></div>}
          </CardContent>
        </Card>

        {/* Location Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Localização e Responsável
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Localização:</span><span>{bem.localizacao || '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Responsável:</span><span>{bem.responsavelNome || '-'}</span></div>
          </CardContent>
        </Card>

        {/* Links Section */}
        {(bem.projetoNome || bem.fundoNome) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Boxes className="h-4 w-4" /> Vínculos
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {bem.projetoNome && <Badge variant="outline">{bem.projetoNome}</Badge>}
              {bem.fundoNome && <Badge variant="outline">{bem.fundoNome}</Badge>}
            </CardContent>
          </Card>
        )}

        {/* Timeline Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Linha do Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timeline.map(event => (
                <div key={event.id} className="flex gap-3 text-sm">
                  <div className="text-xs text-muted-foreground w-20 shrink-0">
                    {new Date(event.data).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{event.descricao}</p>
                    <p className="text-xs text-muted-foreground">por {event.usuario}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// DIALOGS
// ============================================================================

function TransferDialog({ open, onOpenChange, bem, onSave }: { 
  open: boolean; onOpenChange: (open: boolean) => void; bem: BemPatrimonial | null;
  onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({ novaLocalizacao: '', novoResponsavelId: '', motivo: '' });
  useEffect(() => { setForm({ novaLocalizacao: '', novoResponsavelId: '', motivo: '' }); }, [open]);
  if (!bem) return null;

  const handleSubmit = () => {
    if (form.motivo.length < 10) { toast.error('Descreva o motivo (mín. 10 caracteres)'); return; }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Bem - {bem.codigo}</DialogTitle>
          <DialogDescription>Registre a mudança de local ou responsável.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Card className="bg-gray-50">
            <CardContent className="p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Local atual:</span><span>{bem.localizacao || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Responsável atual:</span><span>{bem.responsavelNome || '-'}</span></div>
            </CardContent>
          </Card>
          <div className="space-y-2">
            <Label>Nova Localização</Label>
            <Input value={form.novaLocalizacao} onChange={e => setForm(f => ({ ...f, novaLocalizacao: e.target.value }))} placeholder="Deixe vazio para manter" />
          </div>
          <div className="space-y-2">
            <Label>Novo Responsável</Label>
            <Select value={form.novoResponsavelId} onValueChange={v => setForm(f => ({ ...f, novoResponsavelId: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">João Silva</SelectItem>
                <SelectItem value="2">Maria Santos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Textarea value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Descreva o motivo..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Transferir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BaixaDialog({ open, onOpenChange, bem, onSave }: { 
  open: boolean; onOpenChange: (open: boolean) => void; bem: BemPatrimonial | null;
  onSave: (data: any) => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ status: '', dataBaixa: '', motivoBaixa: '', valorBaixa: 0 });
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => { setStep(1); setForm({ status: '', dataBaixa: '', motivoBaixa: '', valorBaixa: 0 }); setConfirmed(false); }, [open]);
  if (!bem) return null;

  const valorContabil = bem.valorContabil;
  const ganhoPerda = form.status === 'alienado' ? form.valorBaixa - valorContabil : -valorContabil;

  const motivoLabels: Record<string, { title: string; desc: string }> = {
    baixado: { title: 'Baixa por Obsolescência', desc: 'Bem sem utilidade' },
    alienado: { title: 'Venda/Alienação', desc: 'Informe valor recebido' },
    perdido: { title: 'Perda/Sinistro', desc: 'Furto, incêndio, extravio' },
  };

  const handleNext = () => {
    if (step === 1 && !form.status) { toast.error('Selecione um motivo'); return; }
    if (step === 2) {
      if (!form.dataBaixa || form.motivoBaixa.length < 10) { toast.error('Preencha os campos obrigatórios'); return; }
      if (form.status === 'alienado' && form.valorBaixa <= 0) { toast.error('Informe o valor de venda'); return; }
    }
    setStep(s => s + 1);
  };

  const handleConfirm = () => {
    if (!confirmed) { toast.error('Confirme que os dados estão corretos'); return; }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Baixar Bem - {bem.codigo}</DialogTitle></DialogHeader>
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium', step >= s ? 'bg-primary text-white' : 'bg-muted')}>{s}</div>
              {s < 3 && <div className={cn('w-8 h-0.5', step > s ? 'bg-primary' : 'bg-muted')} />}
            </div>
          ))}
        </div>
        {step === 1 && (
          <div className="space-y-4">
            {Object.entries(motivoLabels).map(([key, { title, desc }]) => (
              <div key={key} onClick={() => setForm(f => ({ ...f, status: key }))} className={cn('p-4 border rounded-lg cursor-pointer', form.status === key ? 'border-primary bg-primary/5' : 'hover:border-gray-400')}>
                <div className="flex items-center gap-2">
                  <div className={cn('w-4 h-4 rounded-full border-2', form.status === key ? 'border-primary bg-primary' : 'border-gray-300')} />
                  <span className="font-medium">{title}</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data da Baixa *</Label>
              <Input type="date" value={form.dataBaixa} onChange={e => setForm(f => ({ ...f, dataBaixa: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição do Motivo *</Label>
              <Textarea value={form.motivoBaixa} onChange={e => setForm(f => ({ ...f, motivoBaixa: e.target.value }))} rows={3} />
            </div>
            {form.status === 'alienado' && (
              <div className="space-y-2">
                <Label>Valor de Venda (R$) *</Label>
                <Input type="number" step="0.01" value={form.valorBaixa} onChange={e => setForm(f => ({ ...f, valorBaixa: parseFloat(e.target.value) || 0 }))} />
              </div>
            )}
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-800">Esta ação impacta relatórios contábeis.</p>
            </div>
            <Card>
              <CardContent className="p-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Bem:</span><span>{bem.codigo}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Motivo:</span><span>{motivoLabels[form.status]?.title}</span></div>
                <div className="flex justify-between font-bold"><span>Impacto:</span><Badge className={ganhoPerda >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}>{formatCurrency(Math.abs(ganhoPerda))}</Badge></div>
              </CardContent>
            </Card>
            <div className="flex items-center gap-2">
              <Checkbox id="confirm" checked={confirmed} onCheckedChange={(c) => setConfirmed(!!c)} />
              <Label htmlFor="confirm" className="text-sm cursor-pointer">Confirmo que os dados estão corretos</Label>
            </div>
          </div>
        )}
        <DialogFooter>
          {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Voltar</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {step < 3 ? <Button onClick={handleNext}>Próximo</Button> : <Button variant="destructive" onClick={handleConfirm}>Confirmar Baixa</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepreciacaoDialog({ open, onOpenChange, bens, onEfetivar }: { 
  open: boolean; onOpenChange: (open: boolean) => void; bens: BemPatrimonial[]; onEfetivar: () => void;
}) {
  const [periodo, setPeriodo] = useState('2024-11');
  const [simular, setSimular] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const bensAtivos = bens.filter(b => b.status === 'em_uso' && b.metodoDepreciacao === 'linear');
  const totalDeprecMes = roundMoney(bensAtivos.reduce((sum, b) => sum + (b.valorAquisicao - b.valorResidual) / b.vidaUtilMeses, 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Calcular Depreciação Mensal</DialogTitle>
          <DialogDescription>Processe a depreciação de todos os bens ativos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Período *</Label>
              <Input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Checkbox id="simular" checked={simular} onCheckedChange={(c) => setSimular(!!c)} />
              <Label htmlFor="simular" className="cursor-pointer">Apenas Simular</Label>
            </div>
          </div>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span>Bens a depreciar:</span>
                <span className="font-bold">{bensAtivos.length} de {bens.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Valor total:</span>
                <span className="font-bold text-amber-600">{formatCurrency(totalDeprecMes)}</span>
              </div>
              <button onClick={() => setShowDetails(!showDetails)} className="flex items-center gap-1 text-sm text-primary hover:underline">
                <ChevronDown className={cn('h-4 w-4 transition-transform', showDetails && 'rotate-180')} />
                {showDetails ? 'Ocultar' : 'Ver'} detalhes
              </button>
              {showDetails && (
                <div className="border rounded-lg overflow-hidden max-h-60 overflow-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Deprec.</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {bensAtivos.map(bem => (
                        <TableRow key={bem.id}>
                          <TableCell className="font-mono text-xs">{bem.codigo}</TableCell>
                          <TableCell className="truncate max-w-[200px]">{bem.descricao}</TableCell>
                          <TableCell className="text-right">{formatCurrency((bem.valorAquisicao - bem.valorResidual) / bem.vidaUtilMeses)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {simular ? (
            <Button onClick={() => toast.info('Simulação concluída')}>Simular</Button>
          ) : (
            <Button onClick={() => { onEfetivar(); toast.success(`${bensAtivos.length} bens processados.`); }}>Efetivar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Patrimonio() {
  const [bens] = useState<BemPatrimonial[]>(mockBens);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativos' | 'inativos'>('all');
  const [selectedBemId, setSelectedBemId] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Dialogs
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editBem, setEditBem] = useState<BemPatrimonial | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferBem, setTransferBem] = useState<BemPatrimonial | null>(null);
  const [baixaDialogOpen, setBaixaDialogOpen] = useState(false);
  const [baixaBem, setBaixaBem] = useState<BemPatrimonial | null>(null);
  const [depreciacaoDialogOpen, setDepreciacaoDialogOpen] = useState(false);

  // Filtered data
  const filteredBens = useMemo(() => {
    return bens.filter(bem => {
      if (statusFilter === 'ativos' && bem.status !== 'em_uso') return false;
      if (statusFilter === 'inativos' && !['baixado', 'alienado', 'perdido'].includes(bem.status)) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return bem.codigo.toLowerCase().includes(term) || bem.descricao.toLowerCase().includes(term);
      }
      return true;
    });
  }, [bens, statusFilter, searchTerm]);

  const paginatedBens = filteredBens.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredBens.length / pageSize);

  // Stats
  const stats = useMemo(() => {
    const ativos = bens.filter(b => b.status === 'em_uso');
    const inativos = bens.filter(b => ['baixado', 'alienado', 'perdido'].includes(b.status));
    return {
      total: bens.length,
      ativos: ativos.length,
      inativos: inativos.length,
      valorAquisicao: bens.reduce((sum, b) => sum + b.valorAquisicao, 0),
      deprecAcum: bens.reduce((sum, b) => sum + b.depreciacaoAcumulada, 0),
      valorContabil: bens.reduce((sum, b) => sum + b.valorContabil, 0),
    };
  }, [bens]);

  const selectedBem = bens.find(b => b.id === selectedBemId) || null;

  const handleSelectBem = (bem: BemPatrimonial) => {
    setSelectedBemId(bem.id);
    if (window.innerWidth < 1024) setShowMobileDetail(true);
  };

  const handleNew = () => { setEditBem(null); setFormDialogOpen(true); };
  const handleEdit = (bem: BemPatrimonial) => { setEditBem(bem); setFormDialogOpen(true); };
  const handleTransfer = (bem: BemPatrimonial) => { setTransferBem(bem); setTransferDialogOpen(true); };
  const handleBaixa = (bem: BemPatrimonial) => { setBaixaBem(bem); setBaixaDialogOpen(true); };

  const handleSaveBem = () => { toast.success(editBem ? 'Bem atualizado' : 'Bem cadastrado'); setFormDialogOpen(false); };
  const handleSaveTransfer = () => { toast.success('Transferência registrada'); setTransferDialogOpen(false); };
  const handleSaveBaixa = () => { toast.success('Baixa registrada'); setBaixaDialogOpen(false); };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('search-bens')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] lg:h-[calc(100vh-theme(spacing.8))] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <PageHeader
          title="Patrimônio"
          description="Gestão de bens patrimoniais - ITG 2002"
          icon={<span className="text-3xl">🏛️</span>}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setDepreciacaoDialogOpen(true)} className="hidden sm:flex">
            <Calculator className="h-4 w-4 mr-1.5" /> Depreciação
          </Button>
          <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Bem</span>
          </Button>
        </div>
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
                  id="search-bens"
                  placeholder="Buscar por código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  className="pl-10 h-9"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Quick Stats */}
              <QuickStats stats={stats} statusFilter={statusFilter} setStatusFilter={(v) => { setStatusFilter(v); setPage(1); }} />

              {/* KPIs Compactos */}
              <KPIsCompact stats={stats} />
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-2">
            <BensList bens={paginatedBens} selectedId={selectedBemId} onSelect={handleSelectBem} isLoading={false} />
          </CardContent>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="p-3 border-t shrink-0">
              <Pagination page={page} totalPages={totalPages} totalItems={filteredBens.length} itemsShown={paginatedBens.length} onPageChange={setPage} itemLabel="bens" />
            </div>
          )}
        </Card>

        {/* Detalhes (Detail) - Desktop */}
        <Card className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col overflow-hidden">
          {selectedBem ? (
            <DetailPanel 
              bem={selectedBem} 
              timeline={mockTimeline}
              onEdit={() => handleEdit(selectedBem)}
              onTransfer={() => handleTransfer(selectedBem)}
              onBaixa={() => handleBaixa(selectedBem)}
            />
          ) : (
            <EmptySelection onNewBem={handleNew} />
          )}
        </Card>
      </div>

      {/* Detail Mobile Overlay */}
      {showMobileDetail && selectedBem && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => { setShowMobileDetail(false); setSelectedBemId(null); }}>
                <X className="h-4 w-4 mr-1" /> Fechar
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <DetailPanel 
                bem={selectedBem} 
                timeline={mockTimeline}
                onEdit={() => handleEdit(selectedBem)}
                onTransfer={() => handleTransfer(selectedBem)}
                onBaixa={() => handleBaixa(selectedBem)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <PatrimonioWizard 
        open={formDialogOpen} 
        onOpenChange={setFormDialogOpen} 
        bemId={editBem?.id}
        initialData={editBem ? {
          codigo: editBem.codigo,
          descricao: editBem.descricao,
          categoria: editBem.categoria,
          dataAquisicao: editBem.dataAquisicao,
          valorAquisicao: String(editBem.valorAquisicao),
          valorResidual: String(editBem.valorResidual),
          vidaUtilMeses: editBem.vidaUtilMeses,
          metodoDepreciacao: editBem.metodoDepreciacao,
          contaAtivoId: editBem.contaAtivoId || '',
          localizacao: editBem.localizacao || '',
          responsavelId: editBem.responsavelId || '',
        } : undefined}
        onSuccess={handleSaveBem}
      />
      <TransferDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen} bem={transferBem} onSave={handleSaveTransfer} />
      <BaixaDialog open={baixaDialogOpen} onOpenChange={setBaixaDialogOpen} bem={baixaBem} onSave={handleSaveBaixa} />
      <DepreciacaoDialog open={depreciacaoDialogOpen} onOpenChange={setDepreciacaoDialogOpen} bens={bens} onEfetivar={() => setDepreciacaoDialogOpen(false)} />
    </div>
  );
}
