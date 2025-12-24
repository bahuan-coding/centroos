/**
 * Configuração do Motor Fiscal
 * 
 * Feature flags e configurações de migração.
 */

import { useState } from 'react';
import { 
  Settings, 
  Shield,
  AlertTriangle,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeatureFlags } from '@/lib/hooks/useFiscal';
import { cn } from '@/lib/utils';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function FiscalConfig() {
  const { flags, isLoading, setFlags, isUpdating } = useFeatureFlags();
  const [pendingChanges, setPendingChanges] = useState<{
    usarNovoCore?: boolean;
    shadowMode?: boolean;
    logComparacao?: boolean;
  }>({});

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const handleToggle = (key: keyof typeof pendingChanges, value: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    setFlags(pendingChanges);
    setPendingChanges({});
  };

  const handleCancel = () => {
    setPendingChanges({});
  };

  const getValue = (key: keyof typeof pendingChanges) => {
    if (key in pendingChanges) {
      return pendingChanges[key]!;
    }
    return flags?.[key] ?? false;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração do Motor Fiscal
          </h3>
          <p className="text-sm text-muted-foreground">
            Controle de feature flags e modo de operação
          </p>
        </div>
      </div>

      {/* Alerta de segurança */}
      <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Atenção</AlertTitle>
        <AlertDescription className="text-amber-700">
          Alterações nestas configurações afetam a emissão de documentos fiscais em produção.
          Certifique-se de que você sabe o que está fazendo.
        </AlertDescription>
      </Alert>

      {/* Status atual */}
      <Card className={cn(
        'border-2',
        flags?.usarNovoCore ? 'border-emerald-300 bg-emerald-50/30' :
        flags?.shadowMode ? 'border-amber-300 bg-amber-50/30' :
        'border-blue-300 bg-blue-50/30'
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Modo de Operação Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className={cn(
              'h-4 w-4 rounded-full animate-pulse',
              flags?.usarNovoCore ? 'bg-emerald-500' :
              flags?.shadowMode ? 'bg-amber-500' :
              'bg-blue-500'
            )} />
            <div>
              <p className="font-medium">
                {flags?.usarNovoCore && 'Novo Core Ativo'}
                {flags?.shadowMode && !flags?.usarNovoCore && 'Shadow Mode'}
                {!flags?.shadowMode && !flags?.usarNovoCore && 'Integração Legada'}
              </p>
              <p className="text-xs text-muted-foreground">
                {flags?.usarNovoCore && 'O motor fiscal unificado está processando todas as emissões'}
                {flags?.shadowMode && !flags?.usarNovoCore && 'Comparando novo core com legado sem impactar produção'}
                {!flags?.shadowMode && !flags?.usarNovoCore && 'Usando integração original NFS-e SP'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Feature Flags</CardTitle>
          <CardDescription>
            Controle granular sobre o comportamento do motor fiscal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Shadow Mode */}
          <div className="flex items-start justify-between space-x-4">
            <div className="space-y-1">
              <Label htmlFor="shadowMode" className="font-medium">
                Shadow Mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Executa o novo core em paralelo com o legado e compara os resultados.
                O resultado do legado é sempre retornado. Ideal para validação antes da migração.
              </p>
            </div>
            <Switch
              id="shadowMode"
              checked={getValue('shadowMode')}
              onCheckedChange={(checked) => handleToggle('shadowMode', checked)}
              disabled={getValue('usarNovoCore')}
            />
          </div>

          {/* Log de Comparação */}
          <div className="flex items-start justify-between space-x-4 pl-6 border-l-2 border-muted">
            <div className="space-y-1">
              <Label htmlFor="logComparacao" className="font-medium">
                Log de Comparação
              </Label>
              <p className="text-xs text-muted-foreground">
                Registra diferenças entre os resultados do novo core e do legado.
                Ativado apenas quando Shadow Mode está ligado.
              </p>
            </div>
            <Switch
              id="logComparacao"
              checked={getValue('logComparacao')}
              onCheckedChange={(checked) => handleToggle('logComparacao', checked)}
              disabled={!getValue('shadowMode') || getValue('usarNovoCore')}
            />
          </div>

          {/* Usar Novo Core */}
          <div className="flex items-start justify-between space-x-4 pt-4 border-t">
            <div className="space-y-1">
              <Label htmlFor="usarNovoCore" className="font-medium flex items-center gap-2">
                Usar Novo Core
                <Badge variant="destructive" className="text-[10px]">PRODUÇÃO</Badge>
              </Label>
              <p className="text-xs text-muted-foreground">
                Ativa o motor fiscal unificado para todas as emissões.
                O sistema legado será desativado. Certifique-se de que o Shadow Mode 
                foi testado e validado antes de ativar.
              </p>
            </div>
            <Switch
              id="usarNovoCore"
              checked={getValue('usarNovoCore')}
              onCheckedChange={(checked) => handleToggle('usarNovoCore', checked)}
            />
          </div>
        </CardContent>

        {hasChanges && (
          <CardFooter className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={handleCancel} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Guia de Migração */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            Guia de Migração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                !flags?.shadowMode && !flags?.usarNovoCore 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              )}>
                1
              </span>
              <div>
                <p className="font-medium">Modo Legado (Atual)</p>
                <p className="text-muted-foreground text-xs">
                  Sistema original funcionando normalmente
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                flags?.shadowMode && !flags?.usarNovoCore
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              )}>
                2
              </span>
              <div>
                <p className="font-medium">Shadow Mode</p>
                <p className="text-muted-foreground text-xs">
                  Comparar resultados sem afetar produção
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                flags?.usarNovoCore
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-muted text-muted-foreground'
              )}>
                3
              </span>
              <div>
                <p className="font-medium">Novo Core Ativo</p>
                <p className="text-muted-foreground text-xs">
                  Motor fiscal unificado em produção
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

export default FiscalConfig;


