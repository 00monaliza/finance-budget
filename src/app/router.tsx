import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { useProfile } from '@/entities/profile';
import { AppLayout } from './layouts/AppLayout';

const OnboardingPage     = lazy(() => import('@/pages/onboarding/OnboardingPage'));
const LoginPage          = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage       = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const TransactionsPage   = lazy(() => import('@/pages/transactions/TransactionsPage'));
const AddTransactionPage = lazy(() => import('@/pages/transactions/AddTransactionPage'));
const ImportCSVPage      = lazy(() => import('@/pages/settings/ImportCSVPageRoute'));
const DashboardPage      = lazy(() => import('@/pages/dashboard/DashboardPage'));
const AnalyticsPage      = lazy(() => import('@/pages/analytics/AnalyticsPage'));
const GoalsPage          = lazy(() => import('@/pages/goals/GoalsPage'));
const AIAdvisorPage      = lazy(() => import('@/pages/ai/AIAdvisorPage'));
const AccountsPage       = lazy(() => import('@/pages/accounts/AccountsPage'));
const CreditsPage        = lazy(() => import('@/pages/credits/CreditsPage'));
const InvestmentsPage    = lazy(() => import('@/pages/investments/InvestmentsPage'));
const ProfilePage        = lazy(() => import('@/pages/profile/ProfilePage'));

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

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<GuestRoute />}>
          <Route path="/auth/login"           element={<LoginPage />} />
          <Route path="/auth/register"        element={<RegisterPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>

        <Route element={<OnboardedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard"        element={<DashboardPage />} />
            <Route path="/transactions"     element={<TransactionsPage />} />
            <Route path="/transactions/new" element={<AddTransactionPage />} />
            <Route path="/analytics"        element={<AnalyticsPage />} />
            <Route path="/goals"            element={<GoalsPage />} />
            <Route path="/profile"          element={<ProfilePage />} />
            <Route path="/accounts"         element={<AccountsPage />} />
            <Route path="/credits"          element={<CreditsPage />} />
            <Route path="/investments"      element={<InvestmentsPage />} />
            <Route path="/ai"               element={<AIAdvisorPage />} />
            <Route path="/settings/import"  element={<ImportCSVPage />} />
            {/* Redirects for old routes */}
            <Route path="/settings"         element={<Navigate to="/profile" replace />} />
            <Route path="/budgets"          element={<Navigate to="/transactions" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
