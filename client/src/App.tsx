import { Switch, Route, useLocation, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
// import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/query-client";
import LoadingScreen from "@/components/loading-screen";
import { checkApiHealth } from "@/lib/api";
import { useState, useEffect, useContext, createContext, lazy, Suspense } from 'react';
import { api } from '@/lib/api';

// Layout Components
const Sidebar = lazy(() => import("@/components/sidebar"));
//const Navbar = lazy(() => import("@/components/navbar"));

// Public Pages
const Login = lazy(() => import("@/pages/auth/login"));
//const Register = lazy(() => import("@/pages/auth/register"));
//const ForgotPassword = lazy(() => import("@/pages/auth/forgot-password"));
//const ResetPassword = lazy(() => import("@/pages/auth/reset-password"));

// Protected Pages
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Messages = lazy(() => import("@/pages/messages"));
const Contacts = lazy(() => import("@/pages/contacts"));
const Templates = lazy(() => import("@/pages/templates"));
const Channels = lazy(() => import("@/pages/channels"));
const Chatbot = lazy(() => import("@/pages/chatbot"));
const Scheduled = lazy(() => import("@/pages/scheduled"));
const Analytics = lazy(() => import("@/pages/analytics"));
const Users = lazy(() => import("@/pages/users"));
const Settings = lazy(() => import("@/pages/settings"));
const login = lazy(() => import("@/pages/login"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Criação do contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Implementação do Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Valor do contexto
  const contextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    register,
    forgotPassword,
    resetPassword,
    refreshToken,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Implementação do Hook useAuth
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}


function HealthCheck() {
  useEffect(() => {
    const verifyApi = async () => {
      try {
        await checkApiHealth();
      } catch (error) {
        console.error("API health check failed:", error);
      }
    };

    verifyApi();
    const interval = setInterval(verifyApi, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login", { replace: true });
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}

function MainLayout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Suspense fallback={<LoadingScreen />}>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/messages" component={Messages} />
              <Route path="/contacts" component={Contacts} />
              <Route path="/templates" component={Templates} />
              <Route path="/channels" component={Channels} />
              <Route path="/chatbot" component={Chatbot} />
              <Route path="/scheduled" component={Scheduled} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/users" component={Users} />
              <Route path="/settings" component={Settings} />
              <Route path="/profile" component={Profile} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function AuthLayout() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-whatsapp-dark/10 to-background flex items-center justify-center p-4">
      <Suspense fallback={<LoadingScreen />}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password/:token" component={ResetPassword} />
          <Redirect to="/login" />
        </Switch>
      </Suspense>
      
      {/* Mostra versão apenas nas páginas de auth */}
      {location !== "/login" && (
        <div className="absolute bottom-4 right-4 text-sm text-muted-foreground">
          v{import.meta.env.VITE_APP_VERSION}
        </div>
      )}
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <HealthCheck />
      {isAuthenticated ? (
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      ) : (
        <PublicRoute>
          <AuthLayout />
        </PublicRoute>
      )}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="whatsapp-ui-theme">
        <TooltipProvider delayDuration={300}>
          <Toaster
            position="top-right"
            toastOptions={{
              className: "bg-background text-foreground border",
              duration: 5000,
            }}
          />
          <Router />
          {import.meta.env.DEV && (
            <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
          )}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}