import React from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  MapPin,
  MessageSquare,
  Truck,
} from "lucide-react";
import { Button, Card } from "./ui";
import { Shift } from "../types";
import { FinishedShiftPhotos } from "./FinishedShiftPhotos";
import { FinishedShiftPhotoType } from "../utils/finishedShiftPhotos";

type HistoryPhotoDraft = {
  reason: string;
  file: File | null;
};

interface DriverShiftHistoryCardProps {
  shift: Shift;
  dateLabel: string;
  timeRangeLabel: string | null;
  durationLabel: string | null;
  canCommentShift: boolean;
  isDetailsExpanded: boolean;
  isCommentExpanded: boolean;
  commentDraft: string;
  isCommentSubmitting: boolean;
  historyPhotoOpenFormKey: string | null;
  historyPhotoFocusReturnKey: string | null;
  historyPhotoDrafts: Record<string, HistoryPhotoDraft>;
  historyPhotoSubmitting: Record<string, boolean>;
  historyPhotoPreviewing: Record<string, boolean>;
  maxShiftCommentLength: number;
  maxBackfillReasonLength: number;
  onToggleDetails: (shiftId: number) => void;
  onToggleComment: (shiftId: number, nextOpen: boolean) => void;
  onCommentDraftChange: (shiftId: number, value: string) => void;
  onSubmitComment: (shiftId: number) => void;
  onTogglePhotoForm: (formKey: string) => void;
  onCancelPhotoForm: (formKey: string) => void;
  onPhotoReasonChange: (formKey: string, value: string) => void;
  onPhotoFileChange: (formKey: string, file: File | null) => void;
  onSubmitPhoto: (params: {
    shiftId: number;
    type: FinishedShiftPhotoType;
  }) => void;
  onPreviewPhoto: (shiftId: number, type: FinishedShiftPhotoType) => void;
}

