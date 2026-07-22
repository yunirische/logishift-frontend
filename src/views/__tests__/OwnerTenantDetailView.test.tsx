import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OwnerTenantDetailView from "../OwnerTenantDetailView";
import {
  ApiError,
  endOwnerPilot,
  extendOwnerPilot,
  getOwnerTenantDetail,
  grantOwnerPilot,
} from "../../services/api";
import { OwnerTenantDetail } from "../../types";

vi.mock("../../services/api", async () => {
  const actual = await vi.importActual<typeof import("../../services/api")>("../../services/api");
  return {
    ...actual,
    getOwnerTenantDetail: vi.fn(),
    grantOwnerPilot: vi.fn(),
    extendOwnerPilot: vi.fn(),
    endOwnerPilot: vi.fn(),
  };
});

const freeDetail: OwnerTenantDetail = {
  tenant: { id: 42, name: "Безопасный тенант", timezone: "Europe/Moscow" },
  health: { stage: "working", label: "Работает", lastActivityAt: "2026-07-20T12:00:00.000Z", attentionCount: 2 },
  attention: [
    { code: "STUCK_SHIFTS", severity: "critical", title: "Есть проблемные смены", description: "Требуют проверки: 1." },
    { code: "INVITE_EXPIRING", severity: "warning", title: "Скоро истекут приглашения", description: "Приглашений с истекающим сроком: 1." },
  ],
  storedPlan: { id: 1, code: "free", name: "Free", limitMachines: 2, limitDrivers: 2, limitSites: 2 },
  effectiveEntitlement: {
    source: "free",
    status: "active",
    startsAt: null,
    expiresAt: null,
    plan: { id: 1, code: "free", name: "Free", limitMachines: 2, limitDrivers: 2, limitSites: 2 },
  },
  usage: {
    drivers: { current: 1, limit: 2, overLimit: false },
    trucks: { current: 2, limit: 2, overLimit: false },
    sites: { current: 3, limit: 2, overLimit: true },
  },
  shifts: { active: 4, finished: 5, stuck: 1 },
  usersSummary: { total: 3, admins: 1, foremen: 1, drivers: 1, other: 0 },
  users: [{ id: 1, name: "Иван", role: "driver", roleLabel: "Водитель", hasEmail: true, hasTelegram: false, activityAt: null }],
  resources: { trucks: { total: 2, active: 2, busy: 1 }, sites: { total: 3, active: 2 } },
  recentTrucks: [{ id: 1, name: "КАМАЗ", plate: "А123АА", active: true, busy: true }],
  recentSites: [{ id: 1, name: "Объект", active: true }],
  recentShifts: [{
    id: 1, status: "finished", statusLabel: "Завершена", driverName: "Иван", truckName: "КАМАЗ", siteName: "Объект",
    startedAt: "2026-07-20T08:00:00.000Z", endedAt: "2026-07-20T10:00:00.000Z", updatedAt: "2026-07-20T10:00:00.000Z",
    hasStartPhoto: true, hasEndPhoto: true, hasInvoicePhoto: false, hasComment: true, durationWarning: false,
  }],
  invitesSummary: { pending: 1, accepted: 2, revoked: 1, expired: 0, expiringSoon: 1 },
  pilot: null,
  billing: {
    activePaidSubscription: null,
    recentPayments: [{
      id: 10,
      status: "paid",
      plan: { code: "business", name: "Бизнес" },
      amount: 1990,
      currency: "RUB",
      periodMonths: 1,
      paidAt: "2026-07-20T12:00:00.000Z",
      canceledAt: null,
      createdAt: "2026-07-20T11:00:00.000Z",
    }],
  },
  attribution: { utmSource: "direct", utmCampaign: "launch", utmTerm: "shifts" },
  timeline: [{ id: "audit-7", type: "audit", title: "Пилот выдан", description: null, occurredAt: "2026-07-20T12:00:00.000Z" }],
};

