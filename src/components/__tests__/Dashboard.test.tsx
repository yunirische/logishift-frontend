import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  default: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Manual shift modal">
      <button onClick={onClose}>Закрыть</button>
    </div>
  ),
}));

vi.mock("../../views/DriverView", () => ({
  DriverView: () => <div>Driver workspace</div>,
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
    render(<Dashboard onNavigate={vi.fn()} />);

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

  it.each([
    ["Добавьте объект работы", "objects"],
    ["Добавьте машину или технику", "fleet"],
    ["Пригласите водителя", "drivers"],
    ["Проверьте первую смену в реестре", "shifts"],
  ])("navigates an incomplete %s step to %s", async (label, tab) => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    mockGetAnalyticsUsage.mockResolvedValue({
      trucks: { current: 0, limit: 5, utilization_percent: 0 },
      drivers: { current: 0, limit: 5, utilization_percent: 0 },
      sites: { current: 0, limit: 5, utilization_percent: 0 },
    });
    mockApiGet.mockResolvedValue({
      activeShifts: 0,
      totalShifts: 0,
      activeDrivers: 0,
      activeShiftsDetails: [],
    });

    render(<Dashboard onNavigate={onNavigate} />);

    await screen.findByText("Начните работу за 4 шага");
    await user.click(screen.getByRole("button", { name: label }));

    expect(onNavigate).toHaveBeenCalledWith(tab);
  });

  it("keeps a completed onboarding step non-interactive", async () => {
    render(<Dashboard onNavigate={vi.fn()} />);

    await screen.findByText("Начните работу за 4 шага");

    expect(
      screen.queryByRole("button", { name: "Проверьте первую смену в реестре" })
    ).not.toBeInTheDocument();
    const firstShiftStep = screen
      .getByText("Проверьте первую смену в реестре")
      .closest("div");
    expect(firstShiftStep).not.toBeNull();
    expect(
      within(firstShiftStep as HTMLElement).getByText("Шаг уже выполнен.")
    ).toBeInTheDocument();
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

    render(<Dashboard onNavigate={vi.fn()} />);

    expect(await screen.findByText("Демонстрационная смена")).toBeInTheDocument();
    expect(screen.getByText(/Демо Водитель — КамАЗ — Склад/)).toBeInTheDocument();
    expect(screen.getByText(/Seeded Driver — MAN — База/)).toBeInTheDocument();
    expect(
      screen.getAllByText("Активные смены")[0].previousElementSibling
    ).toHaveTextContent("2");
  });

  it("uses the clarified manual-shift action without changing its availability", async () => {
    mockApiGet.mockResolvedValue({
      activeShifts: 0,
      totalShifts: 0,
      activeDrivers: 0,
      activeShiftsDetails: [],
    });

    render(<Dashboard onNavigate={vi.fn()} />);

    expect(
      await screen.findByRole("button", { name: "Создать смену за водителя" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Создать смену вручную" })
    ).not.toBeInTheDocument();
  });

  it("keeps an identical seeded row and projects the synthetic identity exactly once", async () => {
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

    const view = render(<Dashboard onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getAllByText(/Демо Водитель — КамАЗ — Склад/)
      ).toHaveLength(2);
    });
    expect(
      screen.getAllByText("Активные смены")[0].previousElementSibling
    ).toHaveTextContent("2");
    expect(screen.getByText("Демонстрационная смена")).toBeInTheDocument();

    view.rerender(<Dashboard onNavigate={vi.fn()} />);
    expect(
      screen.getAllByText(/Демо Водитель — КамАЗ — Склад/)
    ).toHaveLength(2);
    expect(
      screen.getAllByText("Активные смены")[0].previousElementSibling
    ).toHaveTextContent("2");
  });
});


