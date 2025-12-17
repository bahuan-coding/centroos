import { Route, Switch } from 'wouter';
import { Toaster } from 'sonner';
import { DashboardLayout } from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Entries from './pages/Entries';
import Periods from './pages/Periods';
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
          <Route path="/accounts" component={Accounts} />
          <Route path="/entries" component={Entries} />
          <Route path="/periods" component={Periods} />
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

