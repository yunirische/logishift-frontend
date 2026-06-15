import React, { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Lock } from "lucide-react";
import { confirmPasswordReset } from "../services/api";

const INVALID_LINK_MESSAGE =
  "Ссылка недействительна или устарела. Запросите восстановление ещё раз.";

const getReadableResetError = (message?: string) => {
  if (!message) {
    return "Не удалось обновить пароль";
  }

  const normalizedMessage = message.toLowerCase();
  if (
    normalizedMessage.includes("недействительный") ||
    normalizedMessage.includes("просроч") ||
    normalizedMessage.includes("устар")
  ) {
    return INVALID_LINK_MESSAGE;
  }

  return message;
};

const ResetPasswordView: React.FC = () => {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", []);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(token ? null : INVALID_LINK_MESSAGE);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigateToLogin = () => {
    const url = new URL(window.location.href);
    url.pathname = "/login";
    url.search = "";
    window.location.href = url.toString();
  };

  const navigateToForgotPassword = () => {
    const url = new URL(window.location.href);
    url.pathname = "/forgot-password";
    url.search = "";
    window.location.href = url.toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError(INVALID_LINK_MESSAGE);
      return;
    }
    if (!newPassword) {
      setError("Введите новый пароль");
      return;
    }
    if (!confirmPassword) {
      setError("Подтвердите пароль");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setIsLoading(true);
    try {
      await confirmPasswordReset(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(getReadableResetError(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-10 border border-slate-50">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-[#1B254B] flex items-center justify-center gap-2">
            <span className="text-[#3b82f6]">LOGI</span>SHIFT
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">Новый пароль</p>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">
            Введите новый пароль для входа в LogiShift.
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100 text-center">
              Пароль обновлён. Теперь можно войти с новым паролем.
            </div>
            <button
              type="button"
              onClick={navigateToLogin}
              className="w-full bg-[#0a192f] hover:bg-[#152238] text-white font-bold py-4 rounded-lg shadow-xl shadow-[#0a192f]/10 transition-all active:scale-[0.98]"
            >
              Перейти ко входу
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100">
                ⚠️ {error}
              </div>
            )}

            <div className="space-y-1">
              <label
                htmlFor="newPassword"
                className="text-[10px] font-semibold text-slate-400 uppercase ml-4 tracking-widest"
              >
                Новый пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Минимум 8 символов"
                  autoComplete="new-password"
                  className="w-full bg-[#F4F7FE] border-none rounded-lg pl-12 pr-6 py-4 text-sm focus:ring-2 focus:ring-[#0a192f] transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="confirmPassword"
                className="text-[10px] font-semibold text-slate-400 uppercase ml-4 tracking-widest"
              >
                Подтвердите пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите новый пароль"
                  autoComplete="new-password"
                  className="w-full bg-[#F4F7FE] border-none rounded-lg pl-12 pr-6 py-4 text-sm focus:ring-2 focus:ring-[#0a192f] transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !token}
              className="w-full bg-[#0a192f] hover:bg-[#152238] text-white font-bold py-4 rounded-lg shadow-xl shadow-[#0a192f]/10 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Обновляем...
                </>
              ) : (
                "Обновить пароль"
              )}
            </button>
          </form>
        )}

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={success ? navigateToLogin : navigateToForgotPassword}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#0a192f] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {success ? "Назад ко входу" : "Запросить новую ссылку"}
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-300 mt-8 uppercase font-bold tracking-widest">
          KONTROLSMEN v2.0 Enterprise
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordView;
