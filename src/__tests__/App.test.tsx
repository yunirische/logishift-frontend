import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../App";
import React from "react";

const {
  mockUseAuth,
  mockIsDemoHostname,
  mockIsDemoTenantId,
  mockIsMarketingHostname,
  mockIsProductionAppHostname,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockIsDemoHostname: vi.fn(),
  mockIsDemoTenantId: vi.fn(),
  mockIsMarketingHostname: vi.fn(),
  mockIsProductionAppHostname: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

vi.mock("../context/DemoSessionContext", () => ({
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
  }: {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    demoPersona?: "admin" | "driver";
    setDemoPersona?: (persona: "admin" | "driver") => void;
    showDemoShiftInRegistry?: (shiftId: string) => void;
  }) => (
    <div>
      <div data-testid="active-tab">{activeTab}</div>
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
  default: ({ focusDemoShiftId }: { focusDemoShiftId?: string | null }) => (
    <div data-testid="shifts-focus-id">{focusDemoShiftId || "none"}</div>
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

vi.mock("../services/navigation", () => ({
  replaceLocation: vi.fn(),
}));

vi.mock("../components/AnalyticsConsent", () => ({
  default: () => null,
}));

vi.mock("../config/demo", () => ({
  APP_DEMO_PERSONA_KEY: "demoPersona",
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

  it("opens the driver scenario from dashboard and restores dashboard on return to admin", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError: vi.fn(),
      user: createDemoAdminUser(),
    });

    render(<App />);

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
