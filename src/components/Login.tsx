import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  DEMO_ENTRY_QUERY_PARAM,
  EXPLICIT_DEMO_LOGOUT_KEY,
  getDemoEntryUrl,
  getProductionAppUrl,
  isDemoHostname,
} from '../config/demo';
import {
  clearAttributionFromCurrentUrl,
  getAttributionNavigationUrl,
  readAttribution,
} from '../lib/attribution';
import { captureDemoRegistrationHandoff } from '../lib/demoRegistrationHandoff';
import { recordDemoAttributionSuccess } from '../services/api';
import { loginUser } from '../services/api';
import BrandLogo from './BrandLogo';
import LegalLinks from './LegalLinks';

const DEMO_RECOVERY_TIMEOUT_MS = 8000;
const DEMO_RECOVERY_TITLE = 'Демо не открылось';
const DEMO_RECOVERY_TEXT =
  'Не удалось автоматически запустить демо. Проверьте соединение и попробуйте ещё раз.';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [showDemoRecovery, setShowDemoRecovery] = useState(false);
  const { login } = useAuth();
  const hasTriggeredAutoDemoLogin = useRef(false);
  const demoLoginAttemptRef = useRef(0);
  const demoRecoveryTimeoutRef = useRef<number | null>(null);
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const isDemoHost = isDemoHostname(hostname);
  const searchParams =
    typeof window !== 'undefined' ? new URLSearchParams(search) : null;
  const hasExplicitDemoEntry = searchParams?.get(DEMO_ENTRY_QUERY_PARAM) === '1';
  const hasExplicitDemoLogout =
    typeof window !== 'undefined' &&
    sessionStorage.getItem(EXPLICIT_DEMO_LOGOUT_KEY) === '1';
  const shouldRedirectToProductionLogin =
    isDemoHost && (pathname === '/login' || (hasExplicitDemoLogout && !hasExplicitDemoEntry));
  const shouldAutoLoginDemo = isDemoHost && !shouldRedirectToProductionLogin;
  const productionLoginUrl = getProductionAppUrl('/login');

  const clearDemoRecoveryTimeout = () => {
    if (demoRecoveryTimeoutRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(demoRecoveryTimeoutRef.current);
      demoRecoveryTimeoutRef.current = null;
    }
  };

  const scheduleDemoRecoveryTimeout = (attemptId: number) => {
    if (typeof window === 'undefined') {
      return;
    }

    clearDemoRecoveryTimeout();
    demoRecoveryTimeoutRef.current = window.setTimeout(() => {
      if (demoLoginAttemptRef.current !== attemptId) {
        return;
      }

      setShowDemoRecovery(true);
    }, DEMO_RECOVERY_TIMEOUT_MS);
  };

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

  const navigateToForgotPassword = () => {
    const url = new URL(window.location.href);
    url.pathname = '/forgot-password';
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
    const attemptId = demoLoginAttemptRef.current + 1;
    demoLoginAttemptRef.current = attemptId;
    captureDemoRegistrationHandoff({
      search: window.location.search,
      explicitEntry: hasExplicitDemoEntry === true,
    });
    setIsDemoLoading(true);
    setShowDemoRecovery(false);
    sessionStorage.removeItem(EXPLICIT_DEMO_LOGOUT_KEY);
    scheduleDemoRecoveryTimeout(attemptId);

    try {
      const data = await loginUser('demo@logishift.ru', 'demo123');

      if (!data || !data.token || !data.user) {
        throw new Error('Некорректный ответ сервера');
      }

      await login(data.token, data.user);

      try {
        await recordDemoAttributionSuccess(readAttribution(window.location.search));
        clearAttributionFromCurrentUrl();
      } catch {
        // The demo session is valid even when attribution observation is unavailable.
      }

      const url = new URL(window.location.href);
      url.searchParams.delete(DEMO_ENTRY_QUERY_PARAM);
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    } catch (err: any) {
      if (demoLoginAttemptRef.current !== attemptId) {
        return;
      }

      console.error('Demo login error:', err);
      setShowDemoRecovery(true);
    } finally {
      if (demoLoginAttemptRef.current === attemptId) {
        clearDemoRecoveryTimeout();
        setIsDemoLoading(false);
      }
    }
  };

  useEffect(() => {
    if (
      hasTriggeredAutoDemoLogin.current ||
      typeof window === 'undefined' ||
      !shouldAutoLoginDemo
    ) {
      return;
    }

    hasTriggeredAutoDemoLogin.current = true;
    void handleDemoLogin();
  }, [shouldAutoLoginDemo]);

  useEffect(() => {
    if (typeof window === 'undefined' || !shouldRedirectToProductionLogin) {
      return;
    }

    try {
      window.location.replace(productionLoginUrl);
    } catch (error) {
      console.error('Login redirect error:', error);
    }
  }, [productionLoginUrl, shouldRedirectToProductionLogin]);

  useEffect(() => clearDemoRecoveryTimeout, []);

  if (isDemoHost) {
    if (shouldAutoLoginDemo && showDemoRecovery) {
      return (
        <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-lg">
            <h1 className="text-base font-semibold text-slate-900">
              {DEMO_RECOVERY_TITLE}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {DEMO_RECOVERY_TEXT}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleDemoLogin()}
                className="min-h-[40px] flex-1 rounded-lg bg-[#0a192f] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#152238] disabled:opacity-60"
              >
                Попробовать снова
              </button>
              <a
                href={productionLoginUrl}
                className="min-h-[40px] flex-1 rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 transition-colors hover:border-[#0a192f] hover:text-[#0a192f]"
              >
                Вернуться ко входу
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="min-h-screen bg-[#F4F7FE]"
        aria-hidden="true"
        data-testid="demo-host-handoff-shell"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-10 border border-slate-50">
        <div className="text-center mb-10">
          <BrandLogo
            className="flex justify-center"
            imageClassName="h-auto w-full max-w-[17rem]"
          />
          <p className="text-slate-400 text-sm mt-2 font-medium">
            Войдите в панель управления
          </p>
        </div>

        {error && (
          <div className="mb-5 p-4 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100 animate-shake">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label
              htmlFor="username"
              className="text-[10px] font-semibold text-slate-400 uppercase ml-4 tracking-widest"
            >
              Логин
            </label>
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
            <label
              htmlFor="password"
              className="text-[10px] font-semibold text-slate-400 uppercase ml-4 tracking-widest"
            >
              Пароль
            </label>
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

          <div className="flex justify-end">
            <button
              type="button"
              onClick={navigateToForgotPassword}
              className="text-sm text-slate-500 hover:text-[#0a192f] transition-colors"
            >
              Забыли пароль?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#0a192f] hover:bg-[#152238] text-white font-bold py-4 rounded-lg shadow-xl shadow-[#0a192f]/10 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
          >
            {isLoading ? 'Вход...' : 'Войти в систему'}
          </button>
        </form>

        {!isDemoHost && (
          <div className="mt-4">
            <a
              href={getAttributionNavigationUrl(getDemoEntryUrl())}
              className="flex w-full items-center justify-center rounded-lg border-2 border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:border-[#0a192f] hover:text-[#0a192f]"
            >
              Войти в демо
            </a>
            <p className="text-center text-xs text-slate-400 mt-2 leading-relaxed px-2">
              Демо-версия открывается на отдельном домене.
            </p>
          </div>
        )}

        {!isDemoHost && (
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={navigateToRegister}
              className="text-sm text-slate-500 hover:text-[#0a192f] transition-colors"
            >
              Нет аккаунта? Зарегистрироваться
            </button>
          </div>
        )}

        <div className="mt-8 border-t border-slate-100 pt-6">
          <LegalLinks compact />
        </div>
      </div>
    </div>
  );
};

export default Login;
