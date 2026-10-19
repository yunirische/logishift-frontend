import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../App";
import React from "react";
import { createDemoScenarioShift, writeDemoSession } from "../lib/demoSession";
import { rememberDemoPresentation, clearDemoPresentation } from "../lib/demoPresentation";
import { getOrCreateDemoFunnelSession } from "../lib/demoFunnelSession";
import { captureDemoRegistrationHandoff } from "../lib/demoRegistrationHandoff";

const {
  mockUseAuth,
  mockIsDemoHostname,
  mockIsDemoTenantId,
  mockIsMarketingHostname,
  mockIsProductionAppHostname,
  mockUseDemoSession,
  mockRecordEvent,
  mockRegistrationClick,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockIsDemoHostname: vi.fn(),
  mockIsDemoTenantId: vi.fn(),
  mockIsMarketingHostname: vi.fn(),
  mockIsProductionAppHostname: vi.fn(),
  mockUseDemoSession: vi.fn(),
  mockRecordEvent: vi.fn().mockResolvedValue(undefined),
  mockRegistrationClick: vi.fn(),
}));

vi.mock("../lib/demoFunnelEvents", () => ({
  recordCurrentDemoFunnelEvent: mockRecordEvent,
  recordDemoRegistrationCtaClick: mockRegistrationClick,
}));

vi.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

vi.mock("../context/DemoSessionContext", () => ({
  useDemoSession: () => mockUseDemoSession(),
  DemoSessionProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../components/Login", () => ({
  default: () => <div>Login screen</div>,
}));

vi.mock("../components/Layout", () => ({
  default: ({
    children,
    activeTab,
    setActiveTab,
    demoPersona,
    setDemoPersona,
    showDemoShiftInRegistry,
    showDemoProductTour,
  }: {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    demoPersona?: "admin" | "driver";
    setDemoPersona?: (persona: "admin" | "driver") => void;
    showDemoShiftInRegistry?: (shiftId: string) => void;
    showDemoProductTour?: boolean;
  }) => (
    <div>
      <div data-testid="active-tab">{activeTab}</div>
      {showDemoProductTour && <div data-testid="manual-demo-tour">Product Tour</div>}
      {demoPersona !== "driver" && (
        <div data-testid="admin-sidebar">Admin sidebar</div>
      )}
      <button type="button" onClick={() => setDemoPersona?.("admin")}>
        Switch demo persona to admin
      </button>
      <button type="button" onClick={() => setDemoPersona?.("driver")}>
        Switch demo persona to driver
      </button>
      <button type="button" onClick={() => setDemoPersona?.("driver")}>
        Guide open driver
      </button>
      <button type="button" onClick={() => setActiveTab("shifts")}>
        Open shifts
      </button>
      <button
        type="button"
        onClick={() =>
          showDemoShiftInRegistry?.("demo-shift:from-guide")
        }
      >
        Guide show synthetic shift
      </button>
      {children}
    </div>
  ),
}));

vi.mock("../components/Dashboard", () => ({
  default: () => <div>Dashboard</div>,
}));

vi.mock("../components/Shifts", () => ({
  default: ({ focusDemoShiftId, onNavigateToBilling }: { focusDemoShiftId?: string | null; onNavigateToBilling?: () => void }) => (
    <div data-testid="shifts-focus-id">{focusDemoShiftId || "none"}<button onClick={onNavigateToBilling}>Export tariff CTA</button></div>
  ),
}));

vi.mock("../views/LandingView", () => ({
  default: () => <div>Landing</div>,
}));

vi.mock("../views/RegisterView", () => ({
  default: () => <div>Register</div>,
}));

vi.mock("../views/ForgotPasswordView", () => ({
  default: () => <div>Forgot password</div>,
}));

vi.mock("../views/ResetPasswordView", () => ({
  default: () => <div>Reset password</div>,
}));

vi.mock("../views/BillingView", () => ({
  default: () => <div>Billing</div>,
}));

vi.mock("../views/LegalDocumentView", () => ({
  default: () => <div>Legal document</div>,
}));

