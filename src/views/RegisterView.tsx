import React, { useState, useEffect } from 'react';
import { UserPlus, Loader2, CheckCircle2, Check, Building, User } from 'lucide-react';
import { acceptInvite } from '../services/api';
import api from '../services/api';
import { API_ENDPOINTS } from '../constants';
import BrandLogo from '../components/BrandLogo';
import LegalLinks from '../components/LegalLinks';
import { REQUIRED_CONSENT_VERSIONS } from '../config/legal';
import { getRegisterContextFromSearch, RegisterMode } from '../utils/registerInvite';
import { readAttribution } from '../lib/attribution';
type ConsentKey = keyof typeof REQUIRED_CONSENT_VERSIONS;

interface RegisterFormData {
  code: string;
  full_name: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  websiteUrl: string;
}

interface PasswordChecks {
  length: boolean;
  upper: boolean;
  number: boolean;
  special: boolean;
}

const RegisterView: React.FC = () => {
  const [registerContext] = useState(() =>
    getRegisterContextFromSearch(window.location.search)
  );
  const [registrationAttribution] = useState(() =>
    readAttribution(window.location.search)
  );
  const [mode, setMode] = useState<RegisterMode>(() =>
    registerContext.initialMode
  );
  const [formData, setFormData] = useState<RegisterFormData>(() => ({
    code: registerContext.inviteCode,
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    websiteUrl: '',
  }));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState<string | null>(null);
  const [acceptedConsents, setAcceptedConsents] = useState<Record<ConsentKey, boolean>>({
    offer: false,
    privacy_policy: false,
    personal_data: false,
  });
  const [passwordChecks, setPasswordChecks] = useState<PasswordChecks>({
    length: false,
    upper: false,
    number: false,
    special: false,
  });

  const navigateToLogin = (email?: string) => {
    const url = new URL(window.location.href);
    url.pathname = '/login';
    url.search = '';
    if (email) {
      url.searchParams.set('email', email);
    }
    window.location.href = url.toString();
  };

  const allRequiredConsentsAccepted = Object.values(acceptedConsents).every(Boolean);
  const consentPayload = {
    accepted: true as const,
    versions: REQUIRED_CONSENT_VERSIONS,
  };

  const validateForm = (): boolean => {
    // Driver mode requires invite code
    if (mode === 'driver' && !formData.code.trim()) {
      setError('Введите код приглашения');
      return false;
    }
    // Admin mode requires company name
    if (mode === 'admin' && !formData.companyName.trim()) {
      setError('Введите название компании');
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

    // Backend password requirements: 8+ chars, uppercase, number, special
    if (formData.password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return false;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError('Пароль должен содержать заглавную букву (A-Z)');
      return false;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError('Пароль должен содержать цифру (0-9)');
      return false;
    }
    if (!/[^A-Za-z0-9]/.test(formData.password)) {
      setError('Пароль должен содержать спецсимвол (!@#$%^&* и т.д.)');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return false;
    }
    if (!allRequiredConsentsAccepted) {
      setError('Необходимо принять обязательные документы');
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
      if (mode === 'admin') {
        // Admin registration - create tenant
        await api.post(API_ENDPOINTS.AUTH_REGISTER_TENANT, {
          companyName: formData.companyName.trim(),
          adminName: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          websiteUrl: formData.websiteUrl,
          consents: consentPayload,
          attribution: registrationAttribution,
        });
      } else {
        // Driver registration - accept invite
        await acceptInvite({
          code: formData.code.trim().toUpperCase(),
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          consents: consentPayload,
        });
      }

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

  // Update password validation checks on password change
  const handlePasswordChange = (value: string) => {
    setFormData((prev) => ({ ...prev, password: value }));
    setPasswordChecks({
      length: value.length >= 8,
      upper: /[A-Z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
    });
  };

  const toggleConsent = (key: ConsentKey) => {
    setAcceptedConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-10 border border-slate-50 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#1B254B] mb-2">Регистрация успешна!</h2>
          <p className="text-slate-500 mb-6">
            {mode === 'admin' ? 'Компания успешно создана!' : 'Добро пожаловать в команду LogiShift!'}
          </p>
          {mode === 'admin' && (
            <p className="text-sm text-slate-500 mb-4">
              Дальше вы попадете в кабинет администратора: добавьте объект, технику и водителей, чтобы провести первую смену.
            </p>
          )}
          <p className="text-sm text-slate-400">Перенаправление на страницу входа...</p>
        </div>
      </div>
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
          <p className="text-slate-400 text-sm mt-2 font-medium">Регистрация в системе</p>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">
            Компания или администратор создаёт аккаунт компании. Водитель подключается по приглашению или ссылке-приглашению.
          </p>
          {registerContext.isDemoSource && mode === 'admin' && (
            <div
              className="mt-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-left"
              data-testid="demo-registration-context"
            >
              <p className="text-sm font-bold text-[#1B254B]">
                Продолжите со своими данными
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Вы посмотрели демо. Создайте компанию, затем добавьте свою технику, объекты и водителей.
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                На бесплатном тарифе доступны 2 машины, 2 объекта и 2 водителя.
              </p>
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="mb-8 bg-[#F4F7FE] rounded-lg p-1 flex">
          <button
            type="button"
            onClick={() => {
              setMode('admin');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-sm font-bold transition-all ${
              mode === 'admin'
                ? 'bg-[#0a192f] text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building className="w-4 h-4" />
            Компания
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('driver');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-sm font-bold transition-all ${
              mode === 'driver'
                ? 'bg-[#0a192f] text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-4 h-4" />
            Водитель
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100">
              ⚠️ {error}
            </div>
          )}

          <div aria-hidden="true" className="hidden">
            <label htmlFor="websiteUrl">Website URL</label>
            <input
              id="websiteUrl"
              name="websiteUrl"
              type="text"
              value={formData.websiteUrl}
              onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
              autoComplete="off"
              tabIndex={-1}
            />
          </div>

          {/* Invite Code (Driver mode only) */}
          {mode === 'driver' && (
            <div className="space-y-1">
              <label htmlFor="code" className="text-[10px] font-semibold text-slate-400 uppercase ml-4 tracking-widest">
                Код приглашения <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="code"
                  name="code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="ABC-123"
                  className={`w-full bg-[#F4F7FE] border-none rounded-lg px-6 py-4 text-sm font-mono focus:ring-2 focus:ring-[#0a192f] transition-all uppercase ${
                    formData.code.length > 0 ? 'ring-2 ring-green-500' : ''
                  }`}
                  maxLength={10}
                  required={mode === 'driver'}
                />
                {formData.code.length > 0 && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <Check size={20} className="text-green-500" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 ml-4">Введите код от вашего администратора</p>
            </div>
          )}

          {/* Company Name (Admin mode only) */}
          {mode === 'admin' && (
            <div className="space-y-1">
              <label htmlFor="companyName" className="text-[10px] font-semibold text-slate-400 uppercase ml-4 tracking-widest">
                Название компании <span className="text-red-500">*</span>
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="ООО Ваша Компания"
                className="w-full bg-[#F4F7FE] border-none rounded-lg px-6 py-4 text-sm focus:ring-2 focus:ring-[#0a192f] transition-all"
                required={mode === 'admin'}
              />
              <p className="text-xs text-slate-400 ml-4">Юридическое название (ООО, ИП и т.д.)</p>
            </div>
          )}

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
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Минимум 8 символов"
              autoComplete="new-password"
              className="w-full bg-[#F4F7FE] border-none rounded-lg px-6 py-4 text-sm focus:ring-2 focus:ring-[#0a192f] transition-all"
              required
              minLength={8}
            />
            <ul className="flex flex-wrap gap-x-4 gap-y-1 ml-4 mt-2">
              <li className={`text-xs flex items-center gap-1 ${passwordChecks.length ? 'text-green-600' : 'text-slate-400'}`}>
                {passwordChecks.length && <Check size={14} />}
                Мин. 8 символов
              </li>
              <li className={`text-xs flex items-center gap-1 ${passwordChecks.upper ? 'text-green-600' : 'text-slate-400'}`}>
                {passwordChecks.upper && <Check size={14} />}
                Заглавная буква (A-Z)
              </li>
              <li className={`text-xs flex items-center gap-1 ${passwordChecks.number ? 'text-green-600' : 'text-slate-400'}`}>
                {passwordChecks.number && <Check size={14} />}
                Цифра (0-9)
              </li>
              <li className={`text-xs flex items-center gap-1 ${passwordChecks.special ? 'text-green-600' : 'text-slate-400'}`}>
                {passwordChecks.special && <Check size={14} />}
                Спецсимвол (!@#...)
              </li>
            </ul>
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

          <div className="space-y-3 rounded-lg bg-[#F4F7FE] px-4 py-4 text-xs text-slate-600">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={acceptedConsents.offer}
                onChange={() => toggleConsent('offer')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0a192f] focus:ring-[#0a192f]"
                required
              />
              <span>
                Принимаю{' '}
                <a href="/offer" target="_blank" rel="noreferrer" className="font-semibold text-[#0a192f] underline">
                  оферту и пользовательское соглашение
                </a>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={acceptedConsents.privacy_policy}
                onChange={() => toggleConsent('privacy_policy')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0a192f] focus:ring-[#0a192f]"
                required
              />
              <span>
                Ознакомлен(а) с{' '}
                <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-[#0a192f] underline">
                  политикой обработки персональных данных
                </a>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={acceptedConsents.personal_data}
                onChange={() => toggleConsent('personal_data')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0a192f] focus:ring-[#0a192f]"
                required
              />
              <span>
                Даю{' '}
                <a
                  href="/personal-data-consent"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#0a192f] underline"
                >
                  согласие на обработку персональных данных
                </a>
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !allRequiredConsentsAccepted}
            className="w-full bg-[#0a192f] hover:bg-[#152238] text-white font-bold py-4 rounded-lg shadow-xl shadow-[#0a192f]/10 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Регистрация...
              </>
            ) : mode === 'admin' ? (
              <>
                <Building className="w-5 h-5" />
                Создать компанию
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

        <div className="mt-8 border-t border-slate-100 pt-6">
          <LegalLinks compact />
        </div>
      </div>
    </div>
  );
};

export default RegisterView;
