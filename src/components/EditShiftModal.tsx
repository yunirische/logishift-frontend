import React, { useState, useEffect, useMemo } from "react";
import { API_ENDPOINTS } from "../constants";
import api from "../services/api";
import { Shift } from "../types";
import { toTenantISO, fromTenantISO } from "../utils/dateUtils";
import { useFocusTrap, useFocusRestore } from "../hooks/useFocusTrap";
import { AlertCircle, MessageSquare, Send, X, Lock } from "lucide-react";
import { getUserInfo } from "../services/api";

interface Comment {
  id: number;
  text: string;
  author: string;
  created_at: string;
}

interface EditShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  shift: Shift;
  timezone: string;
}

const EditShiftModal: React.FC<EditShiftModalProps> = ({
  isOpen,
  onClose,
  onSave,
  shift,
  timezone,
}) => {
  const containerRef = useFocusTrap(isOpen);
  useFocusRestore(isOpen);

  // Get current user role
  const currentUser = getUserInfo();
  const isAdmin = currentUser?.role === 'admin';

  // Time fields
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Comments (chat style)
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlapError, setOverlapError] = useState(false);

  // Pre-fill time fields when modal opens
  useEffect(() => {
    if (isOpen && shift) {
      // Convert backend times to datetime-local format
      setStartTime(
        shift.start_time ? fromTenantISO(shift.start_time, timezone) : ""
      );
      setEndTime(
        shift.end_time ? fromTenantISO(shift.end_time, timezone) : ""
      );

      // Load comments history
      loadComments();

      setError(null);
      setOverlapError(false);
      setNewComment("");
    }
  }, [isOpen, shift, timezone]);

  // Load comment history using new GET /shifts/:id endpoint
  const loadComments = async () => {
    try {
      // Use new endpoint to fetch full shift details with comments
      const data = await api.get(API_ENDPOINTS.GET_SHIFT(shift.id));

      if (data && data.comments && Array.isArray(data.comments)) {
        setComments(data.comments);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error("Failed to load shift comments:", err);
      // If GET /shifts/:id fails, fall back to shift object
      if ((shift as any).comments && Array.isArray((shift as any).comments)) {
        setComments((shift as any).comments);
      } else {
        setComments([]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOverlapError(false);

    try {
      const payload: any = {};

      // Check what fields changed
      const originalStart = shift.start_time ? fromTenantISO(shift.start_time, timezone) : "";
      const originalEnd = shift.end_time ? fromTenantISO(shift.end_time, timezone) : "";
      const timeChanged = startTime !== originalStart || endTime !== originalEnd;
      const commentChanged = newComment.trim().length > 0;

      // Determine if this is a comment-only update
      const isCommentOnly = commentChanged && !timeChanged;

      // v1.1.2: Comment-only updates are allowed for ANY shift status
      // Time changes require admin role and can't be done on finished shifts
      if (timeChanged) {
        // Time changes: need admin + active shift
        if (!isAdmin) {
          setError("⚠️ Только администратор может изменять время смены");
          setLoading(false);
          return;
        }

        if (shift.status === 'finished') {
          setError("⚠️ Нельзя изменить время завершенной смены. Используйте только поле комментария.");
          setLoading(false);
          return;
        }

        // Send time fields
        if (startTime !== originalStart) {
          payload.start_time = toTenantISO(startTime, timezone);
        }

        if (endTime !== originalEnd) {
          payload.end_time = toTenantISO(endTime, timezone);
        }
      }

      // Append comment if provided
      if (commentChanged) {
        payload.comment = newComment.trim();
      }

      // Validate time changes
      if (timeChanged && shift.status !== 'ACTIVE') {
        // For non-active shifts, end_time must be after start_time
        if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
          setError("⚠️ Время окончания должно быть позже начала");
          setLoading(false);
          return;
        }
      }

      await api.patch(API_ENDPOINTS.UPDATE_SHIFT(shift.id), payload);
      onSave();
      onClose();
    } catch (err: any) {
      console.error("Update shift error:", err);

      // Check for overlap error (400 status with specific message)
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.response?.data?.detail || err?.message || "";
      const errorCode = err?.response?.data?.error_code || err?.response?.data?.error;

      // v1.1.2: Check for new error messages
      if (message.includes("Смена уже завершена") || message.includes("только поле comment")) {
        setError("⚠️ " + message);
        return;
      }

      if (message.includes("Водитель может добавлять комментарии только к своим сменам")) {
        setError("⚠️ " + message);
        return;
      }

      // Check for various overlap error formats
      const isOverlap =
        status === 400 &&
        (message.toLowerCase().includes("overlap") ||
          message.toLowerCase().includes("занят") ||
          message.toLowerCase().includes("уже") ||
          errorCode === "OVERLAP" ||
          errorCode === "SHIFT_OVERLAP" ||
          message.includes("машина") ||
          message.includes("водител"));

      if (isOverlap) {
        setOverlapError(true);
          setError(
          "⚠️ Эта машина или водитель уже заняты в указанный период"
        );
      } else {
        // Extract backend error message
        setError(message || "Failed to update shift");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !loading) {
      onClose();
    }
  };

  // Validate: end_time must be after start_time (only if end_time is provided)
  // For ACTIVE shifts, end_time can be empty (shift is still ongoing)
  // For FINISHED shifts with comment-only update, validation is bypassed
  const isEndTimeInvalid = startTime && endTime && shift.status !== 'ACTIVE'
    ? new Date(endTime) <= new Date(startTime)
    : false;

  // Validate: check if year is valid (4 digits, reasonable range)
  const isValidYear = (dateString: string) => {
    if (!dateString) return true;
    const match = dateString.match(/^(\d{4})-/);
    if (!match) return false;
    const year = parseInt(match[1], 10);
    return year >= 1900 && year <= 2100;
  };

  const isStartTimeYearInvalid = !isValidYear(startTime);
  const isEndTimeYearInvalid = !isValidYear(endTime);

  // v1.1.2: Determine if changes are comment-only
  const originalStart = shift.start_time ? fromTenantISO(shift.start_time, timezone) : "";
  const originalEnd = shift.end_time ? fromTenantISO(shift.end_time, timezone) : "";
  const timeChanged = startTime !== originalStart || endTime !== originalEnd;
  const commentChanged = newComment.trim().length > 0;
  const isCommentOnly = commentChanged && !timeChanged;

  // v1.1.2: Smart save button validation
  const canSave = useMemo(() => {
    // Comment-only updates: always allowed (any status, any role)
    if (isCommentOnly) {
      return true;
    }

    // Time changes: require admin + active shift + valid times
    if (timeChanged) {
      if (!isAdmin) return false; // Only admin can change times
      if (shift.status === 'finished') return false; // Can't change finished shift times
      if (isStartTimeYearInvalid || isEndTimeYearInvalid) return false;
      if (shift.status !== 'ACTIVE' && isEndTimeInvalid) return false;
      return true;
    }

    // No changes: can't save
    return false;
  }, [isCommentOnly, timeChanged, isAdmin, shift.status, isStartTimeYearInvalid, isEndTimeYearInvalid, isEndTimeInvalid]);

  // Format comment time for display
  const formatCommentTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-50 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 id="modal-title" className="text-xl font-semibold text-[#1B254B]">
                Редактировать смену
              </h3>
              <p className="text-slate-400 text-xs font-medium mt-1 font-mono mono-id">
                ID: <span className="mono-number">#{shift.id}</span> • {shift.driver_name}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <form id="edit-shift-form" onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error message */}
            {error && (
              <div className={`px-4 py-3 rounded-lg text-sm font-medium flex items-start gap-2 ${
                overlapError
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-red-50 text-red-600 border border-red-100"
              }`}>
                {overlapError ? (
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                ) : (
                  <span>⚠️</span>
                )}
                <span>{error}</span>
              </div>
            )}

            {/* Time fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* v1.1.2: Finished shifts warning */}
              {shift.status === 'finished' && (
                <div className="md:col-span-2 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <Lock size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Смена завершена</p>
                    <p className="text-amber-700 mt-1">
                      {isAdmin
                        ? "Только добавление комментария доступно. Изменение времени невозможно."
                        : "Вы можете добавить комментарий к этой смене."}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="start-time" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Время начала *
                  {shift.status === 'finished' && !isAdmin && (
                    <span className="text-amber-600 font-normal ml-1">(только чтение)</span>
                  )}
                </label>
                <input
                  id="start-time"
                  name="start-time"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  max="2100-12-31T23:59"
                  step="60"
                  disabled={shift.status === 'finished' && !isAdmin}
                  className={`w-full px-4 py-3 rounded-lg border outline-none transition-all text-sm ${
                    (shift.status === 'finished' && !isAdmin)
                      ? "bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
                      : isStartTimeYearInvalid
                      ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-slate-200 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20"
                  }`}
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Часовой пояс: {timezone}
                </p>
                {isStartTimeYearInvalid && (
                  <p className="text-[10px] text-red-500 mt-1">
                    Некорректный год (1900-2100)
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="end-time" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Время окончания
                  {shift.status === 'ACTIVE' && <span className="text-slate-400 font-normal ml-1">(опционально)</span>}
                  {shift.status === 'finished' && !isAdmin && (
                    <span className="text-amber-600 font-normal ml-1">(только чтение)</span>
                  )}
                </label>
                <input
                  id="end-time"
                  name="end-time"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  max="2100-12-31T23:59"
                  step="60"
                  disabled={shift.status === 'ACTIVE' || (shift.status === 'finished' && !isAdmin)}
                  className={`w-full px-4 py-3 rounded-lg border outline-none transition-all text-sm ${
                    shift.status === 'ACTIVE' || (shift.status === 'finished' && !isAdmin)
                      ? "bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
                      : isEndTimeInvalid || isEndTimeYearInvalid
                        ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-200 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20"
                  }`}
                />
                {isEndTimeYearInvalid && shift.status !== 'ACTIVE' && !(shift.status === 'finished' && !isAdmin) ? (
                  <p className="text-[10px] text-red-500 mt-1">
                    Некорректный год (1900-2100)
                  </p>
                ) : isEndTimeInvalid && shift.status !== 'ACTIVE' && !(shift.status === 'finished' && !isAdmin) ? (
                  <p className="text-[10px] text-red-500 mt-1">
                    Должно быть позже начала
                  </p>
                ) : shift.status === 'ACTIVE' ? (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Смена активна — время окончания нельзя изменить
                  </p>
                ) : shift.status === 'finished' && !isAdmin ? (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Завершенная смена — время нельзя изменить
                  </p>
                ) : null}
              </div>
            </div>

            {/* Comments Section (Chat Style) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={16} className="text-slate-500" />
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Комментарии и история
                  {shift.status === 'finished' && (
                    <span className="text-amber-600 font-normal ml-2">(добавление комментариев разрешено)</span>
                  )}
                </label>
              </div>

              {/* Chat History (Read-only) */}
              <div className="mb-3 p-4 bg-slate-50 rounded-lg border border-slate-100 max-h-48 overflow-y-auto">
                {comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-700">
                            {comment.author}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatCommentTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">
                    История комментариев пуста
                  </p>
                )}
              </div>

              {/* Add New Comment */}
              <div>
                <label htmlFor="new-comment" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {shift.status === 'finished'
                    ? "Добавить комментарий к завершенной смене"
                    : "Добавить заметку"}
                </label>
                <textarea
                  id="new-comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={shift.status === 'finished'
                    ? "Укажите причину редактирования или добавьте примечание..."
                    : "Опишите изменения или причину редактирования..."}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20 outline-none transition-all text-sm resize-none"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-50 flex-shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              type="submit"
              form="edit-shift-form"
              disabled={loading || !canSave}
              className="flex-1 px-6 py-3 rounded-lg bg-[#0a192f] text-white font-semibold text-sm hover:bg-[#152238] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>Сохранение...</>
              ) : isCommentOnly ? (
                <>
                  <Send size={16} />
                  Добавить комментарий
                </>
              ) : (
                <>
                  <Send size={16} />
                  Сохранить изменения
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
);
};

export default EditShiftModal;
