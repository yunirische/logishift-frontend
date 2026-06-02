import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TIMEZONE = 'Europe/Moscow';

const normalizeTimezone = (timezone?: string): string => timezone || DEFAULT_TIMEZONE;
const DATETIME_LOCAL_PREFIX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * Convert datetime-local input value to UTC ISO for backend
 * Input: "2025-01-24T14:30" (interpreted as tenant timezone)
 * Output: "2025-01-24T11:30:00Z" (UTC ISO string)
 */
export const toTenantISO = (date: string | Date, timezone: string): string => {
  return dayjs.tz(date, normalizeTimezone(timezone)).utc().toISOString();
};

/**
 * Convert UTC ISO from backend to datetime-local format for display/input
 * Input: "2025-01-24T11:30:00Z" (UTC from backend)
 * Output: "2025-01-24T14:30" (tenant timezone for datetime-local)
 */
export const fromTenantISO = (date: string, timezone: string): string => {
  return dayjs.utc(date).tz(normalizeTimezone(timezone)).format('YYYY-MM-DDTHH:mm');
};

/**
 * Format UTC ISO for display in tenant timezone
 * Input: "2025-01-24T11:30:00Z", "Europe/Moscow"
 * Output: "24.01.2025, 14:30"
 */
export const formatForDisplay = (
  date: string,
  timezone: string,
  format = 'DD.MM.YYYY, HH:mm'
): string => {
  return dayjs.utc(date).tz(normalizeTimezone(timezone)).format(format);
};

export const nowInTenantTimezone = (timezone: string): string => {
  return dayjs().tz(normalizeTimezone(timezone)).format('YYYY-MM-DDTHH:mm');
};

export const compareTenantLocalDateTimes = (
  left?: string,
  right?: string
): number | null => {
  if (!left || !right || !DATETIME_LOCAL_PREFIX.test(left) || !DATETIME_LOCAL_PREFIX.test(right)) {
    return null;
  }

  const normalizedLeft = left.slice(0, 16);
  const normalizedRight = right.slice(0, 16);

  if (normalizedLeft === normalizedRight) {
    return 0;
  }

  return normalizedLeft > normalizedRight ? 1 : -1;
};

export const getBrowserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
};
