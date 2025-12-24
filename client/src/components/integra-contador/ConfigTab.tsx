/**
 * Aba de Configuração do Integra Contador
 * 
 * Mostra status da integração e permite testar conexão
 */

import { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Shield,
  Key,
  Server,
  Clock,
  Building2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface StatusItemProps {
  label: string;
  value: string | number | boolean | undefined;
  status?: 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
}

function StatusItem({ label, value, status = 'info', icon }: StatusItemProps) {
  const statusColors = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    error: 'text-rose-600',
    info: 'text-slate-600',
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={cn('text-sm', statusColors[status])}>
        {typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : (value ?? '-')}
      </span>
    </div>
  );
}

export function ConfigTab() {
  const [testResult, setTestResult] = useState<any>(null);
  
  const { data: configStatus, isLoading, refetch } = trpc.serpro.getConfigStatus.useQuery();
  const testConnection = trpc.serpro.testConnection.useMutation({
    onSuccess: (result) => setTestResult(result),
    onError: (error) => setTestResult({ success: false, error: error.message }),
  });
  const invalidateCache = trpc.serpro.invalidateCache.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  const isReady = configStatus?.credentialsConfigured && configStatus?.certificateValid;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Configuração do Integra Contador</h3>
        <p className="text-sm text-muted-foreground">
          Status da integração com SERPRO para consultas fiscais
        </p>
      </div>

      {/* Status Geral */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Checklist */}
        <div className="bg-white rounded-lg border p-4 space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Checklist de Configuração
          </h4>
          
          <div className="space-y-1">
            <ChecklistItem 
              label="Ambiente configurado" 
              checked={true}
              detail={configStatus?.environment === 'production' ? 'Produção' : 'Homologação'}
            />
            <ChecklistItem 
              label="Credenciais API" 
              checked={configStatus?.credentialsConfigured}
              detail={configStatus?.credentialsConfigured ? 'Configuradas' : 'Não configuradas'}
            />
            <ChecklistItem 
              label="Certificado Digital" 
              checked={configStatus?.certificateValid}
              detail={
                configStatus?.certificateValid 
                  ? `${configStatus?.certificateDaysRemaining} dias restantes`
                  : 'Não configurado'
              }
              warning={configStatus?.certificateDaysRemaining && configStatus?.certificateDaysRemaining < 30}
            />
            <ChecklistItem 
              label="mTLS habilitado" 
              checked={configStatus?.mtlsEnabled}
            />
          </div>
        </div>

        {/* Certificado */}
        <div className="bg-white rounded-lg border p-4 space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Key className="h-4 w-4" />
            Certificado Digital
          </h4>
          
          {configStatus?.certificateValid ? (
            <div className="space-y-1">
              <StatusItem 
                label="CNPJ" 
                value={configStatus?.certificateCnpj} 
                icon={<Building2 className="h-4 w-4" />}
              />
              <StatusItem 
                label="Razão Social" 
                value={configStatus?.certificateRazaoSocial}
              />
              <StatusItem 
                label="Dias Restantes" 
                value={configStatus?.certificateDaysRemaining}
                status={
                  configStatus?.certificateDaysRemaining && configStatus?.certificateDaysRemaining < 30 
                    ? 'warning' 
                    : 'success'
                }
                icon={<Clock className="h-4 w-4" />}
              />
            </div>
          ) : (
            <Alert variant="destructive" className="border-rose-200 bg-rose-50">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Certificado não configurado</AlertTitle>
              <AlertDescription>
                Configure o certificado digital e-CNPJ em Configurações → Certificado Digital
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Teste de Conexão */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Server className="h-4 w-4" />
          Teste de Conexão
        </h4>

        <div className="flex gap-2">
          <Button
            onClick={() => testConnection.mutate()}
            disabled={testConnection.isPending || !isReady}
          >
            {testConnection.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              'Testar Conexão'
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => invalidateCache.mutate()}
            disabled={invalidateCache.isPending}
          >
            {invalidateCache.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              'Limpar Cache'
            )}
          </Button>
        </div>

        {testResult && (
          <Alert 
            variant={testResult.success ? 'default' : 'destructive'}
            className={testResult.success ? 'border-emerald-200 bg-emerald-50' : ''}
          >
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {testResult.success ? 'Conexão bem-sucedida!' : 'Falha na conexão'}
            </AlertTitle>
            <AlertDescription>
              {testResult.success ? (
                <div className="text-sm space-y-1">
                  <p>Token expira em: {testResult.tokenExpiresIn}s</p>
                  <p>JWT Token: {testResult.hasJwtToken ? 'Presente' : 'Ausente'}</p>
                  <p>Certificado: {testResult.certificateLoaded ? 'Carregado' : 'Não carregado'}</p>
                </div>
              ) : (
                testResult.error
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Alerta de pré-requisitos */}
      {!isReady && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Configuração incompleta</AlertTitle>
          <AlertDescription className="text-amber-700">
            Para utilizar o Integra Contador, é necessário:
            <ul className="list-disc list-inside mt-2">
              {!configStatus?.credentialsConfigured && (
                <li>Configurar as variáveis SERPRO_CONSUMER_KEY e SERPRO_CONSUMER_SECRET</li>
              )}
              {!configStatus?.certificateValid && (
                <li>Configurar um certificado digital e-CNPJ válido</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface ChecklistItemProps {
  label: string;
  checked?: boolean;
  detail?: string;
  warning?: boolean;
}

function ChecklistItem({ label, checked, detail, warning }: ChecklistItemProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {checked ? (
          warning ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          ) : (
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          )
        ) : (
          <XCircle className="h-4 w-4 text-rose-500" />
        )}
        <span className="text-sm">{label}</span>
      </div>
      {detail && (
        <Badge 
          variant="outline" 
          className={cn(
            'text-xs',
            checked && !warning && 'bg-emerald-50 text-emerald-700 border-emerald-200',
            checked && warning && 'bg-amber-50 text-amber-700 border-amber-200',
            !checked && 'bg-rose-50 text-rose-700 border-rose-200'
          )}
        >
          {detail}
        </Badge>
      )}
    </div>
  );
}

