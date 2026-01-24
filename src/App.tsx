import React, { useEffect, useState, lazy, Suspense } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Bundle optimization: lazy load heavy components (bundle-dynamic-imports)
const Drivers = lazy(() => import("./components/Drivers"));
const AuditLogs = lazy(() => import("./components/AuditLogs"));
const Shifts = lazy(() => import("./components/Shifts"));
const Fleet = lazy(() => import("./components/Fleet"));
const Objects = lazy(() => import("./components/Objects"));
const Settings = lazy(() => import("./components/Settings"));

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { isAuthenticated, isLoading, error, clearError } = useAuth();

  // Show error if auth error exists
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка авторизации</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={clearError}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

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

  // Hoist static loading state outside render (rendering-hoist-jsx)
  const loadingFallback = (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-300">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-sm text-slate-400">Загрузка...</p>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "shifts":
        return (
          <Suspense fallback={loadingFallback}>
            <Shifts />
          </Suspense>
        );
      case "drivers":
        return (
          <Suspense fallback={loadingFallback}>
            <Drivers />
          </Suspense>
        );
      case "audit":
        return (
          <Suspense fallback={loadingFallback}>
            <AuditLogs />
          </Suspense>
        );
      case "fleet":
        return (
          <Suspense fallback={loadingFallback}>
            <Fleet />
          </Suspense>
        );
      case "objects":
        return (
          <Suspense fallback={loadingFallback}>
            <Objects />
          </Suspense>
        );
      case "settings":
        return (
          <Suspense fallback={loadingFallback}>
            <Settings />
          </Suspense>
        );
      case "users":
        return renderPlaceholder("Контроль Доступа", "👥");
      default:
        return <Dashboard />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Login />;

  return (
    <ErrorBoundary>
      <div className="antialiased selection:bg-indigo-100 selection:text-indigo-900">
        <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </Layout>
        {/* <AIAssistant /> */}
      </div>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
