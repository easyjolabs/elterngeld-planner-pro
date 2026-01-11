import { useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import Sidebar, { SidebarView } from './Sidebar';
import LoginModal from './LoginModal';

const routeToView: Record<string, SidebarView> = {
  '/': 'home',
  '/guide': 'guide',
  '/chat': 'chat',
};

const viewToRoute: Record<SidebarView, string> = {
  'home': '/',
  'guide': '/guide',
  'chat': '/chat',
  'pdf': '/',
};

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const activeView = routeToView[location.pathname] || 'home';

  const handleNavigate = (view: SidebarView) => {
    navigate(viewToRoute[view]);
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        onSignInClick={() => setShowLoginModal(true)}
      />
      <main className="flex-1">
        <Outlet />
      </main>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
};
