import React, { useEffect, useState } from "react";
import AuditLogs from "./components/AuditLogs";
import Dashboard from "./components/Dashboard";
import Drivers from "./components/Drivers";
import Layout from "./components/Layout";
import Login from "./components/Login";
import Shifts from "./components/Shifts";
import { getAuthToken } from "./services/api";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    setIsAuthenticated(!!token);
  }, []);

  const renderPlaceholder = (title: string, icon: string) => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-300 animate-in fade-in zoom-in duration-500">
      <span className="text-8xl mb-6 filter grayscale opacity-20">{icon}</span>
      <h3 className="text-2xl font-bold text-[#1B254B]">{title}</h3>
      <p className="text-slate-400 mt-2 font-medium">
        Модуль находится в стадии разработки
      </p>
      <div className="mt-8 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-widest">
        Coming Soon
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "shifts":
        return <Shifts />;
      case "drivers":
        return <Drivers />;
      case "audit":
        return <AuditLogs />;
      case "fleet":
        return renderPlaceholder("Управление Автопарком", "🚛");
      case "objects":
        return renderPlaceholder("Объекты Работ", "🏗️");
      case "users":
        return renderPlaceholder("Контроль Доступа", "👥");
      case "settings":
        return renderPlaceholder("Конфигурация Системы", "⚙️");
      default:
        return <Dashboard />;
    }
  };

  if (isAuthenticated === null) return null;
  if (!isAuthenticated) return <Login />;

  return (
    <div className="antialiased selection:bg-indigo-100 selection:text-indigo-900">
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderContent()}
      </Layout>
      {/* <AIAssistant /> */}
    </div>
  );
};

export default App;
