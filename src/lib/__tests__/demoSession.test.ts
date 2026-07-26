import {
  DEMO_SESSION_STORAGE_KEY,
  DEMO_SESSION_TTL_MS,
  DEMO_SESSION_VERSION,
  EMPTY_DEMO_SESSION,
  clearObsoleteDemoActiveShiftKeys,
  createDemoScenarioShift,
  finishDemoScenarioShift,
  readDemoSession,
  writeDemoSession,
} from "../demoSession";

const makeShift = () =>
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
    },
    new Date("2026-07-26T10:00:00.000Z")
  );

describe("demoSession storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty and persists start, finish, reset, and reload state", () => {
    expect(readDemoSession(localStorage)).toEqual(EMPTY_DEMO_SESSION);

    const activeShift = makeShift();
    writeDemoSession(
      localStorage,
      { activeShift, finishedShifts: [] },
      Date.parse("2026-07-26T10:00:00.000Z")
    );

    expect(
      readDemoSession(
        localStorage,
        Date.parse("2026-07-26T10:30:00.000Z")
      ).activeShift
    ).toEqual(activeShift);

    const finishedShift = finishDemoScenarioShift(
      activeShift,
      new Date("2026-07-26T11:00:00.000Z")
    );
    writeDemoSession(
      localStorage,
      { activeShift: null, finishedShifts: [finishedShift] },
      Date.parse("2026-07-26T11:00:00.000Z")
    );

    expect(
      readDemoSession(
        localStorage,
        Date.parse("2026-07-26T11:30:00.000Z")
      ).finishedShifts
    ).toEqual([finishedShift]);

    writeDemoSession(localStorage, EMPTY_DEMO_SESSION);
    expect(localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("resets expired, malformed, and version-mismatched payloads", () => {
    const activeShift = makeShift();
    const expiresAt = Date.parse("2026-07-26T10:00:00.000Z") + DEMO_SESSION_TTL_MS;

    localStorage.setItem(
      DEMO_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: DEMO_SESSION_VERSION,
        expiresAt,
        activeShift,
        finishedShifts: [],
      })
    );
    expect(
      readDemoSession(localStorage, expiresAt + 1)
    ).toEqual(EMPTY_DEMO_SESSION);
    expect(localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toBeNull();

    localStorage.setItem(DEMO_SESSION_STORAGE_KEY, "{broken");
    expect(readDemoSession(localStorage)).toEqual(EMPTY_DEMO_SESSION);

    localStorage.setItem(
      DEMO_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: DEMO_SESSION_VERSION + 1,
        expiresAt: Date.now() + DEMO_SESSION_TTL_MS,
        activeShift,
        finishedShifts: [],
      })
    );
    expect(readDemoSession(localStorage)).toEqual(EMPTY_DEMO_SESSION);
  });

  it("keeps unrelated and persona storage while removing obsolete active-shift keys", () => {
    localStorage.setItem("unrelated", "keep");
    localStorage.setItem("demoPersona", "driver");
    localStorage.setItem("logishift_demo_persona_driver_id", "77");
    localStorage.setItem("logishift_active_shift_demo", "{}");
    localStorage.setItem("logishift_active_shift_demo_77", "{}");

    clearObsoleteDemoActiveShiftKeys(localStorage);

    expect(localStorage.getItem("unrelated")).toBe("keep");
    expect(localStorage.getItem("demoPersona")).toBe("driver");
    expect(localStorage.getItem("logishift_demo_persona_driver_id")).toBe("77");
    expect(localStorage.getItem("logishift_active_shift_demo")).toBeNull();
    expect(localStorage.getItem("logishift_active_shift_demo_77")).toBeNull();
  });

  it("creates a string synthetic ID that cannot be confused with a server numeric ID", () => {
    expect(makeShift().id).toMatch(/^demo-shift:/);
  });
});
