import {
  DEMO_COMMENT_MAX_LENGTH,
  DEMO_SESSION_STORAGE_KEY,
  DEMO_SESSION_TTL_MS,
  DEMO_SESSION_VERSION,
  EMPTY_DEMO_SESSION,
  LEGACY_DEMO_SESSION_STORAGE_KEY,
  addDemoPhotoMetadata,
  addDemoShiftComment,
  clearObsoleteDemoActiveShiftKeys,
  createDemoScenarioShift,
  readDemoSession,
  requestDemoShiftFinish,
  writeDemoSession,
} from "../demoSession";

const now = new Date("2026-07-26T10:00:00.000Z");

const makeShift = (
  requirements: {
    odometerRequired?: boolean;
    invoiceRequired?: boolean;
  } = {}
) =>
  createDemoScenarioShift(
    {
      driverId: 77,
      driverName: "Демо Водитель",
      truckId: 12,
      truckName: "КамАЗ",
      truckPlate: "А123БВ",
      siteId: 31,
      siteName: "Склад",
      siteAddress: "Промышленная, 1",
      odometerRequired: requirements.odometerRequired ?? false,
      invoiceRequired: requirements.invoiceRequired ?? false,
    },
    now
  );

const photo = (
  type: "start" | "end" | "invoice",
  fileName = `${type}.jpg`
) => ({
  type,
  fileName,
  mimeType: "image/jpeg",
  size: 1234,
  addedAt: "2026-07-26T10:05:00.000Z",
});

