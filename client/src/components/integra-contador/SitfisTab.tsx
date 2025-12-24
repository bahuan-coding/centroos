/**
 * Aba SITFIS do Integra Contador
 * 
 * Consulta de Situação Fiscal do contribuinte
 */

import { useState } from 'react';
import { 
  FileSearch, 
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Loader2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ModoAcesso = 'proprio' | 'terceiros' | 'softwarehouse';
type Status = 'SOLICITADO' | 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO';

interface ConsultaState {
  status: 'idle' | 'loading' | 'polling' | 'success' | 'error';
  protocolo?: string;
  sitfisStatus?: Status;
  mensagem?: string;
  temPdf?: boolean;
  error?: string;
}

export function SitfisTab() {
  const [cnpj, setCnpj] = useState('');
  const [modo, setModo] = useState<ModoAcesso>('proprio');
  const [cnpjProcurador, setCnpjProcurador] = useState('');
  const [consulta, setConsulta] = useState<ConsultaState>({ status: 'idle' });
  
  const consultarMutation = trpc.serpro.sitfis.consultar.useMutation({
    onSuccess: (result) => {
      setConsulta({
        status: result.success ? 'success' : 'error',
        protocolo: result.protocolo,
        sitfisStatus: result.status,
        mensagem: result.mensagem,
        temPdf: result.temPdf,
      });
    },
    onError: (error) => {
      setConsulta({
        status: 'error',
        error: error.message,
        mensagem: (error as any).data?.cause?.acaoSugerida,
      });
    },
  });

  const solicitarMutation = trpc.serpro.sitfis.solicitar.useMutation({
    onSuccess: (result) => {
      setConsulta({
        status: 'loading',
        protocolo: result.protocolo,
        sitfisStatus: result.status,
        mensagem: result.mensagem,
      });
    },
    onError: (error) => {
      setConsulta({
        status: 'error',
        error: error.message,
      });
    },
  });

  const downloadPdfMutation = trpc.serpro.sitfis.downloadPdf.useMutation({
    onSuccess: (result) => {
      // Converter base64 para blob e download
      const byteCharacters = atob(result.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onError: (error) => {
      setConsulta(prev => ({
        ...prev,
        error: `Erro ao baixar PDF: ${error.message}`,
      }));
    },
  });

  const handleConsultar = () => {
    if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) {
      setConsulta({ status: 'error', error: 'CNPJ inválido' });
      return;
    }

    setConsulta({ status: 'loading' });
    consultarMutation.mutate({
      cnpjContribuinte: cnpj,
      modo,
      cnpjProcurador: modo !== 'proprio' ? cnpjProcurador : undefined,
    });
  };

  const handleSolicitar = () => {
    if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) {
      setConsulta({ status: 'error', error: 'CNPJ inválido' });
      return;
    }

    setConsulta({ status: 'loading' });
    solicitarMutation.mutate({
      cnpjContribuinte: cnpj,
      modo,
      cnpjProcurador: modo !== 'proprio' ? cnpjProcurador : undefined,
    });
  };

  const handleDownload = () => {
    if (!consulta.protocolo) return;
    
    downloadPdfMutation.mutate({
      protocolo: consulta.protocolo,
      cnpjContribuinte: cnpj,
      modo,
    });
  };

  const isLoading = consultarMutation.isPending || solicitarMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Situação Fiscal (SITFIS)</h3>
        <p className="text-sm text-muted-foreground">
          Consulta relatório de situação fiscal do contribuinte junto à RFB
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSearch className="h-4 w-4" />
              Nova Consulta
            </CardTitle>
            <CardDescription>
              Informe o CNPJ e o modo de acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ do Contribuinte</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(formatCnpjInput(e.target.value))}
                maxLength={18}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modo">Modo de Acesso</Label>
              <Select value={modo} onValueChange={(v: ModoAcesso) => setModo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proprio">
                    <div className="flex items-center gap-2">
                      <span>Próprio</span>
                      <span className="text-xs text-muted-foreground">
                        (consultar meu CNPJ)
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="terceiros">
                    <div className="flex items-center gap-2">
                      <span>Terceiros</span>
                      <span className="text-xs text-muted-foreground">
                        (com procuração)
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="softwarehouse">
                    <div className="flex items-center gap-2">
                      <span>Software-house</span>
                      <span className="text-xs text-muted-foreground">
                        (via procurador)
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {modo !== 'proprio' && (
              <div className="space-y-2">
                <Label htmlFor="procurador">CNPJ do Procurador</Label>
                <Input
                  id="procurador"
                  placeholder="00.000.000/0000-00"
                  value={cnpjProcurador}
                  onChange={(e) => setCnpjProcurador(formatCnpjInput(e.target.value))}
                  maxLength={18}
                />
                <p className="text-xs text-muted-foreground">
                  Escritório de contabilidade com procuração ativa
                </p>
              </div>
            )}

            {modo !== 'proprio' && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 text-sm">
                  Requer procuração eletrônica (código 59 - SITFIS) cadastrada no e-CAC
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button 
              onClick={handleConsultar}
              disabled={isLoading || !cnpj}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Consultar Completo
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Resultado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <StatusIcon status={consulta.sitfisStatus} loading={isLoading} />
              Resultado
            </CardTitle>
            {consulta.protocolo && (
              <CardDescription className="font-mono">
                Protocolo: {consulta.protocolo}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {consulta.status === 'idle' && (
              <div className="text-center py-8 text-muted-foreground">
                <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Realize uma consulta para ver o resultado</p>
              </div>
            )}

            {consulta.status === 'loading' && (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">Consultando situação fiscal...</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Isso pode levar alguns minutos
                </p>
              </div>
            )}

            {consulta.status === 'error' && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Erro na consulta</AlertTitle>
                <AlertDescription>
                  {consulta.error}
                  {consulta.mensagem && (
                    <p className="mt-2 text-sm opacity-80">{consulta.mensagem}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {consulta.status === 'success' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <StatusBadge status={consulta.sitfisStatus} />
                </div>

                {consulta.mensagem && (
                  <p className="text-sm text-muted-foreground">{consulta.mensagem}</p>
                )}

                {consulta.sitfisStatus === 'PROCESSANDO' && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-700">
                      O relatório ainda está sendo processado pela RFB.
                      Aguarde alguns minutos e consulte novamente.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
          {consulta.temPdf && (
            <CardFooter>
              <Button 
                onClick={handleDownload}
                disabled={downloadPdfMutation.isPending}
                className="w-full"
              >
                {downloadPdfMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Baixando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Relatório PDF
                  </>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Informações */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Sobre o SITFIS</AlertTitle>
        <AlertDescription className="text-sm space-y-2">
          <p>
            O relatório de Situação Fiscal mostra o status do contribuinte perante a RFB,
            incluindo pendências, débitos e restrições.
          </p>
          <p>
            <strong>Modo Próprio:</strong> Consulta usando o certificado digital da Paycubed para seu próprio CNPJ.
          </p>
          <p>
            <strong>Modo Terceiros:</strong> Consulta CNPJ de cliente que concedeu procuração eletrônica no e-CAC (código 59).
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function StatusIcon({ status, loading }: { status?: Status; loading: boolean }) {
  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  }

  switch (status) {
    case 'CONCLUIDO':
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    case 'PROCESSANDO':
    case 'SOLICITADO':
      return <Clock className="h-4 w-4 text-amber-600" />;
    case 'ERRO':
      return <XCircle className="h-4 w-4 text-rose-600" />;
    default:
      return <FileSearch className="h-4 w-4 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status?: Status }) {
  switch (status) {
    case 'CONCLUIDO':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Concluído
        </Badge>
      );
    case 'PROCESSANDO':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Processando
        </Badge>
      );
    case 'SOLICITADO':
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
          <Clock className="h-3 w-3 mr-1" />
          Solicitado
        </Badge>
      );
    case 'ERRO':
      return (
        <Badge className="bg-rose-100 text-rose-700 border-rose-200">
          <XCircle className="h-3 w-3 mr-1" />
          Erro
        </Badge>
      );
    default:
      return null;
  }
}

function formatCnpjInput(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 14);
  
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
}

