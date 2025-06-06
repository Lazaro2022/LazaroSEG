import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import Dashboard from "@/pages/dashboard";
import DocumentsPage from "@/pages/documents";
import DeadlinesPage from "@/pages/deadlines";
import ReportsPage from "@/pages/reports-new";
import SettingsPage from "@/pages/settings";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";

function AuthenticatedRouter() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 ml-0 flex flex-col">
        <Header />
        
        <div className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/documents" component={DocumentsPage} />
            <Route path="/deadlines" component={DeadlinesPage} />
            <Route path="/reports" component={ReportsPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading, refetchUser } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={refetchUser} />;
  }

  return <AuthenticatedRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 overflow-x-hidden">
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
