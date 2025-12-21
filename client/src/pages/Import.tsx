import { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Check,
  Building2,
  Landmark,
  FileSpreadsheet,
  FileCode,
  Info,
  Loader2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  X,
  FileUp,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ResponsiveTable, TableCardView } from '@/components/ui/table';
import { PageHeader, StatsGrid } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { cn, formatCurrency, formatDate, formatPeriod } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

type Step = 'banco' | 'upload' | 'review' | 'confirm';
type BancoSelecionado = 'bb' | 'caixa' | 'outro' | null;
type FormatoArquivo = 'ofx' | 'csv' | 'txt';

interface Transaction {
  index: number;
  date: string;
  description: string;
  amountCents: number;
  type: 'credit' | 'debit';
  suggestedAccountId: number | null;
  confidence: string;
  isDuplicate: boolean;
  selected: boolean;
  accountId?: number;
  isNfc?: boolean;
  nfcCategory?: 'project_70' | 'operating_30';
}

// Logos dos bancos
const BBLogo = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <circle cx="50" cy="50" r="45" fill="#FFCC00"/>
    <text x="50" y="58" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#003882">BB</text>
  </svg>
);

const CaixaLogo = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <rect x="5" y="5" width="90" height="90" rx="8" fill="#005CA9"/>
    <text x="50" y="58" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#F37021">CEF</text>
  </svg>
);

const bancosConfig = {
  bb: {
    nome: 'Banco do Brasil',
    logo: BBLogo,
    cor: 'from-yellow-400 to-yellow-500',
    corBorda: 'border-yellow-400',
    bgGradient: 'bg-gradient-to-br from-yellow-50 to-amber-50',
    instrucoes: {
      ofx: ['Acesse o Internet Banking do BB', 'Vá em Conta Corrente → Extrato', 'Selecione o período desejado', 'Clique no ícone de download', 'Escolha "Money 2000+ (OFX)"'],
      csv: ['Acesse o Internet Banking do BB', 'Vá em Conta Corrente → Extrato', 'Selecione o período desejado', 'Clique em Exportar → CSV'],
      txt: ['Acesse o Internet Banking do BB', 'Vá em Conta Corrente → Extrato', 'Selecione o período e exporte como TXT'],
    },
  },
  caixa: {
    nome: 'Caixa Econômica Federal',
    logo: CaixaLogo,
    cor: 'from-blue-600 to-orange-500',
    corBorda: 'border-blue-500',
    bgGradient: 'bg-gradient-to-br from-blue-50 to-orange-50',
    instrucoes: {
      ofx: ['Acesse o Internet Banking da Caixa', 'Vá em Conta por Período', 'Selecione o período desejado', 'Clique em "Gerar Arquivo para Gerenciadores Financeiros"', 'Escolha formato OFX'],
      csv: ['Acesse o Internet Banking da Caixa', 'Vá em Conta por Período', 'Exporte o extrato em formato CSV'],
      txt: ['Acesse o Internet Banking da Caixa', 'Vá em Conta por Período', 'Exporte o extrato em formato TXT'],
    },
  },
  outro: {
    nome: 'Outro Banco',
    logo: () => <Landmark className="w-full h-full text-slate-600" />,
    cor: 'from-slate-400 to-slate-500',
    corBorda: 'border-slate-400',
    bgGradient: 'bg-gradient-to-br from-slate-50 to-gray-50',
    instrucoes: {
      ofx: ['Acesse o Internet Banking do seu banco', 'Procure a opção de exportar extrato', 'Escolha o formato OFX ou "Money"'],
      csv: ['Exporte o extrato no formato CSV', 'Verifique se contém: Data, Descrição, Valor'],
      txt: ['Exporte o extrato no formato TXT', 'O sistema tentará detectar o layout automaticamente'],
    },
  },
};

const formatosConfig = {
  ofx: { nome: 'OFX', subtitulo: 'Recomendado', descricao: 'Formato padrão bancário', icone: FileCode, cor: 'text-emerald-600', bgCor: 'bg-emerald-50 border-emerald-200', destaque: true },
  csv: { nome: 'CSV', subtitulo: 'Planilha', descricao: 'Separado por vírgula', icone: FileSpreadsheet, cor: 'text-blue-600', bgCor: 'bg-blue-50 border-blue-200', destaque: false },
  txt: { nome: 'TXT', subtitulo: 'Texto', descricao: 'Texto simples', icone: FileText, cor: 'text-slate-600', bgCor: 'bg-slate-50 border-slate-200', destaque: false },
};

