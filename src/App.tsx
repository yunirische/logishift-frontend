import React, { useEffect, useState, lazy, Suspense } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import LandingView from "./views/LandingView";
import RegisterView from "./views/RegisterView";
import ForgotPasswordView from "./views/ForgotPasswordView";
import ResetPasswordView from "./views/ResetPasswordView";
import BillingView from "./views/BillingView";
import LegalDocumentView from "./views/LegalDocumentView";
import { DriverView } from "./views/DriverView";
import {
  isDemoHostname,
  isDemoTenantId,
  isMarketingHostname,
  isProductionAppHostname,
} from "./config/demo";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Bundle optimization: lazy load heavy components (bundle-dynamic-imports)
const Drivers = lazy(() => import("./components/Drivers"));
const AuditLogs = lazy(() => import("./components/AuditLogs"));
const Shifts = lazy(() => import("./components/Shifts"));
const Fleet = lazy(() => import("./components/Fleet"));
const Objects = lazy(() => import("./components/Objects"));
const System = lazy(() => import("./components/System"));
const Analytics = lazy(() => import("./components/Analytics"));

// Demo persona type
type DemoPersona = 'admin' | 'driver';
type AppTab =
  | "dashboard"
  | "my-shifts"
  | "driver-history"
  | "analytics"
  | "billing"
  | "shifts"
  | "drivers"
  | "fleet"
  | "objects"
  | "audit"
  | "settings"
  | "users";

const APP_TABS: AppTab[] = [
  "dashboard",
  "my-shifts",
  "driver-history",
  "analytics",
  "billing",
  "shifts",
  "drivers",
  "fleet",
  "objects",
  "audit",
  "settings",
  "users",
];

const getAllowedTabs = ({
  role,
  isDemoDriverMode,
}: {
  role?: string;
  isDemoDriverMode: boolean;
}): AppTab[] => {
  if (isDemoDriverMode) {
    return ["my-shifts", "driver-history"];
  }

  switch (role) {
    case "admin":
      return [
        "dashboard",
        "my-shifts",
        "analytics",
        "billing",
        "shifts",
        "drivers",
        "fleet",
        "objects",
        "audit",
        "settings",
      ];
    case "foreman":
      return [
        "dashboard",
        "my-shifts",
        "analytics",
        "billing",
        "shifts",
        "drivers",
        "objects",
      ];
    case "driver":
      return ["my-shifts", "driver-history"];
    default:
      return ["dashboard"];
  }
};

