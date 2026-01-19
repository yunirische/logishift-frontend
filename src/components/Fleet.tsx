import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Pencil, Trash2, X, Power, Loader2 } from 'lucide-react';
import api from '../services/api';
import { API_ENDPOINTS } from '../constants';

const Fleet: React.FC = () => {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<any | null>(null);
  
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
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-indigo-600" size={32} /><span className="text-slate-500 font-medium">Загрузка автопарка...</span></div>;

  return (
    <div className="space-y-6">
      {/* Кнопка добавления */}
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-black text-[#1B254B]">Техника</h2>
           <p className="text-sm text-slate-400 font-medium">Управление парком машин</p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          <Plus size={20} />
          Добавить машину
        </button>
      </div>

      {/* Сетка техники */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
        {trucks.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400 italic bg-slate-50 rounded-[24px] border-2 border-dashed border-slate-200">
            В автопарке пока нет машин
          </div>
        )}

        {trucks.map((t) => (
          <div key={t.id} className={`bg-white p-6 rounded-[24px] border shadow-sm relative group transition-all ${t.is_busy ? 'border-orange-200 bg-orange-50/30' : 'border-slate-50'}`}>
            
            {/* Кнопки действий */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <button
                onClick={() => handleEditClick(t)}
                className="p-2 bg-white border border-slate-100 text-slate-600 rounded-lg hover:bg-indigo-100 hover:text-indigo-600 transition-colors shadow-sm"
                title="Редактировать"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDeleteClick(t.id, t.name)}
                className="p-2 bg-white border border-slate-100 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-100 transition-colors shadow-sm"
                title="Удалить"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex justify-between items-start pr-16">
              <span className="text-4xl drop-shadow-sm">🚛</span>
              {/* Статус в карточке */}
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 ${t.is_busy ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                 <Power size={10} fill="currentColor" />
                 {t.is_busy ? 'В рейсе' : 'Свободна'}
              </div>
            </div>
            
            <h4 className="mt-4 font-bold text-[#1B254B] text-lg">{t.name}</h4>
            
            <div className="flex items-center gap-2 mt-2 text-slate-500 font-medium text-sm">
               <MapPin size={14} className="text-slate-400" />
               <span className="font-mono tracking-wide">{t.plate || 'Без номера'}</span>
            </div>

            {/* Переключатель статуса (быстрое действие) */}
            <div className="mt-6 pt-4 border-t border-slate-100/50">
               <button
                 onClick={() => handleToggleBusy(t)}
                 className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                   t.is_busy 
                   ? 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50' 
                   : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                 }`}
               >
                 {t.is_busy ? 'Освободить машину' : 'Отправить в рейс'}
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* Модальное окно */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-[#1B254B]">
                {editingTruck ? 'Редактировать машину' : 'Новая машина'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Название
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-bold text-[#1B254B]"
                  placeholder="Например, КАМАЗ-55111"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Госномер
                </label>
                <input
                  type="text"
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-mono text-[#1B254B]"
                  placeholder="А123БВ777"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
