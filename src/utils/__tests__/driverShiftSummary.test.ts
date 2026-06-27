import { Shift } from "../../types";
import { formatDriverShiftDuration, formatDriverShiftSummary } from "../driverShiftSummary";

const baseShift: Shift = {
  id: 113,
  status: "finished",
};

describe("driverShiftSummary", () => {
  it("formats short durations from timestamps instead of rounded hours", () => {
    expect(
      formatDriverShiftDuration({
        ...baseShift,
        start_time: "2026-06-27T13:32:00.000Z",
        end_time: "2026-06-27T13:32:46.000Z",
      })
    ).toBe("Меньше 1 минуты");

    expect(
      formatDriverShiftDuration({
        ...baseShift,
        start_time: "2026-06-27T13:32:00.000Z",
        end_time: "2026-06-27T13:33:18.000Z",
      })
    ).toBe("1 мин");

    expect(
      formatDriverShiftDuration({
        ...baseShift,
        start_time: "2026-06-27T13:32:00.000Z",
        end_time: "2026-06-27T13:36:56.000Z",
      })
    ).toBe("4 мин");
  });

  it("formats same-day history cards with date, time range and duration", () => {
    expect(
      formatDriverShiftSummary(
        {
          ...baseShift,
          start_time: "2026-06-27T13:32:00.000Z",
          end_time: "2026-06-27T13:33:18.000Z",
        },
        "Europe/Moscow"
      )
    ).toEqual({
      dateLabel: "27 июня",
      timeRangeLabel: "16:32–16:33",
      durationLabel: "1 мин",
    });
  });

  it("formats cross-midnight history cards in tenant timezone", () => {
    expect(
      formatDriverShiftSummary(
        {
          ...baseShift,
          start_time: "2026-06-27T20:58:00.000Z",
          end_time: "2026-06-27T21:10:00.000Z",
        },
        "Europe/Moscow"
      )
    ).toEqual({
      dateLabel: "27 июня 23:58 – 28 июня 00:10",
      timeRangeLabel: "",
      durationLabel: "12 мин",
    });
  });

  it("returns neutral time label when timestamps are missing", () => {
    expect(
      formatDriverShiftSummary(
        {
          ...baseShift,
          created_at: "2026-06-27T10:00:00.000Z",
        },
        "Europe/Moscow"
      )
    ).toEqual({
      dateLabel: "27 июня",
      timeRangeLabel: "Время не указано",
      durationLabel: null,
    });
  });
});
