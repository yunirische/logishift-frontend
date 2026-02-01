import React, { useState } from "react";
import { Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { changePassword } from "../../services/api";

interface SecurityCardProps {
  onSuccess?: () => void;
}

const SecurityCard: React.FC<SecurityCardProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = "Требуется текущий пароль";
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "Требуется новый пароль";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Минимум 8 символов";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Подтвердите новый пароль";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Пароли не совпадают";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await changePassword(formData.currentPassword, formData.newPassword);
      setMessage({ type: "success", text: "Пароль успешно обновлен" });
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (error) {
      console.error("Failed to change password:", error);
      const errorMsg = error instanceof Error ? error.message : "Ошибка при смене пароля";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0a192f] to-[#1e293b] p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Безопасность</h2>
            <p className="text-sm text-slate-300">Изменение пароля</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Current Password */}
        <div className="space-y-2">
          <label htmlFor="current-password" className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
            Текущий пароль
          </label>
          <div className="relative">
            <input
              id="current-password"
              type={showPasswords.current ? "text" : "password"}
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              className={`w-full px-4 py-3 pr-12 rounded-lg border bg-slate-50 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20 outline-none transition-all font-mono text-slate-800 ${
                errors.currentPassword ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-slate-200"
              }`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("current")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-xs text-red-600 font-medium">{errors.currentPassword}</p>
          )}
        </div>

        {/* New Password */}
        <div className="space-y-2">
          <label htmlFor="new-password" className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
            Новый пароль
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPasswords.new ? "text" : "password"}
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className={`w-full px-4 py-3 pr-12 rounded-lg border bg-slate-50 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20 outline-none transition-all font-mono text-slate-800 ${
                errors.newPassword ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-slate-200"
              }`}
              placeholder="Минимум 8 символов"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("new")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-xs text-red-600 font-medium">{errors.newPassword}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <label htmlFor="confirm-password" className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
            Подтвердите пароль
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showPasswords.confirm ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className={`w-full px-4 py-3 pr-12 rounded-lg border bg-slate-50 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20 outline-none transition-all font-mono text-slate-800 ${
                errors.confirmPassword ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-slate-200"
              }`}
              placeholder="Повторите новый пароль"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("confirm")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-600 font-medium">{errors.confirmPassword}</p>
          )}
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
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0a192f] hover:bg-[#152238] text-white font-bold rounded-lg transition-all shadow-lg shadow-[#0a192f]/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Обновление...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Обновить безопасность
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SecurityCard;
