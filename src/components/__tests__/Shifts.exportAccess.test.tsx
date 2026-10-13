import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Shifts from "../Shifts";
import { API_ENDPOINTS } from "../../constants";

const { getBilling, getUser, getApi } = vi.hoisted(() => ({ getBilling: vi.fn(), getUser: vi.fn(), getApi: vi.fn() }));
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const downloadedNames: string[] = [];
vi.mock("../../services/api", () => ({
  default: { get: getApi, getUserInfo: getUser, getAuthToken: () => "fixture-token" },
  getTenantBilling: getBilling,
  openShiftFilePreview: vi.fn(),
}));
vi.mock("../../context/DemoSessionContext", () => ({
  useDemoSession: () => ({ activeShift: null, finishedShifts: [], getDemoPhotoPreview: vi.fn() }),
}));

const summary = (allowed: boolean, code = "free", source = "free", status = "active") => ({
  current_plan: { code }, stored_plan: { code }, effective_plan: { code },
  entitlement: { source, status }, report_exports: { excel: allowed, photos_zip: allowed },
});
const excel = () => screen.getByRole("button", { name: /Выгрузить в Excel/ });
const zip = () => screen.getByRole("button", { name: /Выгрузить фото ZIP/ });
const ready = async () => { await screen.findByRole("heading", { name: "Реестр смен" }); };
const deferred = () => {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>(done => { resolve = done; });
  return { promise, resolve };
};

beforeEach(() => {
  vi.resetAllMocks();
  downloadedNames.length = 0;
  getUser.mockReturnValue({ id: 10, tenant_id: 20, role: "admin" });
  getBilling.mockResolvedValue(summary(false));
  getApi.mockImplementation((endpoint: string) => Promise.resolve(
    endpoint === API_ENDPOINTS.TENANT_SETTINGS ? { timezone: "Europe/Moscow" }
      : endpoint.startsWith(`${API_ENDPOINTS.SHIFTS}?`) ? { data: [], total: 0 } : []
  ));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ "Content-Disposition": "attachment; filename=report.xlsx" }), blob: async () => new Blob(["fixture"]) }));
  vi.stubGlobal("alert", vi.fn());
  URL.createObjectURL = vi.fn(() => "blob:fixture");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { downloadedNames.push(this.download); });
});
afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

it("keeps both ordinary Free exports visible and locked; clicks explain and navigate without downloading", async () => {
  const navigate = vi.fn();
  render(<Shifts onNavigateToBilling={navigate} />); await ready();
  await waitFor(() => expect(excel()).toHaveTextContent("Доступно со Старт"));
  expect(zip()).toHaveTextContent("Доступно со Старт");
  fireEvent.click(excel());
  expect(screen.getByText("Экспорт Excel доступен с тарифа Старт.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Посмотреть тарифы" }));
  expect(navigate).toHaveBeenCalledTimes(1);
  fireEvent.click(zip());
  expect(screen.getByText("Выгрузка фото ZIP доступна с тарифа Старт.")).toBeVisible();
  expect(fetch).not.toHaveBeenCalled();
});

it.each([
  ["start", "paid", 20], ["business", "paid", 20], ["company", "paid", 20],
  ["start", "pilot", 20], ["individual", "individual", 20], ["free", "free", 1], ["free", "free", 999],
])("uses server true flags for %s/%s tenant %s and preserves both downloads", async (code, source, tenantId) => {
  getUser.mockReturnValue({ tenant_id: tenantId, role: "admin" });
  getBilling.mockResolvedValue(summary(true, code, source));
  render(<Shifts />); await ready();
  await waitFor(() => expect(excel()).toBeEnabled());
  expect(excel()).not.toHaveTextContent("Доступно со Старт");
  fireEvent.click(excel());
  await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1));
  fireEvent.click(zip());
  await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2));
  expect(fetch).toHaveBeenNthCalledWith(1, expect.stringContaining(API_ENDPOINTS.REPORTS_EXCEL), expect.anything());
  expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining(API_ENDPOINTS.REPORTS_PHOTOS_ZIP), expect.anything());
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
});

it.each(["expired", "inactive", "revoked", "scheduled"])("honors server false even with stored paid and %s entitlement", async status => {
  getBilling.mockResolvedValue(summary(false, "company", "pilot", status));
  render(<Shifts />); await ready();
  await waitFor(() => expect(excel()).toHaveTextContent("Доступно со Старт"));
  expect(zip()).toHaveTextContent("Доступно со Старт");
});

it("does not infer a protected/demo exception from tenant ID", async () => {
  getUser.mockReturnValue({ tenant_id: 999, role: "admin" });
  render(<Shifts />); await ready();
  await waitFor(() => expect(zip()).toHaveTextContent("Доступно со Старт"));
});

