import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TIMEZONE = "Europe/Moscow";
const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const normalizeTimezone = (value?: string) => value || DEFAULT_TIMEZONE;

export interface ShiftFiltersQueryState {
  driver_id?: string;
  truck_id?: string;
  date?: string;
}

export interface TenantDayUtcRange {
  date_from: string;
  date_to: string;
}

export const getTenantDayUtcRange = (
  date: string,
  tenantTimezone: string
): TenantDayUtcRange | null => {
  if (!LOCAL_DATE_PATTERN.test(date)) {
    return null;
  }

  const startOfDay = dayjs.tz(
    `${date}T00:00:00`,
    normalizeTimezone(tenantTimezone)
  );

  if (!startOfDay.isValid()) {
    return null;
  }

  return {
    date_from: startOfDay.utc().toISOString(),
    date_to: startOfDay.add(1, "day").utc().toISOString(),
  };
};

export const buildShiftQueryString = ({
  page,
  limit,
  filters,
  tenantTimezone,
}: {
  page: number;
  limit: number;
  filters: ShiftFiltersQueryState;
  tenantTimezone: string;
}): string => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  if (filters.driver_id) {
    params.set("driver_id", filters.driver_id);
  }

  if (filters.truck_id) {
    params.set("truck_id", filters.truck_id);
  }

  if (filters.date) {
    const range = getTenantDayUtcRange(filters.date, tenantTimezone);
    if (range) {
      params.set("date_from", range.date_from);
      params.set("date_to", range.date_to);
    }
  }

  return params.toString();
};
