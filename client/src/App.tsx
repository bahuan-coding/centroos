import { Route, Switch } from 'wouter';
import { Toaster } from 'sonner';
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

export default function App() {
  return (
    <>
      <DashboardLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/pessoas" component={Pessoas} />
          <Route path="/contas" component={ContasFinanceiras} />
          <Route path="/titulos" component={Titulos} />
          <Route path="/accounts" component={Accounts} />
          <Route path="/entries" component={Entries} />
          <Route path="/periods" component={Periods} />
          <Route path="/conciliacao" component={Conciliacao} />
          <Route path="/import" component={Import} />
          <Route path="/reports" component={Reports} />
          <Route path="/audit" component={Audit} />
          <Route path="/settings" component={Settings} />
        </Switch>
      </DashboardLayout>
      <Toaster position="top-right" richColors />
    </>
  );
}

