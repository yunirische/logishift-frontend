import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import DemoScenarioEntry from "../DemoScenarioEntry";
import { DemoSessionProvider } from "../../context/DemoSessionContext";
import { addDemoPhotoMetadata, createDemoScenarioShift, readDemoSession, writeDemoSession } from "../../lib/demoSession";
import { rememberDemoPresentation, shouldResumeDemoCabinet } from "../../lib/demoPresentation";
import { captureDemoRegistrationHandoff } from "../../lib/demoRegistrationHandoff";
import { formatForDisplay } from "../../utils/dateUtils";
import { API_ENDPOINTS } from "../../constants";

const { mockGet, mockPost, mockPostFormData, mockRecordEvent, mockRegistrationClick } = vi.hoisted(() => ({
  mockGet: vi.fn(), mockPost: vi.fn(), mockPostFormData: vi.fn(),
  mockRecordEvent: vi.fn().mockResolvedValue(undefined),
  mockRegistrationClick: vi.fn(),
}));
const user = { id: 1, tenant_id: 999, full_name: "Демо Администратор", role: "admin", current_state: "idle" };
const auth = { user, logout: vi.fn(), refreshUser: vi.fn() };
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../services/api", () => ({
  default: { get: mockGet, post: mockPost, postFormData: mockPostFormData },
  getCurrentShift: vi.fn().mockResolvedValue(null), openShiftFilePreview: vi.fn(),
}));
vi.mock("../../lib/demoFunnelEvents", () => ({
  recordCurrentDemoFunnelEvent: mockRecordEvent,
  recordDemoRegistrationCtaClick: mockRegistrationClick,
}));
vi.mock("../../lib/demoPhotoSample", () => ({
  createDemoPhotoSample: vi.fn().mockImplementation(async () => new File(["sample"], "demo.png", { type: "image/png" })),
}));
const trucks = [{ id: 11, name: "КамАЗ 65115" }, { id: 12, name: "Scania R450" }];
const sites = [
  { id: 22, name: "ЖК Северный", odometer_required: true, invoice_required: true },
  { id: 23, name: "Карьер Южный", odometer_required: true, invoice_required: false },
];
const initialShift = () => createDemoScenarioShift({
  driverId: 7, driverName: "Демо Водитель", truckId: 11, truckName: trucks[0].name,
  siteId: 22, siteName: sites[0].name, odometerRequired: true, invoiceRequired: true,
});
const renderEntry = (onExploreCabinet = vi.fn()) => render(
  <DemoSessionProvider>
    <DemoScenarioEntry onExploreCabinet={onExploreCabinet} setDemoPersona={vi.fn()} setActiveTab={vi.fn()} showDemoShiftInRegistry={vi.fn()} />
  </DemoSessionProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  mockGet.mockImplementation(async (url: string) => {
    if (url === "/users") return [{ id: 7, role: "driver", full_name: "Демо Водитель" }];
    if (url === "/trucks") return trucks;
    if (url === "/sites") return sites;
    if (url === API_ENDPOINTS.TENANT_SETTINGS) return { timezone: "Europe/Moscow" };
    return [];
  });
  URL.createObjectURL = vi.fn(() => "blob:demo-fixture");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => { vi.mocked(window.confirm).mockRestore(); vi.mocked(window.scrollTo).mockRestore(); });

it("opens a visible editable preset without navigation, auto-start or a synthetic request event", async () => {
  renderEntry();
  expect(screen.getByText("Начните тестовую смену — затем увидите её глазами руководителя.")).toBeVisible();
  await waitFor(() => expect(screen.getByTestId("start-shift-button")).toBeEnabled());
  expect(screen.getByTestId("demo-preset-truck")).toHaveTextContent("КамАЗ 65115");
  expect(screen.getByTestId("demo-preset-site")).toHaveTextContent("ЖК Северный");
  expect(screen.getByText("Заранее подготовленный демо-пример")).toBeVisible();
  expect(screen.queryByText("Меню демо")).not.toBeInTheDocument();
  expect(screen.queryByTestId("demo-product-tour")).not.toBeInTheDocument();
  expect(screen.getByTestId("driver-action-bar-shell").parentElement).not.toHaveClass("fixed");
  for (const event of ["demo_driver_view_shown", "demo_shift_selection_shown", "demo_shift_start_ready"]) {
    await waitFor(() => expect(mockRecordEvent).toHaveBeenCalledWith(event));
  }
  expect(mockRecordEvent).not.toHaveBeenCalledWith("demo_driver_scenario_requested");
  expect(mockRecordEvent).not.toHaveBeenCalledWith("demo_shift_started");
  expect(readDemoSession(localStorage).activeShift).toBeNull();
});

