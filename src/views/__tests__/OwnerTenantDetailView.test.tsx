import { render, screen, waitFor } from "@testing-library/react";
import OwnerTenantDetailView from "../OwnerTenantDetailView";
import { ApiError, getOwnerTenantDetail } from "../../services/api";
import { OwnerTenantDetail } from "../../types";

vi.mock("../../services/api", async () => {
  const actual = await vi.importActual<typeof import("../../services/api")>("../../services/api");
  return { ...actual, getOwnerTenantDetail: vi.fn() };
});

const freeDetail: OwnerTenantDetail = {
  tenant: { id: 42, name: "Безопасный тенант", timezone: "Europe/Moscow" },
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
  recentAudit: [{
    id: 7,
    action: "OWNER_PILOT_GRANTED",
    entity: "pilot_entitlement",
    entityId: 8,
    createdAt: "2026-07-20T12:00:00.000Z",
  }],
};

const apiError = (status: number) => {
  const error = new Error("request failed") as ApiError;
  error.status = status;
  error.type = "SERVER" as ApiError["type"];
  return error;
};

describe("OwnerTenantDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOwnerTenantDetail).mockResolvedValue(freeDetail);
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
    expect(screen.getByRole("link", { name: "К списку тенантов" })).toHaveAttribute("href", "/owner");
  });

  it("renders paid and Pilot summaries without owner action controls", async () => {
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
    expect(screen.queryByRole("button", { name: /пилот|impersonation|войти/i })).not.toBeInTheDocument();
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
});
