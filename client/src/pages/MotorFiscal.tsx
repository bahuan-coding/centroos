/**
 * Página do Motor Fiscal
 * 
 * Dashboard, configuração e simulador do motor fiscal unificado.
 */

import { useState } from 'react';
import { 
  Cpu, 
  BarChart3, 
  Settings, 
  FlaskConical,
  History,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FiscalDashboard, FiscalConfig, FiscalDecisor, NFeSefaz } from '@/components/fiscal';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
// Format date helper
const formatDate = (date: Date) => {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// ============================================================================
// AUDITORIA
// ============================================================================

function FiscalAuditoria() {
  const { data, isLoading } = trpc.fiscal.auditoria.useQuery({
    limite: 50,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>Nenhum registro de auditoria</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase px-3 py-2 bg-muted/50 rounded-t-lg">
        <div className="col-span-2">Data</div>
        <div className="col-span-2">Operação</div>
        <div className="col-span-2">Tipo</div>
        <div className="col-span-3">Documento</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-1">Tempo</div>
      </div>
      
      {data.map((registro: any) => (
        <div 
          key={registro.id} 
          className="grid grid-cols-12 gap-2 text-sm px-3 py-2 hover:bg-muted/30 rounded-lg transition-colors"
        >
          <div className="col-span-2 text-muted-foreground">
            {formatDate(new Date(registro.timestamp))}
          </div>
          <div className="col-span-2">
            <Badge variant="outline" className="text-xs">
              {registro.operacao}
            </Badge>
          </div>
          <div className="col-span-2">
            <Badge 
              variant="secondary" 
              className={cn(
                'text-xs',
                registro.tipoDocumento === 'NFSE_SP' && 'bg-blue-100 text-blue-700',
                registro.tipoDocumento === 'NFE' && 'bg-emerald-100 text-emerald-700',
                registro.tipoDocumento === 'NFCE' && 'bg-purple-100 text-purple-700'
              )}
            >
              {registro.tipoDocumento}
            </Badge>
          </div>
          <div className="col-span-3 font-mono text-xs truncate" title={registro.chaveAcesso || registro.numero}>
            {registro.numero || registro.chaveAcesso?.slice(0, 20) + '...' || '-'}
          </div>
          <div className="col-span-2">
            {registro.sucesso ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                Sucesso
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
                Erro
              </Badge>
            )}
          </div>
          <div className="col-span-1 text-muted-foreground text-xs">
            {registro.durationMs}ms
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

export default function MotorFiscal() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Motor Fiscal" icon={<Cpu className="h-6 w-6" />}>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
            Onda 1 Ativa
          </Badge>
        </div>
      </PageHeader>

      <div className="flex-1 p-4 overflow-auto">
        <GlassCard className="h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="simulador" className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4" />
                <span className="hidden sm:inline">Simulador</span>
              </TabsTrigger>
              <TabsTrigger value="nfe" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">NF-e/NFC-e</span>
              </TabsTrigger>
              <TabsTrigger value="auditoria" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Auditoria</span>
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Configuração</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto p-4">
              <TabsContent value="dashboard" className="mt-0 h-full">
                <FiscalDashboard />
              </TabsContent>

              <TabsContent value="simulador" className="mt-0 h-full">
                <FiscalDecisor />
              </TabsContent>

              <TabsContent value="nfe" className="mt-0 h-full">
                <NFeSefaz />
              </TabsContent>

              <TabsContent value="auditoria" className="mt-0 h-full">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">Histórico de Operações</h3>
                    <p className="text-sm text-muted-foreground">
                      Registro de todas as operações fiscais realizadas
                    </p>
                  </div>
                  <FiscalAuditoria />
                </div>
              </TabsContent>

              <TabsContent value="config" className="mt-0 h-full">
                <FiscalConfig />
              </TabsContent>
            </div>
          </Tabs>
        </GlassCard>
      </div>
    </div>
  );
}

