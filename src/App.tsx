import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Chat from "./pages/Chat";
import Guide from "./pages/Guide";
import ImportFaqs from "./pages/ImportFaqs";
import { PasswordGate } from "./components/PasswordGate";
import { usePasswordProtection } from "./hooks/usePasswordProtection";
import { AppLayout } from "./components/AppLayout";

const queryClient = new QueryClient();

function ProtectedApp() {
  const { isAuthenticated, isLoading, error, login } = usePasswordProtection();

  if (isLoading && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordGate onLogin={login} error={error} isLoading={isLoading} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/guide" element={<Guide />} />
        </Route>
        <Route path="/import-faqs" element={<ImportFaqs />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ProtectedApp />
  </QueryClientProvider>
);

export default App;
