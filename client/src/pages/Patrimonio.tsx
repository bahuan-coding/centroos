import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Building2, Car, Monitor, Armchair, Cpu, Package, 
  MoreHorizontal, Eye, Edit2, ArrowRightLeft, XCircle, Calculator,
  TrendingDown, DollarSign, Boxes, ChevronDown, X, Lock, Info,
  MapPin, User, FileText, Calendar, AlertTriangle, CheckCircle2
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
import { PageHeader, FilterBar, Pagination } from '@/components/ui/page-header';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, ResponsiveTable } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

// Helper para arredondar valores monetários (2 casas decimais)
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

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
};

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

// Mock data for demonstration
const mockBens: BemPatrimonial[] = [
  {
    id: '1',
    codigo: 'VEI-001',
    descricao: 'Van Mercedes Sprinter 2020 15 lugares',
    categoria: 'veiculo',
    dataAquisicao: '2020-03-15',
    valorAquisicao: 180000,
    valorResidual: 30000,
    vidaUtilMeses: 60,
    metodoDepreciacao: 'linear',
    contaAtivoId: '1',
    contaDepreciacaoId: '2',
    contaDepreciacaoAcumId: '3',
    fornecedorId: '1',
    fornecedorNome: 'Concessionária Mercedes',
    numeroNotaFiscal: '123456',
    localizacao: 'Garagem Principal',
    responsavelId: '1',
    responsavelNome: 'João Silva',
    projetoId: '1',
    projetoNome: 'Projeto Van Social',
    fundoId: '1',
    fundoNome: 'Fundo Restrito Doações',
    status: 'em_uso',
    dataBaixa: null,
    motivoBaixa: null,
    valorBaixa: null,
    depreciacaoAcumulada: 45000,
    valorContabil: 135000,
  },
  {
    id: '2',
    codigo: 'IMO-001',
    descricao: 'Templo Principal - Rua das Flores, 100 - Centro',
    categoria: 'imovel',
    dataAquisicao: '2015-01-10',
    valorAquisicao: 800000,
    valorResidual: 200000,
    vidaUtilMeses: 300,
    metodoDepreciacao: 'linear',
    contaAtivoId: '4',
    contaDepreciacaoId: '5',
    contaDepreciacaoAcumId: '6',
    fornecedorId: null,
    fornecedorNome: null,
    numeroNotaFiscal: null,
    localizacao: 'Centro',
    responsavelId: '2',
    responsavelNome: 'Maria Santos',
    projetoId: null,
    projetoNome: null,
    fundoId: null,
    fundoNome: null,
    status: 'em_uso',
    dataBaixa: null,
    motivoBaixa: null,
    valorBaixa: null,
    depreciacaoAcumulada: 240000,
    valorContabil: 560000,
  },
  {
    id: '3',
    codigo: 'SOM-001',
    descricao: 'Mesa de Som Yamaha 32 canais',
    categoria: 'equipamento',
    dataAquisicao: '2022-06-20',
    valorAquisicao: 15000,
    valorResidual: 0,
    vidaUtilMeses: 120,
    metodoDepreciacao: 'linear',
    contaAtivoId: '7',
    contaDepreciacaoId: '8',
    contaDepreciacaoAcumId: '9',
    fornecedorId: '2',
    fornecedorNome: 'Audio Pro LTDA',
    numeroNotaFiscal: '789012',
    localizacao: 'Salão Principal',
    responsavelId: '3',
    responsavelNome: 'Pedro Oliveira',
    projetoId: null,
    projetoNome: null,
    fundoId: null,
    fundoNome: null,
    status: 'em_uso',
    dataBaixa: null,
    motivoBaixa: null,
    valorBaixa: null,
    depreciacaoAcumulada: 3750,
    valorContabil: 11250,
  },
];

const mockTimeline: TimelineEvent[] = [
  { id: '1', tipo: 'depreciacao', data: '2024-11-01T10:30:00', usuario: 'Sistema', descricao: 'Depreciação Nov/2024: R$ 2.500,00' },
  { id: '2', tipo: 'depreciacao', data: '2024-10-01T10:30:00', usuario: 'Sistema', descricao: 'Depreciação Out/2024: R$ 2.500,00' },
  { id: '3', tipo: 'transferencia', data: '2024-06-15T14:22:00', usuario: 'Maria Santos', descricao: 'Transferência de local', detalhes: { de: 'Estacionamento', para: 'Garagem' } },
  { id: '4', tipo: 'cadastro', data: '2020-03-15T09:00:00', usuario: 'Admin', descricao: 'Cadastro inicial' },
];

// ============================================================================
// KPI CARD COMPONENT
// ============================================================================