export const DriverShiftHistoryCard: React.FC<DriverShiftHistoryCardProps> = ({
  shift,
  dateLabel,
  timeRangeLabel,
  durationLabel,
  canCommentShift,
  isDetailsExpanded,
  isCommentExpanded,
  commentDraft,
  isCommentSubmitting,
  historyPhotoOpenFormKey,
  historyPhotoFocusReturnKey,
  historyPhotoDrafts,
  historyPhotoSubmitting,
  historyPhotoPreviewing,
  maxShiftCommentLength,
  maxBackfillReasonLength,
  onToggleDetails,
  onToggleComment,
  onCommentDraftChange,
  onSubmitComment,
  onTogglePhotoForm,
  onCancelPhotoForm,
  onPhotoReasonChange,
  onPhotoFileChange,
  onSubmitPhoto,
  onPreviewPhoto,
}) => {
  const detailsId = `driver-history-details-${shift.id}`;
  const statusLabel = "Завершена";
  const truckName = shift.truck?.name || shift.truck_name || "Не указана";
  const siteName = shift.site?.name || shift.site_name || "Не указан";
  const commentText =
    typeof shift.comment === "string" ? shift.comment.trim() : "";

  return (
    <Card
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70"
      data-testid={`driver-history-card-${shift.id}`}
    >
      <div
        className="border-b border-slate-200 bg-slate-100 px-4 py-4 sm:px-5 md:px-6 md:py-3.5"
        data-testid={`driver-history-header-${shift.id}`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                Смена
              </h3>
              <span className="inline-flex min-h-[28px] items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {statusLabel}
              </span>
            </div>

            <div className="mt-2 break-words text-sm text-slate-600 md:hidden">
              {dateLabel}
              {timeRangeLabel ? ` · ${timeRangeLabel}` : ""}
            </div>

            <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-700 md:hidden">
              <Clock3 size={15} className="shrink-0 text-slate-400" />
              <span>{durationLabel || "Время не указано"}</span>
            </div>
          </div>

          <div className="hidden min-w-0 shrink-0 md:flex md:flex-col md:items-end md:gap-1.5 md:text-right">
            <div className="break-words text-sm text-slate-600">
              {dateLabel}
              {timeRangeLabel ? ` · ${timeRangeLabel}` : ""}
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <Clock3 size={15} className="shrink-0 text-slate-400" />
              <span>{durationLabel || "Время не указано"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 sm:px-5 sm:py-4 md:px-6 md:py-3.5">
        <div
          className="grid gap-3 text-sm md:grid-cols-[minmax(180px,0.8fr)_minmax(240px,1.4fr)_auto] md:items-start md:gap-x-4"
          data-testid={`driver-history-summary-${shift.id}`}
        >
          <div
            className="flex min-w-0 items-start gap-2 text-slate-900"
            data-testid={`driver-history-machine-${shift.id}`}
          >
            <Truck size={14} className="mt-0.5 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Машина
              </div>
              <div className="mt-0.5 break-words font-medium">{truckName}</div>
            </div>
          </div>

          <div
            className="flex min-w-0 items-start gap-2 text-slate-900"
            data-testid={`driver-history-object-${shift.id}`}
          >
            <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Объект
              </div>
              <div className="mt-0.5 break-words font-medium">{siteName}</div>
            </div>
          </div>

          <div
            className="md:flex md:justify-self-end md:self-center"
            data-testid={`driver-history-action-${shift.id}`}
          >
            <Button
              type="button"
              aria-expanded={isDetailsExpanded}
              aria-controls={detailsId}
              onClick={() => onToggleDetails(shift.id)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              {isDetailsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {isDetailsExpanded ? "Скрыть детали" : "Подробнее"}
            </Button>
          </div>
        </div>

        {isDetailsExpanded && (
          <div
            id={detailsId}
            data-testid={`driver-history-details-${shift.id}`}
            className="mt-3 space-y-4 border-t border-slate-200 pt-4"
          >
            <section className="max-w-4xl space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-sm font-semibold text-slate-900">
                  Комментарий
                </h4>
                {canCommentShift && !isCommentExpanded && (
                  <button
                    type="button"
                    onClick={() => onToggleComment(shift.id, true)}
                    className="inline-flex min-h-[40px] max-w-full items-center gap-2 self-start whitespace-normal break-words text-sm font-medium text-[#0a192f]"
                  >
                    <MessageSquare size={15} />
                    Добавить комментарий
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/65 px-3 py-2.5">
                {commentText ? (
                  <div className="whitespace-pre-line break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">
                    {commentText}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Комментариев нет</div>
                )}
              </div>

              {canCommentShift && isCommentExpanded && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                  <label
                    htmlFor={`history-comment-${shift.id}`}
                    className="block text-sm font-medium text-slate-700"
                  >
                    Комментарий к смене
                  </label>
                  <textarea
                    id={`history-comment-${shift.id}`}
                    value={commentDraft}
                    maxLength={maxShiftCommentLength}
                    onChange={(event) =>
                      onCommentDraftChange(shift.id, event.target.value)
                    }
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/10"
                    placeholder="Добавьте пояснение к смене"
                  />
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => onToggleComment(shift.id, false)}
                      className="min-h-[40px] text-sm font-medium text-slate-500"
                    >
                      Скрыть
                    </button>
                    <Button
                      type="button"
                      onClick={() => onSubmitComment(shift.id)}
                      disabled={
                        commentDraft.trim().length === 0 || isCommentSubmitting
                      }
                      isLoading={isCommentSubmitting}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#0a192f] px-4 py-2 text-sm font-semibold text-white"
                    >
                      <MessageSquare size={14} />
                      Добавить комментарий
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <section className="max-w-4xl space-y-3">
              <FinishedShiftPhotos
                shift={shift}
                openFormKey={historyPhotoOpenFormKey}
                focusReturnKey={historyPhotoFocusReturnKey}
                drafts={historyPhotoDrafts}
                submitting={historyPhotoSubmitting}
                previewing={historyPhotoPreviewing}
                maxReasonLength={maxBackfillReasonLength}
                className="mt-0 border-slate-200 bg-slate-50/65 px-3.5 py-3"
                onToggleForm={onTogglePhotoForm}
                onCancelForm={onCancelPhotoForm}
                onReasonChange={onPhotoReasonChange}
                onFileChange={onPhotoFileChange}
                onSubmit={onSubmitPhoto}
                onPreview={onPreviewPhoto}
              />
            </section>
          </div>
        )}
      </div>
    </Card>
  );
};
