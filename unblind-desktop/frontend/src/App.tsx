import { useState } from "react";
import { AppLayout } from "@/components/layout";
import {
  DashboardPage,
  BrowserPage,
  NotificationsPage,
  ResultsPage,
  SettingsPage,
} from "@/pages";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "browser":
        return <BrowserPage />;
      case "notifications":
        return <NotificationsPage />;
      case "results":
        return <ResultsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <div>未知页面</div>;
    }
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </AppLayout>
  );
}

export default App;
