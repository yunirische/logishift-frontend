import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EditShiftModal from "../EditShiftModal";
import { API_ENDPOINTS } from "../../constants";

const { mockApiGet, mockApiPatch, mockApiPost, mockGetUserInfo } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPatch: vi.fn(),
  mockApiPost: vi.fn(),
  mockGetUserInfo: vi.fn(),
}));

vi.mock("../../config/demo", () => ({
  isDemoTenantId: vi.fn((tenantId?: number) => tenantId === 999),
}));

vi.mock("../../services/api", () => ({
  default: {
    get: mockApiGet,
    patch: mockApiPatch,
    post: mockApiPost,
  },
  getUserInfo: mockGetUserInfo,
  openShiftFilePreview: vi.fn(),
}));

const baseShift = {
  id: 101,
  status: "finished",
  driver_name: "Иван Петров",
  truck_name: "КамАЗ 65115",
  site_name: "ЖК Северный",
  start_time: "2026-06-28T05:00:00.000Z",
  end_time: "2026-06-28T13:30:00.000Z",
  hours_worked: 8.5,
  salary: 5525,
  is_excluded: false,
  comment: "",
};

describe("EditShiftModal demo mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({ timezone: "Europe/Moscow", invoice_required: true });
    mockGetUserInfo.mockReturnValue({
      id: 999,
      tenant_id: 999,
      role: "admin",
      current_state: "idle",
      full_name: "Демо Администратор",
    });
  });

  it("disables visible admin mutation actions in demo mode with explanatory text", async () => {
    render(
      <EditShiftModal
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        shift={{ ...baseShift, status: "active", end_time: undefined } as any}
        timezone="Europe/Moscow"
        timezoneLoaded
      />
    );

    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());
    const actionButtons = screen.getAllByTitle("В демо-режиме изменение данных недоступно");
    expect(actionButtons.length).toBeGreaterThan(0);
    actionButtons.forEach((button) => expect(button).toBeDisabled());
    expect(screen.getByText("В демо-режиме изменение данных недоступно")).toBeInTheDocument();
  });
});

