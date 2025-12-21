import { useState, useMemo } from 'react';
import { Shield, Users, Key, CheckSquare, Settings, FileSearch, Lock, LayoutDashboard, ChevronRight, AlertTriangle, UserCheck, Clock, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { UsuariosTab } from '@/components/governanca/UsuariosTab';
import { PapeisTab } from '@/components/governanca/PapeisTab';
import { PermissoesTab } from '@/components/governanca/PermissoesTab';
import { AprovacoesTab } from '@/components/governanca/AprovacoesTab';
import { ConfiguracoesTab } from '@/components/governanca/ConfiguracoesTab';
import { AuditoriaTab } from '@/components/governanca/AuditoriaTab';
import { usePermissions } from '@/lib/usePermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const allSections = [
  { value: 'overview', label: 'Visão Geral', icon: LayoutDashboard, permissao: null },
  { value: 'usuarios', label: 'Usuários', icon: Users, permissao: 'sistema.usuario.gerenciar' },
  { value: 'papeis', label: 'Papéis', icon: Key, permissao: 'sistema.papel.gerenciar' },
  { value: 'aprovacoes', label: 'Aprovações', icon: CheckSquare, permissao: null },
  { value: 'auditoria', label: 'Auditoria', icon: FileSearch, permissao: 'sistema.auditoria.visualizar' },
  { value: 'config', label: 'Configurações', icon: Settings, permissao: 'sistema.configuracao.editar' },
];

// Stats Card clicável (similar a Pessoas)
function StatCard({ icon, value, label, active, onClick, variant = 'default' }: {
  icon: React.ReactNode;
  value: number;
  label: string;
  active?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'warning' | 'success' | 'danger';
}) {
  const variants = {
    default: 'text-slate-700',
    warning: 'text-amber-600',
    success: 'text-emerald-600',
    danger: 'text-red-600',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl text-left transition-all w-full',
        active ? 'bg-indigo-100 ring-2 ring-indigo-500' : 'bg-white/60 hover:bg-white/80 border border-slate-200/60',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('text-xl', variants[variant])}>{icon}</div>
        <div>
          <p className={cn('text-2xl font-bold', variants[variant])}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </button>
  );
}

// Overview Section - Dashboard de Governança
function OverviewSection({ onNavigate }: { onNavigate: (section: string) => void }) {
  const { data: usuariosData } = trpc.usuarios.list.useQuery({});
  const { data: adminCount } = trpc.usuarios.countAdmins.useQuery();
  const { data: pendentes } = trpc.aprovacoes.listPendentes.useQuery({});
  const { data: auditoriaStats } = trpc.auditoria.stats.useQuery({});

  const usuarios = usuariosData?.usuarios || [];
  const totalUsuarios = usuariosData?.total || 0;
  const usuariosAtivos = usuarios.filter((u: any) => u.ativo).length;
  const aprovacoesPendentes = pendentes?.length || 0;
  const eventosHoje = auditoriaStats?.porAcao?.reduce((acc: number, a: any) => acc + Number(a.total), 0) || 0;

  // Alertas de segurança
  const alertas = [];
  if (aprovacoesPendentes > 0) {
    alertas.push({ tipo: 'warning', titulo: `${aprovacoesPendentes} aprovações pendentes`, acao: 'aprovacoes' });
  }
  const usuariosSemPapel = usuarios.filter((u: any) => !u.papeis_ativos?.length).length;
  if (usuariosSemPapel > 0) {
    alertas.push({ tipo: 'info', titulo: `${usuariosSemPapel} usuários sem papel atribuído`, acao: 'usuarios' });
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          value={totalUsuarios}
          label="Total de Usuários"
          onClick={() => onNavigate('usuarios')}
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5" />}
          value={usuariosAtivos}
          label="Usuários Ativos"
          variant="success"
          onClick={() => onNavigate('usuarios')}
        />
        <StatCard
          icon={<Shield className="h-5 w-5" />}
          value={adminCount?.count || 0}
          label="Administradores"
          variant="default"
          onClick={() => onNavigate('usuarios')}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          value={aprovacoesPendentes}
          label="Aprovações Pendentes"
          variant={aprovacoesPendentes > 0 ? 'warning' : 'success'}
          onClick={() => onNavigate('aprovacoes')}
        />
      </div>

      {/* Alertas de Segurança */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((alerta, idx) => (
            <Card 
              key={idx} 
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                alerta.tipo === 'warning' ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50' : 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50'
              )}
              onClick={() => onNavigate(alerta.acao)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={cn('h-5 w-5 shrink-0', alerta.tipo === 'warning' ? 'text-amber-600' : 'text-blue-600')} />
                  <span className={cn('font-medium text-sm', alerta.tipo === 'warning' ? 'text-amber-800' : 'text-blue-800')}>
                    {alerta.titulo}
                  </span>
                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Atividade Recente */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" />
              Atividade do Sistema
            </h3>
            <button 
              onClick={() => onNavigate('auditoria')}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Ver trilha completa →
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-emerald-50">
              <p className="text-2xl font-bold text-emerald-600">
                {auditoriaStats?.porAcao?.find((a: any) => a.acao === 'criar')?.total || 0}
              </p>
              <p className="text-xs text-muted-foreground">Criações</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50">
              <p className="text-2xl font-bold text-blue-600">
                {auditoriaStats?.porAcao?.find((a: any) => a.acao === 'atualizar')?.total || 0}
              </p>
              <p className="text-xs text-muted-foreground">Atualizações</p>
            </div>
            <div className="p-4 rounded-lg bg-rose-50">
              <p className="text-2xl font-bold text-rose-600">
                {auditoriaStats?.porAcao?.find((a: any) => a.acao === 'excluir')?.total || 0}
              </p>
              <p className="text-xs text-muted-foreground">Exclusões</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button 
          onClick={() => onNavigate('usuarios')}
          className="p-4 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 transition-all text-left"
        >
          <Users className="h-6 w-6 mb-2" />
          <p className="font-semibold">Gerenciar Usuários</p>
          <p className="text-xs text-white/80">Atribuir papéis e permissões</p>
        </button>
        <button 
          onClick={() => onNavigate('aprovacoes')}
          className="p-4 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 transition-all text-left"
        >
          <CheckSquare className="h-6 w-6 mb-2" />
          <p className="font-semibold">Fila de Aprovações</p>
          <p className="text-xs text-white/80">Processar solicitações pendentes</p>
        </button>
        <button 
          onClick={() => onNavigate('auditoria')}
          className="p-4 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white hover:from-slate-700 hover:to-slate-900 transition-all text-left"
        >
          <FileSearch className="h-6 w-6 mb-2" />
          <p className="font-semibold">Trilha de Auditoria</p>
          <p className="text-xs text-white/80">Histórico de operações</p>
        </button>
      </div>
    </div>
  );
}

// Navegação Lateral
function SideNavigation({ sections, activeSection, onSelect, pendingCount }: {
  sections: typeof allSections;
  activeSection: string;
  onSelect: (section: string) => void;
  pendingCount: number;
}) {
  return (
    <nav className="space-y-1">
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.value;
        const showBadge = section.value === 'aprovacoes' && pendingCount > 0;

        return (
          <button
            key={section.value}
            onClick={() => onSelect(section.value)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all',
              'hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1',
              isActive && 'bg-indigo-100 text-indigo-700 font-medium shadow-sm'
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-indigo-600' : 'text-slate-500')} />
            <span className="flex-1 truncate">{section.label}</span>
            {showBadge && (
              <Badge className="bg-amber-500 text-white text-xs px-2">{pendingCount}</Badge>
            )}
            <ChevronRight className={cn(
              'h-4 w-4 text-slate-300 shrink-0 transition-transform',
              isActive && 'text-indigo-500 rotate-90'
            )} />
          </button>
        );
      })}
    </nav>
  );
}

