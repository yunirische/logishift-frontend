import React, { useState, useEffect } from "react";
import api, { getUserInfo, unlinkTelegram } from "../services/api";
import { API_ENDPOINTS } from "../constants";
import { User } from "../types";
import { Save, Loader2, CheckCircle2, AlertCircle, Send, ExternalLink, Check } from "lucide-react";

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tgLinkCode, setTgLinkCode] = useState<string | null>(null);
  const [tgLoading, setTgLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
    // Load user info from localStorage
    const userInfo = getUserInfo();
    if (userInfo) {
      setUser(userInfo);
    }
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.get(API_ENDPOINTS.TENANT_SETTINGS);

      // Add null/undefined check
      if (!data || typeof data !== 'object') {
        throw new Error("Invalid data received from server");
      }

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

  const handleGenerateTelegramLink = async () => {
    setTgLoading(true);
    setMessage(null);
    try {
      const result = await api.get(API_ENDPOINTS.AUTH_LINK_TOKEN);
      setTgLinkCode(result.code);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Ошибка генерации ссылки" });
    } finally {
      setTgLoading(false);
    }
  };

  const openTelegramBot = () => {
    if (tgLinkCode) {
      // Open Telegram bot with the link code (GSD spec format)
      window.open(`https://t.me/kontrol_smen_bot?start=${tgLinkCode}`, '_blank');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Отключить Telegram-интеграцию?")) return;
    setTgLoading(true);
    setMessage(null);
    try {
      await unlinkTelegram();
      // Update local user state
      if (user) {
        const updatedUser = { ...user, tg_user_id: null };
        setUser(updatedUser);
        // Update localStorage
        localStorage.setItem('logishift_user_info', JSON.stringify(updatedUser));
      }
      setMessage({ type: "success", text: "Telegram отключен" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Ошибка отключения" });
    } finally {
      setTgLoading(false);
    }
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

          {/* Telegram Linking Card */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
              Связь с Telegram
            </label>
            <div className="bg-[#F4F7FE] rounded-lg p-6 border border-slate-100">
              {user?.tg_user_id ? (
                // Connected state
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        ✅ Связано с Telegram (ID: <span className="font-mono">{user.tg_user_id}</span>)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={tgLoading}
                    className="px-4 py-2 text-sm font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                    Отключить
                  </button>
                </div>
              ) : (
                // Not connected state
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Подключите Telegram-бота для получения уведомлений о сменах, объектах и важных событиях.
                  </p>
                  {!tgLinkCode ? (
                    <button
                      type="button"
                      onClick={handleGenerateTelegramLink}
                      disabled={tgLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-[#0a192f] hover:bg-[#152238] text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-[#0a192f]/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {tgLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Генерация...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Связать с Telegram
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-white rounded-md p-3 border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1">Ваш код для связи:</p>
                        <p className="font-mono text-lg font-bold text-[#0a192f] tracking-wider">{tgLinkCode}</p>
                      </div>
                      <button
                        type="button"
                        onClick={openTelegramBot}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-[#0088cc]/20 active:scale-95"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Открыть Telegram
                      </button>
                      <p className="text-xs text-slate-500">
                        Нажмите кнопку и перейдите в бота для завершения привязки
                      </p>
                    </div>
                  )}
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
