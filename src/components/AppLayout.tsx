import { useState } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import Sidebar, { SidebarView } from "./Sidebar";
import Header, { HEADER_HEIGHT } from "./Header";
import LoginModal from "./LoginModal";

const routeToView: Record<string, SidebarView | "settings"> = {
  "/guide": "planner",
  "/planner": "planner",
  "/chat": "chat",
  "/application": "application",
  "/settings": "settings",
};

const viewToRoute: Record<SidebarView, string> = {
  planner: "/guide",
  application: "/application",
  chat: "/chat",
};

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const currentRoute = routeToView[location.pathname];
  const activeView: SidebarView = currentRoute === "settings" ? "planner" : currentRoute || "planner";

  // Determine header variant based on current route
  const getHeaderVariant = () => {
    if (location.pathname === "/chat") return "chat";
    if (location.pathname === "/guide" || location.pathname === "/planner") return "guide";
    return "guide"; // default for app pages
  };

  const handleNavigate = (view: SidebarView) => {
    navigate(viewToRoute[view]);
  };

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#FAFAF9" }}>
      {/* Header - fixed at top */}
      <Header
        variant={getHeaderVariant()}
        onOpenChat={activeView !== "chat" ? () => navigate("/chat") : undefined}
        // Note: onBack and onRestart will be passed from individual pages
      />

      {/* Sidebar - fixed, below header */}
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        onSignInClick={() => setShowLoginModal(true)}
        headerHeight={HEADER_HEIGHT}
      />

      {/* Main content - offset for header and sidebar */}
      <main
        style={{
          marginLeft: 56, // collapsed sidebar width
          paddingTop: HEADER_HEIGHT,
          minHeight: "100vh",
        }}
      >
        <Outlet />
      </main>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
};
