import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Layout from "../Layout";
import { SUPPORT_EMAIL, PUBLIC_LEGAL_LINKS } from "../../config/legal";
import { UserRole } from "../../types";

const { mockGetUserInfo, mockClearAuth } = vi.hoisted(() => ({
  mockGetUserInfo: vi.fn(),
  mockClearAuth: vi.fn(),
}));

vi.mock("../../services/api", () => ({
  default: {
    getUserInfo: mockGetUserInfo,
    clearAuth: mockClearAuth,
  },
}));

vi.mock("../../config/demo", () => ({
  isDemoHostname: vi.fn(() => false),
  isDemoTenantId: vi.fn(() => false),
  getDemoAppUrl: vi.fn(),
  getProductionAppUrl: vi.fn(),
}));

vi.mock("../BrandLogo", () => ({
  default: () => <div>Brand</div>,
}));

vi.mock("../DemoBanner", () => ({
  default: () => <div>Demo banner</div>,
}));

const renderLayout = (role: UserRole) => {
  mockGetUserInfo.mockReturnValue({
    id: 1,
    tenant_id: 16,
    full_name: role === UserRole.ADMIN ? "Админ Тест" : "Водитель Тест",
    role,
    current_state: "idle",
  });

  return render(
    <Layout activeTab="my-shifts" setActiveTab={vi.fn()}>
      <div>Page content</div>
    </Layout>
  );
};

describe("Authenticated legal navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });
});