describe("demoSession v2 storage and workflow", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with site requirements and follows the odometer plus invoice workflow", () => {
    const started = makeShift({
      odometerRequired: true,
      invoiceRequired: true,
    });
    expect(started.status).toBe("awaiting_odo_start");
    expect(started.photos).toEqual({});

    expect(addDemoPhotoMetadata(started, photo("invoice"))).toBeNull();
    const active = addDemoPhotoMetadata(started, photo("start"));
    expect(active?.status).toBe("active");

    const awaitingEnd = requestDemoShiftFinish(active!);
    expect(awaitingEnd?.status).toBe("awaiting_odo_end");
    expect(addDemoPhotoMetadata(awaitingEnd!, photo("invoice"))).toBeNull();

    const awaitingInvoice = addDemoPhotoMetadata(
      awaitingEnd!,
      photo("end")
    );
    expect(awaitingInvoice?.status).toBe("awaiting_invoice");

    const finished = addDemoPhotoMetadata(
      awaitingInvoice!,
      photo("invoice"),
      new Date("2026-07-26T11:00:00.000Z")
    );
    expect(finished?.status).toBe("finished");
    expect(finished?.finishedAt).toBe("2026-07-26T11:00:00.000Z");
  });

  it("handles no-requirement and single-requirement finish transitions", () => {
    expect(requestDemoShiftFinish(makeShift())?.status).toBe("finished");

    const invoice = requestDemoShiftFinish(
      makeShift({ invoiceRequired: true })
    );
    expect(invoice?.status).toBe("awaiting_invoice");
    expect(addDemoPhotoMetadata(invoice!, photo("invoice"))?.status).toBe(
      "finished"
    );

    const odoStarted = addDemoPhotoMetadata(
      makeShift({ odometerRequired: true }),
      photo("start")
    );
    const odoEnding = requestDemoShiftFinish(odoStarted!);
    expect(odoEnding?.status).toBe("awaiting_odo_end");
    expect(addDemoPhotoMetadata(odoEnding!, photo("end"))?.status).toBe(
      "finished"
    );
    expect(requestDemoShiftFinish(odoEnding!)).toBeNull();
  });

  it("stores trimmed comments and rejects invalid comment mutations", () => {
    const shift = makeShift();
    expect(addDemoShiftComment(shift, "  Локальный комментарий  ")?.comment).toBe(
      "Локальный комментарий"
    );
    expect(addDemoShiftComment(shift, "   ")).toBeNull();
    expect(
      addDemoShiftComment(shift, "x".repeat(DEMO_COMMENT_MAX_LENGTH + 1))
    ).toBeNull();
  });

  it("persists metadata and comments without file bytes or preview URLs", () => {
    const active = addDemoPhotoMetadata(
      makeShift({ odometerRequired: true }),
      photo("start", "meter.jpg")
    )!;
    const commented = addDemoShiftComment(active, "Проверено локально")!;
    writeDemoSession(
      localStorage,
      { activeShift: commented, finishedShifts: [] },
      now.getTime()
    );

    const raw = localStorage.getItem(DEMO_SESSION_STORAGE_KEY)!;
    expect(raw).toContain("meter.jpg");
    expect(raw).toContain("Проверено локально");
    expect(raw).not.toContain("blob:");
    expect(raw).not.toContain("base64");
    expect(raw).not.toContain("data:image");

    const restored = readDemoSession(
      localStorage,
      now.getTime() + 60_000
    );
    expect(restored.activeShift?.photos.start?.fileName).toBe("meter.jpg");
    expect(restored.activeShift?.comment).toBe("Проверено локально");
  });

  it("resets malformed photo/comment data, v1 payloads, and expired state", () => {
    const activeShift = makeShift();
    const basePayload = {
      version: DEMO_SESSION_VERSION,
      expiresAt: now.getTime() + DEMO_SESSION_TTL_MS,
      activeShift,
      finishedShifts: [],
    };

    localStorage.setItem(
      DEMO_SESSION_STORAGE_KEY,
      JSON.stringify({
        ...basePayload,
        activeShift: {
          ...activeShift,
          photos: {
            start: {
              ...photo("start"),
              bytes: "data:image/jpeg;base64,unsafe",
              size: "bad",
            },
          },
        },
      })
    );
    expect(readDemoSession(localStorage, now.getTime())).toEqual(
      EMPTY_DEMO_SESSION
    );

    localStorage.setItem(
      DEMO_SESSION_STORAGE_KEY,
      JSON.stringify({
        ...basePayload,
        activeShift: {
          ...activeShift,
          comment: "x".repeat(DEMO_COMMENT_MAX_LENGTH + 1),
        },
      })
    );
    expect(readDemoSession(localStorage, now.getTime())).toEqual(
      EMPTY_DEMO_SESSION
    );

    localStorage.setItem(
      DEMO_SESSION_STORAGE_KEY,
      JSON.stringify({ ...basePayload, version: 1 })
    );
    expect(readDemoSession(localStorage, now.getTime())).toEqual(
      EMPTY_DEMO_SESSION
    );

    localStorage.setItem(
      DEMO_SESSION_STORAGE_KEY,
      JSON.stringify({ ...basePayload, expiresAt: now.getTime() })
    );
    expect(readDemoSession(localStorage, now.getTime() + 1)).toEqual(
      EMPTY_DEMO_SESSION
    );
  });

  it("resets cleanly and removes only obsolete demo keys", () => {
    localStorage.setItem("unrelated", "keep");
    localStorage.setItem("logishift_demo_persona_driver_id", "77");
    localStorage.setItem("logishift_active_shift_demo_77", "{}");
    localStorage.setItem(LEGACY_DEMO_SESSION_STORAGE_KEY, "{}");

    clearObsoleteDemoActiveShiftKeys(localStorage);

    expect(localStorage.getItem("unrelated")).toBe("keep");
    expect(localStorage.getItem("logishift_demo_persona_driver_id")).toBe("77");
    expect(localStorage.getItem("logishift_active_shift_demo_77")).toBeNull();
    expect(localStorage.getItem(LEGACY_DEMO_SESSION_STORAGE_KEY)).toBeNull();

    writeDemoSession(localStorage, EMPTY_DEMO_SESSION);
    expect(localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toBeNull();
  });
});