const apiError = (status: number) => {
  const error = new Error("request failed") as ApiError;
  error.status = status;
  error.type = "SERVER" as ApiError["type"];
  return error;
};

const activePilotDetail: OwnerTenantDetail = {
  ...freeDetail,
  pilot: {
    status: "active",
    plan: { code: "start", name: "Старт" },
    startsAt: "2026-07-10T12:00:00.000Z",
    expiresAt: "2026-08-10T12:00:00.000Z",
    revokedAt: null,
    sourceChannel: "direct",
    version: 1,
  },
};

describe("OwnerTenantDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOwnerTenantDetail).mockResolvedValue(freeDetail);
    vi.mocked(grantOwnerPilot).mockResolvedValue({} as never);
    vi.mocked(extendOwnerPilot).mockResolvedValue({} as never);
    vi.mocked(endOwnerPilot).mockResolvedValue({} as never);
  });

  it("loads and renders a safe Free tenant detail", async () => {
    render(<OwnerTenantDetailView tenantId={42} />);

    expect(screen.getByText("Загрузка тенанта")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Безопасный тенант" })).toBeInTheDocument();
    expect(getOwnerTenantDetail).toHaveBeenCalledWith(42);
    expect(screen.getByText("Бесплатный")).toBeInTheDocument();
    expect(screen.getByText("Пилот не выдан.")).toBeInTheDocument();
    expect(screen.getByText("Превышен лимит")).toBeInTheDocument();
    expect(screen.getByText("Активные")).toBeInTheDocument();
    expect(screen.getByText("Завершённые")).toBeInTheDocument();
    expect(screen.getByText("Проблемные")).toBeInTheDocument();
    expect(screen.getByText("Работает")).toBeInTheDocument();
    expect(screen.getByText("Требует внимания")).toBeInTheDocument();
    expect(screen.getByText("Есть проблемные смены")).toBeInTheDocument();
    expect(screen.getByText(/Администраторы: 1, диспетчеры: 1, водители: 1/)).toBeInTheDocument();
    expect(screen.getByText("Завершена")).toBeInTheDocument();
    expect(screen.getByText("Истекает скоро")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "К списку тенантов" })).toHaveAttribute("href", "/owner");
  });

  it("copies a sanitized tenant summary", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<OwnerTenantDetailView tenantId={42} />);
    await screen.findByRole("heading", { name: "Безопасный тенант" });

    fireEvent.click(screen.getByRole("button", { name: "Скопировать сводку" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain("Компания: Безопасный тенант");
    expect(writeText.mock.calls[0][0]).not.toContain("direct");
    expect(writeText.mock.calls[0][0]).not.toContain("shifts");
    expect(screen.getByRole("button", { name: "Сводка скопирована" })).toBeInTheDocument();
  });

  it("renders paid and Pilot summaries without impersonation", async () => {
    vi.mocked(getOwnerTenantDetail).mockResolvedValue({
      ...freeDetail,
      effectiveEntitlement: {
        source: "paid",
        status: "active",
        startsAt: null,
        expiresAt: "2026-08-20T12:00:00.000Z",
        plan: { id: 2, code: "business", name: "Бизнес", limitMachines: 10, limitDrivers: 10, limitSites: 10 },
      },
      pilot: {
        status: "active",
        plan: { code: "start", name: "Старт" },
        startsAt: "2026-07-10T12:00:00.000Z",
        expiresAt: "2026-08-10T12:00:00.000Z",
        revokedAt: null,
        sourceChannel: "direct",
        version: 1,
      },
      billing: {
        ...freeDetail.billing,
        activePaidSubscription: {
          plan: { code: "business", name: "Бизнес" },
          expiresAt: "2026-08-20T12:00:00.000Z",
        },
      },
    });

    render(<OwnerTenantDetailView tenantId={42} />);

    expect(await screen.findByText("Оплаченный")).toBeInTheDocument();
    expect(screen.getByText("Активен")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Продлить" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Завершить" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /impersonation|войти/i })).not.toBeInTheDocument();
  });

  it("renders an effective Pilot entitlement", async () => {
    vi.mocked(getOwnerTenantDetail).mockResolvedValue({
      ...freeDetail,
      effectiveEntitlement: {
        source: "pilot",
        status: "active",
        startsAt: "2026-07-10T12:00:00.000Z",
        expiresAt: "2026-08-10T12:00:00.000Z",
        plan: { id: 3, code: "start", name: "Старт", limitMachines: 5, limitDrivers: 5, limitSites: 5 },
      },
      pilot: {
        status: "active",
        plan: { code: "start", name: "Старт" },
        startsAt: "2026-07-10T12:00:00.000Z",
        expiresAt: "2026-08-10T12:00:00.000Z",
        revokedAt: null,
        sourceChannel: "direct",
        version: 1,
      },
    });

    render(<OwnerTenantDetailView tenantId={42} />);

    expect(await screen.findByText("Пилотный")).toBeInTheDocument();
    expect(screen.getAllByText("Старт (start)")).toHaveLength(2);
  });

  it.each([
    [403, "Нет доступа к данным тенанта"],
    [404, "Тенант не найден"],
  ])("renders a safe %i error state", async (status, title) => {
    vi.mocked(getOwnerTenantDetail).mockRejectedValue(apiError(status));

    render(<OwnerTenantDetailView tenantId={42} />);

    expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "К списку тенантов" })).toHaveAttribute("href", "/owner");
  });

  it("does not render forbidden detail fields even if an unexpected payload includes them", async () => {
    vi.mocked(getOwnerTenantDetail).mockResolvedValue({
      ...freeDetail,
      email: "must-not-render@example.test",
      full_name: "must-not-render",
      yclid: "must-not-render",
      raw_payload: "must-not-render",
    } as unknown as OwnerTenantDetail);

    const { container } = render(<OwnerTenantDetailView tenantId={42} />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Безопасный тенант" })).toBeInTheDocument());

    expect(container.textContent).not.toContain("must-not-render");
    expect(container.textContent).not.toContain("email");
    expect(container.textContent).not.toContain("yclid");
    expect(container.textContent).not.toContain("raw_payload");
  });

  it("validates Grant and uses default 30 days with selected plan and source", async () => {
    render(<OwnerTenantDetailView tenantId={42} />);
    await screen.findByRole("heading", { name: "Безопасный тенант" });
    fireEvent.click(screen.getByRole("button", { name: "Выдать пилот" }));

    expect((screen.getByLabelText("Срок") as HTMLSelectElement).value).toBe("30");
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    expect(await screen.findByText("Причина должна содержать от 3 до 500 символов.")).toBeInTheDocument();
    expect(grantOwnerPilot).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Тариф"), { target: { value: "company" } });
    fireEvent.change(screen.getByLabelText("Источник"), { target: { value: "referral" } });
    fireEvent.change(screen.getByLabelText("Причина"), { target: { value: "  После демонстрации  " } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));

    await waitFor(() => expect(grantOwnerPilot).toHaveBeenCalledTimes(1));
    expect(grantOwnerPilot).toHaveBeenCalledWith(
      42,
      { planCode: "company", durationDays: 30, sourceChannel: "referral", reason: "После демонстрации" },
      expect.stringMatching(/^[0-9a-f-]{36}$/i)
    );
  });

  it("submits Extend and End only from an active Pilot", async () => {
    vi.mocked(getOwnerTenantDetail).mockResolvedValue(activePilotDetail);
    const { rerender } = render(<OwnerTenantDetailView tenantId={42} />);
    await screen.findByRole("button", { name: "Продлить" });

    fireEvent.click(screen.getByRole("button", { name: "Продлить" }));
    fireEvent.change(screen.getByLabelText("Причина"), { target: { value: "Есть обратная связь" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(extendOwnerPilot).toHaveBeenCalledTimes(1));
    expect(extendOwnerPilot).toHaveBeenCalledWith(42, { durationDays: 30, reason: "Есть обратная связь" }, expect.any(String));

    rerender(<OwnerTenantDetailView tenantId={42} />);
    fireEvent.click(await screen.findByRole("button", { name: "Завершить" }));
    expect(screen.getByText("Подтвердите завершение текущего пилота.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Причина"), { target: { value: "Пилот завершён" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить завершение" }));
    await waitFor(() => expect(endOwnerPilot).toHaveBeenCalledTimes(1));
    expect(endOwnerPilot).toHaveBeenCalledWith(42, { reason: "Пилот завершён" }, expect.any(String));
  });

  it("blocks double submit and retains the same key for an exact network retry", async () => {
    let rejectFirstRequest: ((error: Error) => void) | null = null;
    vi.mocked(grantOwnerPilot)
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectFirstRequest = reject; }) as never)
      .mockResolvedValueOnce({} as never);
    render(<OwnerTenantDetailView tenantId={42} />);
    await screen.findByRole("button", { name: "Выдать пилот" });
    fireEvent.click(screen.getByRole("button", { name: "Выдать пилот" }));
    fireEvent.change(screen.getByLabelText("Причина"), { target: { value: "После встречи" } });
    const confirm = screen.getByRole("button", { name: "Подтвердить" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(grantOwnerPilot).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Подтвердить" })).toBeDisabled();
    rejectFirstRequest?.(new Error("network failed"));
    expect(await screen.findByRole("button", { name: "Повторить запрос" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Повторить запрос" }));

    await waitFor(() => expect(grantOwnerPilot).toHaveBeenCalledTimes(2));
    expect(vi.mocked(grantOwnerPilot).mock.calls[1][2]).toBe(
      vi.mocked(grantOwnerPilot).mock.calls[0][2]
    );
  });

  it("uses a new idempotency key after a final conflict", async () => {
    vi.mocked(grantOwnerPilot)
      .mockRejectedValueOnce(apiError(409))
      .mockRejectedValueOnce(apiError(409));
    render(<OwnerTenantDetailView tenantId={42} />);
    await screen.findByRole("button", { name: "Выдать пилот" });
    fireEvent.click(screen.getByRole("button", { name: "Выдать пилот" }));
    fireEvent.change(screen.getByLabelText("Причина"), { target: { value: "После встречи" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    expect(await screen.findByText(/Действие невозможно/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));

    await waitFor(() => expect(grantOwnerPilot).toHaveBeenCalledTimes(2));
    expect(vi.mocked(grantOwnerPilot).mock.calls[1][2]).not.toBe(
      vi.mocked(grantOwnerPilot).mock.calls[0][2]
    );
  });

  it("refreshes detail after a successful Pilot action without optimistic state", async () => {
    vi.mocked(getOwnerTenantDetail)
      .mockResolvedValueOnce(freeDetail)
      .mockResolvedValueOnce(activePilotDetail);
    render(<OwnerTenantDetailView tenantId={42} />);
    await screen.findByRole("button", { name: "Выдать пилот" });
    fireEvent.click(screen.getByRole("button", { name: "Выдать пилот" }));
    fireEvent.change(screen.getByLabelText("Причина"), { target: { value: "После демонстрации" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));

    await waitFor(() => expect(getOwnerTenantDetail).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("button", { name: "Продлить" })).toBeInTheDocument();
    expect(screen.getByText("Данные пилота обновлены.")).toBeInTheDocument();
  });

  it.each([1, 999])("hides Pilot actions for protected tenant %i", async (protectedTenantId) => {
    vi.mocked(getOwnerTenantDetail).mockResolvedValue({
      ...freeDetail,
      tenant: { ...freeDetail.tenant, id: protectedTenantId },
    });
    render(<OwnerTenantDetailView tenantId={protectedTenantId} />);

    await screen.findByRole("heading", { name: "Безопасный тенант" });
    expect(screen.getByText("Защищённый тенант")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /выдать пилот|продлить|завершить/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/impersonation/i)).not.toBeInTheDocument();
  });
});
