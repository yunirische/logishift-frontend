import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OwnerDashboardView from "../OwnerDashboardView";
import {
  getOwnerInternalOverview,
  getOwnerSummary,
  getOwnerSystem,
  getOwnerTenants,
} from "../../services/api";
import { OwnerInternalOverview, OwnerSummary } from "../../types";

vi.mock("../../services/api", async () => {
  const actual = await vi.importActual<typeof import("../../services/api")>(
    "../../services/api"
  );

  return {
    ...actual,
    getOwnerInternalOverview: vi.fn(),
    getOwnerSummary: vi.fn(),
    getOwnerSystem: vi.fn(),
    getOwnerTenants: vi.fn(),
  };
});

const summary: OwnerSummary = {
  backend: {
    packageVersion: "1.0.0",
    buildId: "build",
  },
  database: {
    connected: true,
  },
  counts: {
    tenants: 2,
    users: 5,
    active_shifts: 1,
    stuck_shifts: 0,
    user_consents: 4,
    invites: 2,
    password_reset_tokens: 0,
  },
  billing: {
    payments_by_status: { pending: 1 },
    provider_events_by_status: {},
    provider_events_with_error: 0,
  },
  latest: {
    tenant_id: 2,
    user_id: 5,
    shift_updated_at: null,
    billing_payment_created_at: null,
    provider_event_received_at: null,
    consent_accepted_at: null,
    invite_expires_at: null,
    reset_token_created_at: null,
  },
};

const overview: OwnerInternalOverview = {
  generatedAt: "2026-07-07T12:00:00.000Z",
  window: "24h",
  baseline: {
    backend: "f12e0040b41e07bbf1f4f5626ede35ee1f73f833",
    frontend: "a5251073220c75610dd08f27338146c31000cf95",
  },
  health: {
    api: "ok",
    db: "ok",
    systemSnapshot: "unknown",
  },
  totals: {
    tenants: 2,
    users: 5,
    activeShifts: 1,
    stuckShifts: 0,
  },
  activity: {
    invitesCreated: null,
    invitesAccepted: 1,
    shiftsCreated: 2,
    shiftsStarted: 1,
    shiftsFinished: 1,
    shiftsCancelled: 0,
    billingCheckouts: 0,
    paymentsSucceeded: 0,
    paymentsCanceled: 0,
    auditEvents: 3,
  },
  funnel: {
    tenantsTotal: 2,
    tenantsWithUsers: 2,
    tenantsWithInvites: 1,
    tenantsWithShifts: 1,
    tenantsWithFinishedShift: 1,
    tenantsWithBillingPayment: 0,
  },
  audit: {
    count: 3,
    byAction: { SHIFT_STARTED: 1 },
    recent: [
      {
        time: "2026-07-07T11:00:00.000Z",
        action: "SHIFT_STARTED",
        tenantId: 2,
        entity: "shift",
        entityId: 10,
        summary: "Смена начата",
      },
    ],
  },
  billing: {
    paymentsByStatus: {},
    providerEventsByStatus: {},
    providerEventsWithError: 0,
  },
  attribution: {
    demoSuccesses: 2,
    registrations: 1,
    lastDemoAt: "2026-07-07T11:30:00.000Z",
    lastRegistrationAt: "2026-07-07T10:30:00.000Z",
    rows: [
      {
        eventType: "demo_entry_success",
        utmSource: "yandex",
        utmCampaign: "summer",
        utmTerm: "shift control",
        count: 2,
      },
    ],
    recentAttributionEvents: [
      {
        eventType: "demo_entry_success",
        occurredAt: "2026-07-07T11:30:00.000Z",
        utmSource: "yandex",
        utmCampaign: "summer",
        utmTerm: "очень-длинный-utm-term-который-должен-переноситься-и-не-ломать-страницу",
      },
      {
        eventType: "tenant_registered",
        occurredAt: "2026-07-07T10:30:00.000Z",
        utmSource: null,
        utmCampaign: null,
        utmTerm: null,
      },
    ],
  },
  risks: [],
};

const tenantRow = {
  id: 42,
  name: "Safe tenant",
  plan: { code: "free", name: "Free" },
  subscription_expires_at: null,
  subscription_status: "expired" as const,
  counts: { users: 1, trucks: 1, sites: 1, active_shifts: 0, stuck_shifts: 0 },
  health: { stage: "ready_for_first_shift" as const, label: "Готов к первой смене", lastActivityAt: null, attentionCount: 1 },
};

