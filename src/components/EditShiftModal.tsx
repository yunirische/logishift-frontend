import React, { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../constants";
import api from "../services/api";
import { Shift } from "../types";
import { toTenantISO, fromTenantISO } from "../utils/dateUtils";
import { useFocusTrap, useFocusRestore } from "../hooks/useFocusTrap";
import { AlertCircle, MessageSquare, Send, X } from "lucide-react";

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

  // Load comment history
  const loadComments = async () => {
    try {
      // Assuming shift has comments array or we fetch from API
      // For now, let's assume comments come with shift object
      if ((shift as any).comments && Array.isArray((shift as any).comments)) {
        setComments((shift as any).comments);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOverlapError(false);

    try {
      const payload: any = {
        start_time: toTenantISO(startTime, timezone),
        end_time: endTime ? toTenantISO(endTime, timezone) : null,
      };

      // Append new comment if provided
      if (newComment.trim()) {
        payload.comment = newComment.trim();
      }

      await api.patch(API_ENDPOINTS.UPDATE_SHIFT(shift.id), payload);
      onSave();
      onClose();
    } catch (err: any) {
      console.error("Update shift error:", err);

      // Check for overlap error (400 status with specific message)
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || "";
      const errorCode = err?.response?.data?.error_code || err?.response?.data?.error;

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
        const errorMessage =
          message || "Failed to update shift";
        setError(errorMessage);
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

  // Validate: end_time must be after start_time
  const isEndTimeInvalid = startTime && endTime
    ? new Date(endTime) <= new Date(startTime)
    : false;

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
              <p className="text-slate-400 text-xs font-medium mt-1 font-mono">
                ID: #{shift.id} • {shift.driver_name}
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
              <div>
                <label htmlFor="start-time" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Время начала *
                </label>
                <input
                  id="start-time"
                  name="start-time"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Часовой пояс: {timezone}
                </p>
              </div>

              <div>
                <label htmlFor="end-time" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Время окончания
                </label>
                <input
                  id="end-time"
                  name="end-time"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border outline-none transition-all text-sm ${
                    isEndTimeInvalid
                      ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  }`}
                />
                {isEndTimeInvalid && (
                  <p className="text-[10px] text-red-500 mt-1">
                    Должно быть позже начала
                  </p>
                )}
              </div>
            </div>

            {/* Comments Section (Chat Style) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={16} className="text-slate-500" />
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Комментарии и история
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
                  Добавить заметку
                </label>
                <textarea
                  id="new-comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Опишите изменения или причину редактирования..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm resize-none"
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
              disabled={loading || isEndTimeInvalid}
              className="flex-1 px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>Сохранение...</>
              ) : (
                <>
                  <Send size={16} />
                  Сохранить
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