describe("Dashboard density and preserved behavior", () => {
  const stats = {
    activeShifts: 3,
    activeDrivers: 2,
    totalShifts: 7,
    activeShiftsDetails: [{
      id: 12,
      driver_name: "Иван Петров",
      truck_name: "КАМАЗ",
      site_name: "Карьер",
      start_time: "2026-10-09T05:12:22.000Z",
    }],
  };
  const usage = {
    trucks: { current: 2, limit: 2, utilization_percent: 100 },
    drivers: { current: 1, limit: 2, utilization_percent: 50 },
    sites: { current: 2, limit: 2, utilization_percent: 100 },
  };
  const comesBefore = (first: Element, second: Element) =>
    Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: {
      id: 4, full_name: "Admin", role: "admin", current_state: "idle", tenant_id: 1,
    } });
    mockUseDemoSession.mockReturnValue({ activeShift: null, finishedShifts: [] });
    mockGetCurrentShift.mockResolvedValue(null);
    mockRefreshBillingSummary.mockResolvedValue(null);
    mockGetAnalyticsUsage.mockResolvedValue(usage);
    mockApiGet.mockResolvedValue(stats);
  });

  it("renders two distinct metrics with the server values and keeps action outside the summary", async () => {
    render(<Dashboard onNavigate={vi.fn()} />);
    const summary = await screen.findByRole("group", { name: "Сводка смен" });
    expect(summary.children).toHaveLength(2);
    expect(within(summary).getByText("Активные смены").previousElementSibling).toHaveTextContent("3");
    expect(within(summary).getByText("Водителей на смене").previousElementSibling).toHaveTextContent("2");
    expect(within(summary).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("+")).not.toBeInTheDocument();
  });

  it.each(["admin", "foreman"])("preserves the create-shift modal for %s", async (role) => {
    mockUseAuth.mockReturnValue({ user: {
      id: 4, role, current_state: "idle", tenant_id: 1,
    } });
    const user = userEvent.setup({ delay: null });
    render(<Dashboard onNavigate={vi.fn()} />);
    await user.click(await screen.findByRole("button", { name: "Создать смену за водителя" }));
    const modal = await screen.findByRole("dialog", { name: "Manual shift modal" });
    await user.click(within(modal).getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("preserves the driver workspace without admin summary, action or limits", async () => {
    mockUseAuth.mockReturnValue({ user: {
      id: 8, role: "driver", current_state: "idle", tenant_id: 1,
    } });
    render(<Dashboard onNavigate={vi.fn()} />);
    await screen.findByText("Driver workspace");
    expect(screen.queryByRole("group", { name: "Сводка смен" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Создать смену за водителя" })).not.toBeInTheDocument();
    expect(screen.queryByText("Лимиты тарифа")).not.toBeInTheDocument();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("orders a working dashboard as summary, action, active shifts, limits", async () => {
    render(<Dashboard onNavigate={vi.fn()} />);
    const summary = await screen.findByRole("group", { name: "Сводка смен" });
    const action = screen.getByRole("button", { name: "Создать смену за водителя" });
    const active = screen.getByRole("heading", { name: "Активные смены" });
    const limits = screen.getByRole("heading", { name: "Лимиты тарифа" });
    expect(comesBefore(summary, action)).toBe(true);
    expect(comesBefore(action, active)).toBe(true);
    expect(comesBefore(active, limits)).toBe(true);
    expect(screen.queryByText("Начните работу за 4 шага")).not.toBeInTheDocument();
    expect(screen.getByText("Иван Петров — КАМАЗ — Карьер")).toBeInTheDocument();
    expect(screen.getByText("В работе")).toBeInTheDocument();
  });

  it.each(["sites", "trucks", "drivers", "firstShift"])("keeps incomplete %s onboarding before active shifts and limits", async (missing) => {
    if (missing === "firstShift") mockApiGet.mockResolvedValue({ ...stats, totalShifts: 0 });
    else mockGetAnalyticsUsage.mockResolvedValue({ ...usage, [missing]: { current: 0, limit: 2 } });
    render(<Dashboard onNavigate={vi.fn()} />);
    const onboarding = await screen.findByRole("heading", { name: "Начните работу за 4 шага" });
    expect(comesBefore(screen.getByRole("button", { name: "Создать смену за водителя" }), onboarding)).toBe(true);
    expect(comesBefore(onboarding, screen.getByRole("heading", { name: "Активные смены" }))).toBe(true);
    expect(comesBefore(onboarding, screen.getByRole("heading", { name: "Лимиты тарифа" }))).toBe(true);
  });

  it("keeps limits available without adding an active-shifts section for an empty list", async () => {
    mockApiGet.mockResolvedValue({ ...stats, activeShifts: 0, activeShiftsDetails: [] });
    render(<Dashboard onNavigate={vi.fn()} />);
    await screen.findByRole("heading", { name: "Лимиты тарифа" });
    expect(screen.queryByRole("heading", { name: "Активные смены" })).not.toBeInTheDocument();
  });

  it("preserves three limit values, full-limit warning colors, progress and tariff badge", async () => {
    render(<Dashboard onNavigate={vi.fn()} />);
    await screen.findByRole("heading", { name: "Лимиты тарифа" });
    for (const label of ["Машины", "Водители", "Объекты"]) expect(screen.getByText(label)).toBeInTheDocument();
    const full = screen.getAllByText("2 / 2");
    expect(full).toHaveLength(2);
    for (const value of full) {
      expect(value).toHaveClass("text-orange-500");
      const progress = value.parentElement!.nextElementSibling!.firstElementChild;
      expect(progress).toHaveClass("bg-orange-500");
      expect(progress).toHaveStyle({ width: "100%" });
    }
    expect(screen.getByText("1 / 2")).toHaveClass("text-slate-800");
    expect(screen.getByText("Старт")).toBeInTheDocument();
  });

  it.each([-1, 0])("preserves the %s limit state", async (limit) => {
    mockGetAnalyticsUsage.mockResolvedValue({ ...usage, trucks: { current: 2, limit } });
    render(<Dashboard onNavigate={vi.fn()} />);
    const value = await screen.findByText(limit === -1 ? "2 / ∞" : "2 / 0");
    const progress = value.parentElement!.nextElementSibling!.firstElementChild;
    expect(progress).toHaveStyle({ width: limit === -1 ? "100%" : "0%" });
    expect(progress).toHaveClass(limit === -1 ? "bg-slate-300" : "bg-[#0a192f]");
  });

  it("keeps refresh wired to stats, usage and billing", async () => {
    const user = userEvent.setup({ delay: null });
    render(<Dashboard onNavigate={vi.fn()} />);
    const refresh = await screen.findByRole("button", { name: "Обновить статистику" });
    const initial = mockApiGet.mock.calls.length;
    await user.click(refresh);
    await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(initial + 1));
    expect(mockGetAnalyticsUsage).toHaveBeenCalledTimes(initial + 1);
    expect(mockRefreshBillingSummary).toHaveBeenCalledTimes(initial + 1);
  });

  it("handles unavailable usage without inventing limits or onboarding", async () => {
    mockGetAnalyticsUsage.mockRejectedValue(new Error("Unavailable"));
    render(<Dashboard onNavigate={vi.fn()} />);
    await screen.findByRole("heading", { name: "Лимиты тарифа" });
    expect(screen.queryByText("Машины")).not.toBeInTheDocument();
    expect(screen.queryByText("Начните работу за 4 шага")).not.toBeInTheDocument();
  });
});
