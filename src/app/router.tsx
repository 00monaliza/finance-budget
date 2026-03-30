import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';

const LoginPage    = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-[#2F4454] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth/login" replace />;
  return <Outlet />;
}

function GuestRoute() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-screen">
      <h1 className="text-2xl font-bold text-gray-600">{title}</h1>
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Auth routes (guests only) */}
        <Route element={<GuestRoute />}>
          <Route path="/auth/login"    element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard"       element={<PlaceholderPage title="Dashboard" />} />
          <Route path="/transactions"    element={<PlaceholderPage title="Transactions" />} />
          <Route path="/transactions/new" element={<PlaceholderPage title="Add Transaction" />} />
          <Route path="/budgets"         element={<PlaceholderPage title="Budgets" />} />
          <Route path="/analytics"       element={<PlaceholderPage title="Analytics" />} />
          <Route path="/goals"           element={<PlaceholderPage title="Goals" />} />
          <Route path="/ai"              element={<PlaceholderPage title="AI Advisor" />} />
          <Route path="/settings"        element={<PlaceholderPage title="Settings" />} />
          <Route path="/settings/import" element={<PlaceholderPage title="Import CSV" />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
