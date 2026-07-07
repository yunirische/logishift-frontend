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

vi.mock("../components/Login", () => ({
  default: () => <div>Login screen</div>,
}));

vi.mock("../components/Layout", () => ({
  default: ({
    children,
    setDemoPersona,
  }: {
    children: React.ReactNode;
    setDemoPersona?: (persona: "admin" | "driver") => void;
  }) => (
    <div>
      <button type="button" onClick={() => setDemoPersona?.("driver")}>
        Switch demo persona
      </button>
      {children}
    </div>
  ),
}));

vi.mock("../components/Dashboard", () => ({
  default: () => <div>Dashboard</div>,
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

    fireEvent.click(screen.getByRole("button", { name: "Switch demo persona" }));

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
});
