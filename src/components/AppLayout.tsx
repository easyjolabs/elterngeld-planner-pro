import { useState } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { GuideProvider } from "./GuideContext";
import Header, { HEADER_HEIGHT } from "./Header";
import Sidebar, { SidebarView, SIDEBAR_WIDTH_COLLAPSED } from "./Sidebar";
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

  const handleNavigate = (view: SidebarView) => {
    navigate(viewToRoute[view]);
  };

  return (
    <GuideProvider>
      <div className="min-h-screen w-full" style={{ backgroundColor: "#FAFAF9" }}>
        {/* Header - fixed at top, full width */}
        <Header variant="app" />

        {/* Sidebar - fixed, below header */}
        <Sidebar activeView={activeView} onNavigate={handleNavigate} onSignInClick={() => setShowLoginModal(true)} />

        {/* Main content - offset for header and sidebar */}
        <main
          style={{
            marginLeft: SIDEBAR_WIDTH_COLLAPSED,
            paddingTop: HEADER_HEIGHT,
            minHeight: "100vh",
          }}
        >
          <Outlet />
        </main>

        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </div>
    </GuideProvider>
  );
};
