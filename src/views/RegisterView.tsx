import React, { useState, useEffect } from 'react';
import { UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { acceptInvite } from '../services/api';

interface RegisterFormData {
  code: string;
  full_name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const RegisterView: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    code: '',
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState<string | null>(null);

  // Extract invite code from URL query params (e.g., /register?code=ABC-123)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('code');
    if (inviteCode) {
      setFormData((prev) => ({ ...prev, code: inviteCode }));
    }
  }, []);

  const navigateToLogin = (email?: string) => {
    const url = new URL(window.location.href);
    url.pathname = '/login';
    url.search = '';
    if (email) {
      url.searchParams.set('email', email);
    }
    window.location.href = url.toString();
  };

  const validateForm = (): boolean => {
    if (!formData.code.trim()) {
      setError('Введите код приглашения');
      return false;
    }
    if (!formData.full_name.trim()) {
      setError('Введите полное имя');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Введите email');
      return false;
    }
    if (!formData.password) {
      setError('Введите пароль');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await acceptInvite({
        code: formData.code.trim().toUpperCase(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigateToLogin(formData.email);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  // Format invite code as XXX-XXX
  const handleCodeChange = (value: string) => {
    // Remove non-alphanumeric chars
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    setFormData((prev) => ({ ...prev, code: cleaned }));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-10 border border-slate-50 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#1B254B] mb-2">Регистрация успешна!</h2>
          <p className="text-slate-500 mb-6">Добро пожаловать в команду LogiShift!</p>
          <p className="text-sm text-slate-400">Перенаправление на страницу входа...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-10 border border-slate-50">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-[#1B254B] flex items-center justify-center gap-2">
            <span className="text-[#3b82f6]">LOGI</span>SHIFT
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">Регистрация водителя</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100">
              ⚠️ {error}
            </div>
          )}

          {/* Invite Code */}
          <div className="space-y-1">
            <label htmlFor="code" className="text-[10px] font-semibold text-slate-400 uppercase ml-4 tracking-widest">
              Код приглашения <span className="text-red-500">*</span>
            </label>
            <input
              id="code"
              name="code"
              type="text"
              value={formData.code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="ABC-123"
              className="w-full bg-[#F4F7FE] border-none rounded-lg px-6 py-4 text-sm font-mono focus:ring-2 focus:ring-[#0a192f] transition-all uppercase"
              maxLength={10}
              required
            />
            <p className="text-xs text-slate-400 ml-4">Введите код от вашего администратора</p>
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <label htmlFor="full_name" className="text-[10px] font-semibold text-slate-400 uppercase ml-4 tracking-widest">
              Полное имя <span className="text-red-500">*</span>
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Иван Петров"
              autoComplete="name"
              className="w-full bg-[#F4F7FE] border-none rounded-lg px-6 py-4 text-sm focus:ring-2 focus:ring-[#0a192f] transition-all"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="email" className="text-[10px] font-semibold text-slate-400 uppercase ml-4 tracking-widest">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="driver@example.com"
              autoComplete="email"
              spellCheck={false}
              className="w-full bg-[#F4F7FE] border-none rounded-lg px-6 py-4 text-sm focus:ring-2 focus:ring-[#0a192f] transition-all"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label htmlFor="password" className="text-[10px] font-semibold text-slate-400 uppercase ml-4 tracking-widest">
              Пароль <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Минимум 6 символов"
              autoComplete="new-password"
              className="w-full bg-[#F4F7FE] border-none rounded-lg px-6 py-4 text-sm focus:ring-2 focus:ring-[#0a192f] transition-all"
              required
              minLength={6}
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-[10px] font-semibold text-slate-400 uppercase ml-4 tracking-widest">
              Подтвердите пароль <span className="text-red-500">*</span>
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Повторите пароль"
              autoComplete="new-password"
              className="w-full bg-[#F4F7FE] border-none rounded-lg px-6 py-4 text-sm focus:ring-2 focus:ring-[#0a192f] transition-all"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#0a192f] hover:bg-[#152238] text-white font-bold py-4 rounded-lg shadow-xl shadow-[#0a192f]/10 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Регистрация...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Вступить в компанию
              </>
            )}
          </button>
        </form>

        {/* Back to Login Link */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => navigateToLogin()}
            className="text-sm text-slate-500 hover:text-[#0a192f] transition-colors"
          >
            Уже есть аккаунт? Войти
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-300 mt-8 uppercase font-bold tracking-widest">
          KONTROLSMEN v2.0 Enterprise
        </p>
      </div>
    </div>
  );
};

export default RegisterView;
