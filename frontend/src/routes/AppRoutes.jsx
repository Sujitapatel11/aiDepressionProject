import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AuthPage      from '../pages/AuthPage';
import DashboardPage from '../pages/DashboardPage';
import MainLayout    from '../layouts/MainLayout';
import { useAuth }   from '../hooks/useAuth';

// Lazy-loaded routes for initial load performance optimization
const JournalPage   = lazy(() => import('../pages/JournalPage'));
const SoulWorldPage = lazy(() => import('../pages/SoulWorldPage'));
const CreatorStudioPage = lazy(() => import('../pages/CreatorStudioPage'));
const CreatorPublicPage = lazy(() => import('../pages/CreatorPublicPage'));
const CreatorDashboardPage = lazy(() => import('../pages/CreatorDashboardPage'));
const CreatorEarningsPage = lazy(() => import('../pages/CreatorEarningsPage'));
const CreatorAdminPage = lazy(() => import('../pages/CreatorAdminPage'));
const InsightsPage  = lazy(() => import('../pages/InsightsPage'));
const PeersPage     = lazy(() => import('../pages/PeersPage'));
const ChatPage      = lazy(() => import('../pages/ChatPage'));
const SleepPage     = lazy(() => import('../pages/SleepPage'));
const CommunityFeedPage = lazy(() => import('../pages/CommunityFeedPage'));
const ProfilePage   = lazy(() => import('../pages/ProfilePage'));
const SettingsPage  = lazy(() => import('../pages/SettingsPage'));
const BetaAdminPage = lazy(() => import('../pages/BetaAdminPage'));
const NotFoundPage  = lazy(() => import('../pages/NotFoundPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh] p-8">
    <div className="w-8 h-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
  </div>
);

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Auth route ── */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/creators/:username" element={<CreatorPublicPage />} />
        <Route path="/creators/:username/posts/:postId" element={<CreatorPublicPage />} />

        {/* ── Protected application shell ── */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/"           element={<DashboardPage />} />
          <Route path="/world"      element={<SoulWorldPage />} />
          <Route path="/creator-studio" element={<CreatorStudioPage />} />
          <Route path="/creator-dashboard" element={<CreatorDashboardPage />} />
          <Route path="/creator-earnings" element={<CreatorEarningsPage />} />
          <Route path="/creator-admin" element={<CreatorAdminPage />} />
          <Route path="/journal"    element={<JournalPage />} />
          <Route path="/insights"   element={<InsightsPage />} />
          <Route path="/peers"      element={<PeersPage />} />
          <Route path="/support"    element={<PeersPage />} />
          <Route path="/chat"       element={<ChatPage />} />
          <Route path="/community"  element={<CommunityFeedPage />} />
          <Route path="/sleep"      element={<SleepPage />} />
          <Route path="/profile"    element={<ProfilePage />} />
          <Route path="/settings"   element={<SettingsPage />} />
          <Route path="/beta-admin" element={<BetaAdminPage />} />
        </Route>

        {/* ── 404 ── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
