import { X } from "lucide-react";
import React from "react";

interface ShiftHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  shifts: any[];
}

export const ShiftHistoryModal: React.FC<ShiftHistoryModalProps> = ({
  isOpen,
  onClose,
  shifts,
}) => {
  if (!isOpen) return null;

  // Format date as "DD MMM" (e.g., "15 фев")
  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Мои смены</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {shifts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              У вас пока нет завершенных смен
            </div>
          ) : (
            <div className="space-y-3">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">
                        {shift.truck?.name || shift.truck_name || '—'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {formatDate(shift.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{shift.site?.name || shift.site_name || '—'}</span>
                    <span className="font-medium">
                      {shift.hours_worked ? `${shift.hours_worked} ч` : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShiftHistoryModal;
