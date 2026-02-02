// apps/web/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Header } from "./components/layout/Header";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { ScaffolderPage } from "./pages/scaffolder/ScaffolderPage";
import { GitOpsPage } from "./pages/gitops/GitOpsPage";
import { AnalyticsPage } from "./pages/analytics/AnalyticsPage";
// import { AiAssistantPage } from "./pages/ai_assistant/AiAssistantPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Header />}>
          {/* Redirect the root URL to /dashboard */}
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
  );
}

export default App;
