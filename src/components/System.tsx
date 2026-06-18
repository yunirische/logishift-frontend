import React, { useState, useEffect } from "react";
import api, { getAnalyticsUsage, unlinkTelegram } from "../services/api";
import { API_ENDPOINTS } from "../constants";
import { useAuth } from "../context/AuthContext";
import { Save, Loader2, CheckCircle2, AlertCircle, CreditCard, BarChart3, Calendar, ExternalLink, Send } from "lucide-react";
import SecurityCard from "./common/SecurityCard";
import { AnalyticsUsage } from "../types";
import { useTenantBillingSummary } from "../hooks/useTenantBillingSummary";

interface TenantSettings {
  name: string;
  timezone: string;
  invoice_required: boolean;
}

const System: React.FC = () => {
  const [settings, setSettings] = useState<TenantSettings>({
    name: "",
    timezone: "Europe/Moscow",
    invoice_required: false,
  });
  const [usage, setUsage] = useState<AnalyticsUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { user, refreshUser } = useAuth();
  const { billing, refreshBilling: refreshBillingSummary } = useTenantBillingSummary({
    autoLoad: false,
  });
  const [tgLinkCode, setTgLinkCode] = useState<string | null>(null);
  const [tgLoading, setTgLoading] = useState(false);

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    try {
      setLoading(true);
      const [settingsData, billingData, usageData] = await Promise.all([
        api.get(API_ENDPOINTS.TENANT_SETTINGS),
        refreshBillingSummary(),
        getAnalyticsUsage().catch(() => null),
      ]);

      // Settings
      if (settingsData && typeof settingsData === 'object') {
        setSettings({
          name: settingsData.name || "",
          timezone: settingsData.timezone || "Europe/Moscow",
          invoice_required: settingsData.invoice_required || false,
        });
      }

      // Usage
      if (usageData) {
        setUsage(usageData);
      }

      if (!billingData) {
        setMessage({ type: "error", text: "Не удалось загрузить данные по тарифу" });
      }
    } catch (error) {
      console.error("Failed to fetch system data:", error);
      setMessage({ type: "error", text: "Не удалось загрузить данные системы" });
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
      });
      setMessage({ type: "success", text: "Настройки успешно сохранены" });
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage({ type: "error", text: "Ошибка при сохранении настроек" });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTelegramLink = async () => {
    setTgLoading(true);
    setMessage(null);
    try {
      const result = await api.get(API_ENDPOINTS.AUTH_LINK_TOKEN);

      // Check if already linked
      if (result.alreadyLinked) {
        setMessage({ type: "success", text: "Ваш аккаунт уже связан с Telegram." });
        // Immediately refresh user profile to update UI
        await refreshUser();
        return;
      }

      setTgLinkCode(result.code);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Ошибка генерации ссылки" });
    } finally {
      setTgLoading(false);
    }
  };

  const openTelegramBot = () => {
    if (tgLinkCode) {
      window.open(`https://t.me/kontrol_smen_bot?start=${tgLinkCode}`, '_blank');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Отключить Telegram-интеграцию?")) return;
    setTgLoading(true);
    setMessage(null);
    try {
      await unlinkTelegram();
      // Refresh user profile to get updated tg_user_id
      await refreshUser();
      setMessage({ type: "success", text: "Telegram отключен" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Ошибка отключения" });
    } finally {
      setTgLoading(false);
    }
  };

  // Refresh user profile when returning from Telegram bot window
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh if user has generated a link code (indicating they're in linking flow)
      if (tgLinkCode) {
        refreshUser().catch(() => {
          // Silently fail - user will see updated state on next action
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [tgLinkCode, refreshUser]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "Не ограничено";
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const activePlanName = billing?.current_plan?.name ?? null;
  const subscriptionExpiry = billing?.subscription_expires_at ?? null;
  const subscriptionStatus = billing?.current_plan ? "active" : "unknown";

  const getUsageColor = (percent: number | null): string => {
    if (percent === null) return "bg-slate-200";
    if (percent >= 100) return "bg-red-500";
    if (percent >= 80) return "bg-amber-500";
    return "bg-[#0a192f]";
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">{label}</span>
            <span className={`text-sm font-mono font-semibold ${displayPercent >= 100 ? 'text-red-600' : displayPercent >= 80 ? 'text-amber-600' : 'text-[#0a192f]'}`}>
              {isUnlimited ? "∞" : `${current} / ${limit}`}
            </span>
          </div>
          {!isUnlimited && (
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getUsageBarColor(percent)} transition-all duration-500`}
                style={{ width: `${Math.min(displayPercent, 100)}%` }}
              />
            </div>
          )}
        </div>
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
    <div className="max-w-7xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0a192f] to-[#1e293b] rounded-2xl p-8 shadow-lg">
        <h1 className="text-3xl font-semibold text-white tracking-tight">
          Система
        </h1>
        <p className="text-[#0a192f]/80 mt-2 text-sm font-medium opacity-90">
          Управление подпиской, квотами и настройками
        </p>
      </div>

      {/* Zone A: Subscription & Quotas (Top Row) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#0a192f] to-[#1e293b] p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Подписка</h2>
                <p className="text-sm text-slate-300">Текущий статус</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Статус</p>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mt-2 ${
                  subscriptionStatus === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    subscriptionStatus === 'active'
                      ? 'bg-green-500'
                      : 'bg-slate-400'
                  }`} />
                  <span className="text-sm font-bold">
                    {subscriptionStatus === 'active' ? 'Активна' : 'Статус уточняется'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <span className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Истекает</span>
              <span className="font-mono text-sm text-slate-800 font-semibold">
                {formatDate(subscriptionExpiry)}
              </span>
            </div>
            {activePlanName ? (
              <div className="flex items-center justify-between py-3 border-t border-slate-100">
                <span className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Тариф</span>
                <span className="font-mono text-sm text-slate-800 font-semibold">{activePlanName}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between py-3 border-t border-slate-100">
                <span className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Тариф</span>
                <span className="text-sm font-semibold text-slate-500">Не удалось загрузить тариф</span>
              </div>
            )}
            <a
              href="/?tab=billing"
              className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#0a192f] hover:bg-[#152238] text-white font-bold rounded-lg transition-all shadow-lg shadow-[#0a192f]/30 active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              Открыть оплату
            </a>
          </div>
        </div>

        {/* Usage Quotas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#0a192f] to-[#1e293b] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Квоты использования</h2>
                  <p className="text-sm text-slate-300">Лимиты ресурсов</p>
                </div>
              </div>
              <button
                onClick={() => {
                  getAnalyticsUsage().then(setUsage).catch(() => {});
                }}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Обновить данные"
              >
                <Loader2 className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {renderUsageBar(usage?.trucks.current || 0, usage?.trucks.limit || 0, usage?.trucks.utilization_percent, "Грузовики")}
            {renderUsageBar(usage?.drivers.current || 0, usage?.drivers.limit || 0, usage?.drivers.utilization_percent, "Водители")}
            {renderUsageBar(usage?.sites.current || 0, usage?.sites.limit || 0, usage?.sites.utilization_percent, "Объекты")}
          </div>
        </div>
      </div>

      {/* Zone B: Security, Telegram, Zone C: Tenant Settings (Bottom Row) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Security Card */}
        <SecurityCard onSuccess={() => setMessage({ type: "success", text: "Пароль успешно изменен" })} />

        {/* Telegram Integration Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#0a192f] to-[#1e293b] p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Telegram</h2>
                <p className="text-sm text-slate-300">Связь с ботом</p>
              </div>
            </div>
          </div>
          <div className="p-6 bg-white">
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

        {/* Tenant Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#0a192f] to-[#1e293b] p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Настройки организации</h2>
                <p className="text-sm text-slate-300">Основные параметры</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-5">
            {/* Company Name */}
            <div className="space-y-2">
              <label htmlFor="company-name" className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
                Название компании
              </label>
              <input
                id="company-name"
                name="company-name"
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20 outline-none transition-all text-slate-800 font-medium"
                placeholder="Введите название компании"
              />
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <label htmlFor="timezone" className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
                Часовой пояс
              </label>
              <div className="relative">
                <select
                  id="timezone"
                  name="timezone"
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20 outline-none transition-all text-slate-800 font-medium appearance-none cursor-pointer"
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

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0a192f] hover:bg-[#152238] text-white font-bold rounded-lg transition-all shadow-lg shadow-[#0a192f]/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
};

export default System;