it("explains administrator responsibility to a foreman without a purchase CTA", async () => {
  getUser.mockReturnValue({ tenant_id: 20, role: "foreman" });
  const navigate = vi.fn();
  render(<Shifts onNavigateToBilling={navigate} />); await ready();
  await waitFor(() => expect(excel()).toHaveTextContent("Доступно со Старт"));
  fireEvent.click(excel());
  expect(screen.getByText("Тариф подключает администратор компании.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Посмотреть тарифы" }));
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: /Купить|Подключить/ })).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

it("keeps exports hidden for a driver and does not fetch billing", async () => {
  getUser.mockReturnValue({ tenant_id: 999, role: "driver" });
  render(<Shifts />); await screen.findByRole("heading", { name: "Мои записи" });
  expect(screen.queryByRole("button", { name: /Выгрузить/ })).toBeNull();
  expect(getBilling).not.toHaveBeenCalled();
});

it("shows neutral loading, then uses the resolved server flags", async () => {
  const pending = deferred(); getBilling.mockReturnValue(pending.promise);
  render(<Shifts />); await ready();
  expect(excel()).toBeDisabled(); expect(zip()).toBeDisabled();
  expect(screen.getByText("Проверяем доступ к экспорту…")).toBeVisible();
  expect(screen.queryByText("Доступно со Старт")).toBeNull();
  await act(async () => { pending.resolve(summary(true, "start", "paid")); });
  expect(excel()).toBeEnabled();
});

it("does not infer Free or paid when flags are missing", async () => {
  getBilling.mockResolvedValue({ current_plan: { code: "start" }, report_exports: null });
  render(<Shifts />); await ready();
  await screen.findByText(/Доступ к экспорту не подтверждён/);
  expect(excel()).toBeDisabled(); expect(zip()).toBeDisabled();
  expect(screen.queryByText("Доступно со Старт")).toBeNull();
});

it.each(["excel", "photos_zip"])("preserves %s filters, timezone range and download filename", async feature => {
  getBilling.mockResolvedValue(summary(true, "start", "paid"));
  getApi.mockImplementation((endpoint: string) => Promise.resolve(
    endpoint === API_ENDPOINTS.TENANT_SETTINGS ? { timezone: "Europe/Moscow" }
      : endpoint.startsWith(`${API_ENDPOINTS.SHIFTS}?`) ? { data: [], total: 0 }
      : [{ id: 17, full_name: "Fixture driver", name: "Fixture resource" }]
  ));
  const { container } = render(<Shifts />); await ready();
  await waitFor(() => expect(excel()).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Фильтры" }));
  for (let i = 0; i < 3; i++) {
    fireEvent.change(screen.getAllByRole("combobox")[i], { target: { value: "17" } });
    await ready();
  }
  fireEvent.change(screen.getAllByRole("combobox")[3], { target: { value: "cancelled" } });
  await ready();
  fireEvent.change(screen.getAllByRole("combobox")[4], { target: { value: "all" } });
  await ready();
  fireEvent.change(container.querySelectorAll('input[type="date"]')[0], { target: { value: "2026-10-01" } });
  await ready();
  fireEvent.change(container.querySelectorAll('input[type="date"]')[1], { target: { value: "2026-10-03" } });
  await ready();
  fireEvent.click(feature === "excel" ? excel() : zip());
  await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1));
  const query = new URL(String(vi.mocked(fetch).mock.calls[0][0])).searchParams;
  for (const key of ["driver_id", "truck_id", "site_id"]) expect(query.get(key)).toBe("17");
  expect(query.get("status")).toBe("cancelled");
  expect(query.get("accounting")).toBe("all");
  expect(query.get("date_from")).toBe("2026-09-30T21:00:00.000Z");
  expect(query.get("date_to")).toBe("2026-10-03T21:00:00.000Z");
  expect(downloadedNames).toEqual(["report.xlsx"]);
});

it("keeps billing errors neutral and supports explicit retry", async () => {
  getBilling.mockRejectedValueOnce(new Error("fixture unavailable"));
  render(<Shifts />); await ready();
  await screen.findByText(/Доступ к экспорту не подтверждён/);
  expect(excel()).toBeDisabled();
  expect(screen.queryByText("Доступно со Старт")).toBeNull();
  getBilling.mockResolvedValue(summary(true, "start", "paid"));
  fireEvent.click(screen.getByRole("button", { name: "Обновить доступ" }));
  await waitFor(() => expect(excel()).toBeEnabled());
});

