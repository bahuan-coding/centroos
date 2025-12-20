import { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  Check,
  Building2,
  Landmark,
  HelpCircle,
  FileSpreadsheet,
  FileCode,
  Info,
  Loader2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ResponsiveTable, TableCardView } from '@/components/ui/table';
import { PageHeader, StatsGrid } from '@/components/ui/page-header';
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

// Logos dos bancos como SVG inline
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
    instrucoes: {
      ofx: [
        'Acesse o Internet Banking do BB',
        'Vá em Conta Corrente → Extrato',
        'Selecione o período desejado',
        'Clique no ícone de download (disquete)',
        'Escolha "Money 2000+ (OFX)"',
      ],
      csv: [
        'Acesse o Internet Banking do BB',
        'Vá em Conta Corrente → Extrato',
        'Selecione o período desejado',
        'Clique em Exportar → CSV',
      ],
      txt: [
        'Acesse o Internet Banking do BB',
        'Vá em Conta Corrente → Extrato',
        'Selecione o período e exporte como TXT',
      ],
    },
  },
  caixa: {
    nome: 'Caixa Econômica Federal',
    logo: CaixaLogo,
    cor: 'from-blue-600 to-orange-500',
    corBorda: 'border-blue-500',
    instrucoes: {
      ofx: [
        'Acesse o Internet Banking da Caixa',
        'Vá em Conta por Período',
        'Selecione o período desejado',
        'Clique em "Gerar Arquivo para Gerenciadores Financeiros"',
        'Escolha formato OFX e clique em Continuar',
      ],
      csv: [
        'Acesse o Internet Banking da Caixa',
        'Vá em Conta por Período',
        'Exporte o extrato em formato CSV',
      ],
      txt: [
        'Acesse o Internet Banking da Caixa',
        'Vá em Conta por Período',
        'Exporte o extrato em formato TXT',
      ],
    },
  },
  outro: {
    nome: 'Outro Banco',
    logo: () => <Landmark className="w-full h-full text-slate-600" />,
    cor: 'from-slate-400 to-slate-500',
    corBorda: 'border-slate-400',
    instrucoes: {
      ofx: [
        'Acesse o Internet Banking do seu banco',
        'Procure a opção de exportar extrato',
        'Escolha o formato OFX ou "Money"',
      ],
      csv: [
        'Exporte o extrato no formato CSV',
        'Verifique se contém: Data, Descrição, Valor',
      ],
      txt: [
        'Exporte o extrato no formato TXT',
        'O sistema tentará detectar o layout automaticamente',
      ],
    },
  },
};

const formatosConfig = {
  ofx: {
    nome: 'OFX',
    subtitulo: 'Recomendado',
    descricao: 'Formato padrão bancário com alta precisão',
    icone: FileCode,
    cor: 'text-emerald-600',
    bgCor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    destaque: true,
  },
  csv: {
    nome: 'CSV',
    subtitulo: 'Planilha',
    descricao: 'Separado por vírgula ou ponto-e-vírgula',
    icone: FileSpreadsheet,
    cor: 'text-blue-600',
    bgCor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    destaque: false,
  },
  txt: {
    nome: 'TXT',
    subtitulo: 'Texto',
    descricao: 'Texto simples com detecção automática',
    icone: FileText,
    cor: 'text-slate-600',
    bgCor: 'bg-slate-50 hover:bg-slate-100 border-slate-200',
    destaque: false,
  },
};

