import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import LoginPage from "@/pages/login-page";
import Dashboard from "@/pages/dashboard";
import Incidents from "@/pages/incidents";
import ServiceRequests from "@/pages/service-requests";
import Changes from "@/pages/changes";
import Monitoring from "@/pages/monitoring";
import Assets from "@/pages/assets";
import CreateAsset from "@/pages/create-asset";
import UpdateAsset from "@/pages/update-asset";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import HelpSupport from "@/pages/help-support";
import DebugPage from "@/pages/debug-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/incidents" component={Incidents} />
      <ProtectedRoute path="/service-requests" component={ServiceRequests} />
      <ProtectedRoute path="/changes" component={Changes} />
      <ProtectedRoute path="/monitoring" component={Monitoring} />
      <ProtectedRoute path="/assets" component={Assets} />
      <ProtectedRoute path="/assets/create" component={CreateAsset} />
      <ProtectedRoute path="/assets/update/:id" component={UpdateAsset} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/help-support" component={HelpSupport} />
      <Route path="/debug" component={DebugPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={LoginPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
