import React, { useCallback, useEffect, useState, lazy, Suspense } from "react";
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
import OwnerDashboardView from "./views/OwnerDashboardView";
import OwnerTenantDetailView from "./views/OwnerTenantDetailView";
import { DriverView } from "./views/DriverView";
import AnalyticsConsent from "./components/AnalyticsConsent";
import {
  APP_DEMO_PERSONA_KEY,
  getMarketingHostAppRedirectUrl,
  isDemoHostname,
  isDemoTenantId,
  isMarketingPublicPath,
  isMarketingHostname,
  isProductionAppHostname,
} from "./config/demo";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DemoSessionProvider } from "./context/DemoSessionContext";
import { replaceLocation } from "./services/navigation";

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
const DEFAULT_DEMO_PERSONA: DemoPersona = "admin";
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

const ExternalRedirect: React.FC<{ to: string }> = ({ to }) => {
  useEffect(() => {
    replaceLocation(to);
  }, [to]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-[#041627]">Переадресация в приложение...</p>
        <a className="mt-3 inline-flex text-sm text-[#006497]" href={to}>
          Перейти вручную
        </a>
      </div>
    </div>
  );
};

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
  const [demoRegistryFocusShiftId, setDemoRegistryFocusShiftId] = useState<
    string | null
  >(null);
  // Initialize from localStorage or default to 'admin'
  const [demoPersona, setDemoPersona] = useState<DemoPersona>(() => {
    const saved = localStorage.getItem(APP_DEMO_PERSONA_KEY);
    return (saved === 'driver' || saved === 'admin') ? saved : DEFAULT_DEMO_PERSONA;
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

  const handleSetDemoPersona = (nextPersona: DemoPersona) => {
    if (nextPersona === demoPersona) {
      return;
    }

    setDemoPersona(nextPersona);
    setActiveTab(nextPersona === "driver" ? "my-shifts" : "dashboard");
  };

  const handleShowDemoShiftInRegistry = (shiftId: string) => {
    setDemoRegistryFocusShiftId(shiftId);
    setActiveTab("shifts");
  };
  const handleDemoRegistryFocusHandled = useCallback(() => {
    setDemoRegistryFocusShiftId(null);
  }, []);

  const isDemoMode = isDemoTenantId(user?.tenant_id);
  const isDemoDriverMode = isDemoMode && demoPersona === 'driver';

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !isDemoMode) {
      localStorage.removeItem(APP_DEMO_PERSONA_KEY);
      return;
    }

    localStorage.setItem(APP_DEMO_PERSONA_KEY, demoPersona);
  }, [demoPersona, isAuthenticated, isDemoMode, isLoading]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isAuthenticated && isDemoMode) {
      return;
    }

    setDemoPersona((currentPersona) =>
      currentPersona === DEFAULT_DEMO_PERSONA
        ? currentPersona
        : DEFAULT_DEMO_PERSONA
    );
  }, [isAuthenticated, isDemoMode, isLoading]);

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
  const isOwnerPage = pathname === "/owner";
  const ownerTenantDetailMatch = pathname.match(/^\/owner\/tenants\/(\d+)\/?$/);
  const isMarketingHost = isMarketingHostname(hostname);
  const isAppHost = isProductionAppHostname(hostname);
  const isDemoHost = isDemoHostname(hostname);
  const shouldShowLandingOnRoot = isLandingPage && isMarketingHost;
  const shouldForceLoginOnRoot = isLandingPage && !isMarketingHost;

  if (isMarketingHost && !isMarketingPublicPath(pathname)) {
    return (
      <ExternalRedirect
        to={getMarketingHostAppRedirectUrl(pathname, window.location.search)}
      />
    );
  }

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
          <Layout activeTab="billing" setActiveTab={handleSetActiveTab} demoPersona={demoPersona} setDemoPersona={handleSetDemoPersona}>
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
          <Layout activeTab="billing" setActiveTab={handleSetActiveTab} demoPersona={demoPersona} setDemoPersona={handleSetDemoPersona}>
            <ErrorBoundary>
              <BillingView returnMode="cancel" />
            </ErrorBoundary>
          </Layout>
        </div>
      </ErrorBoundary>
    );
  }

  if (shouldShowLandingOnRoot) {
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
            <Shifts
              focusDemoShiftId={demoRegistryFocusShiftId}
              onFocusDemoShiftHandled={handleDemoRegistryFocusHandled}
            />
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

  if (ownerTenantDetailMatch) {
    return (
      <ErrorBoundary>
        <OwnerTenantDetailView tenantId={Number(ownerTenantDetailMatch[1])} />
      </ErrorBoundary>
    );
  }

  if (isOwnerPage) {
    return (
      <ErrorBoundary>
        <OwnerDashboardView />
      </ErrorBoundary>
    );
  }

  if (isDemoDriverMode) {
    return (
      <ErrorBoundary>
        <div className="antialiased selection:bg-[#0a192f]/10 selection:text-[#0a192f]">
          <Layout
            activeTab={activeTab}
            setActiveTab={handleSetActiveTab}
            demoPersona={demoPersona}
            setDemoPersona={handleSetDemoPersona}
            showDemoShiftInRegistry={handleShowDemoShiftInRegistry}
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
        <Layout
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          demoPersona={demoPersona}
          setDemoPersona={handleSetDemoPersona}
          showDemoShiftInRegistry={handleShowDemoShiftInRegistry}
        >
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
        <DemoSessionProvider>
          <AppContent />
        </DemoSessionProvider>
        <AnalyticsConsent />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
