import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { useProfile } from '@/entities/profile';
import { AppLayout } from './layouts/AppLayout';

const OnboardingPage      = lazy(() => import('@/pages/onboarding/OnboardingPage'));
const LoginPage           = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage        = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage  = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage   = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const TransactionsPage    = lazy(() => import('@/pages/transactions/TransactionsPage'));
const AddTransactionPage  = lazy(() => import('@/pages/transactions/AddTransactionPage'));
const ImportCSVPage       = lazy(() => import('@/pages/settings/ImportCSVPageRoute'));
const SettingsPage        = lazy(() => import('@/pages/settings/SettingsPage'));
const BudgetsPage         = lazy(() => import('@/pages/budgets/BudgetsPage'));
const DashboardPage       = lazy(() => import('@/pages/dashboard/DashboardPage'));
const AnalyticsPage       = lazy(() => import('@/pages/analytics/AnalyticsPage'));
const GoalsPage           = lazy(() => import('@/pages/goals/GoalsPage'));
const AIAdvisorPage       = lazy(() => import('@/pages/ai/AIAdvisorPage'));
const AccountsPage        = lazy(() => import('@/pages/accounts/AccountsPage'));
const CreditsPage         = lazy(() => import('@/pages/credits/CreditsPage'));
const InvestmentsPage     = lazy(() => import('@/pages/investments/InvestmentsPage'));

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0d1b26]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5DCAA5] border-t-transparent" />
    </div>
  );
}

function ProtectedRoute() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth/login" replace />;
  return <Outlet />;
}

function OnboardedRoute() {
  const { user, isLoading } = useAuthStore();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  if (isLoading || profileLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
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
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-white/55">В разработке</p>
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
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

        {/* Onboarding (protected, no layout) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>

        {/* Protected routes with layout */}
        <Route element={<OnboardedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard"        element={<DashboardPage />} />
            <Route path="/transactions"     element={<TransactionsPage />} />
            <Route path="/transactions/new" element={<AddTransactionPage />} />
            <Route path="/budgets"          element={<BudgetsPage />} />
            <Route path="/analytics"        element={<AnalyticsPage />} />
            <Route path="/goals"            element={<GoalsPage />} />
            <Route path="/accounts"          element={<AccountsPage />} />
            <Route path="/credits"           element={<CreditsPage />} />
            <Route path="/investments"       element={<InvestmentsPage />} />
            <Route path="/ai"               element={<AIAdvisorPage />} />
            <Route path="/settings"         element={<SettingsPage />} />
            <Route path="/settings/import"  element={<ImportCSVPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
