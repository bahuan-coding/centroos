import { Link, useLocation } from 'wouter';
import { Menu, LogOut, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { OrgSwitcher } from './OrgSwitcher';
import { getUserEmail, logout } from '@/lib/auth';
import { clearOrg, getOrg } from '@/lib/org';
import { toast } from 'sonner';
import { APP_VERSION } from '@/lib/version';
import { menuSections } from '@/lib/menu';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logout realizado com sucesso');
    setLocation('/login');
  };

  const handleSwitchOrg = () => {
    clearOrg();
    setLocation('/org-select');
  };

  const org = getOrg();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-14 px-4 bg-white border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-semibold">CentrOS</span>
        </div>
        <div className="flex items-center gap-2">
          <OrgSwitcher />
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 h-14 px-4 border-b">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold">C</span>
            </div>
            <div>
              <h1 className="font-semibold">CentrOS</h1>
              <p className="text-[10px] text-muted-foreground">Gestão Financeira</p>
            </div>
          </div>

          {/* Org Switcher Desktop */}
          <div className="hidden lg:block px-3 py-2 border-b">
            <OrgSwitcher />
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2">
            {menuSections.map((section) => (
              <div key={section.id} className="mb-1">
                <div className="px-4 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </span>
                </div>
                <div className="px-2 space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
                          isActive
                            ? 'bg-primary text-white font-medium'
                            : 'text-gray-600 hover:bg-gray-100'
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t">
            <div className="flex items-center gap-2.5 px-2 py-1.5 mb-2">
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-gray-600">
                  {getUserEmail()?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{getUserEmail() || 'Usuário'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{org?.name || 'Sem empresa'}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-8 text-xs text-muted-foreground"
                onClick={handleSwitchOrg}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Trocar
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleLogout}>
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Sair
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground text-center mt-2">v{APP_VERSION}</p>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:pl-60">
        <div className="pt-14 lg:pt-0 min-h-screen">
          <div className="p-4 lg:p-6">
            <div className="max-w-screen-2xl mx-auto">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