describe("EditShiftModal company time", () => {
  const now = new Date("2026-10-20T13:37:59.900Z");
  const activeShift = {
    ...baseShift,
    id: 14,
    status: "active",
    start_time: "2026-10-16T07:06:00.000Z",
    end_time: undefined,
    requires_odo_start: false,
    requires_odo_end: false,
    requires_invoice: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Keep real async timers; only freeze the clock used by dayjs/Date.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    mockApiGet.mockResolvedValue({ invoice_required: false });
    mockApiPatch.mockResolvedValue({});
    mockGetUserInfo.mockReturnValue({ id: 4, tenant_id: 1, role: "admin" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const openShift = async (shift = activeShift, timezone = "Europe/Moscow", timezoneLoaded = true) => {
    mockApiGet.mockImplementation((endpoint: string) => Promise.resolve(
      endpoint === API_ENDPOINTS.GET_SHIFT(shift.id)
        ? shift
        : { timezone, invoice_required: false }
    ));
    render(
      <EditShiftModal
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        shift={shift as any}
        timezone={timezone}
        timezoneLoaded={timezoneLoaded}
      />
    );
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());
    return {
      start: screen.getByLabelText(/Время начала/) as HTMLInputElement,
      end: screen.getByLabelText(/Время окончания/) as HTMLInputElement,
      save: screen.getByRole("button", { name: "Сохранить изменения" }),
      companyNow: screen.getByRole("button", { name: "Сейчас по компании" }),
    };
  };

  it.each([
    ["Europe/Moscow", "2026-10-16T10:06", "2026-10-20T16:37", "20.10.2026 16:37"],
    ["Asia/Yekaterinburg", "2026-10-16T12:06", "2026-10-20T18:37", "20.10.2026 18:37"],
  ])("uses %s wall-clock values for defaults, bounds, Now and close payload", async (timezone, startTime, companyTime, displayTime) => {
    const { start, end, save, companyNow } = await openShift(activeShift, timezone);

    expect(start).toHaveValue(startTime);
    expect(start.min).toBe("");
    expect(start.max).toBe(companyTime);
    expect(end).toHaveValue("");
    expect(end.min).toBe(startTime);
    expect(end.max).toBe(companyTime);
    expect(screen.getByText(`Сейчас в компании (${timezone}): ${displayTime}`)).toBeInTheDocument();

    fireEvent.click(companyNow);
    expect(end).toHaveValue(companyTime);
    expect(end.validity.valid).toBe(true);
    expect(end).toHaveAttribute("aria-invalid", "false");
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() => expect(mockApiPatch).toHaveBeenCalledWith(
      API_ENDPOINTS.UPDATE_SHIFT(14),
      { end_time: companyTime, tenant_timezone: timezone }
    ));
  });

  it("rejects 18:37 interpreted as Moscow time when company now is 16:37", async () => {
    const { end, save } = await openShift();
    fireEvent.change(end, { target: { value: "2026-10-20T18:37" } });

    expect(end.validity.rangeOverflow).toBe(true);
    expect(end).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Не может быть позже текущего времени компании (Europe/Moscow)")).toBeInTheDocument();
    expect(save).toBeDisabled();
    // Also exercise the application guard independently of native validation.
    fireEvent.submit(end.closest("form")!);
    await waitFor(() => expect(screen.getByText(/⚠️ Время окончания не может быть позже/)).toBeInTheDocument());
    expect(mockApiPatch).not.toHaveBeenCalled();
  });

  it("updates max with Now across a minute boundary", async () => {
    const { end, companyNow, save } = await openShift();
    expect(end.max).toBe("2026-10-20T16:37");
    vi.setSystemTime(new Date("2026-10-20T13:38:00.100Z"));
    fireEvent.click(companyNow);

    expect(end).toHaveValue("2026-10-20T16:38");
    expect(end.max).toBe("2026-10-20T16:38");
    expect(end.validity.valid).toBe(true);
    expect(save).toBeEnabled();
    expect(screen.getByText("Сейчас в компании (Europe/Moscow): 20.10.2026 16:38")).toBeInTheDocument();
  });

  it("allows closing a shift older than five days without moving its minimum", async () => {
    const { end, save, companyNow } = await openShift({
      ...activeShift,
      start_time: "2026-10-01T07:06:00.000Z",
    });
    expect(end.min).toBe("2026-10-01T10:06");
    fireEvent.click(companyNow);
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(mockApiPatch).toHaveBeenCalledWith(
      API_ENDPOINTS.UPDATE_SHIFT(14),
      { end_time: "2026-10-20T16:37", tenant_timezone: "Europe/Moscow" }
    ));
  });

  it.each(["2026-10-16T10:05", "2026-10-16T10:06"])("rejects end %s at or before start", async (endTime) => {
    const { end, save } = await openShift();
    fireEvent.change(end, { target: { value: endTime } });
    expect(screen.getByText("Должно быть позже начала")).toBeInTheDocument();
    expect(save).toBeDisabled();
    expect(mockApiPatch).not.toHaveBeenCalled();
  });

  it("keeps company defaults and sends the existing times endpoint for a finished shift", async () => {
    const { end, save } = await openShift({
      ...activeShift,
      status: "finished",
      end_time: "2026-10-17T09:00:00.000Z",
    } as any);
    expect(end).toHaveValue("2026-10-17T12:00");
    fireEvent.change(end, { target: { value: "2026-10-18T12:00" } });
    fireEvent.click(save);
    await waitFor(() => expect(mockApiPatch).toHaveBeenCalledWith(
      API_ENDPOINTS.UPDATE_SHIFT_TIMES(14),
      { end_time: "2026-10-18T12:00", tenant_timezone: "Europe/Moscow" }
    ));
  });

  it("explains native picker timezone differences only when needed", async () => {
    await openShift();
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTimezone !== "Europe/Moscow") {
      expect(screen.getByText(`Ваше устройство: ${browserTimezone}, компания: Europe/Moscow. Используйте время компании.`)).toBeInTheDocument();
      expect(screen.getByText(/Календарь устройства не учитывает часовой пояс компании/)).toBeInTheDocument();
    } else {
      expect(screen.queryByText(/Ваше устройство:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Календарь устройства не учитывает/)).not.toBeInTheDocument();
    }
  });

  it("keeps Now disabled until the company timezone is loaded", async () => {
    const { companyNow } = await openShift(activeShift, "Europe/Moscow", false);
    expect(companyNow).toBeDisabled();
    expect(screen.queryByText(/Сейчас в компании/)).not.toBeInTheDocument();
  });
});
