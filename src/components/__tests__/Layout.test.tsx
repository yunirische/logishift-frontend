import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Layout from "../Layout";
import { SUPPORT_EMAIL, PUBLIC_LEGAL_LINKS } from "../../config/legal";
import { UserRole } from "../../types";
import {
  APP_DEMO_PERSONA_KEY,
  DEMO_PERSONA_KEY,
  EXPLICIT_DEMO_LOGOUT_KEY,
  demoActiveShiftKey,
} from "../../config/demo";

const { mockUseAuth, mockIsDemoHostname, mockIsDemoTenantId } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockIsDemoHostname: vi.fn(() => false),
  mockIsDemoTenantId: vi.fn(() => false),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../config/demo", () => ({
  APP_DEMO_PERSONA_KEY: "demoPersona",
  DEMO_PERSONA_KEY: "logishift_demo_persona_driver_id",
  EXPLICIT_DEMO_LOGOUT_KEY: "explicit_demo_logout",
  demoActiveShiftKey: (personaId: number | null) =>
    personaId == null
      ? "logishift_active_shift_demo"
      : `logishift_active_shift_demo_${personaId}`,
  isDemoHostname: mockIsDemoHostname,
  isDemoTenantId: mockIsDemoTenantId,
  getDemoAppUrl: vi.fn(),
  getProductionAppUrl: vi.fn(),
}));

vi.mock("../BrandLogo", () => ({
  default: () => <div>Brand</div>,
}));

vi.mock("../DemoBanner", () => ({
  default: () => <div>Demo banner</div>,
}));

vi.mock("../DemoProductTour", () => ({
  default: ({
    onStartDriverScenario,
  }: {
    onStartDriverScenario: () => void;
  }) => (
    <div data-testid="demo-product-tour">
      <button type="button" onClick={onStartDriverScenario}>
        Start driver scenario
      </button>
    </div>
  ),
}));

const renderLayout = (role: UserRole) => {
  mockUseAuth.mockReturnValue({
    logout: vi.fn(),
    user: {
      id: 1,
      tenant_id: 16,
      full_name: role === UserRole.ADMIN ? "Админ Тест" : "Водитель Тест",
      role,
      current_state: "idle",
    },
  });

  return render(
    <Layout activeTab="my-shifts" setActiveTab={vi.fn()}>
      <div>Page content</div>
    </Layout>
  );
};

const DemoDriverLayoutHarness = () => {
  const [activeTab, setActiveTab] = useState("my-shifts");
  const [demoPersona, setDemoPersona] = useState<"admin" | "driver">(
    "driver"
  );

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      demoPersona={demoPersona}
      setDemoPersona={setDemoPersona}
    >
      <div>Page content</div>
    </Layout>
  );
};

