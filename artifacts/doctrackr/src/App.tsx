import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { queryClient } from "./lib/queryClient";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

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

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(221 83% 53%)",
    colorBackground: "hsl(0 0% 100%)",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-sidebar px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-sidebar px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: any }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <img src={`${basePath}/logo.svg`} alt="DocTrackr Logo" className="mx-auto h-24 mb-8" />
            <h1 className="text-4xl font-bold text-[#1e3a5f]">Welcome to DocTrackr</h1>
            <p className="mt-4 text-gray-600 text-lg">Professional compliance tracking for daycare operations.</p>
            <div className="mt-8">
              <a href={`${basePath}/sign-in`} className="bg-[#2563eb] text-white px-6 py-3 rounded-md font-medium">Sign In to Dashboard</a>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
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
            <Route>
              <div className="flex h-screen items-center justify-center">404 Not Found</div>
            </Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
