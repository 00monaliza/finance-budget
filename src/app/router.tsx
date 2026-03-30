import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { AppLayout } from './layouts/AppLayout';

const LoginPage           = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage        = lazy(() => import('@/pages/auth/RegisterPage'));
const TransactionsPage    = lazy(() => import('@/pages/transactions/TransactionsPage'));
const AddTransactionPage  = lazy(() => import('@/pages/transactions/AddTransactionPage'));
const ImportCSVPage       = lazy(() => import('@/pages/settings/ImportCSVPageRoute'));
const BudgetsPage         = lazy(() => import('@/pages/budgets/BudgetsPage'));
const DashboardPage       = lazy(() => import('@/pages/dashboard/DashboardPage'));

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
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h1 className="text-2xl font-bold text-gray-600">{title}</h1>
        <p className="text-gray-400 mt-2">В разработке</p>
      </div>
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

        {/* Protected routes with layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard"        element={<DashboardPage />} />
            <Route path="/transactions"     element={<TransactionsPage />} />
            <Route path="/transactions/new" element={<AddTransactionPage />} />
            <Route path="/budgets"          element={<BudgetsPage />} />
            <Route path="/analytics"        element={<PlaceholderPage title="Аналитика" />} />
            <Route path="/goals"            element={<PlaceholderPage title="Цели" />} />
            <Route path="/ai"               element={<PlaceholderPage title="AI Советник" />} />
            <Route path="/settings"         element={<PlaceholderPage title="Настройки" />} />
            <Route path="/settings/import"  element={<ImportCSVPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
