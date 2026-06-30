import { buildShiftQueryString, getTenantDayUtcRange } from "../shiftFilters";

describe("shiftFilters", () => {
  it("converts a tenant-local Moscow day to a UTC half-open range", () => {
    expect(getTenantDayUtcRange("2026-06-27", "Europe/Moscow")).toEqual({
      date_from: "2026-06-26T21:00:00.000Z",
      date_to: "2026-06-27T21:00:00.000Z",
    });
  });

  it("builds query with date_from/date_to and without legacy date", () => {
    const query = buildShiftQueryString({
      page: 1,
      limit: 20,
      filters: {
        driver_id: "33",
        truck_id: "12",
        date: "2026-06-27",
      },
      tenantTimezone: "Europe/Moscow",
    });

    const params = new URLSearchParams(query);
    expect(params.get("driver_id")).toBe("33");
    expect(params.get("truck_id")).toBe("12");
    expect(params.get("date_from")).toBe("2026-06-26T21:00:00.000Z");
    expect(params.get("date_to")).toBe("2026-06-27T21:00:00.000Z");
    expect(params.has("date")).toBe(false);
  });

  it("removes date range when date filter is cleared", () => {
    const query = buildShiftQueryString({
      page: 1,
      limit: 20,
      filters: {
        driver_id: "33",
        truck_id: "12",
        date: "",
      },
      tenantTimezone: "Europe/Moscow",
    });

    const params = new URLSearchParams(query);
    expect(params.has("date_from")).toBe(false);
    expect(params.has("date_to")).toBe(false);
  });

  it("builds extended shift filters for register and exports", () => {
    const query = buildShiftQueryString({
      page: 2,
      limit: 50,
      filters: {
        driver_id: "33",
        truck_id: "12",
        site_id: "7",
        date_from: "2026-06-01",
        date_to: "2026-06-30",
        status: "finished",
        accounting: "all",
      },
      tenantTimezone: "Europe/Moscow",
    });

    const params = new URLSearchParams(query);
    expect(params.get("page")).toBe("2");
    expect(params.get("limit")).toBe("50");
    expect(params.get("site_id")).toBe("7");
    expect(params.get("status")).toBe("finished");
    expect(params.get("accounting")).toBe("all");
    expect(params.get("date_from")).toBe("2026-05-31T21:00:00.000Z");
    expect(params.get("date_to")).toBe("2026-06-30T21:00:00.000Z");
  });

  it("does not depend on the browser timezone when tenant timezone is explicit", () => {
    expect(getTenantDayUtcRange("2026-06-27", "Asia/Yekaterinburg")).toEqual({
      date_from: "2026-06-26T19:00:00.000Z",
      date_to: "2026-06-27T19:00:00.000Z",
    });
  });
});
