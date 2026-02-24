import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardLayout } from "./components/layout/DashboardLayout.js";
import { DashboardPage } from "./pages/dashboard/DashboardPage.js";
import { ScaffolderPage } from "./pages/scaffolder/ScaffolderPage.js";
import { GitOpsPage } from "./pages/gitops/GitOpsPage.js";
import { AnalyticsPage } from "./pages/analytics/AnalyticsPage.js";
import { LoginPage } from "./pages/auth/LoginPage.js";
import { RegisterPage } from "./pages/auth/RegisterPage.js";

const queryClient = new QueryClient();

const ProtectedLayout = () => {
  const token = localStorage.getItem("devcentral_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/gitops" element={<GitOpsPage />} />
            <Route path="/scaffold" element={<ScaffolderPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
