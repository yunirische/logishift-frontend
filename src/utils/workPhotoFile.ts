const MIB = 1024 * 1024;
const MAX_SOURCE_BYTES = 32 * MIB;
const MAX_SOURCE_PIXELS = 64_000_000;
const MAX_UPLOAD_BYTES = 8 * MIB;
const MAX_EDGE = 1920;
const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function newWorkPhotoUploadId(): string {
  // getRandomValues is usable on mobile installations without randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function prepareWorkPhotoFile(file: File): Promise<File> {
  if (!file.size) throw new Error("Файл пустой. Выберите другой снимок.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("Исходник больше 32 МиБ. Выберите уменьшенную копию снимка.");

  const type = file.type.toLowerCase();
  const mayBeHeic = /^image\/hei[cf](?:-sequence)?$/.test(type)
    || (["", "application/octet-stream"].includes(type) && /\.hei[cf]$/i.test(file.name));
  const namedImage = ["", "application/octet-stream"].includes(type) && /\.(?:jpe?g|png|webp)$/i.test(file.name);
  if (!UPLOAD_TYPES.includes(type) && !mayBeHeic && !namedImage) {
    throw new Error("Выберите снимок JPEG, PNG, WebP или HEIC/HEIF.");
  }

  const source = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(mayBeHeic
        ? "Этот браузер не открывает HEIC. Выберите JPEG или сделайте снимок камерой."
        : "Не удалось открыть изображение. Выберите другой снимок."));
      image.src = source;
    });
    const { naturalWidth: width, naturalHeight: height } = image;
    if (!width || !height || width * height > MAX_SOURCE_PIXELS) {
      throw new Error("Разрешение исходника превышает 64 Мп. Выберите уменьшенную копию.");
    }
    const edge = Math.max(width, height);
    if (edge <= MAX_EDGE && file.size < MAX_UPLOAD_BYTES && UPLOAD_TYPES.includes(type)) return file;

    const scale = Math.min(1, MAX_EDGE / edge);
    const canvas = document.createElement("canvas");
    try {
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Не удалось подготовить фото. Выберите уменьшенную копию.");
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
      if (!jpeg || jpeg.type !== "image/jpeg" || jpeg.size >= MAX_UPLOAD_BYTES) {
        throw new Error("Не удалось уменьшить фото. Выберите уменьшенную копию.");
      }
      return new File([jpeg], "work-photo.jpg", { type: "image/jpeg", lastModified: file.lastModified });
    } finally {
      canvas.width = canvas.height = 0;
    }
  } finally {
    image.removeAttribute("src");
    URL.revokeObjectURL(source);
  }
}
