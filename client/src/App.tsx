import { Route, Switch, useLocation } from 'wouter';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Pessoas from './pages/Pessoas';
import ContasFinanceiras from './pages/ContasFinanceiras';
import Extratos from './pages/Extratos';
import Titulos from './pages/Titulos';
import TitulosCrud from './pages/TitulosCrud';
import Accounts from './pages/Accounts';
import Entries from './pages/Entries';
import Periods from './pages/Periods';
import Contabilidade from './pages/Contabilidade';
import Conciliacao from './pages/Conciliacao';
import Import from './pages/Import';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import Patrimonio from './pages/Patrimonio';
import ModuloE from './pages/ModuloE';
import Governanca from './pages/Governanca';
import Nfse from './pages/Nfse';
import NfseNacional from './pages/NfseNacional';
import Login from './pages/Login';
import OrgSelect from './pages/OrgSelect';
import NotFound from './pages/NotFound';
import { isAuthenticated } from './lib/auth';
import { hasOrg } from './lib/org';

function OrgGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!hasOrg()) {
      setLocation('/org-select');
    }
  }, [setLocation]);

  if (!hasOrg()) return null;
  return <>{children}</>;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    if (!isAuthenticated()) {
      setLocation('/login');
    }
  }, [location, setLocation]);

  if (!isAuthenticated()) {
    return null;
  }

  return <Component />;
}

export default function App() {
  return (
    <>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/org-select" component={OrgSelect} />
        <Route path="*">
          <OrgGuard>
            <DashboardLayout>
              <Switch>
                <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
                <Route path="/pessoas" component={() => <ProtectedRoute component={Pessoas} />} />
                <Route path="/contas" component={() => <ProtectedRoute component={ContasFinanceiras} />} />
                <Route path="/extratos" component={() => <ProtectedRoute component={Extratos} />} />
                <Route path="/titulos" component={() => <ProtectedRoute component={Titulos} />} />
                <Route path="/pagar-receber" component={() => <ProtectedRoute component={TitulosCrud} />} />
                <Route path="/contabilidade" component={() => <ProtectedRoute component={Contabilidade} />} />
                <Route path="/accounts" component={() => <ProtectedRoute component={Accounts} />} />
                <Route path="/entries" component={() => <ProtectedRoute component={Entries} />} />
                <Route path="/periods" component={() => <ProtectedRoute component={Periods} />} />
                <Route path="/conciliacao" component={() => <ProtectedRoute component={Conciliacao} />} />
                <Route path="/import" component={() => <ProtectedRoute component={Import} />} />
                <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
                <Route path="/audit" component={() => <ProtectedRoute component={Audit} />} />
                <Route path="/governanca" component={() => <ProtectedRoute component={Governanca} />} />
                <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
                <Route path="/patrimonio" component={() => <ProtectedRoute component={Patrimonio} />} />
                <Route path="/projetos-fundos" component={() => <ProtectedRoute component={ModuloE} />} />
                <Route path="/nfse" component={() => <ProtectedRoute component={Nfse} />} />
                <Route path="/nfse-nacional" component={() => <ProtectedRoute component={NfseNacional} />} />
                <Route path="/:rest*" component={NotFound} />
              </Switch>
            </DashboardLayout>
          </OrgGuard>
        </Route>
      </Switch>
      <Toaster position="top-right" richColors />
    </>
  );
}
