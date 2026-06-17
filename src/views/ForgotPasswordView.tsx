import React, { useState } from "react";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { requestPasswordReset } from "../services/api";
import BrandLogo from "../components/BrandLogo";

const SUCCESS_MESSAGE =
  "Если email зарегистрирован, инструкция для восстановления будет отправлена.";

const ForgotPasswordView: React.FC = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const navigateToLogin = () => {
    const url = new URL(window.location.href);
    url.pathname = "/login";
    url.search = "";
    window.location.href = url.toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Введите email");
      return;
    }

    setIsLoading(true);
    try {
      await requestPasswordReset(email);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Не удалось отправить запрос на восстановление");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-10 border border-slate-50">
        <div className="text-center mb-10">
          <BrandLogo
            className="flex justify-center"
            imageClassName="h-auto w-full max-w-[17rem]"
          />
          <p className="text-slate-400 text-sm mt-2 font-medium">Восстановление пароля</p>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">
            Введите email администратора или сотрудника. Если восстановление подключено и email
            зарегистрирован, мы отправим инструкцию.
          </p>
        </div>

        {isSubmitted ? (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100">
              {SUCCESS_MESSAGE}
            </div>
            <button
              type="button"
              onClick={navigateToLogin}
              className="w-full bg-[#0a192f] hover:bg-[#152238] text-white font-bold py-4 rounded-lg shadow-xl shadow-[#0a192f]/10 transition-all active:scale-[0.98]"
            >
              Вернуться ко входу
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
                htmlFor="email"
                className="text-[10px] font-semibold text-slate-400 uppercase ml-4 tracking-widest"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  spellCheck={false}
                  className="w-full bg-[#F4F7FE] border-none rounded-lg pl-12 pr-6 py-4 text-sm focus:ring-2 focus:ring-[#0a192f] transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0a192f] hover:bg-[#152238] text-white font-bold py-4 rounded-lg shadow-xl shadow-[#0a192f]/10 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Отправляем...
                </>
              ) : (
                "Отправить инструкцию"
              )}
            </button>
          </form>
        )}

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={navigateToLogin}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#0a192f] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад ко входу
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-300 mt-8 uppercase font-bold tracking-[0.24em]">
          LOGISHIFT
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordView;