const steps = [
  { key: 'banco', label: 'Banco', icon: Building2, description: 'Escolha seu banco' },
  { key: 'upload', label: 'Upload', icon: Upload, description: 'Envie o extrato' },
  { key: 'review', label: 'Revisão', icon: FileText, description: 'Classifique transações' },
  { key: 'confirm', label: 'Confirmar', icon: Check, description: 'Finalize importação' },
];

// Componente de Steps Verticais (painel esquerdo)
function VerticalSteps({ currentStep, bancoSelecionado, file, transactions }: { 
  currentStep: Step; 
  bancoSelecionado: BancoSelecionado;
  file: File | null;
  transactions: Transaction[];
}) {
  const currentIdx = steps.findIndex(s => s.key === currentStep);
  
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const isComplete = i < currentIdx;
        const isCurrent = s.key === currentStep;
        
        return (
          <div
            key={s.key}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl transition-all',
              isCurrent && 'bg-violet-100 ring-2 ring-violet-500',
              isComplete && 'bg-emerald-50',
              !isCurrent && !isComplete && 'bg-muted/30'
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
              isCurrent && 'bg-violet-600 text-white',
              isComplete && 'bg-emerald-500 text-white',
              !isCurrent && !isComplete && 'bg-muted text-muted-foreground'
            )}>
              {isComplete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn(
                'font-medium text-sm',
                isCurrent && 'text-violet-700',
                isComplete && 'text-emerald-700',
                !isCurrent && !isComplete && 'text-muted-foreground'
              )}>
                {s.label}
              </p>
              <p className="text-xs text-muted-foreground truncate">{s.description}</p>
            </div>
            {isCurrent && <ChevronRight className="h-4 w-4 text-violet-500 shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

// Card do banco selecionado
function BancoCard({ bancoKey, onRemove }: { bancoKey: BancoSelecionado; onRemove?: () => void }) {
  if (!bancoKey) return null;
  const config = bancosConfig[bancoKey];
  const Logo = config.logo;
  
  return (
    <div className={cn('p-4 rounded-xl border-2', config.corBorda, config.bgGradient)}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-white/80 p-2 shrink-0">
          <Logo />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{config.nome}</p>
          <p className="text-xs text-muted-foreground">Banco selecionado</p>
        </div>
        {onRemove && (
          <button onClick={onRemove} className="p-1 hover:bg-black/5 rounded">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

// Card do arquivo selecionado
function ArquivoCard({ file, formato, onRemove }: { file: File; formato: FormatoArquivo; onRemove?: () => void }) {
  const config = formatosConfig[formato];
  const Icon = config.icone;
  
  return (
    <div className={cn('p-4 rounded-xl border-2', config.bgCor)}>
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0', config.cor)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB • {formato.toUpperCase()}</p>
        </div>
        {onRemove && (
          <button onClick={onRemove} className="p-1 hover:bg-black/5 rounded">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

// Quick Stats para transações
function TransactionStats({ transactions }: { transactions: Transaction[] }) {
  const total = transactions.length;
  const selected = transactions.filter(t => t.selected).length;
  const classified = transactions.filter(t => t.selected && t.accountId).length;
  const duplicates = transactions.filter(t => t.isDuplicate).length;
  const credits = transactions.filter(t => t.selected && t.accountId && t.type === 'credit').reduce((sum, t) => sum + t.amountCents, 0);
  const debits = transactions.filter(t => t.selected && t.accountId && t.type === 'debit').reduce((sum, t) => sum + t.amountCents, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg bg-violet-50 text-center">
          <p className="text-lg font-bold text-violet-600">{selected}</p>
          <p className="text-[10px] text-muted-foreground">Selecionadas</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-50 text-center">
          <p className="text-lg font-bold text-emerald-600">{classified}</p>
          <p className="text-[10px] text-muted-foreground">Classificadas</p>
        </div>
      </div>
      {duplicates > 0 && (
        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-700">{duplicates} possíveis duplicatas</span>
        </div>
      )}
      <div className="space-y-1 pt-2 border-t">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Receitas</span>
          <span className="font-medium text-emerald-600">+{formatCurrency(credits)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Despesas</span>
          <span className="font-medium text-red-600">-{formatCurrency(debits)}</span>
        </div>
      </div>
    </div>
  );
}

// Estado vazio (nenhum banco selecionado)
function EmptyState({ onSelectBank }: { onSelectBank: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-6">
        <Upload className="h-12 w-12 text-violet-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Importe seu Extrato Bancário</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Selecione seu banco ao lado para começar. O sistema irá guiar você pelo processo de importação.
      </p>
      <Button onClick={onSelectBank} className="bg-violet-600 hover:bg-violet-700 lg:hidden">
        <Building2 className="h-4 w-4 mr-2" />
        Selecionar Banco
      </Button>
    </div>
  );
}

// Lista de seleção de banco (estilo Pessoas)
function BankSelectionList({ selected, onSelect }: { selected: BancoSelecionado; onSelect: (b: BancoSelecionado) => void }) {
  return (
    <div className="space-y-2">
      {(Object.keys(bancosConfig) as BancoSelecionado[]).filter(Boolean).map((key) => {
        const config = bancosConfig[key!];
        const Logo = config.logo;
        const isSelected = selected === key;
        
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all',
              'hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1',
              isSelected && 'bg-violet-100 ring-2 ring-violet-500'
            )}
          >
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center shrink-0 p-2',
              isSelected ? 'bg-white shadow-sm' : 'bg-muted'
            )}>
              <Logo />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{config.nome}</p>
              <p className="text-sm text-muted-foreground">Importar extrato</p>
            </div>
            <ChevronRight className={cn('h-5 w-5 text-slate-300 shrink-0 transition-transform', 
              isSelected && 'text-violet-500 rotate-90')} />
          </button>
        );
      })}
    </div>
  );
}

export default function Import() {
  const [step, setStep] = useState<Step>('banco');
  const [bancoSelecionado, setBancoSelecionado] = useState<BancoSelecionado>(null);
  const [formatoSelecionado, setFormatoSelecionado] = useState<FormatoArquivo>('ofx');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importId, setImportId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [processingStats, setProcessingStats] = useState<{ banco?: string; conta?: string; periodo?: string; total?: number } | null>(null);

  const utils = trpc.useUtils();
  const { data: accounts = [] } = trpc.accounts.list.useQuery();
  const { data: periods = [] } = trpc.periods.list.useQuery();
  
  const uploadMutation = trpc.bankImports.upload.useMutation();
  const processMutation = trpc.bankImports.process.useMutation();
  const confirmMutation = trpc.bankImports.confirm.useMutation();

  const analyticAccounts = accounts.filter(a => !accounts.some(c => c.parentId === a.id) && a.active);
  const openPeriods = periods.filter(p => p.status === 'open');

  const getFileType = (filename: string): FormatoArquivo | null => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'csv') return 'csv';
    if (ext === 'ofx') return 'ofx';
    if (ext === 'txt') return 'txt';
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande. Máximo: 10MB'); return; }
    const tipo = getFileType(f.name);
    if (tipo) { setFile(f); setFormatoSelecionado(tipo); }
    else { toast.error('Formato não suportado. Use OFX, CSV ou TXT.'); }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande. Máximo: 10MB'); return; }
    const tipo = getFileType(f.name);
    if (tipo) { setFile(f); setFormatoSelecionado(tipo); }
    else { toast.error('Formato não suportado. Use OFX, CSV ou TXT.'); }
  }, []);

  const handleProcess = async () => {
    if (!file) return;
    const fileType = getFileType(file.name);
    if (!fileType) { toast.error('Formato não suportado'); return; }
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const uploadResult = await uploadMutation.mutateAsync({ filename: file.name, fileType, fileContent: base64 });
      setImportId(uploadResult.id);
      const result = await processMutation.mutateAsync({ importId: uploadResult.id, fileContent: base64, fileType });
      setTransactions(result.transactions.map(tx => ({ ...tx, accountId: tx.suggestedAccountId || undefined, isNfc: false })));
      setProcessingStats({ banco: result.bank || (bancoSelecionado ? bancosConfig[bancoSelecionado]?.nome : undefined), conta: result.account, total: result.totalCount });
      if (openPeriods.length > 0) setSelectedPeriod(openPeriods[0].id.toString());
      toast.success(`${result.totalCount} transações encontradas`, { description: result.duplicateCount > 0 ? `${result.duplicateCount} possíveis duplicatas` : undefined });
      setStep('review');
    } catch (error: any) { toast.error(error.message || 'Erro ao processar arquivo'); }
  };

  const handleConfirm = async () => {
    if (!importId || !selectedPeriod) return;
    const selectedTxs = transactions.filter(tx => tx.selected && tx.accountId);
    if (selectedTxs.length === 0) { toast.error('Selecione pelo menos uma transação com conta definida'); return; }
    try {
      const result = await confirmMutation.mutateAsync({
        importId,
        periodId: parseInt(selectedPeriod),
        transactions: selectedTxs.map(tx => ({ index: tx.index, accountId: tx.accountId!, isNfc: tx.isNfc || false, nfcCategory: tx.nfcCategory })),
      });
      toast.success(`${result.entriesCreated} lançamentos criados!`);
      utils.entries.list.invalidate();
      setStep('banco'); setBancoSelecionado(null); setFile(null); setImportId(null); setTransactions([]); setProcessingStats(null);
    } catch (error: any) { toast.error(error.message || 'Erro ao criar lançamentos'); }
  };

  const updateTransaction = (index: number, updates: Partial<Transaction>) => {
    setTransactions(txs => txs.map(tx => tx.index === index ? { ...tx, ...updates } : tx));
  };

  const toggleAll = (selected: boolean) => {
    setTransactions(txs => txs.map(tx => ({ ...tx, selected: tx.isDuplicate ? false : selected })));
  };

  const banco = bancoSelecionado ? bancosConfig[bancoSelecionado] : null;
  const selectedCount = transactions.filter(tx => tx.selected).length;
  const classifiedCount = transactions.filter(tx => tx.selected && tx.accountId).length;

  const handleSelectBanco = (b: BancoSelecionado) => {
    setBancoSelecionado(b);
    if (b) setStep('upload');
  };

  const handleReset = () => {
    setStep('banco'); setBancoSelecionado(null); setFile(null); setImportId(null); setTransactions([]); setProcessingStats(null);
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] lg:h-[calc(100vh-theme(spacing.8))] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <PageHeader
          title="Importar Extrato"
          description="Importe extratos bancários e classifique automaticamente"
          icon={<span className="text-3xl">📥</span>}
        />
        {step !== 'banco' && (
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Cancelar</span>
          </Button>
        )}
      </div>

      {/* Master-Detail Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Painel Esquerdo (Master) - Contexto */}
        <Card className="lg:col-span-4 flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 shrink-0 border-b">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progresso</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            <VerticalSteps currentStep={step} bancoSelecionado={bancoSelecionado} file={file} transactions={transactions} />
            
            {/* Contexto: Banco */}
            {bancoSelecionado && (
              <div className="pt-4 border-t space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Banco</p>
                <BancoCard bancoKey={bancoSelecionado} onRemove={step === 'upload' && !file ? handleReset : undefined} />
              </div>
            )}
            
            {/* Contexto: Arquivo */}
            {file && (
              <div className="pt-4 border-t space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Arquivo</p>
                <ArquivoCard file={file} formato={formatoSelecionado} onRemove={step === 'upload' ? () => setFile(null) : undefined} />
              </div>
            )}
            
            {/* Contexto: Stats de Transações */}
            {transactions.length > 0 && (
              <div className="pt-4 border-t space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transações</p>
                <TransactionStats transactions={transactions} />
              </div>
            )}

            {/* Instruções contextuais */}
            {step === 'upload' && banco && (
              <div className="pt-4 border-t">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 flex items-center gap-1.5 mb-2">
                    <Info className="h-3.5 w-3.5" />
                    Como exportar do {banco.nome}
                  </p>
                  <ol className="space-y-1">
                    {banco.instrucoes[formatoSelecionado].map((instrucao, i) => (
                      <li key={i} className="flex gap-2 text-[11px] text-blue-800">
                        <span className="font-bold text-blue-500">{i + 1}.</span>
                        {instrucao}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Painel Direito (Detail) - Conteúdo */}
        <Card className="lg:col-span-8 flex flex-col overflow-hidden">
          {/* Step: Banco */}
          {step === 'banco' && (
            <div className="h-full flex flex-col">
              <CardHeader className="py-4 px-6 shrink-0 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-violet-600" />
                  Selecione seu Banco
                </CardTitle>
                <p className="text-sm text-muted-foreground">Escolha o banco para ver instruções específicas</p>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6">
                {bancoSelecionado ? (
                  <EmptyState onSelectBank={() => {}} />
                ) : (
                  <BankSelectionList selected={bancoSelecionado} onSelect={handleSelectBanco} />
                )}
              </CardContent>
            </div>
          )}

          {/* Step: Upload */}
          {step === 'upload' && banco && (
            <div className="h-full flex flex-col">
              <CardHeader className="py-4 px-6 shrink-0 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-violet-600" />
                  Enviar Extrato
                </CardTitle>
                <p className="text-sm text-muted-foreground">Arraste o arquivo ou clique para selecionar</p>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Seleção de Formato */}
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(formatosConfig) as FormatoArquivo[]).map((key) => {
                    const config = formatosConfig[key];
                    const Icon = config.icone;
                    const isSelected = formatoSelecionado === key;
                    
                    return (
                      <button
                        key={key}
                        onClick={() => setFormatoSelecionado(key)}
                        className={cn(
                          'relative p-3 rounded-xl border-2 transition-all text-center',
                          isSelected ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200' : config.bgCor
                        )}
                      >
                        {config.destaque && (
                          <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] px-1.5">
                            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                            Recomendado
                          </Badge>
                        )}
                        <Icon className={cn('h-6 w-6 mx-auto mb-1', isSelected ? 'text-violet-600' : config.cor)} />
                        <p className="font-bold text-xs">{config.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{config.subtitulo}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Drop Zone */}
                <div
                  className={cn(
                    'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300',
                    isDragging ? 'border-violet-500 bg-violet-50 scale-[1.02]' : 
                    file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/50'
                  )}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  {file ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-emerald-700">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB • Pronto para processar</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-violet-100 flex items-center justify-center">
                        <FileUp className="h-10 w-10 text-violet-500" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">Arraste o extrato aqui</h3>
                      <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>
                      <Badge variant="outline" className="text-xs">{formatoSelecionado.toUpperCase()} • Máx. 10MB</Badge>
                    </>
                  )}
                  <input id="file-input" type="file" accept=".csv,.ofx,.txt" className="hidden" onChange={handleFileChange} />
                </div>

                {/* Botões */}
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => { setStep('banco'); setBancoSelecionado(null); }}>
                    Voltar
                  </Button>
                  <Button 
                    disabled={!file || uploadMutation.isPending || processMutation.isPending} 
                    onClick={handleProcess}
                    className="bg-violet-600 hover:bg-violet-700 gap-2"
                  >
                    {(uploadMutation.isPending || processMutation.isPending) ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Processando...</>
                    ) : (
                      <>Processar<ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </CardContent>
            </div>
          )}

          {/* Step: Review */}
          {step === 'review' && (
            <div className="h-full flex flex-col">
              <CardHeader className="py-4 px-6 shrink-0 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-violet-600" />
                      Revisar Transações
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedCount} selecionadas • {classifiedCount} classificadas</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>Todas</Button>
                    <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>Nenhuma</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0">
                {/* Desktop Table */}
                <div className="hidden md:block h-full">
                  <ResponsiveTable stickyHeader density="compact">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Conta</TableHead>
                          <TableHead className="w-12">NFC</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => (
                          <TableRow key={tx.index} className={cn(tx.isDuplicate && 'bg-amber-50/50')}>
                            <TableCell>
                              <Checkbox checked={tx.selected} onCheckedChange={(c) => updateTransaction(tx.index, { selected: !!c })} disabled={tx.isDuplicate} />
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs">{formatDate(tx.date)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="max-w-[180px] truncate text-xs">{tx.description}</span>
                                {tx.isDuplicate && <Badge className="bg-amber-100 text-amber-700 text-[9px]"><AlertCircle className="h-2.5 w-2.5 mr-0.5" />Dup</Badge>}
                                {tx.confidence === 'high' && <Badge className="bg-emerald-100 text-emerald-700 text-[9px]"><Sparkles className="h-2.5 w-2.5 mr-0.5" />Auto</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                              <span className={tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}>
                                {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amountCents)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Select value={tx.accountId?.toString() || ''} onValueChange={(v) => updateTransaction(tx.index, { accountId: v ? parseInt(v) : undefined })}>
                                <SelectTrigger className="w-[160px] h-7 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                  {analyticAccounts.map((a) => (<SelectItem key={a.id} value={a.id.toString()} className="text-xs">{a.code} - {a.name}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell><Checkbox checked={tx.isNfc || false} onCheckedChange={(c) => updateTransaction(tx.index, { isNfc: !!c })} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ResponsiveTable>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden px-4 py-2">
                  <TableCardView
                    data={transactions}
                    keyExtractor={(tx) => tx.index}
                    renderCard={(tx) => (
                      <div className={cn('space-y-3', tx.isDuplicate && 'opacity-60')}>
                        <div className="flex items-start gap-3">
                          <Checkbox checked={tx.selected} onCheckedChange={(c) => updateTransaction(tx.index, { selected: !!c })} disabled={tx.isDuplicate} className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                              {tx.isDuplicate && <Badge className="bg-amber-100 text-amber-700 text-[9px]">Dup</Badge>}
                              {tx.confidence === 'high' && <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Auto</Badge>}
                            </div>
                            <p className="text-sm font-medium truncate">{tx.description}</p>
                            <p className={cn('font-mono font-bold text-sm', tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600')}>
                              {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amountCents)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-7">
                          <Select value={tx.accountId?.toString() || ''} onValueChange={(v) => updateTransaction(tx.index, { accountId: v ? parseInt(v) : undefined })}>
                            <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Selecione conta..." /></SelectTrigger>
                            <SelectContent>
                              {analyticAccounts.map((a) => (<SelectItem key={a.id} value={a.id.toString()} className="text-xs">{a.code} - {a.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1">
                            <Checkbox checked={tx.isNfc || false} onCheckedChange={(c) => updateTransaction(tx.index, { isNfc: !!c })} />
                            <span className="text-xs text-muted-foreground">NFC</span>
                          </div>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </CardContent>
              <div className="p-4 border-t shrink-0 flex justify-between">
                <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
                <Button onClick={() => setStep('confirm')} disabled={classifiedCount === 0} className="bg-violet-600 hover:bg-violet-700 gap-2">
                  Continuar<ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && (
            <div className="h-full flex flex-col">
              <CardHeader className="py-4 px-6 shrink-0 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-violet-600" />
                  Confirmar Importação
                </CardTitle>
                <p className="text-sm text-muted-foreground">Revise e confirme a criação dos lançamentos</p>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                <StatsGrid columns={3}>
                  <GlassCard className="text-center">
                    <p className="text-3xl font-bold text-violet-600">{classifiedCount}</p>
                    <p className="text-sm text-muted-foreground">Lançamentos</p>
                  </GlassCard>
                  <GlassCard className="text-center bg-gradient-to-br from-emerald-50 to-green-50">
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(transactions.filter(tx => tx.selected && tx.accountId && tx.type === 'credit').reduce((s, t) => s + t.amountCents, 0))}
                    </p>
                    <p className="text-sm text-muted-foreground">Receitas</p>
                  </GlassCard>
                  <GlassCard className="text-center bg-gradient-to-br from-red-50 to-rose-50">
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(transactions.filter(tx => tx.selected && tx.accountId && tx.type === 'debit').reduce((s, t) => s + t.amountCents, 0))}
                    </p>
                    <p className="text-sm text-muted-foreground">Despesas</p>
                  </GlassCard>
                </StatsGrid>

                <div className="space-y-2">
                  <Label>Período de Destino</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-full max-w-xs"><SelectValue placeholder="Selecione o período" /></SelectTrigger>
                    <SelectContent>
                      {openPeriods.map((p) => (<SelectItem key={p.id} value={p.id.toString()}>{formatPeriod(p.month, p.year)}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <div className="p-4 border-t shrink-0 flex justify-between">
                <Button variant="outline" onClick={() => setStep('review')}>Voltar</Button>
                <Button 
                  onClick={handleConfirm} 
                  disabled={confirmMutation.isPending || !selectedPeriod}
                  className="bg-violet-600 hover:bg-violet-700 gap-2"
                >
                  {confirmMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Criando...</>
                  ) : (
                    <><Check className="h-4 w-4" />Criar {classifiedCount} Lançamentos</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
