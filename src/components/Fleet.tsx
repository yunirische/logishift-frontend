import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Power, Loader2, Truck } from 'lucide-react';
import api from '../services/api';
import { API_ENDPOINTS } from '../constants';
import { useFocusTrap, useFocusRestore } from '../hooks/useFocusTrap';

const Fleet: React.FC = () => {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<any | null>(null);
  const modalRef = useFocusTrap(isModalOpen);
  useFocusRestore(isModalOpen);
  
  // Форма состояния
  const [formData, setFormData] = useState({
    name: '',
    plate: '',
    is_busy: false, // Для редактирования, если понадобится в модалке
  });
  const [isSaving, setIsSaving] = useState(false);

  // Функция загрузки техники
  const fetchTrucks = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.TRUCKS);
      setTrucks(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error('Ошибка загрузки техники:', error);
      alert('Не удалось загрузить список техники');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

  // Открытие модалки для создания
  const handleAddClick = () => {
    setEditingTruck(null);
    setFormData({ name: '', plate: '', is_busy: false });
    setIsModalOpen(true);
  };

  // Открытие модалки для редактирования
  const handleEditClick = (truck: any) => {
    setEditingTruck(truck);
    setFormData({
      name: truck.name,
      plate: truck.plate,
      is_busy: truck.is_busy
    });
    setIsModalOpen(true);
  };

  // Удаление техники
  const handleDeleteClick = async (id: number, name: string) => {
    if (!confirm(`Вы уверены, что хотите удалить машину "${name}"?`)) return;

    try {
      await api.del(API_ENDPOINTS.DELETE_TRUCK(id));
      await fetchTrucks();
    } catch (error: any) {
      console.error('Ошибка удаления:', error);
      const msg = error?.response?.data?.message || error?.message || 'Ошибка при удалении';
      alert(msg);
    }
  };

  // Переключение статуса "Занята/Свободна"
  const handleToggleBusy = async (truck: any) => {
    try {
      const newStatus = !truck.is_busy;
      // Оптимистичное обновление UI
      setTrucks(trucks.map(t => t.id === truck.id ? { ...t, is_busy: newStatus } : t));
      
      await api.patch(API_ENDPOINTS.UPDATE_TRUCK(truck.id), {
        is_busy: newStatus
      });
    } catch (error: any) {
      console.error('Ошибка обновления статуса:', error);
      // Откат при ошибке
      setTrucks(trucks.map(t => t.id === truck.id ? { ...t, is_busy: truck.is_busy } : t));
      alert('Не удалось изменить статус');
    }
  };

  // Сохранение (Создание или Редактирование)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('Название обязательно');
    if (!formData.plate.trim()) return alert('Госномер обязателен');

    setIsSaving(true);
    try {
      if (editingTruck) {
        // Редактирование: PATCH на конкретный URL
        await api.patch(API_ENDPOINTS.UPDATE_TRUCK(editingTruck.id), formData);
      } else {
        // Создание: POST на базовый URL
        await api.post(API_ENDPOINTS.ADD_TRUCK, formData);
      }
      setIsModalOpen(false);
      await fetchTrucks(); // Обновляем список
    } catch (error: any) {
      console.error('Ошибка сохранения:', error);
      let msg = 'Ошибка сохранения';
      if (error?.response?.data?.message) {
        msg = error.response.data.message;
      } else if (error?.message) {
        msg = error.message;
      }
      // Обработка лимитов
      if (error?.response?.data?.error === "LIMIT_REACHED" || msg.includes("LIMIT_REACHED") || msg.includes("лимит")) {
        msg = "Лимит вашего тарифа исчерпан. Удалите старые записи или обновите план.";
      }
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-[#0a192f]" size={32} /><span className="text-slate-500 font-medium">Загрузка автопарка...</span></div>;

  return (
    <div className="space-y-6">
      {/* Кнопка добавления */}
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-semibold text-[#1B254B]">Техника</h2>
           <p className="text-sm text-slate-400 font-medium">Машины и оборудование, которые выходят на смены.</p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-6 py-3 bg-[#0a192f] text-white rounded-lg font-bold hover:bg-[#152238] transition-colors shadow-lg shadow-indigo-200"
        >
          <Plus size={20} />
          Добавить машину
        </button>
      </div>

      {/* Таблица техники */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
        {trucks.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-lg font-semibold text-[#1B254B]">Техника еще не добавлена</h3>
            <p className="mt-2 text-sm text-slate-500">
              Добавьте первую машину, чтобы водитель мог выбрать ее при старте смены.
            </p>
            <button
              onClick={handleAddClick}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0a192f] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#152238]"
            >
              <Plus size={18} />
              Добавить машину
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Машина</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Госномер</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Статус</th>
                  <th className="px-4 py-3 w-1"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {trucks.map((t) => (
                  <tr key={t.id} className={`hover:bg-slate-50/60 transition-colors ${t.is_busy ? 'bg-orange-50/20' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Truck size={16} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-[#1B254B]">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-slate-600 text-xs bg-slate-100 px-2 py-1 rounded">
                        {t.plate || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        t.is_busy ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        <Power size={10} fill="currentColor" />
                        {t.is_busy ? 'На смене' : 'Свободна'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleToggleBusy(t)}
                          className={`px-2.5 py-1.5 text-xs font-semibold border rounded-lg transition-all ${
                            t.is_busy
                              ? 'text-orange-600 border-orange-200 hover:bg-orange-50'
                              : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          {t.is_busy ? 'Освободить' : 'На смену'}
                        </button>
                        <button
                          onClick={() => handleEditClick(t)}
                          className="p-1.5 text-slate-500 hover:text-[#0a192f] hover:bg-slate-100 rounded-lg transition-colors"
                          aria-label={`Редактировать ${t.name}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(t.id, t.name)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`Удалить ${t.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модальное окно */}
      {isModalOpen && (
        <div
          ref={modalRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="truck-modal-title"
        >
          <div className="bg-white rounded-lg w-full max-w-md p-5 shadow-sm border border-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 id="truck-modal-title" className="text-xl font-semibold text-[#1B254B]">
                {editingTruck ? 'Редактировать машину' : 'Новая машина'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                aria-label="Закрыть модальное окно"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="truck-name" className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Название
                </label>
                <input
                  id="truck-name"
                  name="truck-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 rounded-lg border border-slate-200 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20 outline-none transition-all font-bold text-[#1B254B]"
                  placeholder="Например, КАМАЗ-55111"
                  spellCheck={false}
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="truck-plate" className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Госномер
                </label>
                <input
                  id="truck-plate"
                  name="truck-plate"
                  type="text"
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                  inputMode="text"
                  className="w-full p-3 rounded-lg border border-slate-200 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20 outline-none transition-all font-mono text-[#1B254B]"
                  placeholder="А123БВ777"
                  spellCheck={false}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-lg border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-lg bg-[#0a192f] text-white font-bold hover:bg-[#152238] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Сохранение...' : (editingTruck ? 'Сохранить' : 'Создать')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fleet;
