import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, ArrowRight, ArrowLeft, Check } from 'lucide-react';
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

type Step = 'upload' | 'review' | 'confirm';

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

export default function Import() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importId, setImportId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');

  const utils = trpc.useUtils();
  const { data: accounts = [] } = trpc.accounts.list.useQuery();
  const { data: periods = [] } = trpc.periods.list.useQuery();
  
  const uploadMutation = trpc.bankImports.upload.useMutation();
  const processMutation = trpc.bankImports.process.useMutation();
  const confirmMutation = trpc.bankImports.confirm.useMutation();

  const analyticAccounts = accounts.filter(a => !accounts.some(c => c.parentId === a.id) && a.active);
  const openPeriods = periods.filter(p => p.status === 'open');

  const getFileType = (filename: string): 'csv' | 'ofx' | 'txt' | null => {
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
    
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (f.size > maxSize) {
      toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }
    
    if (getFileType(f.name)) {
      setFile(f);
    } else {
      toast.error('Formato não suportado. Use CSV, OFX ou TXT.');
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (f.size > maxSize) {
      toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }
    
    if (getFileType(f.name)) {
      setFile(f);
    } else {
      toast.error('Formato não suportado. Use CSV, OFX ou TXT.');
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
      // Convert file to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

      // Upload first
      const uploadResult = await uploadMutation.mutateAsync({
        filename: file.name,
        fileType,
        fileContent: base64,
      });

      setImportId(uploadResult.id);

      // Process
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

      // Set default period
      if (openPeriods.length > 0) {
        setSelectedPeriod(openPeriods[0].id.toString());
      }

      toast.success(`${result.totalCount} transações encontradas`);
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
      setStep('upload');
      setFile(null);
      setImportId(null);
      setTransactions([]);
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
    { key: 'upload', label: 'Upload', shortLabel: '1' },
    { key: 'review', label: 'Revisão', shortLabel: '2' },
    { key: 'confirm', label: 'Confirmar', shortLabel: '3' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Importar Extrato"
        description="Importe extratos bancários em CSV, OFX ou TXT"
        icon={<Upload className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />}
      />

      {/* Steps indicator - Responsivo */}
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
              <span className="font-medium text-xs sm:text-sm hidden xs:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mx-1 sm:mx-2 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload de Arquivo</CardTitle>
            <CardDescription>Arraste o arquivo ou clique para selecionar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
                isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                  <p className="text-lg font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                    Remover
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Arraste o extrato bancário aqui</h3>
                  <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground">CSV, OFX, TXT (máx. 10MB)</p>
                </>
              )}
              <input id="file-input" type="file" accept=".csv,.ofx,.txt" className="hidden" onChange={handleFileChange} />
            </div>

            <Button 
              disabled={!file || uploadMutation.isPending || processMutation.isPending} 
              className="w-full"
              onClick={handleProcess}
            >
              {(uploadMutation.isPending || processMutation.isPending) ? 'Processando...' : 'Processar Extrato'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review */}
      {step === 'review' && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg">Revisar Transações</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {selectedCount} de {transactions.length} selecionadas • {classifiedCount} classificadas
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleAll(true)} className="text-xs sm:text-sm">
                  <span className="hidden xs:inline">Selecionar </span>Todas
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleAll(false)} className="text-xs sm:text-sm">
                  <span className="hidden xs:inline">Desmarcar </span>Todas
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
                            {tx.isDuplicate && <Badge variant="secondary" className="text-[10px]">Dup</Badge>}
                            {tx.confidence === 'high' && <Badge className="bg-green-100 text-green-700 text-[10px]">Auto</Badge>}
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
                <span className="hidden xs:inline">Voltar</span>
              </Button>
              <Button size="sm" onClick={() => setStep('confirm')} disabled={classifiedCount === 0} className="touch-target">
                <span className="hidden xs:inline">Continuar</span>
                <ArrowRight className="ml-1 sm:ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Confirmar Importação</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Revise e confirme a criação dos lançamentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <StatsGrid columns={3}>
              <Card>
                <CardContent className="pt-4 sm:pt-6">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{classifiedCount}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Lançamentos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 sm:pt-6">
                  <div className="text-base sm:text-2xl font-bold text-green-600">
                    {formatCurrency(transactions.filter(tx => tx.selected && tx.accountId && tx.type === 'credit').reduce((sum, tx) => sum + tx.amountCents, 0))}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Receitas</div>
                </CardContent>
              </Card>
              <Card>
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
                <span className="hidden xs:inline">Voltar</span>
              </Button>
              <Button size="sm" onClick={handleConfirm} disabled={confirmMutation.isPending || !selectedPeriod} className="touch-target">
                {confirmMutation.isPending ? 'Criando...' : (
                  <>
                    <span className="hidden sm:inline">Criar {classifiedCount} Lançamentos</span>
                    <span className="sm:hidden">Criar ({classifiedCount})</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supported formats */}
      {step === 'upload' && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Formatos Suportados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 border rounded-lg">
                <h4 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                  <FileText className="h-4 w-4 shrink-0" />
                  CSV
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Separado por vírgula</p>
              </div>
              <div className="p-3 sm:p-4 border rounded-lg">
                <h4 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                  <FileText className="h-4 w-4 shrink-0" />
                  OFX
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Padrão bancário</p>
              </div>
              <div className="p-3 sm:p-4 border rounded-lg">
                <h4 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                  <FileText className="h-4 w-4 shrink-0" />
                  TXT
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Texto simples</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
