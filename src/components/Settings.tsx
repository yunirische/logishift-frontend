import React, { useState, useEffect } from "react";
import api, { getAnalyticsUsage } from "../services/api";
import { API_ENDPOINTS } from "../constants";
import { Save, Loader2, CheckCircle2, AlertCircle, Send, Check } from "lucide-react";
import { AnalyticsUsage } from "../types";

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
  const [usage, setUsage] = useState<AnalyticsUsage | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [data, usageData] = await Promise.all([
        api.get(API_ENDPOINTS.TENANT_SETTINGS),
        getAnalyticsUsage().catch(() => null), // Gracefully handle analytics errors
      ]);

      // Add null/undefined check
      if (!data || typeof data !== 'object') {
        throw new Error("Invalid data received from server");
      }

      setSettings({
        name: data.name || "",
        timezone: data.timezone || "Europe/Moscow",
        invoice_required: data.invoice_required || false,
      });

      // Set usage data
      if (usageData) {
        setUsage(usageData);
      }
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

  const getUsageBarColor = (percent: number | null): string => {
    if (percent === null) return "bg-slate-200";
    if (percent >= 100) return "bg-red-500";
    if (percent >= 80) return "bg-amber-500";
    return "bg-[#0a192f]";
  };

  const renderUsageBar = (current: number, limit: number, percent: number | null, label: string) => {
    const displayPercent = percent ?? 0;
    const isUnlimited = limit === -1;

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-slate-700">{label}</span>
          <span className={`text-sm font-mono font-semibold ${displayPercent >= 100 ? 'text-red-600' : displayPercent >= 80 ? 'text-amber-600' : 'text-[#0a192f]'}`}>
            {isUnlimited ? "∞" : `${current} / ${limit}`}
          </span>
        </div>
        {!isUnlimited && (
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getUsageBarColor(percent)} transition-all duration-500`}
              style={{ width: `${Math.min(displayPercent, 100)}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0a192f]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0a192f] to-[#1e293b] p-8">
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            Настройки организации
          </h1>
          <p className="text-[#0a192f]/80 mt-2 text-sm font-medium opacity-90">
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
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20 outline-none transition-all text-slate-800 font-medium"
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
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20 outline-none transition-all text-slate-800 font-medium appearance-none bg-white cursor-pointer"
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

          {/* Messenger Status Card */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
              Мессенджер MAX
            </label>
            <div className="bg-[#F4F7FE] rounded-lg p-6 border border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-800">Мессенджер MAX</p>
                  <p className="text-sm text-slate-600">
                    Интеграция с MAX запланирована. Сейчас подключение недоступно.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
                  В разработке
                </span>
              </div>
            </div>
          </div>

          {/* Quota Usage Card */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
              Использование ресурсов
            </label>
            <div className="bg-[#F4F7FE] rounded-lg p-6 border border-slate-100 space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex justify-between mb-2">
                        <div className="h-4 bg-slate-200 rounded w-24"></div>
                        <div className="h-4 bg-slate-200 rounded w-16"></div>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full w-full"></div>
                    </div>
                  ))}
                </div>
              ) : usage ? (
                <>
                  {renderUsageBar(usage.trucks.current, usage.trucks.limit, usage.trucks.utilization_percent, "Грузовики")}
                  {renderUsageBar(usage.drivers.current, usage.drivers.limit, usage.drivers.utilization_percent, "Водители")}
                  {renderUsageBar(usage.sites.current, usage.sites.limit, usage.sites.utilization_percent, "Объекты")}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500">Данные недоступны</p>
                  <p className="text-xs text-slate-400 mt-1">Возможно, аналитика отключена для вашего тарифа</p>
                </div>
              )}
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`flex items-center gap-3 p-4 rounded-lg ${
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
              className="flex items-center gap-2 px-8 py-3 bg-[#0a192f] hover:bg-[#152238] text-white font-bold rounded-lg transition-all shadow-lg shadow-[#0a192f]/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