describe("Authenticated legal navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDemoHostname.mockReturnValue(false);
    mockIsDemoTenantId.mockReturnValue(false);
  });

  it("does not render the old authenticated legal footer and toggles the sidebar menu for drivers", async () => {
    const user = userEvent.setup();
    renderLayout(UserRole.DRIVER);

    const trigger = screen.getByRole("button", {
      name: /Документы и поддержка/i,
    });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.queryByText(SUPPORT_EMAIL)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: PUBLIC_LEGAL_LINKS[0].label })
    ).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("authenticated-legal-menu-panel")).toBeInTheDocument();
    PUBLIC_LEGAL_LINKS.forEach((item) => {
      expect(screen.getByRole("link", { name: item.label })).toHaveAttribute(
        "href",
        item.href
      );
    });
    expect(screen.getByRole("link", { name: SUPPORT_EMAIL })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:")
    );
    expect(
      screen.getByRole("link", { name: /Написать в поддержку/i })
    ).toHaveAttribute("href");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByTestId("authenticated-legal-menu-panel")
    ).not.toBeInTheDocument();
  });

  it("shows the same legal sidebar access point for admins", () => {
    renderLayout(UserRole.ADMIN);

    expect(
      screen.getByRole("button", { name: /Документы и поддержка/i })
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(SUPPORT_EMAIL)).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("demo-scenario-guide")
    ).not.toBeInTheDocument();
  });

  it("shows the product tour before the scenario guide for the demo tenant", async () => {
    const user = userEvent.setup();
    mockIsDemoHostname.mockReturnValue(true);
    mockIsDemoTenantId.mockReturnValue(true);
    mockUseAuth.mockReturnValue({
      logout: vi.fn(),
      user: {
        id: 1,
        tenant_id: 999,
        full_name: "Админ Тест",
        role: UserRole.ADMIN,
        current_state: "idle",
      },
    });

    render(
      <Layout
        activeTab="dashboard"
        setActiveTab={vi.fn()}
        demoPersona="admin"
        setDemoPersona={vi.fn()}
      >
        <div>Page content</div>
      </Layout>
    );

    expect(screen.getByTestId("demo-product-tour")).toBeInTheDocument();
    expect(screen.queryByTestId("demo-scenario-guide")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Start driver scenario" })
    );

    expect(screen.queryByTestId("demo-product-tour")).not.toBeInTheDocument();
    expect(screen.getByTestId("demo-scenario-guide")).toBeInTheDocument();
  });

  it("shows the workday entry in the demo admin menu", () => {
    mockIsDemoHostname.mockReturnValue(true);
    mockIsDemoTenantId.mockReturnValue(true);
    mockUseAuth.mockReturnValue({
      logout: vi.fn(),
      user: {
        id: 1,
        tenant_id: 999,
        full_name: "Админ Тест",
        role: UserRole.ADMIN,
        current_state: "idle",
      },
    });

    render(
      <Layout
        activeTab="dashboard"
        setActiveTab={vi.fn()}
        demoPersona="admin"
        setDemoPersona={vi.fn()}
      >
        <div>Page content</div>
      </Layout>
    );

    expect(
      screen.getByRole("button", { name: "Мой рабочий день" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Своя смена, в том числе у администратора")
    ).toBeInTheDocument();
  });

  it("shows the driver workday entry in demo driver mode", () => {
    mockIsDemoHostname.mockReturnValue(true);
    mockIsDemoTenantId.mockReturnValue(true);
    mockUseAuth.mockReturnValue({
      logout: vi.fn(),
      user: {
        id: 1,
        tenant_id: 999,
        full_name: "Админ Тест",
        role: UserRole.ADMIN,
        current_state: "idle",
      },
    });

    render(
      <Layout
        activeTab="my-shifts"
        setActiveTab={vi.fn()}
        demoPersona="driver"
        setDemoPersona={vi.fn()}
      >
        <div>Page content</div>
      </Layout>
    );

    expect(
      screen.getByRole("button", { name: "Мой рабочий день" })
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Своя смена, в том числе у администратора")
    ).not.toBeInTheDocument();
    expect(screen.getByText("Интерфейс водителя")).toBeInTheDocument();
    expect(screen.getByText("Демо-персона")).toBeInTheDocument();
  });

  it("returns a demo driver to the admin dashboard without restarting the tour", async () => {
    const user = userEvent.setup();
    mockIsDemoHostname.mockReturnValue(true);
    mockIsDemoTenantId.mockReturnValue(true);
    mockUseAuth.mockReturnValue({
      logout: vi.fn(),
      user: {
        id: 1,
        tenant_id: 999,
        full_name: "Админ Тест",
        role: UserRole.ADMIN,
        current_state: "idle",
      },
    });

    render(<DemoDriverLayoutHarness />);

    expect(screen.getByText("Интерфейс водителя")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Вернуться к администратору" })
    );

    expect(screen.getByRole("heading", { name: "Главная" })).toBeInTheDocument();
    expect(screen.getByText("Админ Тест")).toBeInTheDocument();
    expect(screen.getByText("Администратор")).toBeInTheDocument();
    expect(screen.getByTestId("demo-scenario-guide")).toBeInTheDocument();
    expect(screen.queryByTestId("demo-product-tour")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Посмотреть, как водитель отмечает смену",
      })
    ).toBeVisible();
  });

  it("keeps the real admin workday menu entry unchanged", () => {
    renderLayout(UserRole.ADMIN);

    expect(
      screen.getByRole("button", { name: "Мой рабочий день" })
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Своя смена, в том числе у администратора")
    ).not.toBeInTheDocument();
  });

  it("uses the unified logout flow for demo logout", async () => {
    const user = userEvent.setup();
    const logout = vi.fn();

    mockIsDemoHostname.mockReturnValue(true);
    mockIsDemoTenantId.mockReturnValue(true);
    mockUseAuth.mockReturnValue({
      logout,
      user: {
        id: 1,
        tenant_id: 999,
        full_name: "Админ Тест",
        role: UserRole.ADMIN,
        current_state: "idle",
      },
    });

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    localStorage.setItem(APP_DEMO_PERSONA_KEY, "driver");
    localStorage.setItem(DEMO_PERSONA_KEY, "77");
    localStorage.setItem(demoActiveShiftKey(77), JSON.stringify({ id: 500 }));
    sessionStorage.setItem(EXPLICIT_DEMO_LOGOUT_KEY, "1");

    render(
      <Layout activeTab="dashboard" setActiveTab={vi.fn()}>
        <div>Page content</div>
      </Layout>
    );

    await user.click(screen.getByRole("button", { name: /выйти из системы/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(logout).toHaveBeenCalledWith({
      redirectToLogin: true,
      markExplicitDemoLogout: true,
    });
  });
});
