import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Chat from "./pages/Chat";
import Guide from "./pages/Guide";
import GuideNew from "./pages/GuideNew";
import Settings from "./pages/Settings";
import ImportFaqs from "./pages/ImportFaqs";
import LandingPage from "./pages/LandingPage";
import { PrivacyPolicy, Disclaimer, Imprint } from "./pages/LegalPages";
import { PasswordGate } from "./components/PasswordGate";
import { usePasswordProtection } from "./hooks/usePasswordProtection";
import { AppLayout } from "./components/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";

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
        {/* Landing Page - eigene Navigation */}
        <Route path="/" element={<LandingPage />} />

        {/* Legal Pages - eigene Navigation */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/disclaimer" element={<Disclaimer />} />
        <Route path="/imprint" element={<Imprint />} />

        {/* App Routes - mit AppLayout */}
        <Route element={<AppLayout />}>
          <Route path="/planner" element={<Index />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="/import-faqs" element={<ImportFaqs />} />
        <Route path="/guide-new" element={<GuideNew />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
