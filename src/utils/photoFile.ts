export const MAX_PHOTO_FILE_BYTES = 10 * 1024 * 1024;
export const PHOTO_WARNING_BYTES = 8 * 1024 * 1024;
export const ALLOWED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type PhotoValidationSuccess = {
  ok: true;
  warning?: string;
};

type PhotoValidationFailure = {
  ok: false;
  error: string;
};

export type PhotoValidationResult =
  | PhotoValidationSuccess
  | PhotoValidationFailure;

export const validatePhotoFile = (file: File): PhotoValidationResult => {
  if (file.size === 0) {
    return { ok: false, error: "Файл пустой" };
  }

  const normalizedMimeType = String(file.type || "").toLowerCase().trim();

  if (!normalizedMimeType) {
    return { ok: false, error: "Поддерживаются JPEG, PNG, WebP" };
  }

  if (
    normalizedMimeType === "image/heic" ||
    normalizedMimeType === "image/heif"
  ) {
    return { ok: false, error: "HEIC не поддерживается" };
  }

  if (normalizedMimeType === "application/pdf") {
    return { ok: false, error: "Поддерживаются JPEG, PNG, WebP" };
  }

  if (
    !ALLOWED_PHOTO_MIME_TYPES.includes(
      normalizedMimeType as (typeof ALLOWED_PHOTO_MIME_TYPES)[number]
    )
  ) {
    return { ok: false, error: "Поддерживаются JPEG, PNG, WebP" };
  }

  if (file.size > MAX_PHOTO_FILE_BYTES) {
    return { ok: false, error: "Слишком большой файл. Максимум 10 МБ" };
  }

  if (file.size >= PHOTO_WARNING_BYTES) {
    return { ok: true, warning: "Большой файл может загружаться дольше" };
  }

  return { ok: true };
};
