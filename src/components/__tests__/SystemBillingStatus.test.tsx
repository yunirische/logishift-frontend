import { render, screen } from "@testing-library/react";
import System from "../System";

const { mockApiGet, mockRefreshBilling } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockRefreshBilling: vi.fn(),
}));

vi.mock("../../services/api", () => ({
  default: { get: mockApiGet, patch: vi.fn() },
  getAnalyticsUsage: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../hooks/useTenantBillingSummary", () => ({
  useTenantBillingSummary: () => ({
    billing: {
      current_plan: { code: "business", name: "Бизнес" },
      effective_plan: {
        code: "demo_internal",
        name: "Внутренний",
        limit_machines: -1,
        limit_drivers: -1,
        limit_sites: -1,
      },
      entitlement: {
        source: "internal_demo",
        status: "active",
        starts_at: null,
        expires_at: null,
      },
      usage: {
        drivers: { current: 3, limit: 2, over_limit: true },
        trucks: { current: 1, limit: -1, over_limit: false },
        sites: { current: 1, limit: -1, over_limit: false },
      },
    },
    refreshBilling: mockRefreshBilling,
  }),
}));

describe("System effective billing status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({ name: "Компания", timezone: "Europe/Moscow" });
    mockRefreshBilling.mockResolvedValue(null);
  });

  it("uses effective entitlement, backend usage, and no false expiry", async () => {
    render(<System />);

    expect((await screen.findAllByText("Внутренний"))).toHaveLength(2);
    expect(screen.getByText("Действует")).toBeInTheDocument();
    expect(screen.getByText("Без срока")).toBeInTheDocument();
    expect(screen.getByText("Превышен лимит")).toBeInTheDocument();
    expect(screen.queryByText("Активна")).not.toBeInTheDocument();
  });
});