export default function Import() {
  const [step, setStep] = useState<Step>('banco');
  const [bancoSelecionado, setBancoSelecionado] = useState<BancoSelecionado>(null);
  const [formatoSelecionado, setFormatoSelecionado] = useState<FormatoArquivo>('ofx');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importId, setImportId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [processingStats, setProcessingStats] = useState<{
    banco?: string;
    conta?: string;
    periodo?: string;
    total?: number;
  } | null>(null);

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
    
    const maxSize = 10 * 1024 * 1024;
    if (f.size > maxSize) {
      toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }
    
    const tipo = getFileType(f.name);
    if (tipo) {
      setFile(f);
      setFormatoSelecionado(tipo);
    } else {
      toast.error('Formato não suportado. Use OFX, CSV ou TXT.');
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    
    const maxSize = 10 * 1024 * 1024;
    if (f.size > maxSize) {
      toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }
    
    const tipo = getFileType(f.name);
    if (tipo) {
      setFile(f);
      setFormatoSelecionado(tipo);
    } else {
      toast.error('Formato não suportado. Use OFX, CSV ou TXT.');
    }
  }, []);

  const handleProcess = async () => {
    if (!file) return;
    
    const fileType = getFileType(file.name);
    if (!fileType) {
      toast.error('Formato não suportado');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

      const uploadResult = await uploadMutation.mutateAsync({
        filename: file.name,
        fileType,
        fileContent: base64,
      });

      setImportId(uploadResult.id);

      const result = await processMutation.mutateAsync({
        importId: uploadResult.id,
        fileContent: base64,
        fileType,
      });

      setTransactions(result.transactions.map(tx => ({
        ...tx,
        accountId: tx.suggestedAccountId || undefined,
        isNfc: false,
      })));

      // Estatísticas do processamento
      setProcessingStats({
        banco: result.bank || bancoSelecionado ? bancosConfig[bancoSelecionado!]?.nome : undefined,
        conta: result.account,
        total: result.totalCount,
      });

      if (openPeriods.length > 0) {
        setSelectedPeriod(openPeriods[0].id.toString());
      }

      toast.success(`${result.totalCount} transações encontradas`, {
        description: result.duplicateCount > 0 ? `${result.duplicateCount} possíveis duplicatas` : undefined,
      });
      setStep('review');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar arquivo');
    }
  };

  const handleConfirm = async () => {
    if (!importId || !selectedPeriod) return;

    const selectedTxs = transactions.filter(tx => tx.selected && tx.accountId);
    
    if (selectedTxs.length === 0) {
      toast.error('Selecione pelo menos uma transação com conta definida');
      return;
    }

    try {
      const result = await confirmMutation.mutateAsync({
        importId,
        periodId: parseInt(selectedPeriod),
        transactions: selectedTxs.map(tx => ({
          index: tx.index,
          accountId: tx.accountId!,
          isNfc: tx.isNfc || false,
          nfcCategory: tx.nfcCategory,
        })),
      });

      toast.success(`${result.entriesCreated} lançamentos criados!`);
      utils.entries.list.invalidate();
      
      // Reset
      setStep('banco');
      setBancoSelecionado(null);
      setFile(null);
      setImportId(null);
      setTransactions([]);
      setProcessingStats(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar lançamentos');
    }
  };

  const updateTransaction = (index: number, updates: Partial<Transaction>) => {
    setTransactions(txs => txs.map(tx => 
      tx.index === index ? { ...tx, ...updates } : tx
    ));
  };

  const toggleAll = (selected: boolean) => {
    setTransactions(txs => txs.map(tx => ({ ...tx, selected: tx.isDuplicate ? false : selected })));
  };

  const selectedCount = transactions.filter(tx => tx.selected).length;
  const classifiedCount = transactions.filter(tx => tx.selected && tx.accountId).length;

  const steps = [
    { key: 'banco', label: 'Banco', shortLabel: '1' },
    { key: 'upload', label: 'Upload', shortLabel: '2' },
    { key: 'review', label: 'Revisão', shortLabel: '3' },
    { key: 'confirm', label: 'Confirmar', shortLabel: '4' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  const banco = bancoSelecionado ? bancosConfig[bancoSelecionado] : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Importar Extrato"
        description="Importe extratos bancários do Banco do Brasil ou Caixa Econômica"
        icon={<Upload className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />}
      />

      {/* Steps indicator */}
      <div className="flex items-center justify-between sm:justify-start sm:gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className={cn(
              'flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors',
              step === s.key ? 'bg-primary text-primary-foreground' : i < currentStepIndex ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
            )}>
              <span className={cn(
                'w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold',
                step === s.key ? 'bg-primary-foreground text-primary' : i < currentStepIndex ? 'bg-green-600 text-white' : 'bg-background text-foreground'
              )}>
                {i < currentStepIndex ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="font-medium text-xs sm:text-sm hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mx-1 sm:mx-2 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Seleção de Banco */}
      {step === 'banco' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Selecione seu Banco
              </CardTitle>
              <CardDescription>
                Escolha o banco para ver instruções específicas de exportação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(Object.keys(bancosConfig) as BancoSelecionado[]).filter(Boolean).map((key) => {
                  const config = bancosConfig[key!];
                  const Logo = config.logo;
                  const isSelected = bancoSelecionado === key;
                  
                  return (
                    <button
                      key={key}
                      onClick={() => setBancoSelecionado(key)}
                      className={cn(
                        'group relative p-6 rounded-2xl border-2 transition-all duration-300',
                        'hover:shadow-lg hover:scale-[1.02]',
                        isSelected 
                          ? `${config.corBorda} border-2 shadow-lg bg-gradient-to-br ${config.cor} text-white` 
                          : 'border-border hover:border-primary/50 bg-card'
                      )}
                    >
                      <div className={cn(
                        'w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center overflow-hidden',
                        isSelected ? 'bg-white/20' : 'bg-muted'
                      )}>
                        <div className="w-12 h-12">
                          <Logo />
                        </div>
                      </div>
                      <h3 className={cn(
                        'font-bold text-center',
                        isSelected ? 'text-white' : 'text-foreground'
                      )}>
                        {config.nome}
                      </h3>
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end mt-6">
                <Button 
                  onClick={() => setStep('upload')} 
                  disabled={!bancoSelecionado}
                  size="lg"
                  className="gap-2"
                >
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Upload */}
      {step === 'upload' && banco && (
        <div className="space-y-4">
          {/* Seleção de Formato */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Formato do Arquivo
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                        'relative p-4 rounded-xl border-2 transition-all text-left',
                        isSelected 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                          : config.bgCor
                      )}
                    >
                      {config.destaque && (
                        <Badge className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px]">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Recomendado
                        </Badge>
                      )}
                      <Icon className={cn('h-8 w-8 mb-2', config.cor)} />
                      <h4 className="font-bold text-sm">{config.nome}</h4>
                      <p className="text-xs text-muted-foreground">{config.descricao}</p>
                      {isSelected && (
                        <CheckCircle className="absolute top-3 right-3 h-5 w-5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Instruções Contextuais */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                <Info className="h-4 w-4" />
                Como exportar do {banco.nome}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ol className="space-y-1">
                {banco.instrucoes[formatoSelecionado].map((instrucao, i) => (
                  <li key={i} className="flex gap-2 text-sm text-blue-800">
                    <span className="font-bold text-blue-500">{i + 1}.</span>
                    {instrucao}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Drop Zone */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upload de Arquivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300',
                  isDragging 
                    ? 'border-primary bg-primary/10 scale-[1.02]' 
                    : file 
                      ? 'border-green-400 bg-green-50' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-700">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB • {formatoSelecionado.toUpperCase()}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    >
                      Remover arquivo
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Arraste o extrato aqui</h3>
                    <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>
                    <Badge variant="outline" className="text-xs">
                      {formatoSelecionado.toUpperCase()} • Máx. 10MB
                    </Badge>
                  </>
                )}
                <input 
                  id="file-input" 
                  type="file" 
                  accept=".csv,.ofx,.txt" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep('banco')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button 
                  disabled={!file || uploadMutation.isPending || processMutation.isPending} 
                  onClick={handleProcess}
                  size="lg"
                  className="gap-2"
                >
                  {(uploadMutation.isPending || processMutation.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      Processar Extrato
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  Revisar Transações
                  {processingStats?.banco && (
                    <Badge variant="outline">{processingStats.banco}</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {selectedCount} de {transactions.length} selecionadas • {classifiedCount} classificadas
                  {processingStats?.conta && ` • Conta: ${processingStats.conta}`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleAll(true)} className="text-xs sm:text-sm">
                  Selecionar Todas
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleAll(false)} className="text-xs sm:text-sm">
                  Desmarcar Todas
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {/* Desktop Table */}
            <div className="hidden md:block">
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
                      <TableRow key={tx.index} className={cn(tx.isDuplicate && 'bg-yellow-50 dark:bg-yellow-950/20')}>
                        <TableCell>
                          <Checkbox 
                            checked={tx.selected}
                            onCheckedChange={(checked) => updateTransaction(tx.index, { selected: !!checked })}
                            disabled={tx.isDuplicate}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{formatDate(tx.date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="max-w-[150px] lg:max-w-[200px] truncate text-xs">{tx.description}</span>
                            {tx.isDuplicate && (
                              <Badge variant="secondary" className="text-[10px] bg-yellow-100 text-yellow-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Duplicado
                              </Badge>
                            )}
                            {tx.confidence === 'high' && (
                              <Badge className="bg-green-100 text-green-700 text-[10px]">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Auto
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                          <span className={tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                            {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amountCents)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={tx.accountId?.toString() || ''} 
                            onValueChange={(v) => updateTransaction(tx.index, { accountId: v ? parseInt(v) : undefined })}
                          >
                            <SelectTrigger className="w-[140px] lg:w-[180px] h-8 text-xs">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {analyticAccounts.map((a) => (
                                <SelectItem key={a.id} value={a.id.toString()} className="text-xs">
                                  {a.code} - {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Checkbox 
                            checked={tx.isNfc || false}
                            onCheckedChange={(checked) => updateTransaction(tx.index, { isNfc: !!checked })}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ResponsiveTable>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden px-4 max-h-[60vh] overflow-auto">
              <TableCardView
                data={transactions}
                keyExtractor={(tx) => tx.index}
                renderCard={(tx) => (
                  <div className={cn('space-y-3', tx.isDuplicate && 'opacity-60')}>
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={tx.selected}
                        onCheckedChange={(checked) => updateTransaction(tx.index, { selected: !!checked })}
                        disabled={tx.isDuplicate}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                          {tx.isDuplicate && <Badge variant="secondary" className="text-[10px]">Duplicado</Badge>}
                          {tx.confidence === 'high' && <Badge className="bg-green-100 text-green-700 text-[10px]">Auto</Badge>}
                        </div>
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <p className={cn(
                          'font-mono font-bold text-sm',
                          tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        )}>
                          {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amountCents)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-7">
                      <Select 
                        value={tx.accountId?.toString() || ''} 
                        onValueChange={(v) => updateTransaction(tx.index, { accountId: v ? parseInt(v) : undefined })}
                      >
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="Selecione conta..." />
                        </SelectTrigger>
                        <SelectContent>
                          {analyticAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id.toString()} className="text-xs">
                              {a.code} - {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Checkbox 
                          checked={tx.isNfc || false}
                          onCheckedChange={(checked) => updateTransaction(tx.index, { isNfc: !!checked })}
                        />
                        <span className="text-xs text-muted-foreground">NFC</span>
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>

            <div className="flex justify-between mt-4 sm:mt-6 px-4 sm:px-0">
              <Button variant="outline" size="sm" onClick={() => setStep('upload')} className="touch-target">
                <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button size="sm" onClick={() => setStep('confirm')} disabled={classifiedCount === 0} className="touch-target">
                Continuar
                <ArrowRight className="ml-1 sm:ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirm */}
      {step === 'confirm' && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Confirmar Importação</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Revise e confirme a criação dos lançamentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <StatsGrid columns={3}>
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="text-xl sm:text-2xl font-bold text-primary">{classifiedCount}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Lançamentos</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-emerald-100">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="text-base sm:text-2xl font-bold text-green-600">
                    {formatCurrency(transactions.filter(tx => tx.selected && tx.accountId && tx.type === 'credit').reduce((sum, tx) => sum + tx.amountCents, 0))}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Receitas</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-rose-100">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="text-base sm:text-2xl font-bold text-red-600">
                    {formatCurrency(transactions.filter(tx => tx.selected && tx.accountId && tx.type === 'debit').reduce((sum, tx) => sum + tx.amountCents, 0))}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Despesas</div>
                </CardContent>
              </Card>
            </StatsGrid>

            <div className="space-y-2">
              <Label className="text-sm">Período de Destino</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full sm:max-w-xs">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {openPeriods.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{formatPeriod(p.month, p.year)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" size="sm" onClick={() => setStep('review')} className="touch-target">
                <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button 
                size="lg" 
                onClick={handleConfirm} 
                disabled={confirmMutation.isPending || !selectedPeriod}
                className="gap-2"
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Criar {classifiedCount} Lançamentos
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
