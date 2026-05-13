import { Switch, Route, Redirect, Router as WouterRouter } from 'wouter';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import StudentsPage from "@/pages/students";
import StudentDetailPage from "@/pages/student-detail";
import EmployeesPage from "@/pages/employees";
import EmployeeDetailPage from "@/pages/employee-detail";
import CompliancePage from "@/pages/compliance";
import DocumentTypesPage from "@/pages/document-types";
import EmailLogsPage from "@/pages/email-logs";
import OrgSettingsPage from "@/pages/settings-org";
import SmtpSettingsPage from "@/pages/settings-smtp";
import ReminderSettingsPage from "@/pages/settings-reminders";
import CredentialsSettingsPage from "@/pages/settings-credentials";
import { useMe } from "@/lib/auth";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data, isLoading } = useMe();
  if (isLoading) return null;
  if (!data?.authenticated) return <Redirect to="/login" />;
  return <Component />;
}

function HomeRedirect() {
  const { data, isLoading } = useMe();
  if (isLoading) return null;
  return <Redirect to={data?.authenticated ? "/dashboard" : "/login"} />;
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard"><ProtectedRoute component={DashboardPage} /></Route>
      <Route path="/students"><ProtectedRoute component={StudentsPage} /></Route>
      <Route path="/students/:id"><ProtectedRoute component={StudentDetailPage} /></Route>
      <Route path="/employees"><ProtectedRoute component={EmployeesPage} /></Route>
      <Route path="/employees/:id"><ProtectedRoute component={EmployeeDetailPage} /></Route>
      <Route path="/compliance"><ProtectedRoute component={CompliancePage} /></Route>
      <Route path="/document-types"><ProtectedRoute component={DocumentTypesPage} /></Route>
      <Route path="/email-logs"><ProtectedRoute component={EmailLogsPage} /></Route>
      <Route path="/settings/organization"><ProtectedRoute component={OrgSettingsPage} /></Route>
      <Route path="/settings/smtp"><ProtectedRoute component={SmtpSettingsPage} /></Route>
      <Route path="/settings/reminders"><ProtectedRoute component={ReminderSettingsPage} /></Route>
      <Route path="/settings/credentials"><ProtectedRoute component={CredentialsSettingsPage} /></Route>
      <Route>
        <div className="flex h-screen items-center justify-center">404 Not Found</div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Routes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
