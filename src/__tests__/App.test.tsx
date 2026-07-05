import { render, screen } from "@testing-library/react";
import App from "../App";
import React from "react";

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

vi.mock("../components/Login", () => ({
  default: () => <div>Login screen</div>,
}));

vi.mock("../components/Layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

vi.mock("../components/AnalyticsConsent", () => ({
  default: () => null,
}));

vi.mock("../config/demo", () => ({
  APP_DEMO_PERSONA_KEY: "demoPersona",
  isDemoHostname: vi.fn(() => true),
  isDemoTenantId: vi.fn(() => false),
  isMarketingHostname: vi.fn(() => false),
  isProductionAppHostname: vi.fn(() => false),
}));

describe("App protected routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/");
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
});
