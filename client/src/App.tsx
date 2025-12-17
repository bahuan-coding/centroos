import { Route, Switch, useLocation } from 'wouter';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Pessoas from './pages/Pessoas';
import ContasFinanceiras from './pages/ContasFinanceiras';
import Titulos from './pages/Titulos';
import Accounts from './pages/Accounts';
import Entries from './pages/Entries';
import Periods from './pages/Periods';
import Conciliacao from './pages/Conciliacao';
import Import from './pages/Import';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { isAuthenticated } from './lib/auth';

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
        <Route path="*">
          <DashboardLayout>
            <Switch>
              <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
              <Route path="/pessoas" component={() => <ProtectedRoute component={Pessoas} />} />
              <Route path="/contas" component={() => <ProtectedRoute component={ContasFinanceiras} />} />
              <Route path="/titulos" component={() => <ProtectedRoute component={Titulos} />} />
              <Route path="/accounts" component={() => <ProtectedRoute component={Accounts} />} />
              <Route path="/entries" component={() => <ProtectedRoute component={Entries} />} />
              <Route path="/periods" component={() => <ProtectedRoute component={Periods} />} />
              <Route path="/conciliacao" component={() => <ProtectedRoute component={Conciliacao} />} />
              <Route path="/import" component={() => <ProtectedRoute component={Import} />} />
              <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
              <Route path="/audit" component={() => <ProtectedRoute component={Audit} />} />
              <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
            </Switch>
          </DashboardLayout>
        </Route>
      </Switch>
      <Toaster position="top-right" richColors />
    </>
  );
}

