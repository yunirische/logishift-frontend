import { clearDemoPresentation, getInitialDemoPresentation, readDemoPresentation, rememberDemoPresentation } from "../demoPresentation";
import { getOrCreateDemoFunnelSession } from "../demoFunnelSession";
import { createDemoScenarioShift, EMPTY_DEMO_SESSION } from "../demoSession";

const shift = () => createDemoScenarioShift({ driverId: 7, driverName: "Демо водитель", truckId: 11, truckName: "КамАЗ", siteId: 22, siteName: "Объект", odometerRequired: true, invoiceRequired: true });
beforeEach(() => localStorage.clear());

it("defaults to overview and remembers a chosen path before any shift exists", () => {
  expect(getInitialDemoPresentation(EMPTY_DEMO_SESSION)).toBe("overview");
  getOrCreateDemoFunnelSession({ explicitEntry: true });
  expect(getInitialDemoPresentation(EMPTY_DEMO_SESSION)).toBe("overview");
  rememberDemoPresentation("driver");
  expect(getInitialDemoPresentation(EMPTY_DEMO_SESSION)).toBe("scenario");
  rememberDemoPresentation("cabinet");
  expect(getInitialDemoPresentation(EMPTY_DEMO_SESSION)).toBe("cabinet");
});

it("does not let the pre-start driver choice suppress the real owner result", () => {
  getOrCreateDemoFunnelSession({ explicitEntry: true });
  rememberDemoPresentation("driver");
  expect(readDemoPresentation(shift().id)).toBeNull();
});

it("preserves active/finished scenarios and the deployed shift-specific cabinet preference", () => {
  const active = shift();
  const state = { activeShift: active, finishedShifts: [] };
  expect(getInitialDemoPresentation(state)).toBe("scenario");
  rememberDemoPresentation("cabinet", active.id);
  expect(getInitialDemoPresentation(state)).toBe("cabinet");
  const finished = { activeShift: null, finishedShifts: [{ ...active, status: "finished" as const, finishedAt: new Date().toISOString() }] };
  expect(getInitialDemoPresentation(finished)).toBe("cabinet");
  clearDemoPresentation();
  expect(getInitialDemoPresentation(finished)).toBe("scenario");
});

it("does not carry an empty-session path beyond its existing funnel TTL or a reset", () => {
  const now = Date.now();
  getOrCreateDemoFunnelSession({ explicitEntry: true, now: now - 5 * 60 * 60 * 1000 });
  rememberDemoPresentation("driver");
  expect(getInitialDemoPresentation(EMPTY_DEMO_SESSION)).toBe("overview");
  getOrCreateDemoFunnelSession({ explicitEntry: true });
  rememberDemoPresentation("cabinet");
  clearDemoPresentation();
  expect(getInitialDemoPresentation(EMPTY_DEMO_SESSION)).toBe("overview");
});

it("falls back safely when the browser preference is invalid or storage is blocked", () => {
  localStorage.setItem("logishift_demo_presentation_v1", "invalid-json");
  expect(getInitialDemoPresentation(EMPTY_DEMO_SESSION)).toBe("overview");
  const blocked = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(getInitialDemoPresentation(EMPTY_DEMO_SESSION)).toBe("overview");
  blocked.mockRestore();
});
