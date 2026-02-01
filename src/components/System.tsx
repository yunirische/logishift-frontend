import React, { useState, useEffect } from "react";
import api, { getSubscription, getAnalyticsUsage } from "../services/api";
import { API_ENDPOINTS } from "../constants";
import { Save, Loader2, CheckCircle2, AlertCircle, CreditCard, BarChart3, Calendar, ExternalLink } from "lucide-react";
import SecurityCard from "./common/SecurityCard";
import { SubscriptionInfo, AnalyticsUsage } from "../types";

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
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [usage, setUsage] = useState<AnalyticsUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    try {
      setLoading(true);
      const [settingsData, subscriptionData, usageData] = await Promise.all([
        api.get(API_ENDPOINTS.TENANT_SETTINGS),
        getSubscription().catch(() => ({ status: 'active', expires_at: null })),
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

      // Subscription
      if (subscriptionData) {
        setSubscription(subscriptionData);
      }

      // Usage
      if (usageData) {
        setUsage(usageData);
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

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "Не ограничено";
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getUsageColor = (percent: number | null): string => {
    if (percent === null) return "bg-slate-200";
    if (percent >= 100) return "bg-red-500";
    if (percent >= 80) return "bg-amber-500";
    return "bg-indigo-500";
  };

  const getUsageBarColor = (percent: number | null): string => {
    if (percent === null) return "bg-slate-200";
    if (percent >= 100) return "bg-red-500";
    if (percent >= 80) return "bg-amber-500";
    return "bg-indigo-500";
  };

  const renderUsageBar = (current: number, limit: number, percent: number | null, label: string) => {
    const displayPercent = percent ?? 0;
    const isUnlimited = limit === -1;

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">{label}</span>
            <span className={`text-sm font-mono font-semibold ${displayPercent >= 100 ? 'text-red-600' : displayPercent >= 80 ? 'text-amber-600' : 'text-indigo-600'}`}>
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
                  subscription?.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : subscription?.status === 'trial'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    subscription?.status === 'active'
                      ? 'bg-green-500'
                      : subscription?.status === 'trial'
                      ? 'bg-blue-500'
                      : 'bg-red-500'
                  }`} />
                  <span className="text-sm font-bold">
                    {subscription?.status === 'active' ? 'Активна' : subscription?.status === 'trial' ? 'Пробная' : 'Истекла'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <span className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Истекает</span>
              <span className="font-mono text-sm text-slate-800 font-semibold">
                {formatDate(subscription?.expires_at || null)}
              </span>
            </div>
            {subscription?.plan_name && (
              <div className="flex items-center justify-between py-3 border-t border-slate-100">
                <span className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Тариф</span>
                <span className="font-mono text-sm text-slate-800 font-semibold">{subscription.plan_name}</span>
              </div>
            )}
            <a
              href="https://t.me/logishift_support"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#0a192f] hover:bg-[#152238] text-white font-bold rounded-lg transition-all shadow-lg shadow-[#0a192f]/30 active:scale-95"
            >
              <ExternalLink className="w-4 h-4" />
              Продлить подписку
            </a>
          </div>
        </div>

        {/* Usage Quotas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#0a192f] to-[#1e293b] p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Квоты использования</h2>
                <p className="text-sm text-slate-300">Лимиты ресурсов</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {renderUsageBar(usage?.trucks.current || 0, usage?.trucks.limit || 0, usage?.trucks.utilization_percent, "Грузовики")}
            {renderUsageBar(usage?.drivers.current || 0, usage?.drivers.limit || 0, usage?.drivers.utilization_percent, "Водители")}
            {renderUsageBar(usage?.sites.current || 0, usage?.sites.limit || 0, usage?.sites.utilization_percent, "Объекты")}
          </div>
        </div>
      </div>

      {/* Zone B: Security & Zone C: Tenant Settings (Bottom Row) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Card */}
        <SecurityCard onSuccess={() => setMessage({ type: "success", text: "Пароль успешно изменен" })} />

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
