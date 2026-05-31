
import React, { useState, useEffect } from 'react';
import { loginUser } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const { login } = useAuth();

  // Prefill email from URL params (redirected from registration)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    if (email) {
      setUsername(email);
    }
  }, []);

  const navigateToRegister = () => {
    const url = new URL(window.location.href);
    url.pathname = '/register';
    url.search = '';
    window.location.href = url.toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await loginUser(username, password);
      await login(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Неверный логин или пароль');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setIsDemoLoading(true);

    try {
      // Directly call API with hardcoded demo credentials
      const data = await loginUser('demo@logishift.ru', 'demo123');

      // Validate response
      if (!data || !data.token || !data.user) {
        throw new Error('Некорректный ответ сервера');
      }

      // Login with received token and user data
      await login(data.token, data.user);
    } catch (err: any) {
      console.error('Demo login error:', err);

      // Provide more specific error messages for demo mode
      let errorMessage = 'Ошибка подключения к демо-режиму';

      if (err.message) {
        if (err.message.includes('сети') || err.message.includes('network')) {
          errorMessage = 'Ошибка сети. Проверьте подключение к интернету';
        } else if (err.message.includes('авторизации') || err.message.includes('401')) {
          errorMessage = 'Демо-доступ暂时 недоступен. Попробуйте позже.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-10 border border-slate-50">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-[#1B254B] flex items-center justify-center gap-2">
            <span className="text-[#3b82f6]">LOGI</span>SHIFT
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">Войдите в панель управления</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100 animate-shake">
              ⚠️ {error}
            </div>
          )}
          
          <div className="space-y-1">
            <label htmlFor="username" className="text-[10px] font-semibold text-slate-400 uppercase ml-4 tracking-widest">Логин</label>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              spellCheck={false}
              className="w-full bg-[#F4F7FE] border-none rounded-lg px-6 py-4 text-sm focus:ring-2 focus:ring-[#0a192f] transition-all"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-[10px] font-semibold text-slate-400 uppercase ml-4 tracking-widest">Пароль</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-[#F4F7FE] border-none rounded-lg px-6 py-4 text-sm focus:ring-2 focus:ring-[#0a192f] transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#0a192f] hover:bg-[#152238] text-white font-bold py-4 rounded-lg shadow-xl shadow-[#0a192f]/10 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
          >
            {isLoading ? 'Вход...' : 'Войти в систему'}
          </button>
        </form>

        {/* Demo Mode Button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isDemoLoading}
            className="w-full border-2 border-[#0a192f] text-[#0a192f] hover:bg-[#0a192f] hover:text-white font-bold py-3 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
          >
            {isDemoLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Входим в демо...
              </>
            ) : (
              'Войти в демо-организацию'
            )}
          </button>
          <p className="text-center text-xs text-slate-400 mt-2 leading-relaxed px-2">
            Откроется тестовая компания с демо-данными.
            Для реальной компании используйте регистрацию.
          </p>
        </div>

        {/* Register Link */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={navigateToRegister}
            className="text-sm text-slate-500 hover:text-[#0a192f] transition-colors"
          >
            Нет аккаунта? Зарегистрироваться
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-300 mt-8 uppercase font-bold tracking-widest">
          KONTROLSMEN v2.0 Enterprise
        </p>
      </div>
    </div>
  );
};

export default Login;
