import { useActionDialog } from "./ActionDialog";
import React, { useState, useEffect } from 'react';
import { MapPin, Camera, FileText, Image, Plus, Pencil, Trash2, X, Building } from 'lucide-react';
import api from '../services/api';
import { API_ENDPOINTS } from '../constants';
import { useFocusTrap, useFocusRestore } from '../hooks/useFocusTrap';

const Objects: React.FC = () => {
  const { ask, dialog } = useActionDialog();
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    odometer_required: false,
    invoice_required: false,
    work_photo_required: false,
    is_active: true
  });
  const [isSaving, setIsSaving] = useState(false);

  const modalRef = useFocusTrap(isModalOpen);
  useFocusRestore(isModalOpen);

  // Функция загрузки объектов
  const fetchSites = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.SITES);
      setSites(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
      void ask('Не удалось загрузить список объектов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleAddClick = () => {
    setEditingSite(null);
    setFormData({ name: '', address: '', odometer_required: false, invoice_required: false, work_photo_required: false, is_active: true });
    setIsModalOpen(true);
  };

  const handleEditClick = (site: any) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      address: site.address || '',
      odometer_required: site.odometer_required,
      invoice_required: site.invoice_required,
      work_photo_required: site.work_photo_required === true,
      is_active: site.is_active
    });
    setIsModalOpen(true);
  };

  // Удаление объекта
  const handleDeleteClick = async (id: number, name: string) => {
    if (!await ask(`Вы уверены, что хотите удалить объект "${name}"?`, "Удалить")) return;

    try {
      await api.del(API_ENDPOINTS.DELETE_SITE(id));
      await fetchSites();
    } catch (error: any) {
      console.error('Ошибка удаления:', error);
      const msg = error?.response?.data?.message || error?.message || 'Ошибка при удалении';
      void ask(msg);
    }
  };

  // Сохранение (Создание или Редактирование)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return void ask('Название объекта обязательно');

    setIsSaving(true);
    try {
      if (editingSite) {
        // Редактирование: PATCH на конкретный URL
        await api.patch(`${API_ENDPOINTS.SITES}/${editingSite.id}`, formData);
      } else {
        // Создание: POST на базовый URL
        await api.post(API_ENDPOINTS.ADD_SITE, formData);
      }
      setIsModalOpen(false);
      await fetchSites(); // Обновляем список
    } catch (error: any) {
      console.error('Ошибка сохранения:', error);
      let msg = 'Ошибка сохранения объекта';
      // ApiError type has direct 'status' and 'message' properties (from api.ts)
      if (error?.status === 403 || error?.status === 400) {
        msg = error?.message || 'Превышен лимит тарифа или недостаточно прав';
      } else if (error?.message) {
        msg = error.message;
      }
      // Обработка лимитов
      if (msg.includes("LIMIT_REACHED") || msg.includes("лимит") || error?.backendCode === "LIMIT_REACHED") {
        msg = "Лимит вашего тарифа исчерпан. Удалите старые записи или обновите план.";
      }
      void ask(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Загрузка объектов...</div>;

  return (
    <div className="space-y-6">
      {dialog}
      {/* Кнопка добавления */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#1B254B]">Объекты</h2>
          <p className="text-sm text-slate-400 font-medium">Места работ: стройки, склады, точки доставки или объекты клиента.</p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-6 py-3 bg-[#0a192f] text-white rounded-xl font-bold hover:bg-[#152238] transition-colors shadow-lg shadow-indigo-200"
        >
          <Plus size={20} />
          Добавить объект
        </button>
      </div>

      {/* Сетка объектов */}
      {sites.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center animate-in fade-in">
          <h3 className="text-lg font-semibold text-[#1B254B]">Объектов пока нет</h3>
          <p className="mt-2 text-sm text-slate-500">
            Создайте первый объект работы. Здесь можно настроить требования к одометру, накладной и фотоотчёту.
          </p>
          <button
            onClick={handleAddClick}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0a192f] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#152238]"
          >
            <Plus size={18} />
            Добавить объект
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
          {sites.map((s) => (
            <div key={s.id} className={`bg-white p-4 rounded-lg border border-slate-200 shadow-sm relative group ${s.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
            
            {/* Кнопки действий */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => handleEditClick(s)}
                className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-100 hover:text-[#0a192f] transition-colors"
                title="Редактировать"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDeleteClick(s.id, s.name)}
                className="p-2 bg-slate-100 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                title="Удалить"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex justify-between items-start pr-16">
              <div className="p-2 bg-indigo-50 text-[#0a192f] rounded-lg">
                <Building size={28} strokeWidth={2} />
              </div>
              {!s.is_active && <span className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase bg-slate-100 text-slate-500">Неактивен</span>}
            </div>
            
            <h4 className="mt-4 font-bold text-[#1B254B] text-lg">{s.name}</h4>
            {s.address && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                <MapPin size={12} />
                <span className="truncate">{s.address}</span>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 mt-3">
              {s.odometer_required && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold">
                  <Camera size={12} />
                  <span>Одометр</span>
                </div>
              )}
              {s.invoice_required && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold">
                  <FileText size={12} />
                  <span>Накладная</span>
                </div>
              )}
              {s.work_photo_required && (
                <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-bold text-indigo-700">
                  <Image size={12} aria-hidden="true" />
                  <span>Фотоотчёт</span>
                </div>
              )}
            </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно (с исправленной логикой видимости) */}
      {isModalOpen && (
        <div
          ref={modalRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="site-modal-title"
        >
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden p-5 shadow-sm border border-slate-200 animate-in zoom-in-95">
            <div className="flex shrink-0 justify-between items-center mb-6">
              <h3 id="site-modal-title" className="text-xl font-semibold text-[#1B254B]">
                {editingSite ? 'Редактировать объект' : 'Новый объект'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                aria-label="Закрыть модальное окно"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
              <div className="min-h-0 space-y-4 overflow-y-auto">
              <div>
                <label htmlFor="site-name" className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Название
                </label>
                <input
                  id="site-name"
                  name="site-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20 outline-none transition-all font-bold text-[#1B254B]"
                  placeholder="Например, Стройка №1"
                  spellCheck={false}
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="site-address" className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Адрес
                </label>
                <input
                  id="site-address"
                  name="site-address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  inputMode="text"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20 outline-none transition-all text-slate-600"
                  placeholder="Например, ул. Строителей, 10"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Camera size={18} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Требовать фото одометра</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.odometer_required}
                    onChange={(e) => setFormData({ ...formData, odometer_required: e.target.checked })}
                    className="w-5 h-5 text-[#0a192f] rounded focus:ring-indigo-500 border-gray-300"
                  />
                </label>

                <label className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <FileText size={18} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Требовать накладную</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.invoice_required}
                    onChange={(e) => setFormData({ ...formData, invoice_required: e.target.checked })}
                    className="w-5 h-5 text-[#0a192f] rounded focus:ring-indigo-500 border-gray-300"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="shrink-0 rounded-lg bg-indigo-50 p-2 text-indigo-700">
                      <Image size={18} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <span id="site-work-photo-label" className="block text-sm font-bold text-slate-700">Требовать фотоотчёт о работе</span>
                      <span id="site-work-photo-description" className="mt-1 block text-xs text-slate-500">
                        Для новых смен на объекте нужен хотя бы один снимок результата или препятствия.
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    aria-labelledby="site-work-photo-label"
                    aria-describedby="site-work-photo-description"
                    checked={formData.work_photo_required}
                    onChange={(e) => setFormData({ ...formData, work_photo_required: e.target.checked })}
                    className="w-5 h-5 shrink-0 text-[#0a192f] rounded focus:ring-indigo-500 border-gray-300"
                  />
                </label>

                 <label className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-700">Активен</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 text-[#0a192f] rounded focus:ring-indigo-500 border-gray-300"
                  />
                </label>
              </div>

              </div>

              <div className="flex shrink-0 gap-3 pt-4">
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
                  className="flex-1 py-3 rounded-xl bg-[#0a192f] text-white font-bold hover:bg-[#152238] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Сохранение...' : (editingSite ? 'Сохранить' : 'Создать')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Objects;
