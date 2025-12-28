import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminImport from "./pages/AdminImport";
import Beratung from "./pages/Beratung";
import { PasswordGate } from "./components/PasswordGate";
import { usePasswordProtection } from "./hooks/usePasswordProtection";

const queryClient = new QueryClient();

function ProtectedApp() {
  const { isAuthenticated, isLoading, error, login } = usePasswordProtection();

  // Show loading state briefly while checking localStorage
  if (isLoading && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show password gate if not authenticated
  if (!isAuthenticated) {
    return <PasswordGate onLogin={login} error={error} isLoading={isLoading} />;
  }

  // Render the app if authenticated
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/beratung" element={<Beratung />} />
        <Route path="/admin/import" element={<AdminImport />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ProtectedApp />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
