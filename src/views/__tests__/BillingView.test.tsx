import { render, screen } from "@testing-library/react";
import BillingView from "../BillingView";
import { UserRole } from "../../types";

const mockRefreshBilling = vi.fn();

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      full_name: "Admin",
      role: UserRole.ADMIN,
      tenant_id: 1,
    },
  }),
}));

vi.mock("../../hooks/useTenantBillingSummary", () => ({
  useTenantBillingSummary: () => ({
    billing: {
      current_plan: {
        code: "free",
        name: "Бесплатный",
        status: "active",
      },
      effective_plan: {
        code: "free",
        name: "Бесплатный",
        limit_machines: 2,
        limit_drivers: 2,
        limit_sites: 2,
      },
      entitlement: {
        source: "free",
        status: "active",
        starts_at: null,
        expires_at: null,
      },
      usage: {
        drivers: { current: 3, limit: 2, over_limit: true },
        trucks: { current: 1, limit: 2, over_limit: false },
        sites: { current: 1, limit: 2, over_limit: false },
      },
    },
    isLoading: false,
    error: null,
    refreshBilling: mockRefreshBilling,
  }),
}));

vi.mock("../../services/api", async () => {
  const actual = await vi.importActual<typeof import("../../services/api")>(
    "../../services/api"
  );

  return {
    ...actual,
    getBillingPayments: vi.fn().mockResolvedValue([]),
    createBillingCheckout: vi.fn(),
  };
});

describe("BillingView UX copy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshBilling.mockResolvedValue(null);
  });

  it("uses user-facing payment status copy and refresh button label", async () => {
    render(<BillingView />);

    expect(await screen.findByRole("button", { name: /Проверить статус/ })).toBeInTheDocument();
    expect(
      screen.getByText(/После оплаты статус тарифа обновится автоматически/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Фронтенд не подтверждает оплату сам/)).not.toBeInTheDocument();
    expect(screen.queryByText(/backend/)).not.toBeInTheDocument();
    expect(screen.getByText(/Источник:/)).toBeInTheDocument();
    expect(screen.getAllByText("Бесплатный")).toHaveLength(2);
    expect(screen.getByText("Без срока")).toBeInTheDocument();
    expect(screen.getByText("Превышен лимит")).toBeInTheDocument();
  });
});
