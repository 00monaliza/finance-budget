import { Routes, Route, Navigate } from 'react-router-dom';

// Placeholder pages - will be implemented in subsequent tasks
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-screen">
      <h1 className="text-2xl font-bold text-gray-600">{title}</h1>
    </div>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<PlaceholderPage title="Dashboard" />} />
      <Route path="/transactions" element={<PlaceholderPage title="Transactions" />} />
      <Route path="/transactions/new" element={<PlaceholderPage title="Add Transaction" />} />
      <Route path="/budgets" element={<PlaceholderPage title="Budgets" />} />
      <Route path="/analytics" element={<PlaceholderPage title="Analytics" />} />
      <Route path="/goals" element={<PlaceholderPage title="Goals" />} />
      <Route path="/ai" element={<PlaceholderPage title="AI Advisor" />} />
      <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
      <Route path="/settings/import" element={<PlaceholderPage title="Import CSV" />} />
      <Route path="/auth/login" element={<PlaceholderPage title="Login" />} />
      <Route path="/auth/register" element={<PlaceholderPage title="Register" />} />
    </Routes>
  );
}
