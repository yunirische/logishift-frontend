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
  });
});
