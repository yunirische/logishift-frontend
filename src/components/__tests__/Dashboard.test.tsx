import { render, screen, waitFor, within } from "@testing-library/react";
import Dashboard from "../Dashboard";

const {
  mockApiGet,
  mockGetCurrentShift,
  mockGetAnalyticsUsage,
  mockRefreshBillingSummary,
  mockSetUserInfo,
} = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockGetCurrentShift: vi.fn(),
  mockGetAnalyticsUsage: vi.fn(),
  mockRefreshBillingSummary: vi.fn(),
  mockSetUserInfo: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      full_name: "Admin",
      role: "admin",
      current_state: "idle",
      tenant_id: 1,
    },
  }),
}));

vi.mock("../../hooks/useTenantBillingSummary", () => ({
  useTenantBillingSummary: () => ({
    billing: { current_plan: { name: "Старт" } },
    isLoading: false,
    refreshBilling: mockRefreshBillingSummary,
  }),
}));

vi.mock("../../services/api", () => ({
  default: {
    get: mockApiGet,
    setUserInfo: mockSetUserInfo,
  },
  getCurrentShift: mockGetCurrentShift,
  getAnalyticsUsage: mockGetAnalyticsUsage,
}));

vi.mock("../ManualShiftModal", () => ({
  default: () => <div>Manual shift modal</div>,
}));

describe("Dashboard onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshBillingSummary.mockResolvedValue(null);
    mockGetCurrentShift.mockResolvedValue(null);
    mockGetAnalyticsUsage.mockResolvedValue({
      trucks: { current: 1, limit: 5, utilization_percent: 20 },
      drivers: { current: 0, limit: 5, utilization_percent: 0 },
      sites: { current: 1, limit: 5, utilization_percent: 20 },
    });
    mockApiGet.mockResolvedValue({
      activeShifts: 0,
      totalShifts: 1,
      activeDrivers: 0,
      activeShiftsDetails: [],
    });
  });

  it("marks the first-shift onboarding step complete when totalShifts exists but activeShifts is zero", async () => {
    render(<Dashboard />);

    await screen.findByText("Начните работу за 4 шага");

    expect(screen.getByText("Активные смены").previousElementSibling).toHaveTextContent("0");

    const firstShiftStep = screen
      .getByText("Проверьте первую смену в реестре")
      .closest("div");
    expect(firstShiftStep).not.toBeNull();
    expect(within(firstShiftStep as HTMLElement).getByText("Шаг уже выполнен.")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalled();
    });
  });
});
