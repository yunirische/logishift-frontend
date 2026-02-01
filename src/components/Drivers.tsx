import React, { useEffect, useState } from "react";
import { API_ENDPOINTS } from "../constants";
import api from "../services/api";
import { UserRole } from "../types";
import { Pencil, Copy, Plus, X, CheckCircle2, Trash2 } from "lucide-react";
import { useFocusTrap, useFocusRestore } from "../hooks/useFocusTrap";

interface Driver {
  id: number;
  full_name: string;
  role: UserRole;
  phone_number?: string;
  vehicle_info?: string;
  last_activity?: string;
  is_active: boolean;
  hourly_rate?: number;
}

const Drivers: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [toast, setToast] = useState<{show: boolean; message: string}>({show: false, message: ''});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    role: UserRole.DRIVER,
    hourly_rate: 0,
  });
  const [saving, setSaving] = useState(false);

  // Focus trap for invite modal
  const inviteModalRef = useFocusTrap(inviteModalOpen);
  useFocusRestore(inviteModalOpen);

  // Focus trap for edit modal
  const editModalRef = useFocusTrap(editModalOpen);
  useFocusRestore(editModalOpen);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const data = await api.get(API_ENDPOINTS.DRIVERS);
      setDrivers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Ошибка связи с сервером");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    setInviteLoading(true);
    try {
      const result = await api.post(API_ENDPOINTS.INVITES, {});
      // Предполагаем, что ответ содержит поле `link` или `url` или `code`
      const link = result.link || result.url || result.invite_url || 
                   (result.code ? `/invite/${result.code}` : '');
      setInviteLink(link);
      setInviteModalOpen(true);
    } catch (err: any) {
      alert(err.message || "Ошибка создания приглашения");
    } finally {
      setInviteLoading(false);
    }
  };

  const copyToClipboard = () => {
    // Extract invite code from the link (format may be /invite/CODE or just CODE)
    let inviteCode = inviteLink;
    if (inviteLink.includes('/invite/')) {
      inviteCode = inviteLink.split('/invite/')[1];
    }

    // Build full registration URL
    const fullUrl = `${window.location.origin}/register?code=${inviteCode}`;

    // Copy to clipboard
    navigator.clipboard.writeText(fullUrl);

    // Show toast notification
    setToast({show: true, message: 'Ссылка скопирована!'});

    // Auto-hide after 2 seconds
    setTimeout(() => {
      setToast({show: false, message: ''});
    }, 2000);
  };

  const openEditModal = (driver: Driver) => {
    setCurrentDriver(driver);
    setEditForm({
      full_name: driver.full_name,
      role: driver.role,
      hourly_rate: driver.hourly_rate || 0,
    });
    setEditModalOpen(true);
  };

  const saveEdit = async () => {
    if (!currentDriver) return;
    setSaving(true);
    try {
      await api.patch(API_ENDPOINTS.UPDATE_USER(currentDriver.id), editForm);
      await fetchDrivers();
      setEditModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (driver: Driver) => {
    if (!confirm(`Удалить сотрудника ${driver.full_name}?`)) return;
    try {
      await api.del(API_ENDPOINTS.UPDATE_USER(driver.id));
      await fetchDrivers();
    } catch (err: any) {
      alert(err.message || "Ошибка удаления");
    }
  };

  if (loading)
    return (
      <div className="p-20 text-center animate-pulse text-[#0a192f] font-semibold uppercase tracking-widest text-xs">
        Загрузка штата KONTROLSMEN...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-[#1B254B]">Персонал</h2>
          <p className="text-sm text-slate-400 font-medium">Управление сотрудниками</p>
        </div>
        <button
          onClick={handleInvite}
          disabled={inviteLoading}
          className="flex items-center gap-2 px-6 py-3 bg-[#0a192f] text-white rounded-lg font-bold hover:bg-[#152238] transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50"
        >
          <Plus size={20} />
          {inviteLoading ? "Создание..." : "Пригласить водителя"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 flex items-center gap-2">
          <span>🚨</span> {error}
        </div>
      )}

      {drivers.length === 0 && !error ? (
        <div className="p-20 text-center bg-white rounded-lg text-slate-300 italic">
          Список водителей пуст
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className="bg-white p-6 rounded-lg border border-slate-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="text-4xl">🚚</span>
              </div>
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg shadow-inner ${
                    driver.is_active
                      ? "bg-indigo-100 text-[#0a192f]"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {driver.full_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-[#1B254B] truncate text-base">
                    {driver.full_name}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">
                    {driver.role}
                  </p>
                </div>
                <button
                  onClick={() => openEditModal(driver)}
                  className="min-w-[40px] min-h-[40px] p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-100 hover:text-[#0a192f] transition-colors"
                  aria-label={`Редактировать ${driver.full_name}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(driver)}
                  className="min-w-[40px] min-h-[40px] p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors"
                  aria-label={`Удалить ${driver.full_name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="pt-4 border-t border-slate-50 text-sm space-y-2 relative z-10">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium text-xs">
                    Ставка:
                  </span>
                  <span className="font-bold text-[#1B254B] text-[10px] px-2 py-1 bg-slate-50 rounded-lg uppercase tracking-tight">
                    {driver.hourly_rate ? `${driver.hourly_rate} ₽/час` : "Не указана"}
                  </span>
                </div>
                {driver.last_activity && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium text-xs">
                      Активность:
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(driver.last_activity).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка приглашения */}
      {inviteModalOpen && (
        <div
          ref={inviteModalRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-modal-title"
        >
          <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 id="invite-modal-title" className="text-xl font-semibold text-[#1B254B]">Приглашение создано</h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"
                aria-label="Закрыть модальное окно"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <p className="text-slate-600 mb-4">
              Отправьте эту ссылку новому водителю для регистрации:
            </p>
            <div className="flex items-center gap-2 mb-6">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/register?code=${inviteLink.includes('/invite/') ? inviteLink.split('/invite/')[1] : inviteLink}`}
                className="flex-1 p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono"
                aria-label="Ссылка приглашения"
              />
              <button
                onClick={copyToClipboard}
                className="p-3 bg-[#0a192f] text-white rounded-lg hover:bg-[#152238]"
                aria-label="Копировать ссылку"
              >
                <Copy size={18} />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setInviteModalOpen(false)}
                className="flex-1 py-3 rounded-lg border border-slate-200 font-bold text-slate-500 hover:bg-slate-50"
              >
                Закрыть
              </button>
              <button
                onClick={copyToClipboard}
                className="flex-1 py-3 rounded-lg bg-[#0a192f] text-white font-bold hover:bg-[#152238]"
              >
                Скопировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка редактирования */}
      {editModalOpen && currentDriver && (
        <div
          ref={editModalRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 id="edit-modal-title" className="text-xl font-semibold text-[#1B254B]">Редактировать сотрудника</h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"
                aria-label="Закрыть модальное окно"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="driver-name" className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Имя
                </label>
                <input
                  id="driver-name"
                  name="driver-name"
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  spellCheck={false}
                  className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>
              <div>
                <label htmlFor="driver-role" className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Роль
                </label>
                <select
                  id="driver-role"
                  name="driver-role"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                >
                  <option value={UserRole.DRIVER}>Водитель</option>
                  <option value={UserRole.ADMIN}>Администратор</option>
                  <option value={UserRole.FOREMAN}>Прораб</option>
                </select>
              </div>
              <div>
                <label htmlFor="driver-rate" className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Ставка (₽/час)
                </label>
                <input
                  id="driver-rate"
                  name="driver-rate"
                  type="number"
                  inputMode="numeric"
                  value={editForm.hourly_rate}
                  onChange={(e) => setEditForm({ ...editForm, hourly_rate: Number(e.target.value) })}
                  spellCheck={false}
                  className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-6">
              <button
                onClick={() => setEditModalOpen(false)}
                className="flex-1 py-3 rounded-lg border border-slate-200 font-bold text-slate-500 hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 py-3 rounded-lg bg-[#0a192f] text-white font-bold hover:bg-[#152238] disabled:opacity-50"
              >
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-[#0a192f] text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-400" />
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drivers;
