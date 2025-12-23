import {
  LayoutDashboard,
  Building2,
  ArrowLeftRight,
  Upload,
  TrendingUp,
  Receipt,
  Layers,
  BookOpen,
  FolderTree,
  Calendar,
  Users,
  Boxes,
  BarChart3,
  Shield,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface MenuSection {
  id: string;
  label: string;
  items: MenuItem[];
}

export const menuSections: MenuSection[] = [
  {
    id: 'operacional',
    label: 'Operacional',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/contas', label: 'Caixa e Bancos', icon: Building2 },
      { href: '/conciliacao', label: 'Conciliação', icon: ArrowLeftRight },
      { href: '/import', label: 'Importar Extrato', icon: Upload },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    items: [
      { href: '/titulos', label: 'Títulos', icon: TrendingUp },
      { href: '/pagar-receber', label: 'Pagar/Receber', icon: Receipt },
      { href: '/projetos-fundos', label: 'Projetos e Fundos', icon: Layers },
    ],
  },
  {
    id: 'contabilidade',
    label: 'Contabilidade',
    items: [
      { href: '/contabilidade', label: 'Lançamentos', icon: BookOpen },
      { href: '/accounts', label: 'Plano de Contas', icon: FolderTree },
      { href: '/periods', label: 'Períodos', icon: Calendar },
    ],
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    items: [
      { href: '/pessoas', label: 'Pessoas', icon: Users },
      { href: '/patrimonio', label: 'Patrimônio', icon: Boxes },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    items: [
      { href: '/reports', label: 'Relatórios', icon: BarChart3 },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    items: [
      { href: '/governanca', label: 'Governança', icon: Shield },
      { href: '/settings', label: 'Configurações', icon: Settings },
    ],
  },
];

