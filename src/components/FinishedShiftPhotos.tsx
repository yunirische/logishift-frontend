import React, { useEffect, useMemo, useRef } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  FileImage,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { Button } from "./ui";
import { Shift } from "../types";
import {
  FinishedShiftPhotoType,
  getFinishedShiftPhotoProgress,
  getFinishedShiftPhotoSlots,
} from "../utils/finishedShiftPhotos";

type PhotoDraft = {
  reason: string;
  file: File | null;
};

interface FinishedShiftPhotosProps {
  shift: Shift;
  className?: string;
  openFormKey: string | null;
  focusReturnKey: string | null;
  drafts: Record<string, PhotoDraft>;
  submitting: Record<string, boolean>;
  previewing: Record<string, boolean>;
  maxReasonLength: number;
  onToggleForm: (formKey: string) => void;
  onCancelForm: (formKey: string) => void;
  onReasonChange: (formKey: string, value: string) => void;
  onFileChange: (formKey: string, file: File | null) => void;
  onSubmit: (params: {
    shiftId: number;
    type: FinishedShiftPhotoType;
  }) => void;
  onPreview: (shiftId: number, type: FinishedShiftPhotoType) => void;
}

const toneStyles = {
  success: {
    chip: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: CheckCircle2,
  },
  warning: {
    chip: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: AlertCircle,
  },
  neutral: {
    chip: "bg-slate-100 text-slate-600 border border-slate-200",
    icon: FileImage,
  },
} as const;

export const FinishedShiftPhotos: React.FC<FinishedShiftPhotosProps> = ({
  shift,
  className = "mt-4 rounded-lg border border-slate-200 bg-white px-3 py-3",
  openFormKey,
  focusReturnKey,
  drafts,
  submitting,
  previewing,
  maxReasonLength,
  onToggleForm,
  onCancelForm,
  onReasonChange,
  onFileChange,
  onSubmit,
  onPreview,
}) => {
  const slots = useMemo(() => getFinishedShiftPhotoSlots(shift), [shift]);
  const { requiredCount, uploadedCount, hasRequiredPhotos } = useMemo(
    () => getFinishedShiftPhotoProgress(shift),
    [shift]
  );
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!openFormKey) {
      return;
    }

    reasonRef.current?.focus();
  }, [openFormKey]);

  useEffect(() => {
    if (!focusReturnKey) {
      return;
    }

    triggerRefs.current[focusReturnKey]?.focus();
  }, [focusReturnKey]);

  return (
    <div className={className}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Camera size={15} className="text-slate-400" />
            <span>Фотографии смены</span>
          </div>
          {hasRequiredPhotos && (
            <div className="mt-1 text-xs text-slate-500">
              {uploadedCount} из {requiredCount} загружено
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {slots.map((slot) => {
          const formKey = `${shift.id}:${slot.type}`;
          const isOpen = openFormKey === formKey;
          const draft = drafts[formKey] || { reason: "", file: null };
          const isPreviewing = Boolean(previewing[formKey]);
          const isSubmitting = Boolean(submitting[formKey]);
          const formId = `finished-shift-photo-form-${formKey}`;
          const fileInputId = `finished-shift-photo-file-${formKey}`;
          const reasonId = `finished-shift-photo-reason-${formKey}`;
          const ToneIcon = toneStyles[slot.statusTone].icon;

          return (
            <div
              key={slot.type}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900">
                  {slot.label}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-flex min-h-[28px] max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${toneStyles[slot.statusTone].chip}`}
                    >
                      <ToneIcon size={13} className="shrink-0" />
                      <span className="truncate sm:whitespace-normal">
                        {slot.statusLabel}
                      </span>
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {slot.hasPhoto ? (
                      <Button
                        ref={(element: HTMLButtonElement | null) => {
                          triggerRefs.current[formKey] = element;
                        }}
                        type="button"
                        onClick={() => onPreview(shift.id, slot.type)}
                        isLoading={isPreviewing}
                        aria-label={`Открыть фото: ${slot.label}`}
                        className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        Открыть
                      </Button>
                    ) : slot.canBackfill ? (
                      <Button
                        ref={(element: HTMLButtonElement | null) => {
                          triggerRefs.current[formKey] = element;
                        }}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={formId}
                        onClick={() => onToggleForm(formKey)}
                        className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        Добавить
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              {slot.canBackfill && isOpen && (
                <div
                  id={formId}
                  className="mt-3 border-t border-slate-200 pt-3"
                >
                  <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/65 p-3">
                    <div className="space-y-1">
                      <label
                        htmlFor={reasonId}
                        className="block text-xs font-medium text-slate-600"
                      >
                        Причина дозагрузки
                      </label>
                      <textarea
                        ref={reasonRef}
                        id={reasonId}
                        value={draft.reason}
                        maxLength={maxReasonLength}
                        onChange={(event) =>
                          onReasonChange(formKey, event.target.value)
                        }
                        rows={3}
                        className="w-full max-w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/10"
                        placeholder="Почему фото добавляется после завершения смены"
                      />
                    </div>

                    <div className="space-y-2">
                      <span className="block text-xs font-medium text-slate-600">
                        Фото
                      </span>
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <label
                          htmlFor={fileInputId}
                          className="inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                        >
                          <ImagePlus size={16} />
                          <span>Выбрать фото</span>
                        </label>
                        <input
                          id={fileInputId}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) =>
                            onFileChange(formKey, event.target.files?.[0] || null)
                          }
                          className="sr-only"
                        />
                        <div
                          className="min-w-0 flex-1 text-sm text-slate-500"
                          aria-live="polite"
                        >
                          {draft.file ? (
                            <span className="block truncate">{draft.file.name}</span>
                          ) : (
                            <span>Файл не выбран</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <Button
                        type="button"
                        onClick={() => onCancelForm(formKey)}
                        className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
                      >
                        Отмена
                      </Button>
                      <Button
                        type="button"
                        onClick={() =>
                          onSubmit({ shiftId: shift.id, type: slot.type })
                        }
                        disabled={
                          draft.reason.trim().length < 3 ||
                          draft.reason.trim().length > maxReasonLength ||
                          !draft.file ||
                          isSubmitting
                        }
                        isLoading={isSubmitting}
                        aria-busy={isSubmitting}
                        className="min-h-[40px] rounded-lg bg-[#0a192f] px-4 py-2 text-sm font-semibold text-white"
                      >
                        {isSubmitting ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin" />
                            <span>Загрузка...</span>
                          </span>
                        ) : (
                          "Загрузить"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
