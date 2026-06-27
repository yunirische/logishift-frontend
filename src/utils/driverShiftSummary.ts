import { Shift } from "../types";
import { formatForDisplay } from "./dateUtils";

const hasValidTimestamp = (value?: string | null): value is string => {
  if (!value) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
};

const getDurationMinutes = (shift: Shift): number | null => {
  if (!hasValidTimestamp(shift.start_time) || !hasValidTimestamp(shift.end_time)) {
    return null;
  }

  const durationMs =
    new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime();

  if (durationMs < 0) {
    return null;
  }

  return Math.floor(durationMs / 60000);
};

export const formatDriverShiftDuration = (shift: Shift): string | null => {
  if (!hasValidTimestamp(shift.start_time) || !hasValidTimestamp(shift.end_time)) {
    return null;
  }

  const durationSeconds = Math.max(
    0,
    Math.floor(
      (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / 1000
    )
  );

  if (durationSeconds < 60) {
    return "Меньше 1 минуты";
  }

  const totalMinutes = Math.floor(durationSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${totalMinutes} мин`;
  }

  if (minutes === 0) {
    return `${hours} ч`;
  }

  return `${hours} ч ${minutes} мин`;
};

export const formatDriverShiftSummary = (
  shift: Shift,
  tenantTimezone: string
): {
  dateLabel: string;
  timeRangeLabel: string;
  durationLabel: string | null;
} => {
  const fallbackDate = hasValidTimestamp(shift.created_at)
    ? formatForDisplay(shift.created_at, tenantTimezone, "D MMMM")
    : "—";

  if (!hasValidTimestamp(shift.start_time) || !hasValidTimestamp(shift.end_time)) {
    return {
      dateLabel: fallbackDate,
      timeRangeLabel: "Время не указано",
      durationLabel: null,
    };
  }

  const startDay = formatForDisplay(shift.start_time, tenantTimezone, "YYYY-MM-DD");
  const endDay = formatForDisplay(shift.end_time, tenantTimezone, "YYYY-MM-DD");
  const durationLabel = formatDriverShiftDuration(shift);

  if (startDay === endDay) {
    return {
      dateLabel: formatForDisplay(shift.start_time, tenantTimezone, "D MMMM"),
      timeRangeLabel: `${formatForDisplay(
        shift.start_time,
        tenantTimezone,
        "HH:mm"
      )}–${formatForDisplay(shift.end_time, tenantTimezone, "HH:mm")}`,
      durationLabel,
    };
  }

  return {
    dateLabel: `${formatForDisplay(
      shift.start_time,
      tenantTimezone,
      "D MMMM HH:mm"
    )} – ${formatForDisplay(shift.end_time, tenantTimezone, "D MMMM HH:mm")}`,
    timeRangeLabel: "",
    durationLabel,
  };
};

export const getDriverShiftDurationMinutes = (shift: Shift): number | null =>
  getDurationMinutes(shift);