vi.mock("../views/OwnerDashboardView", () => ({
  default: () => <div>Owner dashboard</div>,
}));

vi.mock("../views/OwnerTenantDetailView", () => ({
  default: ({ tenantId }: { tenantId: number }) => <div>Owner tenant detail {tenantId}</div>,
}));

vi.mock("../views/DriverView", () => ({
  DriverView: () => <div>Driver view</div>,
}));

vi.mock("../components/DemoScenarioEntry", () => ({
  default: ({ onExploreCabinet, setDemoPersona }: {
    onExploreCabinet: () => void;
    setDemoPersona: (persona: "admin" | "driver") => void;
  }) => (
    <div data-testid="demo-scenario-entry">
      <div>Driver view</div>
      <div data-testid="active-tab">my-shifts</div>
      <button onClick={onExploreCabinet}>Посмотреть кабинет подробнее</button>
      <button onClick={() => setDemoPersona("admin")}>Switch demo persona to admin</button>
      <button onClick={() => setDemoPersona("driver")}>Switch demo persona to driver</button>
    </div>
  ),
}));

vi.mock("../services/navigation", () => ({
  replaceLocation: vi.fn(),
}));

vi.mock("../components/AnalyticsConsent", () => ({
  default: () => null,
}));

vi.mock("../config/demo", () => ({
  APP_DEMO_PERSONA_KEY: "demoPersona",
  DEMO_ENTRY_QUERY_PARAM: "enterDemo",
  getProductionAppUrl: (pathname = "/") => `https://app.kontrolsmen.ru${pathname}`,
  getMarketingHostAppRedirectUrl: (pathname: string, search = "") =>
    `https://app.kontrolsmen.ru${pathname === "/dashboard" ? "/" : pathname}${search}`,
  isDemoHostname: mockIsDemoHostname,
  isDemoTenantId: mockIsDemoTenantId,
  isMarketingPublicPath: (pathname: string) =>
    ["/", "/offer", "/privacy", "/personal-data-consent", "/payment-and-refund", "/contacts"].includes(pathname),
  isMarketingHostname: mockIsMarketingHostname,
  isProductionAppHostname: mockIsProductionAppHostname,
}));

