import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    if (f && getFileType(f.name)) {
      setFile(f);
    } else {
      toast.error('Formato não suportado. Use CSV, OFX ou TXT.');
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && getFileType(f.name)) {
      setFile(f);
    } else if (f) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importar Extrato</h1>
        <p className="text-muted-foreground">Importe extratos bancários em CSV, OFX ou TXT</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-4">
        <div className={cn('flex items-center gap-2 px-4 py-2 rounded-lg', step === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
          <span className="w-6 h-6 rounded-full bg-background text-foreground flex items-center justify-center text-sm font-bold">1</span>
          <span className="font-medium">Upload</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className={cn('flex items-center gap-2 px-4 py-2 rounded-lg', step === 'review' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
          <span className="w-6 h-6 rounded-full bg-background text-foreground flex items-center justify-center text-sm font-bold">2</span>
          <span className="font-medium">Revisão</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className={cn('flex items-center gap-2 px-4 py-2 rounded-lg', step === 'confirm' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
          <span className="w-6 h-6 rounded-full bg-background text-foreground flex items-center justify-center text-sm font-bold">3</span>
          <span className="font-medium">Confirmar</span>
        </div>
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
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revisar Transações</CardTitle>
                <CardDescription>
                  {selectedCount} de {transactions.length} selecionadas • {classifiedCount} classificadas
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => toggleAll(true)}>Selecionar Todas</Button>
                <Button variant="outline" onClick={() => toggleAll(false)}>Desmarcar Todas</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>NFC</TableHead>
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
                      <TableCell>{formatDate(tx.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="max-w-[200px] truncate">{tx.description}</span>
                          {tx.isDuplicate && <Badge variant="warning">Duplicado</Badge>}
                          {tx.confidence === 'high' && <Badge variant="success">Auto</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                          {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amountCents)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={tx.accountId?.toString() || ''} 
                          onValueChange={(v) => updateTransaction(tx.index, { accountId: v ? parseInt(v) : undefined })}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {analyticAccounts.map((a) => (
                              <SelectItem key={a.id} value={a.id.toString()}>{a.code} - {a.name}</SelectItem>
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
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={() => setStep('confirm')} disabled={classifiedCount === 0}>
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmar Importação</CardTitle>
            <CardDescription>Revise e confirme a criação dos lançamentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">{classifiedCount}</div>
                  <div className="text-sm text-muted-foreground">Lançamentos a criar</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {formatCurrency(transactions.filter(tx => tx.selected && tx.accountId && tx.type === 'credit').reduce((sum, tx) => sum + tx.amountCents, 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Receitas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {formatCurrency(transactions.filter(tx => tx.selected && tx.accountId && tx.type === 'debit').reduce((sum, tx) => sum + tx.amountCents, 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Despesas</div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Label>Período de Destino</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {openPeriods.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{formatPeriod(p.month, p.year)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('review')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={handleConfirm} disabled={confirmMutation.isPending || !selectedPeriod}>
                {confirmMutation.isPending ? 'Criando...' : `Criar ${classifiedCount} Lançamentos`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supported formats */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Formatos Suportados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  CSV
                </h4>
                <p className="text-sm text-muted-foreground mt-1">Arquivo separado por vírgula ou ponto-e-vírgula</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  OFX
                </h4>
                <p className="text-sm text-muted-foreground mt-1">Formato padrão bancário</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  TXT
                </h4>
                <p className="text-sm text-muted-foreground mt-1">Extrato em texto simples</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