function KPICard({ title, value, subtitle, icon: Icon, color = 'primary' }: { 
  title: string; 
  value: string; 
  subtitle?: string;
  icon: typeof Boxes;
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
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={cn('p-2 rounded-lg bg-gradient-to-br', colorClasses[color])}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FILTER CHIPS
// ============================================================================

function FilterChips({ 
  filters, 
  onRemove, 
  onClearAll 
}: { 
  filters: { key: string; label: string; value: string }[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}) {
  if (filters.length === 0) return null;
  
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      {filters.map(filter => (
        <Badge key={filter.key} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
          <span className="text-muted-foreground">{filter.label}:</span>
          <span className="font-medium">{filter.value}</span>
          <button onClick={() => onRemove(filter.key)} className="ml-1 hover:bg-accent rounded-full p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <button onClick={onClearAll} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        Limpar tudo
      </button>
    </div>
  );
}

// ============================================================================
// DETAIL PANEL
// ============================================================================

function DetailPanel({ 
  bem, 
  timeline,
  onClose, 
  onEdit, 
  onTransfer, 
  onBaixa 
}: { 
  bem: BemPatrimonial;
  timeline: TimelineEvent[];
  onClose: () => void;
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
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-background border-l shadow-xl z-50 overflow-auto">
      <div className="sticky top-0 bg-background border-b z-10 p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Fechar
          </Button>
          {isAtivo && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEdit} aria-label={`Editar bem ${bem.codigo}`}><Edit2 className="h-4 w-4 mr-1" /> Editar</Button>
              <Button variant="outline" size="sm" onClick={onTransfer} aria-label={`Transferir bem ${bem.codigo}`}><ArrowRightLeft className="h-4 w-4 mr-1" /> Transferir</Button>
              <Button variant="destructive" size="sm" onClick={onBaixa} aria-label={`Baixar bem ${bem.codigo}`}><XCircle className="h-4 w-4 mr-1" /> Baixar</Button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={cn('p-3 rounded-lg', cat.color)}>
            <CatIcon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{bem.codigo}</span>
              <Badge className={cn('text-white', st.color)}>{st.label}</Badge>
            </div>
            <h2 className="text-xl font-bold mt-1">{bem.descricao}</h2>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Aquisição</p>
            <p className="text-lg font-bold">{formatCurrency(bem.valorAquisicao)}</p>
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
            {bem.localizacao && <div className="flex justify-between"><span className="text-muted-foreground">Localização:</span><span>{bem.localizacao}</span></div>}
            {bem.responsavelNome && <div className="flex justify-between"><span className="text-muted-foreground">Responsável:</span><span>{bem.responsavelNome}</span></div>}
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
                  <div className="text-xs text-muted-foreground w-24 shrink-0">
                    {new Date(event.data).toLocaleDateString('pt-BR')}
                    <br />
                    {new Date(event.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{event.descricao}</p>
                    <p className="text-xs text-muted-foreground">por {event.usuario}</p>
                    {event.detalhes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        De: {event.detalhes.de} → Para: {event.detalhes.para}
                      </p>
                    )}
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
// CREATE/EDIT DIALOG
// ============================================================================

function BemFormDialog({ 
  open, 
  onOpenChange, 
  bem,
  onSave 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bem: BemPatrimonial | null;
  onSave: (data: Partial<BemPatrimonial>) => void;
}) {
  const isEdit = !!bem;
  const [form, setForm] = useState({
    codigo: bem?.codigo || '',
    descricao: bem?.descricao || '',
    categoria: bem?.categoria || 'equipamento',
    dataAquisicao: bem?.dataAquisicao || '',
    valorAquisicao: bem?.valorAquisicao || 0,
    valorResidual: bem?.valorResidual || 0,
    vidaUtilMeses: bem?.vidaUtilMeses || 60,
    metodoDepreciacao: bem?.metodoDepreciacao || 'linear',
    localizacao: bem?.localizacao || '',
    responsavelId: bem?.responsavelId || '',
    fornecedorId: bem?.fornecedorId || '',
    numeroNotaFiscal: bem?.numeroNotaFiscal || '',
    contaAtivoId: bem?.contaAtivoId || '',
    contaDepreciacaoId: bem?.contaDepreciacaoId || '',
    contaDepreciacaoAcumId: bem?.contaDepreciacaoAcumId || '',
    projetoId: bem?.projetoId || '',
    fundoId: bem?.fundoId || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (bem) {
      setForm({
        codigo: bem.codigo,
        descricao: bem.descricao,
        categoria: bem.categoria,
        dataAquisicao: bem.dataAquisicao,
        valorAquisicao: bem.valorAquisicao,
        valorResidual: bem.valorResidual,
        vidaUtilMeses: bem.vidaUtilMeses,
        metodoDepreciacao: bem.metodoDepreciacao,
        localizacao: bem.localizacao || '',
        responsavelId: bem.responsavelId || '',
        fornecedorId: bem.fornecedorId || '',
        numeroNotaFiscal: bem.numeroNotaFiscal || '',
        contaAtivoId: bem.contaAtivoId || '',
        contaDepreciacaoId: bem.contaDepreciacaoId || '',
        contaDepreciacaoAcumId: bem.contaDepreciacaoAcumId || '',
        projetoId: bem.projetoId || '',
        fundoId: bem.fundoId || '',
      });
    } else {
      setForm({
        codigo: '',
        descricao: '',
        categoria: 'equipamento',
        dataAquisicao: '',
        valorAquisicao: 0,
        valorResidual: 0,
        vidaUtilMeses: 60,
        metodoDepreciacao: 'linear',
        localizacao: '',
        responsavelId: '',
        fornecedorId: '',
        numeroNotaFiscal: '',
        contaAtivoId: '',
        contaDepreciacaoId: '',
        contaDepreciacaoAcumId: '',
        projetoId: '',
        fundoId: '',
      });
    }
    setErrors({});
  }, [bem, open]);

  const handleCategoriaChange = (cat: string) => {
    const config = categoriaConfig[cat];
    setForm(f => ({ ...f, categoria: cat as any, vidaUtilMeses: config?.vidaUtilPadrao || 60 }));
  };

  const depreciacaoMensal = form.metodoDepreciacao === 'linear' && form.vidaUtilMeses > 0
    ? roundMoney((form.valorAquisicao - form.valorResidual) / form.vidaUtilMeses)
    : 0;

  const [codigoChecking, setCodigoChecking] = useState(false);
  const checkCodigoMutation = trpc.patrimonio.codigoExiste.useQuery(form.codigo, {
    enabled: !isEdit && form.codigo.length >= 3 && codigoChecking,
  });

  const validate = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.codigo.trim()) newErrors.codigo = 'Campo obrigatório';
    if (!form.descricao.trim()) newErrors.descricao = 'Campo obrigatório';
    if (!form.dataAquisicao) newErrors.dataAquisicao = 'Campo obrigatório';
    if (form.valorAquisicao <= 0) newErrors.valorAquisicao = 'Valor deve ser positivo';
    if (form.valorResidual >= form.valorAquisicao) newErrors.valorResidual = 'Valor residual deve ser menor que valor de aquisição';
    if (form.vidaUtilMeses < 1 || form.vidaUtilMeses > 600) newErrors.vidaUtilMeses = 'Vida útil deve ser entre 1 e 600 meses';
    if (!form.contaAtivoId) newErrors.contaAtivoId = 'Conta do ativo é obrigatória';
    if (form.metodoDepreciacao === 'linear') {
      if (!form.contaDepreciacaoId) newErrors.contaDepreciacaoId = 'Conta de despesa é obrigatória para depreciação linear';
      if (!form.contaDepreciacaoAcumId) newErrors.contaDepreciacaoAcumId = 'Conta de deprec. acumulada é obrigatória para depreciação linear';
    }
    // Validação de código único (apenas para novo cadastro)
    if (!isEdit && form.codigo.trim() && checkCodigoMutation.data === true) {
      newErrors.codigo = 'Este código já está em uso';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Trigger codigo check when codigo changes
  useEffect(() => {
    if (!isEdit && form.codigo.length >= 3) {
      setCodigoChecking(true);
    }
  }, [form.codigo, isEdit]);

  const handleSubmit = async () => {
    const isValid = await validate();
    if (!isValid) {
      toast.error('Corrija os erros antes de salvar');
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar Bem - ${bem.codigo}` : 'Cadastrar Novo Bem'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Altere as informações permitidas do bem.' : 'Preencha os dados para registrar um bem no patrimônio.'}
          </DialogDescription>
        </DialogHeader>

        {isEdit && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              Valores contábeis (aquisição, depreciação) não podem ser alterados. Use estorno e novo lançamento se necessário.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Identificação */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Identificação</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código/Plaqueta *</Label>
                <Input 
                  id="codigo" 
                  value={form.codigo} 
                  onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                  disabled={isEdit}
                  placeholder="VEI-001"
                  className={errors.codigo ? 'border-red-500' : ''}
                />
                {isEdit && <p className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Não editável</p>}
                {errors.codigo && <p className="text-xs text-red-500">{errors.codigo}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria *</Label>
                <Select value={form.categoria} onValueChange={handleCategoriaChange} disabled={isEdit}>
                  <SelectTrigger className={errors.categoria ? 'border-red-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoriaConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label} ({cfg.vidaUtilPadrao} meses)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição do Bem *</Label>
              <Textarea 
                id="descricao" 
                value={form.descricao} 
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descrição completa do bem..."
                rows={2}
                className={errors.descricao ? 'border-red-500' : ''}
              />
              {errors.descricao && <p className="text-xs text-red-500">{errors.descricao}</p>}
            </div>
          </div>

          {/* Aquisição */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Aquisição</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataAquisicao">Data de Aquisição *</Label>
                <Input 
                  id="dataAquisicao" 
                  type="date"
                  value={form.dataAquisicao} 
                  onChange={e => setForm(f => ({ ...f, dataAquisicao: e.target.value }))}
                  disabled={isEdit}
                  className={errors.dataAquisicao ? 'border-red-500' : ''}
                />
                {isEdit && <p className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Não editável</p>}
                {errors.dataAquisicao && <p className="text-xs text-red-500">{errors.dataAquisicao}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="valorAquisicao">Valor de Aquisição (R$) *</Label>
                <Input 
                  id="valorAquisicao" 
                  type="number"
                  step="0.01"
                  value={form.valorAquisicao} 
                  onChange={e => setForm(f => ({ ...f, valorAquisicao: parseFloat(e.target.value) || 0 }))}
                  disabled={isEdit}
                  className={errors.valorAquisicao ? 'border-red-500' : ''}
                />
                {isEdit && <p className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Não editável</p>}
                {errors.valorAquisicao && <p className="text-xs text-red-500">{errors.valorAquisicao}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fornecedorId">Fornecedor</Label>
                <Select value={form.fornecedorId} onValueChange={v => setForm(f => ({ ...f, fornecedorId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Concessionária Mercedes</SelectItem>
                    <SelectItem value="2">Audio Pro LTDA</SelectItem>
                    <SelectItem value="3">TechShop Informática</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="numeroNotaFiscal">Nota Fiscal</Label>
                <Input 
                  id="numeroNotaFiscal" 
                  value={form.numeroNotaFiscal} 
                  onChange={e => setForm(f => ({ ...f, numeroNotaFiscal: e.target.value }))}
                  placeholder="Número da NF"
                />
              </div>
            </div>
          </div>

          {/* Depreciação */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Depreciação</h3>
            <div className="space-y-2">
              <Label htmlFor="metodoDepreciacao">Método de Depreciação *</Label>
              <Select 
                value={form.metodoDepreciacao} 
                onValueChange={v => setForm(f => ({ ...f, metodoDepreciacao: v as any }))}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear (Quotas Constantes)</SelectItem>
                  <SelectItem value="nenhum">Não Depreciar</SelectItem>
                </SelectContent>
              </Select>
              {isEdit && <p className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Não editável</p>}
            </div>

            {form.metodoDepreciacao === 'linear' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vidaUtilMeses">Vida Útil (meses) *</Label>
                    <Input 
                      id="vidaUtilMeses" 
                      type="number"
                      value={form.vidaUtilMeses} 
                      onChange={e => setForm(f => ({ ...f, vidaUtilMeses: parseInt(e.target.value) || 0 }))}
                      disabled={isEdit}
                      className={errors.vidaUtilMeses ? 'border-red-500' : ''}
                    />
                    {errors.vidaUtilMeses && <p className="text-xs text-red-500">{errors.vidaUtilMeses}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valorResidual">Valor Residual (R$)</Label>
                    <Input 
                      id="valorResidual" 
                      type="number"
                      step="0.01"
                      value={form.valorResidual} 
                      onChange={e => setForm(f => ({ ...f, valorResidual: parseFloat(e.target.value) || 0 }))}
                      disabled={isEdit}
                      className={errors.valorResidual ? 'border-red-500' : ''}
                    />
                    {errors.valorResidual && <p className="text-xs text-red-500">{errors.valorResidual}</p>}
                  </div>
                </div>
                
                {!isEdit && depreciacaoMensal > 0 && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-3">
                      <p className="text-sm font-medium text-blue-800">Prévia de Depreciação</p>
                      <p className="text-lg font-bold text-blue-900">{formatCurrency(depreciacaoMensal)}/mês</p>
                      <p className="text-xs text-blue-700">Início: mês seguinte à aquisição</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {form.metodoDepreciacao === 'nenhum' && (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-3 flex gap-2">
                  <Info className="h-5 w-5 text-gray-600 shrink-0" />
                  <p className="text-sm text-gray-700">
                    Terrenos e bens sem perda de valor não depreciam. Contas de depreciação não serão exigidas.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Contas Contábeis */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Contas Contábeis</h3>
            <div className="space-y-2">
              <Label htmlFor="contaAtivoId">Conta do Ativo *</Label>
              <Select value={form.contaAtivoId} onValueChange={v => setForm(f => ({ ...f, contaAtivoId: v }))}>
                <SelectTrigger className={errors.contaAtivoId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione a conta do imobilizado..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.2.1.01">1.2.1.01 - Imóveis</SelectItem>
                  <SelectItem value="1.2.1.02">1.2.1.02 - Veículos</SelectItem>
                  <SelectItem value="1.2.1.03">1.2.1.03 - Equipamentos</SelectItem>
                  <SelectItem value="1.2.1.04">1.2.1.04 - Móveis e Utensílios</SelectItem>
                  <SelectItem value="1.2.1.05">1.2.1.05 - Equipamentos de Informática</SelectItem>
                </SelectContent>
              </Select>
              {errors.contaAtivoId && <p className="text-xs text-red-500">{errors.contaAtivoId}</p>}
            </div>
            
            {form.metodoDepreciacao === 'linear' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contaDepreciacaoId">Conta de Despesa de Depreciação *</Label>
                  <Select value={form.contaDepreciacaoId} onValueChange={v => setForm(f => ({ ...f, contaDepreciacaoId: v }))}>
                    <SelectTrigger className={errors.contaDepreciacaoId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5.3.1.01">5.3.1.01 - Deprec. Imóveis</SelectItem>
                      <SelectItem value="5.3.1.02">5.3.1.02 - Deprec. Veículos</SelectItem>
                      <SelectItem value="5.3.1.03">5.3.1.03 - Deprec. Equipamentos</SelectItem>
                      <SelectItem value="5.3.1.04">5.3.1.04 - Deprec. Móveis</SelectItem>
                      <SelectItem value="5.3.1.05">5.3.1.05 - Deprec. Informática</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.contaDepreciacaoId && <p className="text-xs text-red-500">{errors.contaDepreciacaoId}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contaDepreciacaoAcumId">Conta de Deprec. Acumulada *</Label>
                  <Select value={form.contaDepreciacaoAcumId} onValueChange={v => setForm(f => ({ ...f, contaDepreciacaoAcumId: v }))}>
                    <SelectTrigger className={errors.contaDepreciacaoAcumId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.2.9.01">1.2.9.01 - Deprec. Acum. Imóveis</SelectItem>
                      <SelectItem value="1.2.9.02">1.2.9.02 - Deprec. Acum. Veículos</SelectItem>
                      <SelectItem value="1.2.9.03">1.2.9.03 - Deprec. Acum. Equipamentos</SelectItem>
                      <SelectItem value="1.2.9.04">1.2.9.04 - Deprec. Acum. Móveis</SelectItem>
                      <SelectItem value="1.2.9.05">1.2.9.05 - Deprec. Acum. Informática</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.contaDepreciacaoAcumId && <p className="text-xs text-red-500">{errors.contaDepreciacaoAcumId}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Localização */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Localização e Responsável</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="localizacao">Localização Física</Label>
                <Input 
                  id="localizacao" 
                  value={form.localizacao} 
                  onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))}
                  placeholder="Ex: Salão Principal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsavel">Responsável/Custodiante</Label>
                <Select value={form.responsavelId} onValueChange={v => setForm(f => ({ ...f, responsavelId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">João Silva</SelectItem>
                    <SelectItem value="2">Maria Santos</SelectItem>
                    <SelectItem value="3">Pedro Oliveira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Vínculos */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Vínculos (Opcional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projetoId">Projeto</Label>
                <Select value={form.projetoId} onValueChange={v => setForm(f => ({ ...f, projetoId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vincular a projeto..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Projeto Van Social</SelectItem>
                    <SelectItem value="2">Projeto Reforma Templo</SelectItem>
                    <SelectItem value="3">Projeto Evangelização</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Se adquirido para projeto específico</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fundoId">Fundo</Label>
                <Select value={form.fundoId} onValueChange={v => setForm(f => ({ ...f, fundoId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vincular a fundo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Fundo Restrito Doações</SelectItem>
                    <SelectItem value="2">Fundo Patrimônio</SelectItem>
                    <SelectItem value="3">Fundo Missões</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Se adquirido com recursos de fundo restrito</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>{isEdit ? 'Salvar' : 'Cadastrar Bem'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// TRANSFER DIALOG
// ============================================================================

function TransferDialog({ 
  open, 
  onOpenChange, 
  bem,
  onSave 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bem: BemPatrimonial | null;
  onSave: (data: { novaLocalizacao?: string; novoResponsavelId?: string; motivo: string }) => void;
}) {
  const [form, setForm] = useState({ novaLocalizacao: '', novoResponsavelId: '', motivo: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm({ novaLocalizacao: '', novoResponsavelId: '', motivo: '' });
    setErrors({});
  }, [open]);

  if (!bem) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (form.motivo.length < 10) {
      newErrors.motivo = 'Descreva o motivo da transferência (mínimo 10 caracteres)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      toast.error('Preencha o motivo da transferência');
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Bem - {bem.codigo}</DialogTitle>
          <DialogDescription>
            Registre a mudança de local ou responsável. Um histórico será mantido para auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-gray-50">
            <CardContent className="p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Localização atual:</span><span>{bem.localizacao || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Responsável atual:</span><span>{bem.responsavelNome || '-'}</span></div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="novaLocalizacao">Nova Localização</Label>
            <Input 
              id="novaLocalizacao" 
              value={form.novaLocalizacao} 
              onChange={e => setForm(f => ({ ...f, novaLocalizacao: e.target.value }))}
              placeholder="Deixe vazio para manter atual"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="novoResponsavel">Novo Responsável</Label>
            <Select value={form.novoResponsavelId} onValueChange={v => setForm(f => ({ ...f, novoResponsavelId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione ou mantenha..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">João Silva</SelectItem>
                <SelectItem value="2">Maria Santos</SelectItem>
                <SelectItem value="3">Pedro Oliveira</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da Transferência *</Label>
            <Textarea 
              id="motivo" 
              value={form.motivo} 
              onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
              placeholder="Descreva o motivo da transferência..."
              rows={2}
              className={errors.motivo ? 'border-red-500' : ''}
            />
            <p className="text-xs text-muted-foreground">Caracteres: {form.motivo.length}/10 mínimo</p>
            {errors.motivo && <p className="text-xs text-red-500">{errors.motivo}</p>}
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

// ============================================================================
// BAIXA DIALOG (STEPPER)
// ============================================================================

function BaixaDialog({ 
  open, 
  onOpenChange, 
  bem,
  onSave 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bem: BemPatrimonial | null;
  onSave: (data: { status: string; dataBaixa: string; motivoBaixa: string; valorBaixa?: number }) => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ status: '', dataBaixa: '', motivoBaixa: '', valorBaixa: 0 });
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setStep(1);
    setForm({ status: '', dataBaixa: '', motivoBaixa: '', valorBaixa: 0 });
    setConfirmed(false);
    setErrors({});
  }, [open]);

  if (!bem) return null;

  const valorContabil = bem.valorContabil;
  const ganhoPerda = form.status === 'alienado' ? form.valorBaixa - valorContabil : -valorContabil;
  const isGanho = ganhoPerda >= 0;

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!form.dataBaixa) newErrors.dataBaixa = 'Campo obrigatório';
    if (form.motivoBaixa.length < 10) newErrors.motivoBaixa = 'Descreva o motivo da baixa (mínimo 10 caracteres)';
    if (form.status === 'alienado' && form.valorBaixa <= 0) newErrors.valorBaixa = 'Informe o valor recebido na venda';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !form.status) {
      toast.error('Selecione um motivo');
      return;
    }
    if (step === 2 && !validateStep2()) return;
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleConfirm = () => {
    if (!confirmed) {
      toast.error('Confirme que os dados estão corretos');
      return;
    }
    onSave(form);
  };

  const motivoLabels: Record<string, { title: string; desc: string }> = {
    baixado: { title: 'Baixa por Obsolescência', desc: 'Bem não tem mais utilidade ou conserto inviável' },
    alienado: { title: 'Venda/Alienação', desc: 'Bem foi vendido. Informe valor recebido.' },
    perdido: { title: 'Perda/Sinistro', desc: 'Furto, incêndio, acidente ou extravio.' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Baixar Bem - {bem.codigo}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step >= s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              )}>{s}</div>
              {s < 3 && <div className={cn('w-8 h-0.5', step > s ? 'bg-primary' : 'bg-muted')} />}
            </div>
          ))}
        </div>

        {/* Step 1: Motivo */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione o motivo da baixa:</p>
            {Object.entries(motivoLabels).map(([key, { title, desc }]) => (
              <div 
                key={key}
                onClick={() => setForm(f => ({ ...f, status: key }))}
                className={cn(
                  'p-4 border rounded-lg cursor-pointer transition-colors',
                  form.status === key ? 'border-primary bg-primary/5' : 'hover:border-gray-400'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn('w-4 h-4 rounded-full border-2', form.status === key ? 'border-primary bg-primary' : 'border-gray-300')} />
                  <span className="font-medium">{title}</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Dados */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dataBaixa">Data da Baixa *</Label>
              <Input 
                id="dataBaixa" 
                type="date"
                value={form.dataBaixa} 
                onChange={e => setForm(f => ({ ...f, dataBaixa: e.target.value }))}
                className={errors.dataBaixa ? 'border-red-500' : ''}
              />
              {errors.dataBaixa && <p className="text-xs text-red-500">{errors.dataBaixa}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivoBaixa">Descrição do Motivo *</Label>
              <Textarea 
                id="motivoBaixa" 
                value={form.motivoBaixa} 
                onChange={e => setForm(f => ({ ...f, motivoBaixa: e.target.value }))}
                placeholder="Descreva detalhadamente..."
                rows={3}
                className={errors.motivoBaixa ? 'border-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground">Caracteres: {form.motivoBaixa.length}/10 mínimo</p>
              {errors.motivoBaixa && <p className="text-xs text-red-500">{errors.motivoBaixa}</p>}
            </div>

            {form.status === 'alienado' && (
              <div className="space-y-2">
                <Label htmlFor="valorBaixa">Valor de Venda (R$) *</Label>
                <Input 
                  id="valorBaixa" 
                  type="number"
                  step="0.01"
                  value={form.valorBaixa} 
                  onChange={e => setForm(f => ({ ...f, valorBaixa: parseFloat(e.target.value) || 0 }))}
                  className={errors.valorBaixa ? 'border-red-500' : ''}
                />
                {errors.valorBaixa && <p className="text-xs text-red-500">{errors.valorBaixa}</p>}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirmação */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-800">
                Esta ação impacta relatórios e lançamentos contábeis. Confira os dados antes de confirmar.
              </p>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resumo da Baixa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Bem:</span><span>{bem.codigo} - {bem.descricao}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Motivo:</span><span>{motivoLabels[form.status]?.title}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Data:</span><span>{form.dataBaixa ? formatDate(form.dataBaixa) : '-'}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Impacto Contábil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Valor de Aquisição:</span><span>{formatCurrency(bem.valorAquisicao)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">(-) Deprec. Acumulada:</span><span>{formatCurrency(bem.depreciacaoAcumulada)}</span></div>
                <div className="flex justify-between font-medium"><span>Valor Contábil:</span><span>{formatCurrency(valorContabil)}</span></div>
                {form.status === 'alienado' && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Valor de Venda:</span><span>{formatCurrency(form.valorBaixa)}</span></div>
                    <div className="flex justify-between font-bold">
                      <span>{isGanho ? 'GANHO NA ALIENAÇÃO:' : 'PERDA NA ALIENAÇÃO:'}</span>
                      <Badge className={isGanho ? 'bg-emerald-500' : 'bg-rose-500'}>{formatCurrency(Math.abs(ganhoPerda))}</Badge>
                    </div>
                  </>
                )}
                {(form.status === 'baixado' || form.status === 'perdido') && (
                  <div className="flex justify-between font-bold">
                    <span>PERDA NA BAIXA:</span>
                    <Badge className="bg-rose-500">{formatCurrency(Math.abs(ganhoPerda))}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center gap-2">
              <Checkbox id="confirm" checked={confirmed} onCheckedChange={(c) => setConfirmed(!!c)} />
              <Label htmlFor="confirm" className="text-sm cursor-pointer">Li e confirmo que os dados estão corretos</Label>
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && <Button variant="outline" onClick={handleBack}>Voltar</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {step < 3 ? (
            <Button onClick={handleNext}>Próximo</Button>
          ) : (
            <Button variant="destructive" onClick={handleConfirm}>Confirmar Baixa</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// DEPRECIATION DIALOG
// ============================================================================

function DepreciacaoDialog({ 
  open, 
  onOpenChange,
  bens,
  onEfetivar
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bens: BemPatrimonial[];
  onEfetivar: () => void;
}) {
  const [periodo, setPeriodo] = useState('2024-11');
  const [simular, setSimular] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const bensAtivos = bens.filter(b => b.status === 'em_uso' && b.metodoDepreciacao === 'linear');
  
  const porCategoria = useMemo(() => {
    const result: Record<string, { qtd: number; deprecMes: number; deprecAcum: number }> = {};
    bensAtivos.forEach(bem => {
      const deprecMes = roundMoney((bem.valorAquisicao - bem.valorResidual) / bem.vidaUtilMeses);
      if (!result[bem.categoria]) {
        result[bem.categoria] = { qtd: 0, deprecMes: 0, deprecAcum: 0 };
      }
      result[bem.categoria].qtd++;
      result[bem.categoria].deprecMes = roundMoney(result[bem.categoria].deprecMes + deprecMes);
      result[bem.categoria].deprecAcum = roundMoney(result[bem.categoria].deprecAcum + bem.depreciacaoAcumulada);
    });
    return result;
  }, [bensAtivos]);

  const totalDeprecMes = roundMoney(Object.values(porCategoria).reduce((sum, c) => sum + c.deprecMes, 0));
  const totalDeprecAcum = roundMoney(Object.values(porCategoria).reduce((sum, c) => sum + c.deprecAcum, 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Calcular Depreciação Mensal</DialogTitle>
          <DialogDescription>
            Processe a depreciação de todos os bens ativos. A depreciação inicia no mês seguinte à aquisição.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodo">Período *</Label>
              <Input 
                id="periodo" 
                type="month"
                value={periodo} 
                onChange={e => setPeriodo(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Checkbox id="simular" checked={simular} onCheckedChange={(c) => setSimular(!!c)} />
              <Label htmlFor="simular" className="cursor-pointer">Apenas Simular (não gera lançamentos)</Label>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Preview de Bens Impactados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Bens a depreciar:</span>
                <span className="font-bold">{bensAtivos.length} de {bens.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Valor total da depreciação:</span>
                <span className="font-bold text-amber-600">{formatCurrency(totalDeprecMes)}</span>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Deprec. Mês</TableHead>
                      <TableHead className="text-right">Deprec. Acum.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(porCategoria).map(([cat, data]) => (
                      <TableRow key={cat}>
                        <TableCell>{categoriaConfig[cat]?.label || cat}</TableCell>
                        <TableCell className="text-right">{data.qtd}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.deprecMes)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.deprecAcum)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">{bensAtivos.length}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalDeprecMes)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalDeprecAcum)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ChevronDown className={cn('h-4 w-4 transition-transform', showDetails && 'rotate-180')} />
                {showDetails ? 'Ocultar' : 'Ver'} detalhes por bem
              </button>

              {showDetails && (
                <div className="border rounded-lg overflow-hidden max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Deprec. Mês</TableHead>
                        <TableHead className="text-right">Valor Contábil</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bensAtivos.map(bem => {
                        const deprecMes = (bem.valorAquisicao - bem.valorResidual) / bem.vidaUtilMeses;
                        return (
                          <TableRow key={bem.id}>
                            <TableCell className="font-mono text-xs">{bem.codigo}</TableCell>
                            <TableCell className="truncate max-w-[200px]">{bem.descricao}</TableCell>
                            <TableCell className="text-right">{formatCurrency(deprecMes)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(bem.valorContabil)}</TableCell>
                          </TableRow>
                        );
                      })}
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
            <Button onClick={() => toast.info('Simulação concluída')}>Simular Novamente</Button>
          ) : (
            <Button onClick={() => { onEfetivar(); toast.success(`Depreciação efetivada. ${bensAtivos.length} bens processados.`); }}>
              Efetivar Depreciação
            </Button>
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
  // State
  const [bens] = useState<BemPatrimonial[]>(mockBens);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Dialogs
  const [detailBem, setDetailBem] = useState<BemPatrimonial | null>(null);
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
      if (categoriaFilter !== 'all' && bem.categoria !== categoriaFilter) return false;
      if (statusFilter !== 'all' && bem.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return bem.codigo.toLowerCase().includes(term) || 
               bem.descricao.toLowerCase().includes(term) ||
               bem.numeroNotaFiscal?.toLowerCase().includes(term);
      }
      return true;
    });
  }, [bens, categoriaFilter, statusFilter, searchTerm]);

  const paginatedBens = filteredBens.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredBens.length / pageSize);

  // Stats
  const stats = useMemo(() => {
    const ativos = bens.filter(b => b.status === 'em_uso');
    return {
      total: bens.length,
      ativos: ativos.length,
      valorAquisicao: bens.reduce((sum, b) => sum + b.valorAquisicao, 0),
      deprecAcum: bens.reduce((sum, b) => sum + b.depreciacaoAcumulada, 0),
      valorContabil: bens.reduce((sum, b) => sum + b.valorContabil, 0),
    };
  }, [bens]);

  // Filter chips
  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; value: string }[] = [];
    if (categoriaFilter !== 'all') {
      filters.push({ key: 'categoria', label: 'Categoria', value: categoriaConfig[categoriaFilter]?.label || categoriaFilter });
    }
    if (statusFilter !== 'all') {
      filters.push({ key: 'status', label: 'Status', value: statusConfig[statusFilter]?.label || statusFilter });
    }
    return filters;
  }, [categoriaFilter, statusFilter]);

  const handleRemoveFilter = (key: string) => {
    if (key === 'categoria') setCategoriaFilter('all');
    if (key === 'status') setStatusFilter('all');
  };

  const handleClearAllFilters = () => {
    setCategoriaFilter('all');
    setStatusFilter('all');
    setSearchTerm('');
  };

  // Selection
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === paginatedBens.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginatedBens.map(b => b.id)));
    }
  };

  // Handlers
  const handleNew = () => {
    setEditBem(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (bem: BemPatrimonial) => {
    setEditBem(bem);
    setFormDialogOpen(true);
    setDetailBem(null);
  };

  const handleTransfer = (bem: BemPatrimonial) => {
    setTransferBem(bem);
    setTransferDialogOpen(true);
    setDetailBem(null);
  };

  const handleBaixa = (bem: BemPatrimonial) => {
    setBaixaBem(bem);
    setBaixaDialogOpen(true);
    setDetailBem(null);
  };

  const handleSaveBem = (data: Partial<BemPatrimonial>) => {
    toast.success(editBem ? 'Bem atualizado' : 'Bem cadastrado com sucesso');
    setFormDialogOpen(false);
  };

  const handleSaveTransfer = (data: any) => {
    toast.success('Transferência registrada');
    setTransferDialogOpen(false);
  };

  const handleSaveBaixa = (data: any) => {
    toast.success('Baixa registrada. Lançamento contábil gerado.');
    setBaixaDialogOpen(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.getElementById('search-bens')?.focus();
      }
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        handleNew();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Patrimônio"
        description="Gestão de bens patrimoniais - ITG 2002"
        icon={<Boxes className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setDepreciacaoDialogOpen(true)}>
              <Calculator className="mr-1.5 h-4 w-4" /> Calcular Depreciação
            </Button>
            <Button onClick={handleNew}>
              <Plus className="mr-1.5 h-4 w-4" /> Novo Bem
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total de Bens"
          value={stats.total.toString()}
          subtitle={`${stats.ativos} ativos`}
          icon={Boxes}
          color="primary"
        />
        <KPICard
          title="Valor Aquisição"
          value={formatCurrency(stats.valorAquisicao)}
          icon={DollarSign}
          color="success"
        />
        <KPICard
          title="Deprec. Acumulada"
          value={formatCurrency(stats.deprecAcum)}
          subtitle={formatPercent(stats.valorAquisicao > 0 ? stats.deprecAcum / stats.valorAquisicao : 0)}
          icon={TrendingDown}
          color="warning"
        />
        <KPICard
          title="Valor Contábil"
          value={formatCurrency(stats.valorContabil)}
          subtitle={formatPercent(stats.valorAquisicao > 0 ? stats.valorContabil / stats.valorAquisicao : 0) + ' do original'}
          icon={DollarSign}
          color="primary"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <FilterBar>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-bens"
                placeholder="Buscar código/descrição/NF... (pressione /)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(categoriaConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterBar>
          <FilterChips filters={activeFilters} onRemove={handleRemoveFilter} onClearAll={handleClearAllFilters} />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <ResponsiveTable stickyHeader density="normal">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox 
                    checked={selected.size === paginatedBens.length && paginatedBens.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor Aquisição</TableHead>
                <TableHead className="text-right">Deprec. Acum.</TableHead>
                <TableHead className="text-right">Valor Contábil</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Boxes className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        {searchTerm || categoriaFilter !== 'all' || statusFilter !== 'all'
                          ? 'Nenhum bem encontrado com os filtros aplicados.'
                          : 'Nenhum bem cadastrado.'}
                      </p>
                      {!searchTerm && categoriaFilter === 'all' && statusFilter === 'all' && (
                        <Button variant="outline" onClick={handleNew} className="mt-2">
                          <Plus className="h-4 w-4 mr-1" /> Cadastrar Primeiro Bem
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBens.map(bem => {
                  const cat = categoriaConfig[bem.categoria];
                  const st = statusConfig[bem.status];
                  const CatIcon = cat.icon;
                  const percentDeprec = bem.valorAquisicao > 0 ? bem.depreciacaoAcumulada / bem.valorAquisicao : 0;
                  
                  return (
                    <TableRow key={bem.id} className="group">
                      <TableCell>
                        <Checkbox 
                          checked={selected.has(bem.id)}
                          onCheckedChange={() => toggleSelect(bem.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{bem.codigo}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium truncate max-w-[250px]">{bem.descricao}</p>
                          {(bem.projetoNome || bem.fundoNome) && (
                            <div className="flex gap-1 mt-1">
                              {bem.projetoNome && <Badge variant="outline" className="text-xs">{bem.projetoNome}</Badge>}
                              {bem.fundoNome && <Badge variant="outline" className="text-xs">{bem.fundoNome}</Badge>}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn('p-1.5 rounded', cat.color)}>
                            <CatIcon className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="text-sm">{cat.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-white', st.color)}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(bem.valorAquisicao)}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-amber-600">{formatCurrency(bem.depreciacaoAcumulada)}</span>
                        <span className="text-xs text-muted-foreground ml-1">({formatPercent(percentDeprec)})</span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{formatCurrency(bem.valorContabil)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{bem.localizacao || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => setDetailBem(bem)}
                            aria-label={`Ver detalhes do bem ${bem.codigo}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            aria-label={`Mais ações para ${bem.codigo}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ResponsiveTable>
        
        {filteredBens.length > 0 && (
          <div className="p-4 border-t">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredBens.length}
              itemsShown={paginatedBens.length}
              onPageChange={setPage}
              itemLabel="bens"
            />
          </div>
        )}
      </Card>

      {/* Detail Panel */}
      {detailBem && (
        <DetailPanel
          bem={detailBem}
          timeline={mockTimeline}
          onClose={() => setDetailBem(null)}
          onEdit={() => handleEdit(detailBem)}
          onTransfer={() => handleTransfer(detailBem)}
          onBaixa={() => handleBaixa(detailBem)}
        />
      )}

      {/* Dialogs */}
      <BemFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        bem={editBem}
        onSave={handleSaveBem}
      />

      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        bem={transferBem}
        onSave={handleSaveTransfer}
      />

      <BaixaDialog
        open={baixaDialogOpen}
        onOpenChange={setBaixaDialogOpen}
        bem={baixaBem}
        onSave={handleSaveBaixa}
      />

      <DepreciacaoDialog
        open={depreciacaoDialogOpen}
        onOpenChange={setDepreciacaoDialogOpen}
        bens={bens}
        onEfetivar={() => setDepreciacaoDialogOpen(false)}
      />
    </div>
  );
}

