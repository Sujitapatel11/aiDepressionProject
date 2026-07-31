import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AuthPage      from '../pages/AuthPage';
import DashboardPage from '../pages/DashboardPage';
import JournalPage   from '../pages/JournalPage';
import InsightsPage  from '../pages/InsightsPage';
import PeersPage     from '../pages/PeersPage';
import ChatPage      from '../pages/ChatPage';
import SleepPage     from '../pages/SleepPage';
import ProfilePage   from '../pages/ProfilePage';
import SettingsPage  from '../pages/SettingsPage';
import BetaAdminPage from '../pages/BetaAdminPage';
import NotFoundPage  from '../pages/NotFoundPage';
import MainLayout    from '../layouts/MainLayout';

import { useAuth } from '../hooks/useAuth';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export const AppRoutes = () => {
  return (
    <Routes>
      {/* ── Auth route ── */}
      <Route path="/login" element={<AuthPage />} />

      {/* ── Protected application shell ── */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/"           element={<DashboardPage />} />
        <Route path="/journal"    element={<JournalPage />} />
        <Route path="/insights"   element={<InsightsPage />} />
        <Route path="/peers"      element={<PeersPage />} />
        <Route path="/support"    element={<PeersPage />} />
        <Route path="/chat"       element={<ChatPage />} />
        <Route path="/sleep"      element={<SleepPage />} />
        <Route path="/profile font-bold" element={<ProfilePage />} />
        <Route path="/profile"    element={<ProfilePage />} />
        <Route path="/settings"   element={<SettingsPage />} />
        <Route path="/beta-admin" element={<BetaAdminPage />} />
      </Route>

      {/* ── 404 ── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
