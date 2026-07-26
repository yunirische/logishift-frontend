import { render, screen, waitFor, within } from "@testing-library/react";
import Dashboard from "../Dashboard";

const {
  mockApiGet,
  mockGetCurrentShift,
  mockGetAnalyticsUsage,
  mockRefreshBillingSummary,
  mockSetUserInfo,
  mockUseAuth,
  mockUseDemoSession,
} = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockGetCurrentShift: vi.fn(),
  mockGetAnalyticsUsage: vi.fn(),
  mockRefreshBillingSummary: vi.fn(),
  mockSetUserInfo: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUseDemoSession: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../context/DemoSessionContext", () => ({
  useDemoSession: () => mockUseDemoSession(),
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
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        full_name: "Admin",
        role: "admin",
        current_state: "idle",
        tenant_id: 1,
      },
    });
    mockUseDemoSession.mockReturnValue({
      activeShift: null,
      finishedShifts: [],
    });
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

describe("Dashboard demo session projection", () => {
  const activeShift = {
    id: "demo-shift:test",
    driverId: 77,
    driverName: "Демо Водитель",
    truckId: 12,
    truckName: "КамАЗ",
    siteId: 31,
    siteName: "Склад",
    startedAt: "2026-07-26T10:00:00.000Z",
    finishedAt: null,
    status: "active",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        full_name: "Admin",
        role: "admin",
        current_state: "idle",
        tenant_id: 999,
      },
    });
    mockUseDemoSession.mockReturnValue({
      activeShift,
      finishedShifts: [],
    });
    mockRefreshBillingSummary.mockResolvedValue(null);
    mockGetCurrentShift.mockResolvedValue(null);
    mockGetAnalyticsUsage.mockResolvedValue({
      trucks: { current: 1, limit: 5, utilization_percent: 20 },
      drivers: { current: 1, limit: 5, utilization_percent: 20 },
      sites: { current: 1, limit: 5, utilization_percent: 20 },
    });
  });

  it("adds the visitor synthetic shift without replacing seeded server rows", async () => {
    mockApiGet.mockResolvedValue({
      activeShifts: 1,
      totalShifts: 5,
      activeDrivers: 1,
      activeShiftsDetails: [
        {
          driver_name: "Seeded Driver",
          truck_name: "MAN",
          site_name: "База",
          start_time: "2026-07-26T09:00:00.000Z",
        },
      ],
    });

    render(<Dashboard />);

    expect(await screen.findByText("Демонстрационная смена")).toBeInTheDocument();
    expect(screen.getByText(/Демо Водитель — КамАЗ — Склад/)).toBeInTheDocument();
    expect(screen.getByText(/Seeded Driver — MAN — База/)).toBeInTheDocument();
    expect(
      screen.getAllByText("Активные смены")[0].previousElementSibling
    ).toHaveTextContent("2");
  });

  it("does not double-count an already matching active detail", async () => {
    mockApiGet.mockResolvedValue({
      activeShifts: 1,
      totalShifts: 5,
      activeDrivers: 1,
      activeShiftsDetails: [
        {
          driver_name: activeShift.driverName,
          truck_name: activeShift.truckName,
          site_name: activeShift.siteName,
          start_time: activeShift.startedAt,
        },
      ],
    });

    render(<Dashboard />);

    await screen.findByText(/Демо Водитель — КамАЗ — Склад/);
    expect(
      screen.getAllByText("Активные смены")[0].previousElementSibling
    ).toHaveTextContent("1");
    expect(screen.queryByText("Демонстрационная смена")).not.toBeInTheDocument();
  });
});
