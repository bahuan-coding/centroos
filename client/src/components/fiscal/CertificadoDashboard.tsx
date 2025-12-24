/**
 * Certificate Dashboard Component
 * Dashboard detalhado do certificado digital com alertas e status
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { trpc } from '@/lib/trpc';
import { 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  Calendar, 
  Building2, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  FileKey,
  Info
} from 'lucide-react';

// Helper functions for date formatting (avoiding date-fns dependency)
function formatDateBR(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

function formatDateLongBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
}

function differenceInDays(date1: Date, date2: Date): number {
  const diffTime = date1.getTime() - date2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

interface CertificadoDashboardProps {
  showActions?: boolean;
  compact?: boolean;
}

export function CertificadoDashboard({ showActions = true, compact = false }: CertificadoDashboardProps) {
  const { data: cert, isLoading, refetch } = trpc.certificado.get.useQuery();
  const { data: validation } = trpc.certificado.validate.useQuery();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Carregando certificado...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cert) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <ShieldX className="h-5 w-5" />
            Certificado Não Configurado
          </CardTitle>
          <CardDescription>
            Configure seu certificado e-CNPJ A1 para habilitar funcionalidades fiscais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="bg-amber-100 border-amber-300 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Ação Necessária</AlertTitle>
            <AlertDescription>
              Sem certificado digital, não é possível:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Emitir NFS-e</li>
                <li>Assinar documentos digitalmente</li>
                <li>Integrar com SEFAZ</li>
              </ul>
            </AlertDescription>
          </Alert>
          {showActions && (
            <Button className="mt-4 gap-2" asChild>
              <a href="/settings">
                <FileKey className="h-4 w-4" />
                Configurar Certificado
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Calcular dias até vencimento
  const hoje = new Date();
  const vencimento = new Date(cert.validadeFim);
  const diasRestantes = differenceInDays(vencimento, hoje);
  const diasTotais = differenceInDays(vencimento, new Date(cert.validadeInicio));
  const percentualRestante = Math.max(0, Math.min(100, (diasRestantes / diasTotais) * 100));

  // Determinar status
  let statusIcon = <ShieldCheck className="h-5 w-5 text-green-600" />;
  let statusBadge = <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Válido</Badge>;
  let statusColor = 'green';

  if (diasRestantes <= 0) {
    statusIcon = <ShieldX className="h-5 w-5 text-red-600" />;
    statusBadge = <Badge variant="destructive">Expirado</Badge>;
    statusColor = 'red';
  } else if (diasRestantes <= 7) {
    statusIcon = <ShieldAlert className="h-5 w-5 text-red-600" />;
    statusBadge = <Badge variant="destructive">Expira em {diasRestantes} dias</Badge>;
    statusColor = 'red';
  } else if (diasRestantes <= 30) {
    statusIcon = <ShieldAlert className="h-5 w-5 text-amber-600" />;
    statusBadge = <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Expira em {diasRestantes} dias</Badge>;
    statusColor = 'amber';
  } else if (diasRestantes <= 60) {
    statusIcon = <ShieldCheck className="h-5 w-5 text-amber-600" />;
    statusBadge = <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Renovar em breve</Badge>;
    statusColor = 'amber';
  }

  if (compact) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {statusIcon}
              <div>
                <p className="font-medium text-sm">{cert.razaoSocial}</p>
                <p className="text-xs text-muted-foreground">CNPJ: {formatCnpj(cert.cnpj)}</p>
              </div>
            </div>
            <div className="text-right">
              {statusBadge}
              <p className="text-xs text-muted-foreground mt-1">
                {diasRestantes > 0 ? `${diasRestantes} dias restantes` : 'Expirado'}
              </p>
            </div>
          </div>
          <Progress 
            value={percentualRestante} 
            className={`h-1.5 mt-3 ${
              statusColor === 'red' ? '[&>div]:bg-red-500' : 
              statusColor === 'amber' ? '[&>div]:bg-amber-500' : 
              '[&>div]:bg-green-500'
            }`}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alertas */}
      {diasRestantes <= 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Certificado Expirado</AlertTitle>
          <AlertDescription>
            Seu certificado expirou em {formatDateLongBR(vencimento)}.
            Renove imediatamente para continuar usando as funcionalidades fiscais.
          </AlertDescription>
        </Alert>
      )}

      {diasRestantes > 0 && diasRestantes <= 7 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Certificado Expirando!</AlertTitle>
          <AlertDescription>
            Seu certificado expira em {diasRestantes} dias ({formatDateBR(cert.validadeFim)}).
            Providencie a renovação urgentemente.
          </AlertDescription>
        </Alert>
      )}

      {diasRestantes > 7 && diasRestantes <= 30 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <Clock className="h-4 w-4" />
          <AlertTitle>Renovação Próxima</AlertTitle>
          <AlertDescription>
            Seu certificado expira em {diasRestantes} dias. 
            Inicie o processo de renovação para evitar interrupções.
          </AlertDescription>
        </Alert>
      )}

      {/* Card Principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {statusIcon}
              <div>
                <CardTitle className="text-lg">Certificado Digital</CardTitle>
                <CardDescription>e-CNPJ A1 • {cert.emissor}</CardDescription>
              </div>
            </div>
            {statusBadge}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informações do Certificado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Razão Social</p>
                  <p className="text-sm text-muted-foreground">{cert.razaoSocial}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileKey className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">CNPJ</p>
                  <p className="text-sm text-muted-foreground">{formatCnpj(cert.cnpj)}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Validade</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateBR(cert.validadeInicio)} até {formatDateBR(cert.validadeFim)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Número de Série</p>
                  <p className="text-sm text-muted-foreground font-mono text-xs">{cert.serialNumber}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tempo de Validade</span>
              <span className={`font-medium ${
                statusColor === 'red' ? 'text-red-600' : 
                statusColor === 'amber' ? 'text-amber-600' : 
                'text-green-600'
              }`}>
                {diasRestantes > 0 ? `${diasRestantes} dias restantes` : 'Expirado'}
              </span>
            </div>
            <Progress 
              value={percentualRestante} 
              className={`h-2 ${
                statusColor === 'red' ? '[&>div]:bg-red-500' : 
                statusColor === 'amber' ? '[&>div]:bg-amber-500' : 
                '[&>div]:bg-green-500'
              }`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatDateBR(cert.validadeInicio)}</span>
              <span>{formatDateBR(cert.validadeFim)}</span>
            </div>
          </div>

          {/* Status de Validação */}
          {validation && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              validation.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {validation.valid ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Certificado válido e funcional</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{validation.error}</span>
                </>
              )}
            </div>
          )}

          {/* Funcionalidades Habilitadas */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Funcionalidades Habilitadas</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'NFS-e SP', enabled: diasRestantes > 0 },
                { label: 'Assinatura Digital', enabled: diasRestantes > 0 },
                { label: 'NF-e/NFC-e', enabled: false, reason: 'Requer IE' },
                { label: 'APIs SEFAZ', enabled: diasRestantes > 0 },
              ].map((func) => (
                <div 
                  key={func.label}
                  className={`p-2 rounded-lg text-center text-xs ${
                    func.enabled 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-gray-50 text-gray-500 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {func.enabled ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {func.label}
                  </div>
                  {func.reason && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{func.reason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ações */}
          {showActions && (
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
                <RefreshCw className="h-3.5 w-3.5" />
                Verificar Status
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-1">
                <a href="/settings">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Gerenciar
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper para formatar CNPJ
function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

export default CertificadoDashboard;