const getDefaultTab = ({
  role,
  isDemoDriverMode,
}: {
  role?: string;
  isDemoDriverMode: boolean;
}): AppTab => {
  if (isDemoDriverMode || role === "driver") {
    return "my-shifts";
  }

  return "dashboard";
};

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab && APP_TABS.includes(requestedTab as AppTab)) {
      return requestedTab as AppTab;
    }
    return "dashboard";
  });
  // Initialize from localStorage or default to 'admin'
  const [demoPersona, setDemoPersona] = useState<DemoPersona>(() => {
    const saved = localStorage.getItem('demoPersona');
    return (saved === 'driver' || saved === 'admin') ? saved : 'admin';
  });
  const { isAuthenticated, isLoading, error, clearError, user } = useAuth();
  const pathname = window.location.pathname;
  const hostname = window.location.hostname;
  const isPaymentSuccessPage = pathname === "/payment/success";
  const isPaymentCancelPage = pathname === "/payment/cancel";
  const isPaymentReturnPage = isPaymentSuccessPage || isPaymentCancelPage;
  const handleSetActiveTab = (tab: string) => {
    const nextTab = tab as AppTab;

    if (isPaymentReturnPage) {
      const nextUrl =
        nextTab === "dashboard" ? "/" : `/?tab=${encodeURIComponent(nextTab)}`;
      window.location.href = nextUrl;
      return;
    }

    setActiveTab(nextTab);
  };

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem('demoPersona', demoPersona);
  }, [demoPersona]);

  // Check if user is in demo mode
  const isDemoMode = isDemoTenantId(user?.tenant_id);
  const isDemoDriverMode = isDemoMode && demoPersona === 'driver';

  useEffect(() => {
    if (!user) return;

    const allowedTabs = getAllowedTabs({
      role: user.role,
      isDemoDriverMode,
    });

    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(
        getDefaultTab({
          role: user.role,
          isDemoDriverMode,
        })
      );
    }
  }, [activeTab, isDemoDriverMode, user]);

  const isLandingPage = pathname === "/";
  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";
  const isForgotPasswordPage = pathname === "/forgot-password";
  const isResetPasswordPage = pathname === "/reset-password";
  const isOfferPage = pathname === "/offer";
  const isPrivacyPage = pathname === "/privacy";
  const isPaymentAndRefundPage = pathname === "/payment-and-refund";
  const isContactsPage = pathname === "/contacts";
  const isPersonalDataConsentPage = pathname === "/personal-data-consent";
  const isMarketingHost = isMarketingHostname(hostname);
  const isAppHost = isProductionAppHostname(hostname);
  const isDemoHost = isDemoHostname(hostname);
  const shouldShowLandingOnRoot = isLandingPage && isMarketingHost;
  const shouldForceLoginOnRoot = isLandingPage && !isMarketingHost;

  if (isOfferPage) {
    return <LegalDocumentView documentKey="offer" />;
  }

  if (isPrivacyPage) {
    return <LegalDocumentView documentKey="privacy" />;
  }

  if (isPaymentAndRefundPage) {
    return <LegalDocumentView documentKey="payment-and-refund" />;
  }

  if (isContactsPage) {
    return <LegalDocumentView documentKey="contacts" />;
  }

  if (isPersonalDataConsentPage) {
    return <LegalDocumentView documentKey="personal-data-consent" />;
  }

  if (isRegisterPage) {
    return <RegisterView />;
  }

  if (isForgotPasswordPage) {
    return <ForgotPasswordView />;
  }

  if (isResetPasswordPage) {
    return <ResetPasswordView />;
  }

  if (isPaymentSuccessPage && isAuthenticated) {
    return (
      <ErrorBoundary>
        <div className="antialiased selection:bg-[#0a192f]/10 selection:text-[#0a192f]">
          <Layout activeTab="billing" setActiveTab={handleSetActiveTab} demoPersona={demoPersona} setDemoPersona={setDemoPersona}>
            <ErrorBoundary>
              <BillingView returnMode="success" />
            </ErrorBoundary>
          </Layout>
        </div>
      </ErrorBoundary>
    );
  }

  if (isPaymentCancelPage && isAuthenticated) {
    return (
      <ErrorBoundary>
        <div className="antialiased selection:bg-[#0a192f]/10 selection:text-[#0a192f]">
          <Layout activeTab="billing" setActiveTab={handleSetActiveTab} demoPersona={demoPersona} setDemoPersona={setDemoPersona}>
            <ErrorBoundary>
              <BillingView returnMode="cancel" />
            </ErrorBoundary>
          </Layout>
        </div>
      </ErrorBoundary>
    );
  }

  if (!isAuthenticated && shouldShowLandingOnRoot) {
    return <LandingView />;
  }

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
            className="w-full px-4 py-2 bg-[#0a192f] text-white rounded-lg hover:bg-[#152238] transition-colors"
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
      <div className="mt-8 px-6 py-2 bg-[#0a192f]/10 text-[#0a192f] rounded-full text-xs font-bold uppercase tracking-widest">
        Coming Soon
      </div>
    </div>
  );

  // Hoist static loading state outside render (rendering-hoist-jsx)
  const loadingFallback = (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-300">
      <div className="w-12 h-12 border-4 border-[#0a192f] border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-sm text-slate-400">Загрузка...</p>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "my-shifts":
        return <DriverView />;
      case "driver-history":
        return <DriverView focusHistory />;
      case "analytics":
        return (
          <Suspense fallback={loadingFallback}>
            <Analytics />
          </Suspense>
        );
      case "billing":
        return <BillingView />;
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
            <System />
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
          <div className="w-12 h-12 border-4 border-[#0a192f] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (isLoginPage || shouldForceLoginOnRoot || !isLandingPage || isAppHost || isDemoHost) {
      return <Login />;
    }
    return <LandingView />;
  }

  if (isDemoDriverMode) {
    return (
      <ErrorBoundary>
        <div className="antialiased selection:bg-[#0a192f]/10 selection:text-[#0a192f]">
          <Layout
            activeTab={activeTab}
            setActiveTab={handleSetActiveTab}
            demoPersona={demoPersona}
            setDemoPersona={setDemoPersona}
          >
            <ErrorBoundary>
              <DriverView focusHistory={activeTab === "driver-history"} />
            </ErrorBoundary>
          </Layout>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="antialiased selection:bg-[#0a192f]/10 selection:text-[#0a192f]">
        <Layout activeTab={activeTab} setActiveTab={handleSetActiveTab} demoPersona={demoPersona} setDemoPersona={setDemoPersona}>
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
