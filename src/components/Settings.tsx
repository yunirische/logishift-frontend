import React, { useState, useEffect } from "react";
import api from "../services/api";
import { API_ENDPOINTS } from "../constants";
import { Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface TenantSettings {
  name: string;
  timezone: string;
  invoice_required: boolean;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<TenantSettings>({
    name: "",
    timezone: "Europe/Moscow",
    invoice_required: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.get(API_ENDPOINTS.TENANT_SETTINGS);
      setSettings({
        name: data.name || "",
        timezone: data.timezone || "Europe/Moscow",
        invoice_required: data.invoice_required || false,
      });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      setMessage({ type: "error", text: "Не удалось загрузить настройки" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await api.patch(API_ENDPOINTS.TENANT_SETTINGS, {
        name: settings.name,
        timezone: settings.timezone,
        // invoice_required удалено, т.к. управляется на уровне объектов
      });
      setMessage({ type: "success", text: "Настройки успешно сохранены" });
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage({ type: "error", text: "Ошибка при сохранении настроек" });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !saving) {
      // Optional: close form or navigate away
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8">
          <h1 className="text-3xl font-black text-white tracking-tight">
            Настройки организации
          </h1>
          <p className="text-indigo-100 mt-2 text-sm font-medium opacity-90">
            Управление параметрами вашей компании
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-8 space-y-8">
          {/* Company Name */}
          <div className="space-y-3">
            <label htmlFor="company-name" className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
              Название компании
            </label>
            <input
              id="company-name"
              name="company-name"
              type="text"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-slate-800 font-medium"
              placeholder="Введите название компании"
            />
          </div>

          {/* Timezone */}
          <div className="space-y-3">
            <label htmlFor="timezone" className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
              Часовой пояс
            </label>
            <div className="relative">
              <select
                id="timezone"
                name="timezone"
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-slate-800 font-medium appearance-none bg-white cursor-pointer"
              >
                <option value="Europe/Moscow">Europe/Moscow (UTC+3)</option>
                <option value="Asia/Yekaterinburg">Asia/Yekaterinburg (UTC+5)</option>
                <option value="Asia/Novosibirsk">Asia/Novosibirsk (UTC+7)</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" aria-hidden="true">
                ▼
              </div>
            </div>
          </div>


          {/* Message */}
          {message && (
            <div
              className={`flex items-center gap-3 p-4 rounded-xl ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-100"
                  : "bg-red-50 text-red-800 border border-red-100"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Сохранить
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
