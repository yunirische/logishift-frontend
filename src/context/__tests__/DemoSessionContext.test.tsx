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

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock("../AuthContext", () => ({
  useAuth: () => mockUseAuth(),
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
  odometerRequired: true,
  invoiceRequired: true,
};

const testFile = (name: string) =>
  new File(["image"], name, { type: "image/jpeg" });

const Harness = () => {
  const {
    activeShift,
    finishedShifts,
    startDemoShift,
    requestDemoShiftFinish,
    addDemoShiftComment,
    addDemoShiftPhoto,
    getDemoPhotoPreview,
    resetDemoSession,
  } = useDemoSession();
  const shift = activeShift || finishedShifts[0] || null;

  return (
    <div>
      <div data-testid="status">{shift?.status || "none"}</div>
      <div data-testid="comment">{shift?.comment || "none"}</div>
      <div data-testid="photos">{Object.keys(shift?.photos || {}).join(",")}</div>
      <div data-testid="preview">
        {shift && getDemoPhotoPreview(shift.id, "invoice")?.url
          ? "available"
          : "none"}
      </div>
      <button onClick={() => startDemoShift(startInput)}>start</button>
      <button
        onClick={() => shift && addDemoShiftComment(shift.id, " Локально ")}
      >
        comment
      </button>
      <button
        onClick={() =>
          activeShift &&
          addDemoShiftPhoto(activeShift.id, "start", testFile("start.jpg"))
        }
      >
        start-photo
      </button>
      <button onClick={requestDemoShiftFinish}>finish</button>
      <button
        onClick={() =>
          activeShift &&
          addDemoShiftPhoto(activeShift.id, "end", testFile("end.jpg"))
        }
      >
        end-photo
      </button>
      <button
        onClick={() =>
          shift &&
          addDemoShiftPhoto(shift.id, "invoice", testFile("invoice.jpg"))
        }
      >
        invoice-photo
      </button>
      <button onClick={resetDemoSession}>reset</button>
    </div>
  );
};

describe("DemoSessionProvider v2 lifecycle", () => {
  const createObjectURL = vi.fn();
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    mockUseAuth.mockReturnValue({ user: { tenant_id: 999 } });
    createObjectURL.mockReset();
    revokeObjectURL.mockReset();
    createObjectURL
      .mockReturnValueOnce("blob:start")
      .mockReturnValueOnce("blob:end")
      .mockReturnValueOnce("blob:invoice")
      .mockReturnValue("blob:replacement");
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
  });

  it("runs the typed workflow, persists metadata/comment, and keeps bytes memory-only", () => {
    render(
      <DemoSessionProvider>
        <Harness />
      </DemoSessionProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "start" }));
    expect(screen.getByTestId("status")).toHaveTextContent(
      "awaiting_odo_start"
    );

    fireEvent.click(screen.getByRole("button", { name: "comment" }));
    expect(screen.getByTestId("comment")).toHaveTextContent("Локально");

    fireEvent.click(screen.getByRole("button", { name: "start-photo" }));
    expect(screen.getByTestId("status")).toHaveTextContent("active");
    fireEvent.click(screen.getByRole("button", { name: "finish" }));
    expect(screen.getByTestId("status")).toHaveTextContent("awaiting_odo_end");
    fireEvent.click(screen.getByRole("button", { name: "end-photo" }));
    expect(screen.getByTestId("status")).toHaveTextContent("awaiting_invoice");
    fireEvent.click(screen.getByRole("button", { name: "invoice-photo" }));

    expect(screen.getByTestId("status")).toHaveTextContent("finished");
    expect(screen.getByTestId("photos")).toHaveTextContent("start,end,invoice");
    expect(screen.getByTestId("preview")).toHaveTextContent("available");
    fireEvent.click(screen.getByRole("button", { name: "comment" }));
    expect(screen.getByTestId("comment")).toHaveTextContent(
      "Локально Локально"
    );
    const persisted = localStorage.getItem(DEMO_SESSION_STORAGE_KEY)!;
    expect(persisted).toContain("invoice.jpg");
    expect(persisted).not.toContain("blob:");
    expect(persisted).not.toContain("image]");
    expect(createObjectURL).toHaveBeenCalledTimes(3);
  });

  it("revokes replaced previews, reset previews, and all previews on unmount", () => {
    const view = render(
      <DemoSessionProvider>
        <Harness />
      </DemoSessionProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    fireEvent.click(screen.getByRole("button", { name: "start-photo" }));
    fireEvent.click(screen.getByRole("button", { name: "finish" }));
    fireEvent.click(screen.getByRole("button", { name: "end-photo" }));
    fireEvent.click(screen.getByRole("button", { name: "invoice-photo" }));
    fireEvent.click(screen.getByRole("button", { name: "invoice-photo" }));

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:invoice");

    fireEvent.click(screen.getByRole("button", { name: "reset" }));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:start");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:end");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:replacement");
    expect(localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "start" }));
    fireEvent.click(screen.getByRole("button", { name: "start-photo" }));
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:replacement");
  });

  it("reloads metadata without recreating a local preview", () => {
    const shift = createDemoScenarioShift(startInput);
    const withMetadata = {
      ...shift,
      status: "active" as const,
      photos: {
        start: {
          type: "start" as const,
          fileName: "meter.jpg",
          mimeType: "image/jpeg",
          size: 123,
          addedAt: "2026-07-26T10:00:00.000Z",
        },
      },
    };
    writeDemoSession(localStorage, {
      activeShift: withMetadata,
      finishedShifts: [],
    });

    render(
      <DemoSessionProvider>
        <Harness />
      </DemoSessionProvider>
    );

    expect(screen.getByTestId("photos")).toHaveTextContent("start");
    expect(screen.getByTestId("preview")).toHaveTextContent("none");
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("preserves metadata and previews across an ordinary role switch", () => {
    mockUseAuth.mockReturnValue({
      user: { tenant_id: 999, role: "driver" },
    });
    const view = render(
      <DemoSessionProvider>
        <Harness />
      </DemoSessionProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    fireEvent.click(screen.getByRole("button", { name: "start-photo" }));

    mockUseAuth.mockReturnValue({
      user: { tenant_id: 999, role: "admin" },
    });
    view.rerender(
      <DemoSessionProvider>
        <Harness />
      </DemoSessionProvider>
    );

    expect(screen.getByTestId("status")).toHaveTextContent("active");
    expect(screen.getByTestId("photos")).toHaveTextContent("start");
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it("clears metadata on explicit new entry and logout transition", () => {
    const shift = createDemoScenarioShift({
      ...startInput,
      odometerRequired: false,
      invoiceRequired: false,
    });
    writeDemoSession(localStorage, { activeShift: shift, finishedShifts: [] });
    window.history.replaceState({}, "", "/?enterDemo=1");

    const view = render(
      <DemoSessionProvider>
        <Harness />
      </DemoSessionProvider>
    );
    expect(screen.getByTestId("status")).toHaveTextContent("none");
    expect(localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toBeNull();

    window.history.replaceState({}, "", "/");
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    fireEvent.click(screen.getByRole("button", { name: "start-photo" }));
    mockUseAuth.mockReturnValue({ user: null });
    view.rerender(
      <DemoSessionProvider>
        <Harness />
      </DemoSessionProvider>
    );

    expect(screen.getByTestId("status")).toHaveTextContent("none");
    expect(localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalled();
  });
});
