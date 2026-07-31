import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useResponsive } from '../../hooks/useResponsive';
import DesktopSidebar from './DesktopSidebar';
import TopHeader from './TopHeader';
import MobileBottomNav from './MobileBottomNav';
import { api } from '../../services/api';

export const AppLayout = () => {
  const { isDesktop } = useResponsive();
  const location = useLocation();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    async function fetchDashboardStats() {
      const res = await api('GET', '/dashboard/');
      if (res && res.ok) {
        try {
          const data = await res.json();
          setPendingRequestsCount(data.pending_requests_count || 0);
        } catch (e) {}
      }
    }
    fetchDashboardStats();
  }, [location.pathname]);

  const isChatScreen = location.pathname.startsWith('/chat');

  if (isDesktop) {
    return (
      <div id="desk" className="flex min-h-screen bg-gray-50">
        <DesktopSidebar pendingRequestsCount={pendingRequestsCount} />
        <main className="flex-1 min-w-0 p-8 max-w-6xl mx-auto overflow-y-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div id="mob" className="min-h-screen flex flex-col bg-gray-50 pb-20">
      {!isChatScreen && <TopHeader />}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
      {!isChatScreen && <MobileBottomNav />}
    </div>
  );
};

export default AppLayout;
