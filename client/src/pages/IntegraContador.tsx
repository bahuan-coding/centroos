/**
 * Página Integra Contador SERPRO
 * 
 * Interface para consulta de dados fiscais via API SERPRO.
 * - SITFIS: Situação Fiscal
 * - Procurações: Gestão de procurações eletrônicas
 * - Console: Execução raw para desenvolvimento
 */

import { useState } from 'react';
import { 
  Building2, 
  Settings, 
  FileSearch,
  ScrollText,
  Terminal,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ConfigTab } from '@/components/integra-contador/ConfigTab';
import { ProcuracoesTab } from '@/components/integra-contador/ProcuracoesTab';
import { SitfisTab } from '@/components/integra-contador/SitfisTab';
import { ConsoleTab } from '@/components/integra-contador/ConsoleTab';

export default function IntegraContador() {
  const [activeTab, setActiveTab] = useState('config');

  // Verificar se está habilitado
  const { data: isEnabled, isLoading: loadingEnabled } = trpc.serpro.isEnabled.useQuery();

  // Se não está habilitado, mostrar mensagem
  if (!loadingEnabled && !isEnabled) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Integra Contador" icon={<Building2 className="h-6 w-6" />}>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Desabilitado
          </Badge>
        </PageHeader>

        <div className="flex-1 p-4 overflow-auto">
          <GlassCard className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <XCircle className="h-16 w-16 mx-auto text-amber-500" />
              <h2 className="text-xl font-semibold">Integra Contador Desabilitado</h2>
              <p className="text-muted-foreground">
                A integração com SERPRO está desabilitada neste ambiente.
                Configure a variável de ambiente <code className="bg-muted px-1 rounded">INTEGRA_CONTADOR_ENABLED=true</code> para habilitar.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Integra Contador" icon={<Building2 className="h-6 w-6" />}>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
            SERPRO
          </Badge>
        </div>
      </PageHeader>

      <div className="flex-1 p-4 overflow-auto">
        <GlassCard className="h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Configuração</span>
              </TabsTrigger>
              <TabsTrigger value="procuracoes" className="flex items-center gap-2">
                <ScrollText className="h-4 w-4" />
                <span className="hidden sm:inline">Procurações</span>
              </TabsTrigger>
              <TabsTrigger value="sitfis" className="flex items-center gap-2">
                <FileSearch className="h-4 w-4" />
                <span className="hidden sm:inline">SITFIS</span>
              </TabsTrigger>
              <TabsTrigger value="console" className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                <span className="hidden sm:inline">Console</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto p-4">
              <TabsContent value="config" className="mt-0 h-full">
                <ConfigTab />
              </TabsContent>

              <TabsContent value="procuracoes" className="mt-0 h-full">
                <ProcuracoesTab />
              </TabsContent>

              <TabsContent value="sitfis" className="mt-0 h-full">
                <SitfisTab />
              </TabsContent>

              <TabsContent value="console" className="mt-0 h-full">
                <ConsoleTab />
              </TabsContent>
            </div>
          </Tabs>
        </GlassCard>
      </div>
    </div>
  );
}

