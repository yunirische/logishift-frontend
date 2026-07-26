import { fireEvent, render, screen } from "@testing-library/react";
import {
  DemoSessionProvider,
  useDemoSession,
} from "../DemoSessionContext";
import {
  DEMO_SESSION_STORAGE_KEY,
  createDemoScenarioShift,
  writeDemoSession,
} from "../../lib/demoSession";

vi.mock("../AuthContext", () => ({
  useAuth: () => ({ user: { tenant_id: 999 } }),
}));

vi.mock("../../config/demo", async () => {
  const actual = await vi.importActual<typeof import("../../config/demo")>(
    "../../config/demo"
  );
  return {
    ...actual,
    isDemoHostname: () => true,
    isDemoTenantId: (tenantId: unknown) => tenantId === 999,
  };
});

const startInput = {
  driverId: 77,
  driverName: "Демо Водитель",
  truckId: 12,
  truckName: "КамАЗ",
  siteId: 31,
  siteName: "Склад",
};

const Harness = () => {
  const {
    activeShift,
    finishedShifts,
    startDemoShift,
    finishDemoShift,
    resetDemoSession,
  } = useDemoSession();

  return (
    <div>
      <div data-testid="active">{activeShift?.driverName || "none"}</div>
      <div data-testid="finished">{finishedShifts.length}</div>
      <button onClick={() => startDemoShift(startInput)}>start</button>
      <button onClick={() => finishDemoShift()}>finish</button>
      <button onClick={resetDemoSession}>reset</button>
    </div>
  );
};

describe("DemoSessionProvider lifecycle", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("starts, finishes, persists through remount, and resets", () => {
    const first = render(
      <DemoSessionProvider>
        <Harness />
      </DemoSessionProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "start" }));
    expect(screen.getByTestId("active")).toHaveTextContent("Демо Водитель");

    fireEvent.click(screen.getByRole("button", { name: "finish" }));
    expect(screen.getByTestId("active")).toHaveTextContent("none");
    expect(screen.getByTestId("finished")).toHaveTextContent("1");

    first.unmount();
    render(
      <DemoSessionProvider>
        <Harness />
      </DemoSessionProvider>
    );
    expect(screen.getByTestId("finished")).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "reset" }));
    expect(screen.getByTestId("finished")).toHaveTextContent("0");
    expect(localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("clears an old scenario on explicit new demo entry", () => {
    const activeShift = createDemoScenarioShift(startInput);
    writeDemoSession(localStorage, { activeShift, finishedShifts: [] });
    window.history.replaceState({}, "", "/?enterDemo=1");

    render(
      <DemoSessionProvider>
        <Harness />
      </DemoSessionProvider>
    );

    expect(screen.getByTestId("active")).toHaveTextContent("none");
    expect(localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("does not clear a valid scenario on ordinary reload/remount", () => {
    const activeShift = createDemoScenarioShift(startInput);
    writeDemoSession(localStorage, { activeShift, finishedShifts: [] });
    const persistedBeforeRender = localStorage.getItem(DEMO_SESSION_STORAGE_KEY);

    render(
      <DemoSessionProvider>
        <Harness />
      </DemoSessionProvider>
    );

    expect(screen.getByTestId("active")).toHaveTextContent("Демо Водитель");
    expect(localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toBe(
      persistedBeforeRender
    );
  });
});
