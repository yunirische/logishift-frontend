import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OwnerTraffic from "../OwnerTraffic";
import { getOwnerTraffic } from "../../services/api";
import type { OwnerTrafficReport, TrafficMetrics } from "../../types";
vi.mock("../../services/api", () => ({ getOwnerTraffic: vi.fn() }));
const metrics: TrafficMetrics = {
  sessions: 10, landing: 8, demo: 4, engagedDemo: 2, registration: 3, tenants: 1,
  convertedSessions: 1, demoClicks: 5, registrationClicks: 2, landingToDemo: 50,
  landingToRegistration: 25, landingToTenant: 12.5, registrationToTenant: 33.3, sessionToTenant: 10,
};
const report: OwnerTrafficReport = {
  window: "24h", generatedAt: "2026-10-20T00:00:00Z",
  requestedStart: "2026-10-19T00:00:00Z", effectiveStart: "2026-10-19T05:41:08.271251Z",
  cohortStart: "2026-10-19T05:41:08.271251Z", external: metrics,
  internal: { ...metrics, sessions: 99 }, unlinkedRegistrations: 2,
  segments: [{ ...metrics, source: "vk", medium: "cpc", campaign: "core_active_30d", content: "creative_01" },
    { ...metrics, source: "vk", medium: "cpc", campaign: "core_active_30d", content: "creative_02" }],
};
describe("OwnerTraffic", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(getOwnerTraffic).mockResolvedValue(report); });
  it("renders all externally supplied attribution strings as text, never HTML", async () => {
    const attribution = {
      source: '<img data-utm-injected="source" src=x onerror="alert(1)">',
      medium: '<svg data-utm-injected="medium" onload="alert(1)"></svg>',
      campaign: '<script data-utm-injected="campaign">alert(1)</script>',
      content: '<a data-utm-injected="content" href="javascript:alert(1)">creative</a>',
    };
    vi.mocked(getOwnerTraffic).mockResolvedValue({ ...report, segments: [{ ...metrics, ...attribution }] });
    const { container } = render(<OwnerTraffic />);
    await screen.findByText("Внешние сессии");
    for (const value of Object.values(attribution)) expect(container.textContent).toContain(value);
    expect(container.querySelector("[data-utm-injected], img, svg, script, a")).toBeNull();
  });
  it("shows five headline metrics, campaign creatives, cohort caveat and separate diagnostics", async () => {
    const { container } = render(<OwnerTraffic />);
    expect(await screen.findByText("Внешние сессии")).toBeInTheDocument();
    expect(container.querySelector("dl")?.children).toHaveLength(5);
    expect(screen.getByText("creative_01")).toBeInTheDocument();
    expect(screen.getByText("creative_02")).toBeInTheDocument();
    expect(screen.getByText(/Период ограничен запуском/)).toBeInTheDocument();
    expect(screen.getByText(/Исключены внутренние сессии: 99/).closest("details")).not.toHaveAttribute("open");
    expect(container.textContent).not.toMatch(/landing_viewed|tenant_registered|unique visitors/);
  });
  it("switches periods and ignores late results from the previous period", async () => {
    let resolveOld!: (value: OwnerTrafficReport) => void;
    vi.mocked(getOwnerTraffic).mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    render(<OwnerTraffic />);
    fireEvent.click(screen.getByRole("button", { name: "7 дней" }));
    await screen.findByText("creative_01");
    resolveOld({ ...report, segments: [] });
    await waitFor(() => expect(getOwnerTraffic).toHaveBeenLastCalledWith("7d"));
    expect(screen.getByText("creative_01")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    await waitFor(() => expect(getOwnerTraffic).toHaveBeenLastCalledWith("30d"));
  });
  it("shows errors instead of stale or zero metrics and supports retry", async () => {
    vi.mocked(getOwnerTraffic).mockRejectedValueOnce(new Error("unavailable"));
    render(<OwnerTraffic />);
    expect(await screen.findByRole("alert")).toHaveTextContent("временно недоступна");
    expect(screen.queryByText("Внешние сессии")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Обновить статистику" }));
    await screen.findByText("Внешние сессии");
  });
  it("explains empty observations without claiming no traffic", async () => {
    vi.mocked(getOwnerTraffic).mockResolvedValue({ ...report, external: { ...metrics, sessions: 0, landingToTenant: null }, segments: [] });
    render(<OwnerTraffic />);
    expect(await screen.findByText(/не доказывает отсутствие посещений/)).toBeInTheDocument();
  });
});
