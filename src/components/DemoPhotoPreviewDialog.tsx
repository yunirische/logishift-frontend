import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface DemoPhotoPreviewDialogProps {
  preview: { url: string; fileName: string } | null;
  onClose: () => void;
}

export const DemoPhotoPreviewDialog: React.FC<
  DemoPhotoPreviewDialogProps
> = ({ preview, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!preview) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, preview]);

  if (!preview) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-photo-preview-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="demo-photo-preview-title"
              className="text-base font-bold text-slate-900"
            >
              Локальное демонстрационное фото
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500">
              {preview.fileName}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Закрыть предпросмотр фотографии"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>
        <img
          src={preview.url}
          alt="Предпросмотр локального демонстрационного фото"
          className="max-h-[70vh] w-full rounded-xl bg-slate-100 object-contain"
        />
        <p className="mt-3 text-sm text-amber-700">
          Файл используется только для предпросмотра на этой странице и не
          отправляется на сервер.
        </p>
      </div>
    </div>
  );
};
