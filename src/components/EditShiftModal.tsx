import React, { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../constants";
import api from "../services/api";
import { Shift } from "../types";
import { toTenantISO, fromTenantISO } from "../utils/dateUtils";
import { useFocusTrap, useFocusRestore } from "../hooks/useFocusTrap";

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
  const [formData, setFormData] = useState({
    start_time: "",
    end_time: "",
    comment: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && shift) {
      // DEBUG: Log shift keys if start_time is missing
      if (!shift.start_time) {
        console.log("DEBUG: shift object keys:", Object.keys(shift));
        console.log("DEBUG: full shift object:", shift);
      }

      setFormData({
        start_time: shift.start_time ? fromTenantISO(shift.start_time, timezone) : "",
        end_time: shift.end_time ? fromTenantISO(shift.end_time, timezone) : "",
        comment: shift.comment || "",
      });
      setError(null);
    }
  }, [isOpen, shift, timezone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        comment: formData.comment,
      };

      if (formData.start_time) {
        payload.start_time = toTenantISO(formData.start_time, timezone);
      }

      if (formData.end_time) {
        payload.end_time = toTenantISO(formData.end_time, timezone);
      }

      await api.patch(API_ENDPOINTS.UPDATE_SHIFT(shift.id), payload);
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to update shift");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !loading) {
      onClose();
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
      <div className="bg-white rounded-[40px] shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-8 border-b border-slate-50">
          <h3 id="modal-title" className="text-xl font-black text-[#1B254B]">
            Редактировать смену
          </h3>
          <p className="text-slate-400 text-xs font-medium mt-1">
            ID: {shift.id} • {shift.driver_name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="start-time" className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
              Время начала
            </label>
            <input
              id="start-time"
              name="start-time"
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) =>
                setFormData({ ...formData, start_time: e.target.value })
              }
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Часовой пояс: {timezone}
            </p>
          </div>

          <div>
            <label htmlFor="end-time" className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
              Время окончания (опционально)
            </label>
            <input
              id="end-time"
              name="end-time"
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) =>
                setFormData({ ...formData, end_time: e.target.value })
              }
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label htmlFor="comment" className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
              Комментарий
            </label>
            <textarea
              id="comment"
              name="comment"
              value={formData.comment}
              onChange={(e) =>
                setFormData({ ...formData, comment: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm resize-none"
              placeholder="Добавьте комментарий..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditShiftModal;