describe("OwnerDashboardView internal overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOwnerSummary).mockResolvedValue(summary);
    vi.mocked(getOwnerTenants).mockResolvedValue([]);
    vi.mocked(getOwnerSystem).mockRejectedValue(new Error("disabled"));
    vi.mocked(getOwnerInternalOverview).mockResolvedValue(overview);
  });

  it("renders internal status and activity with honest labels", async () => {
    render(<OwnerDashboardView />);

    expect(await screen.findByText("Статус и активность")).toBeInTheDocument();
    expect(getOwnerInternalOverview).toHaveBeenCalledWith("24h");
    expect(screen.getAllByText("Компании всего").length).toBeGreaterThan(0);
    expect(screen.getByText("Пользователи всего")).toBeInTheDocument();
    expect(screen.getByText("Инвайты за период")).toBeInTheDocument();
    expect(screen.getByText("Смены за период")).toBeInTheDocument();
    expect(screen.getByText("Созданы: не отслеживается, приняты: 1")).toBeInTheDocument();
    expect(screen.getByText("Последние события")).toBeInTheDocument();
    expect(screen.getByText("SHIFT_STARTED")).toBeInTheDocument();
    expect(screen.getByText("Смена начата")).toBeInTheDocument();
    expect(screen.getByText("Рекламная атрибуция")).toBeInTheDocument();
    expect(screen.getAllByText("yandex").length).toBeGreaterThan(0);
    expect(screen.getByText(/Последний вход: 07\.07\.2026, \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.getByText(/Последняя регистрация: 07\.07\.2026, \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.getByText("Последние входы и регистрации")).toBeInTheDocument();
    expect(screen.getByText("Вход в демо")).toBeInTheDocument();
    expect(screen.getByText("Регистрация")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText("очень-длинный-utm-term-который-должен-переноситься-и-не-ломать-страницу")).toBeInTheDocument();
    expect(screen.queryByText(/Метрика/i)).not.toBeInTheDocument();
  });

  it("switches overview windows", async () => {
    render(<OwnerDashboardView />);

    await screen.findByText("Статус и активность");
    fireEvent.click(screen.getByRole("button", { name: "1ч" }));

    await waitFor(() => {
      expect(getOwnerInternalOverview).toHaveBeenLastCalledWith("1h");
    });

    fireEvent.click(screen.getByRole("button", { name: "7д" }));

    await waitFor(() => {
      expect(getOwnerInternalOverview).toHaveBeenLastCalledWith("7d");
    });
  });

  it("renders empty and error states safely", async () => {
    vi.mocked(getOwnerInternalOverview).mockResolvedValueOnce({
      ...overview,
      audit: { count: 0, byAction: {}, recent: [] },
      attribution: {
        ...overview.attribution,
        lastDemoAt: null,
        lastRegistrationAt: null,
        recentAttributionEvents: [],
      },
    });

    const { rerender } = render(<OwnerDashboardView />);

    expect(await screen.findByText("За выбранный период событий нет.")).toBeInTheDocument();
    expect(screen.getByText("Последний вход: нет")).toBeInTheDocument();
    expect(screen.getByText("Последняя регистрация: нет")).toBeInTheDocument();
    expect(screen.getByText("За выбранный период входов и регистраций нет.")).toBeInTheDocument();

    vi.mocked(getOwnerInternalOverview).mockRejectedValueOnce(new Error("failed"));
    fireEvent.click(screen.getByRole("button", { name: "1ч" }));

    expect(await screen.findByText("Статус и активность временно недоступны.")).toBeInTheDocument();

    rerender(<OwnerDashboardView />);
    expect(screen.queryByText(/password_hash|reset token|invite code/i)).not.toBeInTheDocument();
  });

  it("provides row and explicit navigation to a tenant detail", async () => {
    vi.mocked(getOwnerTenants).mockResolvedValue([tenantRow]);

    render(<OwnerDashboardView />);

    expect(await screen.findByRole("link", { name: "Открыть" })).toHaveAttribute(
      "href",
      "/owner/tenants/42"
    );
    expect(screen.getByRole("link", { name: "Открыть тенант Safe tenant" })).toBeInTheDocument();
    expect(screen.getByText("Готов к первой смене")).toBeInTheDocument();
  });
});