// Componente Principal
export default function Governanca() {
  const { temPermissao, isAdmin, isLoading } = usePermissions();
  const [activeSection, setActiveSection] = useState('overview');
  const [showMobileNav, setShowMobileNav] = useState(false);

  // Contagem de aprovações pendentes para badge
  const { data: pendentes } = trpc.aprovacoes.listPendentes.useQuery({});
  const pendingCount = pendentes?.length || 0;

  // Filtrar seções com base nas permissões
  const sections = useMemo(() => {
    return allSections.filter(section => {
      if (isAdmin) return true;
      if (!section.permissao) return true;
      return temPermissao(section.permissao);
    });
  }, [isAdmin, temPermissao]);

  const handleNavigate = (section: string) => {
    setActiveSection(section);
    setShowMobileNav(false);
  };

  // Se nenhuma seção disponível
  if (!isLoading && sections.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Governança e Auditoria"
          description="Controle de acessos, aprovações e trilha de auditoria"
          icon={<Shield className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 shrink-0" />}
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

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection onNavigate={handleNavigate} />;
      case 'usuarios':
        return <UsuariosTab readOnly={!isAdmin && !temPermissao('sistema.usuario.gerenciar')} />;
      case 'papeis':
        return <PapeisTab readOnly={!isAdmin && !temPermissao('sistema.papel.gerenciar')} />;
      case 'permissoes':
        return <PermissoesTab readOnly={!isAdmin && !temPermissao('sistema.papel.gerenciar')} />;
      case 'aprovacoes':
        return <AprovacoesTab />;
      case 'config':
        return <ConfiguracoesTab readOnly={!isAdmin && !temPermissao('sistema.configuracao.editar')} />;
      case 'auditoria':
        return <AuditoriaTab />;
      default:
        return <OverviewSection onNavigate={handleNavigate} />;
    }
  };

  const currentSection = sections.find(s => s.value === activeSection);

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] lg:h-[calc(100vh-theme(spacing.8))] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <PageHeader
          title="Governança e Auditoria"
          description="Controle de acessos, aprovações e trilha de auditoria"
          icon={<Shield className="h-7 w-7 text-indigo-600 shrink-0" />}
        />
        {/* Mobile Nav Toggle */}
        <button 
          onClick={() => setShowMobileNav(!showMobileNav)}
          className="lg:hidden p-2 rounded-lg border hover:bg-muted"
        >
          <span className="text-sm font-medium">{currentSection?.label || 'Menu'}</span>
        </button>
      </div>

      {/* Mobile Navigation Dropdown */}
      {showMobileNav && (
        <Card className="lg:hidden mb-4 p-2">
          <SideNavigation
            sections={sections}
            activeSection={activeSection}
            onSelect={handleNavigate}
            pendingCount={pendingCount}
          />
        </Card>
      )}

      {/* Main Layout - Sidebar + Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Navegação Lateral (Desktop) */}
        <Card className="hidden lg:block lg:col-span-3 xl:col-span-2 p-4 overflow-y-auto">
          <SideNavigation
            sections={sections}
            activeSection={activeSection}
            onSelect={handleNavigate}
            pendingCount={pendingCount}
          />
        </Card>

        {/* Conteúdo Principal */}
        <div className="lg:col-span-9 xl:col-span-10 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
