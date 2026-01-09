import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import Sidebar, { SidebarView } from './Sidebar';

const routeToView: Record<string, SidebarView> = {
  '/': 'home',
  '/guide': 'guide',
  '/beratung': 'chat',
};

const viewToRoute: Record<SidebarView, string> = {
  'home': '/',
  'guide': '/guide',
  'chat': '/beratung',
  'pdf': '/',
};

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const activeView = routeToView[location.pathname] || 'home';
  
  const handleNavigate = (view: SidebarView) => {
    navigate(viewToRoute[view]);
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar activeView={activeView} onNavigate={handleNavigate} />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