describe("App protected routes", () => {
  const createDemoAdminUser = () => ({
    id: 999,
    full_name: "Demo Admin",
    role: "admin",
    tenant_id: 999,
  });

  const createNonDemoAdminUser = () => ({
    id: 5,
    full_name: "Prod Admin",
    role: "admin",
    tenant_id: 5,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Existing routing tests exercise a visitor who already chose the driver path.
    getOrCreateDemoFunnelSession({ explicitEntry: true });
    rememberDemoPresentation("driver");
    mockUseDemoSession.mockReturnValue({ activeShift: null, finishedShifts: [] });
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    mockIsDemoHostname.mockReturnValue(true);
    mockIsDemoTenantId.mockImplementation((tenantId: unknown) => tenantId === 999);
    mockIsMarketingHostname.mockReturnValue(false);
    mockIsProductionAppHostname.mockReturnValue(false);
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      clearError: vi.fn(),
      user: null,
    });
  });

  const authenticateDemo = () => mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, error: null, clearError: vi.fn(), user: createDemoAdminUser() });

  it.each(["/register", "/privacy"])("does not observe Overview when demo-auth renders another route: %s", pathname => {
    clearDemoPresentation(); authenticateDemo();
    window.history.replaceState({}, "", pathname);
    render(<App />);
    expect(screen.queryByTestId("demo-overview")).not.toBeInTheDocument();
    expect(mockRecordEvent).not.toHaveBeenCalled();
  });

  it("opens existing Billing from the registry export tariff CTA", async () => {
    mockIsDemoHostname.mockReturnValue(false);
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, error: null, user: createNonDemoAdminUser() });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open shifts" }));
    fireEvent.click(await screen.findByRole("button", { name: "Export tariff CTA" }));
    expect(await screen.findByText("Billing")).toBeInTheDocument();
  });

  it("consumes the one-shot entry marker after demo authentication without removing attribution", () => {
    clearDemoPresentation();
    window.history.replaceState({}, "", "/?enterDemo=1&utm_source=fixture#section");
    authenticateDemo();
    const first = render(<App />);
    expect(screen.getByTestId("demo-overview")).toBeVisible();
    expect(new URLSearchParams(window.location.search).has("enterDemo")).toBe(false);
    expect(new URLSearchParams(window.location.search).get("utm_source")).toBe("fixture");
    expect(window.location.hash).toBe("#section");
    const registration = new URL(screen.getByRole("link", { name: "Создать свою компанию" }).getAttribute("href")!);
    expect(registration.searchParams.get("utm_source")).toBe("fixture");
    fireEvent.click(screen.getByRole("button", { name: "Попробовать самому" }));
    first.unmount();
    render(<App />);
    expect(screen.getByTestId("demo-scenario-entry")).toBeVisible();
  });

  it("shows overview on fresh entry/reload without mounting the scenario, dashboard or tour", () => {
    clearDemoPresentation();
    authenticateDemo();
    const first = render(<App />);
    expect(screen.getByTestId("demo-overview")).toBeVisible();
    expect(screen.queryByTestId("demo-scenario-entry")).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByTestId("manual-demo-tour")).not.toBeInTheDocument();
    expect(mockRecordEvent).toHaveBeenCalledExactlyOnceWith("demo_overview_shown");
    first.unmount();
    render(<App />);
    expect(screen.getByTestId("demo-overview")).toBeVisible();
    // Remount may retry the request; the server unique index keeps one stored event.
    expect(mockRecordEvent.mock.calls).toEqual([["demo_overview_shown"], ["demo_overview_shown"]]);
  });

  it("enters the deployed driver flow only after an explicit choice and resumes it before Start", () => {
    clearDemoPresentation();
    authenticateDemo();
    const first = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Попробовать самому" }));
    expect(screen.getByTestId("demo-scenario-entry")).toBeVisible();
    expect(mockRecordEvent.mock.calls).toEqual([["demo_overview_shown"], ["demo_driver_scenario_requested"]]);
    first.unmount();
    render(<App />);
    expect(screen.getByTestId("demo-scenario-entry")).toBeVisible();
    expect(screen.queryByTestId("demo-overview")).not.toBeInTheDocument();
    expect(mockRecordEvent).toHaveBeenCalledTimes(2);
  });

  it("opens the existing full cabinet/Tour before a shift and does not return to overview on reload", () => {
    clearDemoPresentation();
    authenticateDemo();
    const first = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Посмотреть настоящий кабинет" }));
    expect(mockRecordEvent.mock.calls).toEqual([["demo_overview_shown"], ["demo_cabinet_requested"]]);
    expect(screen.getByTestId("manual-demo-tour")).toBeVisible();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    first.unmount();
    render(<App />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("demo-overview")).not.toBeInTheDocument();
  });

  it("uses the existing registration handoff and resumes the cabinet when returning", () => {
    clearDemoPresentation();
    captureDemoRegistrationHandoff({ explicitEntry: true, search: "?utm_source=fixture&yclid=fixture" });
    authenticateDemo();
    const first = render(<App />);
    const link = screen.getByRole("link", { name: "Создать свою компанию" });
    const url = new URL(link.getAttribute("href")!);
    expect(url.origin + url.pathname).toBe("https://app.kontrolsmen.ru/register");
    expect(url.searchParams.get("registration_source")).toBe("demo");
    expect(url.searchParams.get("utm_source")).toBe("fixture");
    expect(url.searchParams.get("yclid")).toBe("fixture");
    expect(url.hash).toMatch(/^#demo_session=/);
    expect(mockRegistrationClick).not.toHaveBeenCalled();
    link.addEventListener("click", event => event.preventDefault(), { once: true });
    fireEvent.click(link);
    expect(mockRegistrationClick).toHaveBeenCalledTimes(1);
    expect(mockRecordEvent).toHaveBeenCalledExactlyOnceWith("demo_overview_shown");
    first.unmount();
    render(<App />);
    expect(screen.queryByTestId("demo-overview")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it.each(["active", "finished"] as const)("preserves an existing %s synthetic scenario without overview", status => {
    clearDemoPresentation();
    const shift = { ...createDemoScenarioShift({ driverId: 7, driverName: "Демо водитель", truckId: 11, truckName: "КамАЗ", siteId: 22, siteName: "Объект", odometerRequired: false, invoiceRequired: false }), status };
    const state = status === "finished" ? { activeShift: null, finishedShifts: [shift] } : { activeShift: shift, finishedShifts: [] };
    mockUseDemoSession.mockReturnValue(state);
    authenticateDemo();
    render(<App />);
    expect(screen.getByTestId("demo-scenario-entry")).toBeVisible();
    expect(screen.queryByTestId("demo-overview")).not.toBeInTheDocument();
    expect(mockUseDemoSession()).toEqual(state);
    expect(mockRecordEvent).not.toHaveBeenCalled();
  });

  it("resumes the full demo cabinet after leaving the owner result, including after reload", async () => {
    const shift = createDemoScenarioShift({ driverId: 7, driverName: "Демо водитель", truckId: 11, truckName: "КамАЗ", siteId: 22, siteName: "Объект", odometerRequired: false, invoiceRequired: false });
    writeDemoSession(localStorage, { activeShift: shift, finishedShifts: [] });
    mockUseDemoSession.mockReturnValue({ activeShift: shift, finishedShifts: [] });
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, error: null, clearError: vi.fn(), user: createDemoAdminUser() });
    const first = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Посмотреть кабинет подробнее" }));
    expect(screen.getByTestId("manual-demo-tour")).toBeInTheDocument();
    first.unmount();
    render(<App />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("demo-scenario-entry")).not.toBeInTheDocument();
    expect(screen.queryByTestId("manual-demo-tour")).not.toBeInTheDocument();
  });

  it("ignores remembered demo presentation for a real tenant", () => {
    const shift = createDemoScenarioShift({ driverId: 7, driverName: "Демо водитель", truckId: 11, truckName: "КамАЗ", siteId: 22, siteName: "Объект", odometerRequired: false, invoiceRequired: false });
    writeDemoSession(localStorage, { activeShift: shift, finishedShifts: [] });
    mockUseDemoSession.mockReturnValue({ activeShift: shift, finishedShifts: [] });
    rememberDemoPresentation("cabinet", shift.id);
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, error: null, clearError: vi.fn(), user: createNonDemoAdminUser() });
    render(<App />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("demo-scenario-entry")).not.toBeInTheDocument();
    expect(screen.queryByTestId("manual-demo-tour")).not.toBeInTheDocument();
  });

  it("shows login on protected root when auth is gone after logout", () => {
    render(<App />);

    expect(screen.getByText("Login screen")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("removes demoPersona on logout and does not restore it on guest rerender", async () => {
    localStorage.setItem("demoPersona", "driver");
    localStorage.setItem("keep_me", "1");

    const clearError = vi.fn();
    let authState = {
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError,
      user: {
        id: 999,
        full_name: "Demo Admin",
        role: "admin",
        tenant_id: 999,
      },
    };
    mockUseAuth.mockImplementation(() => authState);

    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Driver view")).toBeInTheDocument();
      expect(localStorage.getItem("demoPersona")).toBe("driver");
    });

    authState = {
      isAuthenticated: false,
      isLoading: false,
      error: null,
      clearError,
      user: null,
    };
    rerender(<App />);

    await waitFor(() => {
      expect(screen.getByText("Login screen")).toBeInTheDocument();
      expect(localStorage.getItem("demoPersona")).toBeNull();
      expect(localStorage.getItem("keep_me")).toBe("1");
    });

    rerender(<App />);

    await waitFor(() => {
      expect(localStorage.getItem("demoPersona")).toBeNull();
      expect(localStorage.getItem("keep_me")).toBe("1");
    });
  });

  it("allows demo persona to be saved again after explicit re-login", async () => {
    localStorage.setItem("demoPersona", "driver");

    const clearError = vi.fn();
    let authState = {
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError,
      user: {
        id: 999,
        full_name: "Demo Admin",
        role: "admin",
        tenant_id: 999,
      },
    };
    mockUseAuth.mockImplementation(() => authState);

    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(localStorage.getItem("demoPersona")).toBe("driver");
    });

    authState = {
      isAuthenticated: false,
      isLoading: false,
      error: null,
      clearError,
      user: null,
    };
    rerender(<App />);

    await waitFor(() => {
      expect(localStorage.getItem("demoPersona")).toBeNull();
    });

    authState = {
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError,
      user: {
        id: 999,
        full_name: "Demo Admin",
        role: "admin",
        tenant_id: 999,
      },
    };
    rerender(<App />);

    await waitFor(() => {
      expect(localStorage.getItem("demoPersona")).toBe("admin");
    });

    fireEvent.click(screen.getByRole("button", { name: "Попробовать самому" }));

    fireEvent.click(
      screen.getByRole("button", { name: "Switch demo persona to driver" })
    );

    await waitFor(() => {
      expect(localStorage.getItem("demoPersona")).toBe("driver");
    });
  });

  it("preserves driver persona through auth hydration into an authenticated demo session", async () => {
    localStorage.setItem("demoPersona", "driver");

    const clearError = vi.fn();
    let authState = {
      isAuthenticated: false,
      isLoading: true,
      error: null,
      clearError,
      user: null,
    };
    mockUseAuth.mockImplementation(() => authState);

    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(localStorage.getItem("demoPersona")).toBe("driver");
    });

    authState = {
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError,
      user: createDemoAdminUser(),
    };
    rerender(<App />);

    await waitFor(() => {
      expect(screen.getByText("Driver view")).toBeInTheDocument();
      expect(localStorage.getItem("demoPersona")).toBe("driver");
    });
  });

  it("resumes the chosen driver scenario and restores dashboard on return to admin", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError: vi.fn(),
      user: createDemoAdminUser(),
    });

    render(<App />);

    expect(screen.getByTestId("demo-scenario-entry")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByTestId("manual-demo-tour")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Посмотреть кабинет подробнее" }));
    expect(screen.getByTestId("manual-demo-tour")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("active-tab")).toHaveTextContent("dashboard");

    fireEvent.click(
      screen.getByRole("button", { name: "Switch demo persona to driver" })
    );

    await waitFor(() => {
      expect(screen.getByText("Driver view")).toBeInTheDocument();
      expect(screen.getByTestId("active-tab")).toHaveTextContent("my-shifts");
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Switch demo persona to admin" })
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.queryByText("Driver view")).not.toBeInTheDocument();
      expect(screen.getByTestId("active-tab")).toHaveTextContent("dashboard");
      expect(screen.getByTestId("admin-sidebar")).toBeInTheDocument();
    });
  });

  it("routes the initial guide action through the persona transition contract", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError: vi.fn(),
      user: createDemoAdminUser(),
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Посмотреть кабинет подробнее" }));

    fireEvent.click(
      screen.getByRole("button", { name: "Guide open driver" })
    );

    await waitFor(() => {
      expect(screen.getByText("Driver view")).toBeInTheDocument();
      expect(screen.getByTestId("active-tab")).toHaveTextContent("my-shifts");
    });
  });

  it("does not reset an admin tab or demo session when the active persona is clicked", async () => {
    const demoSession = JSON.stringify({
      version: 2,
      expiresAt: "2099-01-01T00:00:00.000Z",
      activeShift: { id: "demo-shift:preserved" },
      finishedShifts: [],
    });
    localStorage.setItem("logishift_demo_session_v2", demoSession);
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError: vi.fn(),
      user: createDemoAdminUser(),
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Посмотреть кабинет подробнее" }));
    fireEvent.click(screen.getByRole("button", { name: "Open shifts" }));

    expect(screen.getByTestId("active-tab")).toHaveTextContent("shifts");

    fireEvent.click(
      screen.getByRole("button", { name: "Switch demo persona to admin" })
    );

    expect(screen.getByTestId("active-tab")).toHaveTextContent("shifts");
    expect(localStorage.getItem("logishift_demo_session_v2")).toBe(demoSession);
  });

  it("opens the registry with the exact synthetic shift requested by the guide", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError: vi.fn(),
      user: createDemoAdminUser(),
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Посмотреть кабинет подробнее" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Guide show synthetic shift" })
    );

    expect(screen.getByTestId("active-tab")).toHaveTextContent("shifts");
    expect(await screen.findByTestId("shifts-focus-id")).toHaveTextContent(
      "demo-shift:from-guide"
    );
  });

  it("restores dashboard from a persisted driver persona after reload through the demo UI", async () => {
    localStorage.setItem("demoPersona", "driver");
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError: vi.fn(),
      user: createDemoAdminUser(),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Driver view")).toBeInTheDocument();
      expect(screen.getByTestId("active-tab")).toHaveTextContent("my-shifts");
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Switch demo persona to admin" })
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByTestId("active-tab")).toHaveTextContent("dashboard");
    });
  });

  it("keeps persona during loading, then cleans it up for the final guest state", async () => {
    localStorage.setItem("demoPersona", "driver");
    localStorage.setItem("keep_me", "1");

    const clearError = vi.fn();
    let authState = {
      isAuthenticated: false,
      isLoading: true,
      error: null,
      clearError,
      user: null,
    };
    mockUseAuth.mockImplementation(() => authState);

    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(localStorage.getItem("demoPersona")).toBe("driver");
    });

    authState = {
      isAuthenticated: false,
      isLoading: false,
      error: null,
      clearError,
      user: null,
    };
    rerender(<App />);

    await waitFor(() => {
      expect(screen.getByText("Login screen")).toBeInTheDocument();
      expect(localStorage.getItem("demoPersona")).toBeNull();
      expect(localStorage.getItem("keep_me")).toBe("1");
    });

    authState = {
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError,
      user: createDemoAdminUser(),
    };
    rerender(<App />);

    await waitFor(() => {
      expect(localStorage.getItem("demoPersona")).toBe("admin");
    });
  });

  it("removes demoPersona after hydration for an authenticated non-demo tenant", async () => {
    localStorage.setItem("demoPersona", "driver");

    const clearError = vi.fn();
    let authState = {
      isAuthenticated: false,
      isLoading: true,
      error: null,
      clearError,
      user: null,
    };
    mockUseAuth.mockImplementation(() => authState);

    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(localStorage.getItem("demoPersona")).toBe("driver");
    });

    authState = {
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError,
      user: createNonDemoAdminUser(),
    };
    rerender(<App />);

    await waitFor(() => {
      expect(localStorage.getItem("demoPersona")).toBeNull();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("keeps marketing root on landing even when apex has an auth state", () => {
    mockIsMarketingHostname.mockReturnValue(true);
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError: vi.fn(),
      user: createNonDemoAdminUser(),
    });

    render(<App />);

    expect(screen.getByText("Landing")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("does not render login on marketing /login and points to the app host", () => {
    mockIsMarketingHostname.mockReturnValue(true);
    window.history.replaceState({}, "", "/login");

    render(<App />);

    expect(screen.queryByText("Login screen")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Перейти вручную" })).toHaveAttribute(
      "href",
      "https://app.kontrolsmen.ru/login"
    );
  });

  it("does not render dashboard on marketing /dashboard and redirects to app root", () => {
    mockIsMarketingHostname.mockReturnValue(true);
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError: vi.fn(),
      user: createNonDemoAdminUser(),
    });
    window.history.replaceState({}, "", "/dashboard");

    render(<App />);

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Перейти вручную" })).toHaveAttribute(
      "href",
      "https://app.kontrolsmen.ru/"
    );
  });

  it("renders the owner tenant detail route for an authenticated session", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError: vi.fn(),
      user: createNonDemoAdminUser(),
    });
    window.history.replaceState({}, "", "/owner/tenants/42");

    render(<App />);

    expect(screen.getByText("Owner tenant detail 42")).toBeInTheDocument();
  });
});
