// apps/web/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { ScaffolderPage } from "./pages/scaffolder/ScaffolderPage";
import { GitOpsPage } from "./pages/gitops/GitOpsPage";
import { AnalyticsPage } from "./pages/analytics/AnalyticsPage";
// Temporary placeholder pages (we will build these out next)

const AiAssistantPage = () => (
  <div className="text-2xl font-bold">AI Assistant</div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* All routes inside this wrapper get the Header navigation */}
        <Route element={<DashboardLayout />}>
          {/* Redirect the root URL to /dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Main Feature Routes */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/gitops" element={<GitOpsPage />} />
          <Route path="/scaffold" element={<ScaffolderPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/ai-assistant" element={<AiAssistantPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
