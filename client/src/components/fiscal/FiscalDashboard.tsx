/**
 * Dashboard do Motor Fiscal
 * 
 * Exibe métricas, status e operações recentes.
 */

import { useState } from 'react';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  Activity,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMetricasFiscais } from '@/lib/hooks/useFiscal';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

// ============================================================================
// MÉTRICAS CARDS
// ============================================================================

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  trend,
  variant = 'default',
}: { 
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  trend?: { value: number; label: string };
  variant?: 'default' | 'success' | 'error' | 'warning';
}) {
  const variantStyles = {
    default: 'text-muted-foreground',
    success: 'text-emerald-600',
    error: 'text-rose-600',
    warning: 'text-amber-600',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className={cn('text-2xl font-bold', variantStyles[variant])}>
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                <TrendingUp className={cn('h-3 w-3', trend.value >= 0 ? 'text-emerald-600' : 'text-rose-600')} />
                <span className={trend.value >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {trend.value >= 0 ? '+' : ''}{trend.value}%
                </span>
                <span className="text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={cn('p-2 rounded-lg bg-muted/50', variantStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ERROS POR CATEGORIA
// ============================================================================

function ErrosPorCategoria({ erros }: { erros: Record<string, number> }) {
  const categorias = Object.entries(erros).sort((a, b) => b[1] - a[1]);
  
  if (categorias.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
        <p className="text-sm">Nenhum erro registrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {categorias.map(([categoria, quantidade]) => (
        <div key={categoria} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">{categoria}</span>
          </div>
          <Badge variant="secondary">{quantidade}</Badge>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// STATUS DO MOTOR
// ============================================================================

function StatusMotor() {
  const { data: flags, isLoading } = trpc.fiscal.getFeatureFlags.useQuery();

  if (isLoading) {
    return <Skeleton className="h-20" />;
  }

  const modoAtual = flags?.usarNovoCore 
    ? 'Novo Core Ativo' 
    : flags?.shadowMode 
      ? 'Shadow Mode' 
      : 'Legado';

  const corStatus = flags?.usarNovoCore 
    ? 'bg-emerald-500' 
    : flags?.shadowMode 
      ? 'bg-amber-500' 
      : 'bg-blue-500';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Modo de Operação
            </p>
            <p className="text-lg font-bold">{modoAtual}</p>
            <p className="text-xs text-muted-foreground">
              {flags?.shadowMode && 'Comparando resultados sem impactar produção'}
              {flags?.usarNovoCore && 'Motor Fiscal unificado em uso'}
              {!flags?.shadowMode && !flags?.usarNovoCore && 'Integração legada em uso'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('h-3 w-3 rounded-full animate-pulse', corStatus)} />
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function FiscalDashboard() {
  const { data: metricas, isLoading, refetch, isFetching } = useMetricasFiscais();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const taxaSucesso = metricas?.emissaoTotal 
    ? ((metricas.emissaoSucesso / metricas.emissaoTotal) * 100).toFixed(1)
    : '100';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Motor Fiscal</h3>
          <p className="text-sm text-muted-foreground">Métricas e status do sistema fiscal</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isFetching && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      {/* Status do Motor */}
      <StatusMotor />

      {/* Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Emissões"
          value={metricas?.emissaoTotal ?? 0}
          icon={FileText}
          description="Total de documentos"
        />
        <MetricCard
          title="Sucesso"
          value={metricas?.emissaoSucesso ?? 0}
          icon={CheckCircle}
          variant="success"
          description={`${taxaSucesso}% de aprovação`}
        />
        <MetricCard
          title="Erros"
          value={metricas?.emissaoErro ?? 0}
          icon={XCircle}
          variant={metricas?.emissaoErro ? 'error' : 'default'}
        />
        <MetricCard
          title="Consultas"
          value={metricas?.consultaTotal ?? 0}
          icon={Clock}
          description="Consultas realizadas"
        />
      </div>

      {/* Detalhes */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Erros por Categoria */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Erros por Categoria</CardTitle>
            <CardDescription className="text-xs">
              Distribuição de erros por tipo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrosPorCategoria erros={metricas?.errosPorCategoria ?? {}} />
          </CardContent>
        </Card>

        {/* Tipos de Documento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tipos de Documento</CardTitle>
            <CardDescription className="text-xs">
              Documentos suportados pelo motor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium">NFS-e SP</span>
                </div>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
                  Produção
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium">NFS-e Nacional</span>
                </div>
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                  Aguardando SERPRO
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium">NF-e (modelo 55)</span>
                </div>
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                  Aguardando SERPRO
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium">NFC-e (modelo 65)</span>
                </div>
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                  Aguardando SERPRO
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default FiscalDashboard;


