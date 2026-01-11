import { useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import Sidebar, { SidebarView } from './Sidebar';
import LoginModal from './LoginModal';

const routeToView: Record<string, SidebarView | 'settings'> = {
  '/': 'home',
  '/guide': 'guide',
  '/chat': 'chat',
  '/settings': 'settings',
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

  const currentRoute = routeToView[location.pathname];
  const activeView: SidebarView = currentRoute === 'settings' ? 'home' : (currentRoute || 'home');

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