it("treats a failed focus refresh as unknown even after a Free summary", async () => {
  render(<Shifts />); await ready();
  await waitFor(() => expect(excel()).toHaveTextContent("Доступно со Старт"));
  getBilling.mockRejectedValue(new Error("fixture unavailable"));
  fireEvent.focus(window);
  await screen.findByText(/Доступ к экспорту не подтверждён/);
  expect(excel()).toBeDisabled();
  expect(screen.queryByText("Доступно со Старт")).toBeNull();
});

it("keeps a server denial visible if refreshing stale entitlement fails", async () => {
  getBilling.mockResolvedValueOnce(summary(true)).mockRejectedValue(new Error("fixture unavailable"));
  vi.mocked(fetch).mockResolvedValue({ ok: false, status: 403, headers: new Headers({ "Content-Type": "application/json" }), json: async () => ({ code: "EXPORT_PLAN_REQUIRED", feature: "excel", minimum_plan: "start" }) } as Response);
  render(<Shifts onNavigateToBilling={vi.fn()} />); await ready();
  await waitFor(() => expect(excel()).toBeEnabled());
  fireEvent.click(excel());
  await screen.findByText(/Доступ к экспорту не подтверждён/);
  expect(screen.getByText("Экспорт Excel доступен с тарифа Старт.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Посмотреть тарифы" })).toBeVisible();
  expect(alert).not.toHaveBeenCalled();
  expect(excel()).toBeDisabled();
});

it("honors feature flags independently", async () => {
  getBilling.mockResolvedValue({ ...summary(true), report_exports: { excel: true, photos_zip: false } });
  render(<Shifts />); await ready();
  await waitFor(() => expect(excel()).toBeEnabled());
  expect(excel()).not.toHaveTextContent("Доступно со Старт");
  expect(zip()).toHaveTextContent("Доступно со Старт");
  fireEvent.click(zip()); expect(fetch).not.toHaveBeenCalled();
});

it.each(["excel", "photos_zip"])("handles %s server paywall as stale entitlement, refreshing without a generic error", async feature => {
  getBilling.mockResolvedValueOnce(summary(true, "start", "paid")).mockResolvedValue(summary(false));
  vi.mocked(fetch).mockResolvedValue({ ok: false, status: 403, headers: new Headers({ "Content-Type": "application/json" }), json: async () => ({ code: "EXPORT_PLAN_REQUIRED", feature, minimum_plan: "start" }) } as Response);
  render(<Shifts onNavigateToBilling={vi.fn()} />); await ready();
  await waitFor(() => expect(excel()).toBeEnabled());
  fireEvent.click(feature === "excel" ? excel() : zip());
  await screen.findByRole("button", { name: "Посмотреть тарифы" });
  await waitFor(() => expect(excel()).toHaveTextContent("Доступно со Старт"));
  expect(getBilling).toHaveBeenCalledTimes(2);
  expect(alert).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("does not mislabel ordinary role denial as a plan paywall", async () => {
  getBilling.mockResolvedValue(summary(true));
  vi.mocked(fetch).mockResolvedValue({ ok: false, status: 403, headers: new Headers({ "Content-Type": "application/json" }), json: async () => ({ error: "Доступ запрещён" }) } as Response);
  render(<Shifts />); await ready(); await waitFor(() => expect(excel()).toBeEnabled());
  fireEvent.click(excel());
  await waitFor(() => expect(alert).toHaveBeenCalledWith("Доступ запрещён"));
  expect(getBilling).toHaveBeenCalledTimes(1);
});

it("refreshes on focus and never lets an older response overwrite newer entitlement", async () => {
  getBilling.mockResolvedValueOnce(summary(true));
  const older = deferred(), newer = deferred();
  getBilling.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
  render(<Shifts />); await ready(); await waitFor(() => expect(excel()).toBeEnabled());
  fireEvent.focus(window); expect(excel()).toBeDisabled();
  fireEvent.focus(window);
  await act(async () => { newer.resolve(summary(false)); });
  expect(excel()).toHaveTextContent("Доступно со Старт");
  await act(async () => { older.resolve(summary(true)); });
  expect(excel()).toHaveTextContent("Доступно со Старт");
});

it("reflects an upgrade on focus without reloading the application", async () => {
  render(<Shifts />); await ready(); await waitFor(() => expect(excel()).toHaveTextContent("Доступно со Старт"));
  fireEvent.click(excel());
  getBilling.mockResolvedValue(summary(true, "start", "pilot"));
  fireEvent.focus(window);
  await waitFor(() => expect(excel()).not.toHaveTextContent("Доступно со Старт"));
  expect(screen.queryByText("Экспорт Excel доступен с тарифа Старт.")).toBeNull();
});

it("loads server flags under React StrictMode", async () => {
  getBilling.mockResolvedValue(summary(true));
  render(<StrictMode><Shifts /></StrictMode>); await ready();
  await waitFor(() => expect(excel()).toBeEnabled());
});
