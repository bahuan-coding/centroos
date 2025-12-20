import { useState, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Check, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { FormField } from '@/components/ui/form-section';
import { FileDropzone, FileType } from './FileDropzone';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

// Types
interface ContaFinanceira {
  id: string;
  nome: string;
  tipo: string;
  bancoNome?: string;
  saldoAtual: number;
  ultimoExtrato?: string;
}

interface LinhaExtrato {
  data: string;
  descricao: string;
  valor: number;
  tipo: 'credito' | 'debito';
}

interface ExtratoImportFormProps {
  contas: ContaFinanceira[];
  onSuccess?: (extratoId: string) => void;
  onCancel?: () => void;
}

interface FileInfo {
  file: File;
  type: FileType;
  preview?: string;
  lines?: number;
}

// Mock data for demo
const MOCK_CONTAS: ContaFinanceira[] = [
  { id: '1', nome: 'BB Conta Movimento', tipo: 'conta_corrente', bancoNome: 'Banco do Brasil', saldoAtual: 15234.56, ultimoExtrato: '2024-11-30' },
  { id: '2', nome: 'Caixa Econômica', tipo: 'conta_corrente', bancoNome: 'Caixa Econômica Federal', saldoAtual: 8976.32 },
  { id: '3', nome: 'Caixa Geral', tipo: 'caixa', saldoAtual: 1250.00 },
];

// Steps
const STEPS = [
  { id: 1, title: 'Conta', description: 'Selecione a conta' },
  { id: 2, title: 'Arquivo', description: 'Upload do extrato' },
  { id: 3, title: 'Preview', description: 'Revise os dados' },
  { id: 4, title: 'Confirmar', description: 'Finalize a importação' },
];

// CSV Config
interface CsvConfig {
  separador: string;
  colunaData: number;
  colunaDescricao: number;
  colunaValor: number;
  colunaTipo: number;
  formatoData: string;
  linhasIgnorar: number;
}

const DEFAULT_CSV_CONFIG: CsvConfig = {
  separador: ';',
  colunaData: 0,
  colunaDescricao: 1,
  colunaValor: 2,
  colunaTipo: -1,
  formatoData: 'DD/MM/YYYY',
  linhasIgnorar: 1,
};

export function ExtratoImportForm({
  contas = MOCK_CONTAS,
  onSuccess,
  onCancel,
}: ExtratoImportFormProps) {
  const [step, setStep] = useState(1);
  const [selectedContaId, setSelectedContaId] = useState<string>('');
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [csvConfig, setCsvConfig] = useState<CsvConfig>(DEFAULT_CSV_CONFIG);
  const [parsedLines, setParsedLines] = useState<LinhaExtrato[]>([]);
  
  const utils = trpc.useUtils();
  
  const uploadMutation = trpc.bankImports.upload.useMutation({
    onSuccess: (data) => {
      utils.extratos.invalidate();
      toast.success(`${parsedLines.length} linhas importadas com sucesso!`);
      onSuccess?.(data.id.toString());
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao importar extrato');
    },
  });
  
  const isProcessing = uploadMutation.isPending;

  const selectedConta = useMemo(
    () => contas.find((c) => c.id === selectedContaId),
    [contas, selectedContaId]
  );

  // Parse file content (simplified demo)
  const parseFile = async (info: FileInfo) => {
    if (!info.preview) return;

    const lines = info.preview.split('\n').filter((l) => l.trim());
    const parsed: LinhaExtrato[] = [];

    // Skip header lines
    for (let i = csvConfig.linhasIgnorar; i < lines.length && i < 15; i++) {
      const cols = lines[i].split(csvConfig.separador);
      if (cols.length > Math.max(csvConfig.colunaData, csvConfig.colunaDescricao, csvConfig.colunaValor)) {
        const valorStr = cols[csvConfig.colunaValor]?.replace(/[^\d,.-]/g, '').replace(',', '.') || '0';
        const valor = parseFloat(valorStr) || 0;
        
        parsed.push({
          data: cols[csvConfig.colunaData]?.trim() || '',
          descricao: cols[csvConfig.colunaDescricao]?.trim() || '',
          valor: Math.abs(valor),
          tipo: valor >= 0 ? 'credito' : 'debito',
        });
      }
    }

    setParsedLines(parsed);
  };

  // Computed stats
  const stats = useMemo(() => {
    const creditos = parsedLines.filter((l) => l.tipo === 'credito');
    const debitos = parsedLines.filter((l) => l.tipo === 'debito');
    return {
      total: parsedLines.length,
      creditos: creditos.length,
      debitos: debitos.length,
      somaCreditos: creditos.reduce((sum, l) => sum + l.valor, 0),
      somaDebitos: debitos.reduce((sum, l) => sum + l.valor, 0),
    };
  }, [parsedLines]);

  // Navigation
  const canGoNext = () => {
    switch (step) {
      case 1: return !!selectedContaId;
      case 2: return !!fileInfo;
      case 3: return parsedLines.length > 0;
      default: return true;
    }
  };

  const goNext = () => {
    if (step === 2 && fileInfo) {
      parseFile(fileInfo);
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  // Submit
  const handleSubmit = async () => {
    if (!fileInfo) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadMutation.mutate({
        filename: fileInfo.file.name,
        fileType: fileInfo.type as 'csv' | 'ofx' | 'txt',
        fileContent: base64,
      });
    };
    reader.readAsDataURL(fileInfo.file);
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => {
          const isActive = s.id === step;
          const isCompleted = s.id < step;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all',
                    isCompleted && 'bg-emerald-500 text-white',
                    isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                    !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : s.id}
                </div>
                <p className={cn('text-xs font-medium mt-1.5', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                  {s.title}
                </p>
                <p className="text-[10px] text-muted-foreground">{s.description}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('flex-1 h-0.5 mx-2 rounded', isCompleted ? 'bg-emerald-500' : 'bg-muted')} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Select Account */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">Selecione a Conta Bancária</h3>
                <p className="text-sm text-muted-foreground">Escolha a conta para a qual deseja importar o extrato</p>
              </div>

              <div className="grid gap-3">
                {contas.map((conta) => (
                  <button
                    key={conta.id}
                    type="button"
                    onClick={() => setSelectedContaId(conta.id)}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all',
                      selectedContaId === conta.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    <div className={cn('p-3 rounded-lg', selectedContaId === conta.id ? 'bg-primary/10' : 'bg-muted')}>
                      <Building2 className={cn('h-5 w-5', selectedContaId === conta.id ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{conta.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{conta.bancoNome || conta.tipo}</span>
                        {conta.ultimoExtrato && (
                          <Badge variant="secondary" className="text-[10px]">
                            Último: {new Date(conta.ultimoExtrato).toLocaleDateString('pt-BR')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Saldo Atual</p>
                      <p className="font-mono font-medium">
                        R$ {conta.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    {selectedContaId === conta.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Upload File */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">Upload do Extrato</h3>
                <p className="text-sm text-muted-foreground">
                  Importe o arquivo de extrato da conta <strong>{selectedConta?.nome}</strong>
                </p>
              </div>

              <FileDropzone
                onFileSelect={(info) => setFileInfo(info)}
                onClear={() => setFileInfo(null)}
                acceptedTypes={['ofx', 'csv', 'txt']}
              />

              {/* CSV Config (show only for CSV/TXT) */}
              {fileInfo && (fileInfo.type === 'csv' || fileInfo.type === 'txt') && (
                <Card className="mt-4 border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Configuração de Colunas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <FormField>
                        <LabelWithHelp label="Separador" help="Caractere que separa as colunas" />
                        <Select
                          value={csvConfig.separador}
                          onValueChange={(v) => setCsvConfig((c) => ({ ...c, separador: v }))}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=";">Ponto-vírgula (;)</SelectItem>
                            <SelectItem value=",">Vírgula (,)</SelectItem>
                            <SelectItem value="\t">Tab</SelectItem>
                            <SelectItem value="|">Pipe (|)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>

                      <FormField>
                        <LabelWithHelp label="Coluna Data" help="Posição da coluna de data (0 = primeira)" />
                        <Input
                          type="number"
                          min={0}
                          value={csvConfig.colunaData}
                          onChange={(e) => setCsvConfig((c) => ({ ...c, colunaData: parseInt(e.target.value) || 0 }))}
                          className="h-9 text-sm"
                        />
                      </FormField>

                      <FormField>
                        <LabelWithHelp label="Coluna Descrição" help="Posição da coluna de descrição" />
                        <Input
                          type="number"
                          min={0}
                          value={csvConfig.colunaDescricao}
                          onChange={(e) => setCsvConfig((c) => ({ ...c, colunaDescricao: parseInt(e.target.value) || 0 }))}
                          className="h-9 text-sm"
                        />
                      </FormField>

                      <FormField>
                        <LabelWithHelp label="Coluna Valor" help="Posição da coluna de valor" />
                        <Input
                          type="number"
                          min={0}
                          value={csvConfig.colunaValor}
                          onChange={(e) => setCsvConfig((c) => ({ ...c, colunaValor: parseInt(e.target.value) || 0 }))}
                          className="h-9 text-sm"
                        />
                      </FormField>
                    </div>

                    <FormField>
                      <LabelWithHelp label="Linhas de Cabeçalho" help="Quantas linhas ignorar no início (cabeçalho)" />
                      <Input
                        type="number"
                        min={0}
                        value={csvConfig.linhasIgnorar}
                        onChange={(e) => setCsvConfig((c) => ({ ...c, linhasIgnorar: parseInt(e.target.value) || 0 }))}
                        className="h-9 text-sm w-24"
                      />
                    </FormField>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInfo && parseFile(fileInfo)}
                    >
                      Testar Configuração
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Preview Lines */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">Pré-visualização</h3>
                <p className="text-sm text-muted-foreground">Confira os movimentos que serão importados</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Linhas</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/10 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{stats.creditos}</p>
                  <p className="text-xs text-muted-foreground">Créditos</p>
                  <p className="text-xs font-medium text-emerald-600 mt-1">
                    +R$ {stats.somaCreditos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-rose-500/10 text-center">
                  <p className="text-2xl font-bold text-rose-600">{stats.debitos}</p>
                  <p className="text-xs text-muted-foreground">Débitos</p>
                  <p className="text-xs font-medium text-rose-600 mt-1">
                    -R$ {stats.somaDebitos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Lines Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left px-3 py-2 font-medium">Data</th>
                      <th className="text-left px-3 py-2 font-medium">Descrição</th>
                      <th className="text-right px-3 py-2 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedLines.slice(0, 10).map((line, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{line.data}</td>
                        <td className="px-3 py-2 truncate max-w-[200px]">{line.descricao}</td>
                        <td
                          className={cn(
                            'px-3 py-2 text-right font-mono font-medium',
                            line.tipo === 'credito' ? 'text-emerald-600' : 'text-rose-600'
                          )}
                        >
                          {line.tipo === 'credito' ? '+' : '-'}R$ {line.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedLines.length > 10 && (
                  <div className="p-2 text-center text-xs text-muted-foreground bg-muted/50">
                    +{parsedLines.length - 10} linhas adicionais
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Confirmar Importação</h3>
                <p className="text-sm text-muted-foreground">Revise os dados antes de confirmar</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                  <span className="text-sm">Conta</span>
                  <span className="font-medium">{selectedConta?.nome}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                  <span className="text-sm">Arquivo</span>
                  <span className="font-medium">{fileInfo?.file.name}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                  <span className="text-sm">Total de Linhas</span>
                  <span className="font-medium">{stats.total}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-500/10">
                  <span className="text-sm">Total Créditos</span>
                  <span className="font-medium text-emerald-600">
                    +R$ {stats.somaCreditos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-rose-500/10">
                  <span className="text-sm">Total Débitos</span>
                  <span className="font-medium text-rose-600">
                    -R$ {stats.somaDebitos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Warning if period overlap */}
              {selectedConta?.ultimoExtrato && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700 text-sm">Atenção</p>
                    <p className="text-xs text-amber-600">
                      Último extrato importado em {new Date(selectedConta.ultimoExtrato).toLocaleDateString('pt-BR')}.
                      Verifique se não há sobreposição de períodos.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={step === 1 ? onCancel : goBack} disabled={isProcessing}>
          {step === 1 ? (
            'Cancelar'
          ) : (
            <>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </>
          )}
        </Button>

        {step < 4 ? (
          <Button type="button" onClick={goNext} disabled={!canGoNext()}>
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700">
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Confirmar Importação
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

