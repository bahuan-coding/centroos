import { useState, useMemo } from 'react';
import { Shield, Users, Key, CheckSquare, Settings, FileSearch, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { UsuariosTab } from '@/components/governanca/UsuariosTab';
import { PapeisTab } from '@/components/governanca/PapeisTab';
import { PermissoesTab } from '@/components/governanca/PermissoesTab';
import { AprovacoesTab } from '@/components/governanca/AprovacoesTab';
import { ConfiguracoesTab } from '@/components/governanca/ConfiguracoesTab';
import { AuditoriaTab } from '@/components/governanca/AuditoriaTab';
import { usePermissions } from '@/lib/usePermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';

const allTabs = [
  { value: 'usuarios', label: 'Usuários', icon: Users, permissao: 'sistema.usuario.gerenciar' },
  { value: 'papeis', label: 'Papéis', icon: Key, permissao: 'sistema.papel.gerenciar' },
  { value: 'permissoes', label: 'Permissões', icon: CheckSquare, permissao: 'sistema.papel.gerenciar' },
  { value: 'aprovacoes', label: 'Aprovações', icon: CheckSquare, permissao: null }, // Qualquer autenticado pode ver suas aprovações
  { value: 'config', label: 'Configurações', icon: Settings, permissao: 'sistema.configuracao.editar' },
  { value: 'auditoria', label: 'Auditoria', icon: FileSearch, permissao: 'sistema.auditoria.visualizar' },
];

export default function Governanca() {
  const { temPermissao, isAdmin, isLoading, user } = usePermissions();
  
  // Filtrar tabs com base nas permissões
  const tabs = useMemo(() => {
    return allTabs.filter(tab => {
      // Admin vê tudo
      if (isAdmin) return true;
      // Se não requer permissão específica, mostra
      if (!tab.permissao) return true;
      // Verifica permissão
      return temPermissao(tab.permissao);
    });
  }, [isAdmin, temPermissao]);

  const [activeTab, setActiveTab] = useState(() => tabs[0]?.value || 'aprovacoes');

  // Se nenhuma tab disponível
  if (!isLoading && tabs.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Governança e Auditoria"
          description="Controle de acessos, aprovações e trilha de auditoria"
          icon={<Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />}
        />
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar nenhum módulo de governança.
            Entre em contato com o administrador do sistema.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Governança e Auditoria"
        description="Controle de acessos, aprovações e trilha de auditoria"
        icon={<Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-lg">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <UsuariosTab readOnly={!isAdmin && !temPermissao('sistema.usuario.gerenciar')} />
        </TabsContent>

        <TabsContent value="papeis" className="mt-4">
          <PapeisTab readOnly={!isAdmin && !temPermissao('sistema.papel.gerenciar')} />
        </TabsContent>

        <TabsContent value="permissoes" className="mt-4">
          <PermissoesTab readOnly={!isAdmin && !temPermissao('sistema.papel.gerenciar')} />
        </TabsContent>

        <TabsContent value="aprovacoes" className="mt-4">
          <AprovacoesTab />
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <ConfiguracoesTab readOnly={!isAdmin && !temPermissao('sistema.configuracao.editar')} />
        </TabsContent>

        <TabsContent value="auditoria" className="mt-4">
          <AuditoriaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