it("changes the preset, starts through the existing store and preserves selected proof requirements", async () => {
  renderEntry();
  await waitFor(() => expect(screen.getByTestId("start-shift-button")).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Изменить технику и объект" }));
  fireEvent.click(screen.getByTestId("driver-truck-card-12"));
  fireEvent.click(screen.getByTestId("driver-site-card-23"));
  fireEvent.click(screen.getByRole("button", { name: "Готово" }));
  expect(screen.getByTestId("demo-preset-truck")).toHaveTextContent("Scania R450");
  expect(screen.getByTestId("demo-preset-site")).toHaveTextContent("Карьер Южный");
  fireEvent.click(screen.getByTestId("start-shift-button"));
  await screen.findByRole("button", { name: "Использовать образец" });
  expect(screen.queryByTestId("demo-owner-result")).not.toBeInTheDocument();
  expect(mockRecordEvent).not.toHaveBeenCalledWith("demo_owner_result_shown");
  await waitFor(() => expect(readDemoSession(localStorage).activeShift).toMatchObject({
    truckId: 12, siteId: 23, odometerRequired: true, invoiceRequired: false, status: "awaiting_odo_start",
  }));
  expect(mockRecordEvent).toHaveBeenCalledWith("demo_shift_started");
  expect(mockPost).not.toHaveBeenCalled();
  expect(mockPostFormData).not.toHaveBeenCalled();
});

it("reloads before start with a valid preset and no automatic shift", async () => {
  const first = renderEntry();
  await waitFor(() => expect(screen.getByTestId("start-shift-button")).toBeEnabled());
  first.unmount();
  renderEntry();
  await waitFor(() => expect(screen.getByTestId("start-shift-button")).toBeEnabled());
  expect(readDemoSession(localStorage).activeShift).toBeNull();
  expect(mockRecordEvent).not.toHaveBeenCalledWith("demo_shift_started");
});

it("reloads a created shift at its photo step without creating a duplicate", async () => {
  const first = renderEntry();
  await waitFor(() => expect(screen.getByTestId("start-shift-button")).toBeEnabled());
  fireEvent.click(screen.getByTestId("start-shift-button"));
  await screen.findByRole("button", { name: "Использовать образец" });
  await waitFor(() => expect(readDemoSession(localStorage).activeShift).not.toBeNull());
  const originalId = readDemoSession(localStorage).activeShift!.id;
  first.unmount();
  renderEntry();
  await screen.findByRole("button", { name: "Использовать образец" });
  expect(screen.queryByTestId("start-shift-button")).not.toBeInTheDocument();
  expect(readDemoSession(localStorage).activeShift!.id).toBe(originalId);
  expect(mockRecordEvent.mock.calls.filter(([event]) => event === "demo_shift_started")).toHaveLength(1);
});

it("resumes existing state and finishes through all proof steps without server writes", async () => {
  const shift = initialShift();
  writeDemoSession(localStorage, { activeShift: shift, finishedShifts: [] });
  renderEntry();
  fireEvent.click(await screen.findByRole("button", { name: "Использовать образец" }));
  await screen.findByTestId("demo-owner-result");
  fireEvent.click(screen.getByRole("button", { name: "Продолжить сценарий водителя" }));
  fireEvent.click(await screen.findByTestId("end-shift-button"));
  await screen.findByText("Сфотографируйте одометр ПОСЛЕ работы");
  fireEvent.click(screen.getByRole("button", { name: "Использовать образец" }));
  await screen.findByText("Сфотографируйте накладную (ТТН)");
  fireEvent.click(screen.getByRole("button", { name: "Использовать образец" }));
  await screen.findByText("Смена завершена");
  await waitFor(() => expect(readDemoSession(localStorage).finishedShifts).toHaveLength(1));
  expect(readDemoSession(localStorage).finishedShifts[0].id).toBe(shift.id);
  expect(mockRecordEvent).not.toHaveBeenCalledWith("demo_shift_started");
  expect(mockRecordEvent).toHaveBeenCalledWith("demo_scenario_completed");
  expect(mockPost).not.toHaveBeenCalled();
  expect(mockPostFormData).not.toHaveBeenCalled();
});

it("shows the same shift immediately after required proof, with real preview and unchanged event semantics", async () => {
  captureDemoRegistrationHandoff({ explicitEntry: true, search: "?utm_source=yandex&yclid=fixture" });
  const first = renderEntry();
  await waitFor(() => expect(screen.getByTestId("start-shift-button")).toBeEnabled());
  fireEvent.click(screen.getByTestId("start-shift-button"));
  await screen.findByRole("button", { name: "Использовать образец" });
  const before = readDemoSession(localStorage).activeShift!;
  expect(mockRecordEvent).not.toHaveBeenCalledWith("demo_owner_result_shown");
  fireEvent.click(screen.getByRole("button", { name: "Использовать образец" }));
  const result = await screen.findByTestId("demo-owner-result");
  expect(result).toHaveAttribute("data-synthetic-shift-id", before.id);
  const summary = within(result).getByTestId("demo-guide-shift-summary");
  for (const value of [before.driverName, before.truckName, before.siteName, "Активна", formatForDisplay(before.startedAt, "Europe/Moscow")]) {
    expect(summary).toHaveTextContent(value);
  }
  expect(screen.getByAltText("Фото начала тестовой смены")).toHaveAttribute("src", "blob:demo-fixture");
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Смена глазами руководителя" }));
  await waitFor(() => expect(mockRecordEvent.mock.calls.filter(([event]) => event === "demo_owner_result_shown")).toHaveLength(1));
  expect(mockRecordEvent.mock.calls.filter(([event]) => event === "demo_shift_started")).toHaveLength(1);
  expect(mockRecordEvent).not.toHaveBeenCalledWith("demo_scenario_completed");
  expect(mockRecordEvent).not.toHaveBeenCalledWith("demo_driver_scenario_requested");
  const link = screen.getByRole("link", { name: "Создать свою компанию" });
  const url = new URL(link.getAttribute("href")!);
  expect(url.origin + url.pathname).toBe("https://app.kontrolsmen.ru/register");
  expect(url.searchParams.get("utm_source")).toBe("yandex");
  expect(url.searchParams.get("yclid")).toBe("fixture");
  expect(url.hash).toMatch(/^#demo_session=/);
  link.addEventListener("click", event => event.preventDefault(), { once: true });
  fireEvent.click(link);
  expect(mockRegistrationClick).toHaveBeenCalledTimes(1);
  const after = readDemoSession(localStorage).activeShift!;
  expect(after.id).toBe(before.id);
  expect(after.status).toBe("active");
  first.unmount();
  renderEntry();
  expect(await screen.findByTestId("demo-owner-result")).toHaveAttribute("data-synthetic-shift-id", before.id);
  expect(screen.queryByAltText("Фото начала тестовой смены")).not.toBeInTheDocument();
  expect(screen.getByText("Добавлено")).toBeVisible();
  expect(readDemoSession(localStorage).activeShift).toEqual(after);
  expect(mockPost).not.toHaveBeenCalled();
  expect(mockPostFormData).not.toHaveBeenCalled();
});

it("resumes a proved active shift and continues without looping after reload", async () => {
  const shift = addDemoPhotoMetadata(initialShift(), { type: "start", fileName: "proof.png", mimeType: "image/png", size: 6, addedAt: new Date().toISOString() })!;
  writeDemoSession(localStorage, { activeShift: shift, finishedShifts: [] });
  const first = renderEntry();
  expect(await screen.findByTestId("demo-owner-result")).toHaveAttribute("data-synthetic-shift-id", shift.id);
  fireEvent.click(screen.getByRole("button", { name: "Продолжить сценарий водителя" }));
  await screen.findByTestId("end-shift-button");
  expect(screen.queryByTestId("demo-owner-result")).not.toBeInTheDocument();
  first.unmount();
  renderEntry();
  await screen.findByTestId("end-shift-button");
  expect(screen.queryByTestId("demo-owner-result")).not.toBeInTheDocument();
  expect(readDemoSession(localStorage).activeShift).toEqual(shift);
  expect(mockRecordEvent).not.toHaveBeenCalledWith("demo_shift_started");
});

it("opens the full cabinet through the existing callback and remembers it for this shift only", async () => {
  const shift = { ...initialShift(), odometerRequired: false, status: "active" as const };
  writeDemoSession(localStorage, { activeShift: shift, finishedShifts: [] });
  const onExploreCabinet = vi.fn(() => rememberDemoPresentation("cabinet", shift.id));
  renderEntry(onExploreCabinet);
  expect(await screen.findByText("Не добавлено")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Посмотреть кабинет подробнее" }));
  expect(onExploreCabinet).toHaveBeenCalledTimes(1);
  expect(shouldResumeDemoCabinet(readDemoSession(localStorage))).toBe(true);
  expect(readDemoSession(localStorage).activeShift).toEqual(shift);
  writeDemoSession(localStorage, { activeShift: initialShift(), finishedShifts: [] });
  expect(shouldResumeDemoCabinet(readDemoSession(localStorage))).toBe(false);
  localStorage.clear();
  expect(shouldResumeDemoCabinet(readDemoSession(localStorage))).toBe(false);
});

it("resumes a finished scenario as history without opening a new shift", async () => {
  const shift = { ...initialShift(), status: "finished" as const, finishedAt: new Date().toISOString() };
  writeDemoSession(localStorage, { activeShift: null, finishedShifts: [shift] });
  renderEntry();
  await screen.findByRole("heading", { name: "Мои смены" });
  expect(screen.queryByTestId("start-shift-button")).not.toBeInTheDocument();
  expect(readDemoSession(localStorage).finishedShifts).toHaveLength(1);
  expect(mockRecordEvent).not.toHaveBeenCalledWith("demo_shift_started");
  expect(mockRecordEvent).not.toHaveBeenCalledWith("demo_scenario_completed");
});

it("does not invent a preset when a directory is empty", async () => {
  mockGet.mockResolvedValue([]);
  renderEntry();
  expect(await screen.findByText("Нет доступной техники")).toBeVisible();
  expect(screen.getByText("Нет доступного объекта")).toBeVisible();
  expect(screen.getByTestId("start-shift-button")).toBeDisabled();
  expect(mockRecordEvent).not.toHaveBeenCalledWith("demo_shift_start_ready");
});
