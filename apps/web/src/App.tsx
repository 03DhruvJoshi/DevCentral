// apps/web/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardLayout } from "./components/layout/DashboardLayout.js";
import { DashboardPage } from "./pages/dashboard/DashboardPage.js";
import { ScaffolderPage } from "./pages/scaffolder/ScaffolderPage.js";
import { GitOpsPage } from "./pages/gitops/GitOpsPage.js";
import { AnalyticsPage } from "./pages/analytics/AnalyticsPage.js";
// import { AiAssistantPage } from "./pages/ai_assistant/AiAssistantPage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Main Feature Routes */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/gitops" element={<GitOpsPage />} />
            <Route path="/scaffold" element={<ScaffolderPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            {/* <Route path="/ai-assistant" element={<AiAssistantPage />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
