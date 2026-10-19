import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Loader2, CheckCircle2, Check, Building, User, Eye, EyeOff } from 'lucide-react';
import { acceptInvite } from '../services/api';
import api from '../services/api';
import { API_ENDPOINTS } from '../constants';
import BrandLogo from '../components/BrandLogo';
import LegalLinks from '../components/LegalLinks';
import { REQUIRED_CONSENT_VERSIONS } from '../config/legal';
import { getRegisterContextFromSearch, RegisterMode } from '../utils/registerInvite';
import { readAttribution } from '../lib/attribution';
import { prepareAttributionSession } from '../lib/demoRegistrationHandoff';
import { recordCurrentPublicFunnelEvent } from '../lib/demoFunnelEvents';
import { PUBLIC_TARIFFS } from '../config/tariffs';
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

type FieldName = Exclude<keyof RegisterFormData, 'websiteUrl'>;
type FieldErrors = Partial<Record<FieldName, string>>;

// Keep in sync with registration.service.ts: validatePasswordStrength.
export const getRegistrationPasswordChecks = (value: string) => ({
  length: value.length >= 8,
  upper: /[A-Z]/.test(value),
  number: /\d/.test(value),
  special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value),
});

const freeTariff = PUBLIC_TARIFFS.find((plan) => plan.code === 'free')!;

const RegisterView: React.FC = () => {
  const [registerContext] = useState(() =>
    getRegisterContextFromSearch(window.location.search)
  );
  const [registrationAttribution] = useState(() =>
    readAttribution(window.location.search)
  );
  const [measurementSession] = useState(() => prepareAttributionSession());
  const demoSessionKey = measurementSession?.key;
  const [mode, setMode] = useState<RegisterMode>(() =>
    registerContext.initialMode
  );
  useEffect(() => {
    if (mode === 'admin') void recordCurrentPublicFunnelEvent('registration_viewed').catch(() => undefined);
  }, [mode]);
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const pendingFieldFocus = useRef<FieldName | null>(null);
  const generalErrorRef = useRef<HTMLDivElement>(null);
  const [visiblePasswords, setVisiblePasswords] = useState({ password: false, confirmPassword: false });
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedConsents, setAcceptedConsents] = useState<Record<ConsentKey, boolean>>({
    offer: false,
    privacy_policy: false,
    personal_data: false,
  });
  const passwordChecks = getRegistrationPasswordChecks(formData.password);

  useEffect(() => {
    if (error) generalErrorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (pendingFieldFocus.current) {
      (formRef.current?.elements.namedItem(pendingFieldFocus.current) as HTMLInputElement | null)?.focus();
      pendingFieldFocus.current = null;
    }
  }, [fieldErrors]);

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

  const getFieldErrors = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (mode === 'driver' && !formData.code.trim()) errors.code = 'Введите код приглашения';
    if (mode === 'admin' && !formData.companyName.trim()) errors.companyName = 'Введите название компании';
    if (!formData.full_name.trim()) errors.full_name = 'Введите полное имя';
    if (!formData.email.trim()) {
      errors.email = 'Введите email';
    } else if ((formRef.current?.elements.namedItem('email') as HTMLInputElement | null)?.validity.typeMismatch) {
      errors.email = 'Введите корректный email';
    }
    if (!formData.password) errors.password = 'Введите пароль';
    else if (!passwordChecks.length) errors.password = 'Пароль должен содержать минимум 8 символов';
    else if (!passwordChecks.upper) errors.password = 'Пароль должен содержать заглавную букву (A-Z)';
    else if (!passwordChecks.number) errors.password = 'Пароль должен содержать цифру (0-9)';
    else if (!passwordChecks.special) errors.password = 'Добавьте допустимый спецсимвол (например ! @ #)';
    if (!formData.confirmPassword) errors.confirmPassword = 'Повторите пароль';
    else if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Пароли не совпадают';
    return errors;
  };

  const fieldProps = (field: FieldName, helperId?: string) => ({
    'aria-invalid': Boolean(fieldErrors[field]),
    'aria-describedby': [helperId, fieldErrors[field] ? `${field}-error` : null].filter(Boolean).join(' ') || undefined,
    onBlur: () => setFieldErrors((prev) => ({ ...prev, [field]: getFieldErrors()[field] })),
  });

  const fieldError = (field: FieldName) => fieldErrors[field] && (
    <p id={`${field}-error`} className="text-sm leading-5 text-red-700" role="alert">
      {fieldErrors[field]}
    </p>
  );

  const validateForm = (): boolean => {
    const errors = getFieldErrors();
    setFieldErrors(errors);
    const firstField = (Object.keys(errors) as FieldName[])[0];
    if (firstField) {
      pendingFieldFocus.current = firstField;
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
    if (isLoading) return;
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
          ...(demoSessionKey ? { demoSessionKey } : {}),
          ...(measurementSession?.isInternal ? { isInternal: true } : {}),
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

  const handlePasswordChange = (value: string) => {
    setFormData((prev) => ({ ...prev, password: value }));
  };

  const toggleConsent = (key: ConsentKey) => {
    setAcceptedConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-5 sm:p-10 border border-slate-50 text-center">
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
    <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center p-3 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-4 sm:p-8 border border-slate-50">
        <div className="text-center mb-4">
          <BrandLogo className="flex justify-center" imageClassName="h-auto w-32 sm:w-40" />
          <h1 className="mt-3 text-xl font-bold leading-tight text-[#1B254B]">
            {mode === 'admin' ? 'Создайте компанию бесплатно' : 'Вступите в компанию'}
          </h1>
          {mode === 'admin' ? (
            <div className="mt-3 text-sm leading-5 text-slate-600" data-testid="free-registration-context">
              <p><strong className="text-[#1B254B]">{freeTariff.priceLabel}</strong> · {freeTariff.meta}</p>
              <p className="mt-1">{freeTariff.details.slice(0, 3).join(' · ')}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-5 text-slate-600">По приглашению администратора</p>
          )}
          {registerContext.isDemoSource && mode === 'admin' && (
            <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-left text-sm leading-5 text-slate-600" data-testid="demo-registration-context">
              <p className="font-semibold text-[#1B254B]">Продолжите со своими данными</p>
              <p>Вы посмотрели демо. Создайте компанию, затем добавьте свою технику, объекты и водителей.</p>
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="mb-4 bg-[#F4F7FE] rounded-lg p-1 flex">
          <button
            type="button"
            onClick={() => {
              setMode('admin');
              setError(null);
              setFieldErrors({});
            }}
            aria-pressed={mode === 'admin'}
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
              setFieldErrors({});
            }}
            aria-pressed={mode === 'driver'}
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

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
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
              <label htmlFor="code" className="block text-sm font-semibold text-slate-700">
                Код приглашения <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="code"
                {...fieldProps('code', 'code-help')}
                  name="code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="ABC-123"
                  className={`w-full bg-[#F4F7FE] border-none rounded-lg px-4 py-3 text-base font-mono focus:ring-2 focus:ring-[#0a192f] transition-all uppercase ${
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
              <p id="code-help" className="text-sm leading-5 text-slate-600">Введите код от вашего администратора</p>
              {fieldError('code')}
            </div>
          )}

          {/* Company Name (Admin mode only) */}
          {mode === 'admin' && (
            <div className="space-y-1">
              <label htmlFor="companyName" className="block text-sm font-semibold text-slate-700">
                Название компании <span className="text-red-500">*</span>
              </label>
              <input
                id="companyName"
                {...fieldProps('companyName', 'companyName-help')}
                name="companyName"
                autoComplete="organization"
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="ООО Ваша Компания"
                className="w-full bg-[#F4F7FE] border-none rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-[#0a192f] transition-all"
                required={mode === 'admin'}
              />
              <p id="companyName-help" className="text-sm leading-5 text-slate-600">Юридическое название (ООО, ИП и т.д.)</p>
              {fieldError('companyName')}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1">
            <label htmlFor="full_name" className="block text-sm font-semibold text-slate-700">
              Полное имя <span className="text-red-500">*</span>
            </label>
            <input
              id="full_name"
              {...fieldProps('full_name')}
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Иван Петров"
              autoComplete="name"
              className="w-full bg-[#F4F7FE] border-none rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-[#0a192f] transition-all"
              required
            />
            {fieldError('full_name')}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
              {mode === 'admin' ? 'Email администратора' : 'Email'} <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              {...fieldProps('email')}
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="name@example.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full bg-[#F4F7FE] border-none rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-[#0a192f] transition-all"
              required
            />
            {fieldError('email')}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
              Пароль <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                {...fieldProps('password', 'password-help')}
                name="password"
                type={visiblePasswords.password ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Минимум 8 символов"
                autoComplete="new-password"
                className="w-full bg-[#F4F7FE] border-none rounded-lg px-4 pr-14 py-3 text-base focus:ring-2 focus:ring-[#0a192f] transition-all"
                required
                minLength={8}
              />
              <button
                type="button"
                aria-label={`${visiblePasswords.password ? 'Скрыть' : 'Показать'} пароль`}
                aria-controls="password"
                aria-pressed={visiblePasswords.password}
                onClick={() => setVisiblePasswords((prev) => ({ ...prev, password: !prev.password }))}
                className="absolute right-1 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-md text-slate-600 focus-visible:ring-2 focus-visible:ring-[#0a192f]"
              >
                {visiblePasswords.password ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>
            <ul id="password-help" className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
              <li className={`text-sm leading-5 flex items-center gap-1 ${passwordChecks.length ? 'text-green-700' : 'text-slate-600'}`}>
                {passwordChecks.length && <Check size={14} />}
                8+ символов
              </li>
              <li className={`text-sm leading-5 flex items-center gap-1 ${passwordChecks.upper ? 'text-green-700' : 'text-slate-600'}`}>
                {passwordChecks.upper && <Check size={14} />}
                Заглавная A–Z
              </li>
              <li className={`text-sm leading-5 flex items-center gap-1 ${passwordChecks.number ? 'text-green-700' : 'text-slate-600'}`}>
                {passwordChecks.number && <Check size={14} />}
                Цифра 0–9
              </li>
              <li className={`text-sm leading-5 flex items-center gap-1 ${passwordChecks.special ? 'text-green-700' : 'text-slate-600'}`}>
                {passwordChecks.special && <Check size={14} />}
                Спецсимвол ! @ #
              </li>
            </ul>
            <details className="text-sm leading-5 text-slate-600">
              <summary className="min-h-11 cursor-pointer py-3">Допустимые спецсимволы</summary>
              <p className="break-all font-mono">{'!@#$%^&*()_+-=[]{};\':"\\|,.<>/?'}</p>
            </details>
            {fieldError('password')}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700">
              Подтвердите пароль <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                {...fieldProps('confirmPassword')}
                name="confirmPassword"
                type={visiblePasswords.confirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Повторите пароль"
                autoComplete="new-password"
                className="w-full bg-[#F4F7FE] border-none rounded-lg px-4 pr-14 py-3 text-base focus:ring-2 focus:ring-[#0a192f] transition-all"
                required
              />
              <button
                type="button"
                aria-label={`${visiblePasswords.confirmPassword ? 'Скрыть' : 'Показать'} повтор пароля`}
                aria-controls="confirmPassword"
                aria-pressed={visiblePasswords.confirmPassword}
                onClick={() => setVisiblePasswords((prev) => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                className="absolute right-1 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-md text-slate-600 focus-visible:ring-2 focus-visible:ring-[#0a192f]"
              >
                {visiblePasswords.confirmPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>
            {fieldError('confirmPassword')}
          </div>

          <div role="group" aria-labelledby="consents-heading" className="space-y-1 rounded-lg bg-[#F4F7FE] px-3 py-2 text-sm leading-5 text-slate-700">
            <p id="consents-heading" className="font-semibold">Три обязательных согласия</p>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
              <input
                type="checkbox"
                checked={acceptedConsents.offer}
                onChange={() => toggleConsent('offer')}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-[#0a192f] focus:ring-[#0a192f]"
                required
              />
              <span>
                Принимаю{' '}
                <a href="/offer" target="_blank" rel="noreferrer" className="font-semibold text-[#0a192f] underline">
                  оферту и пользовательское соглашение
                </a>
              </span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
              <input
                type="checkbox"
                checked={acceptedConsents.privacy_policy}
                onChange={() => toggleConsent('privacy_policy')}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-[#0a192f] focus:ring-[#0a192f]"
                required
              />
              <span>
                Ознакомлен(а) с{' '}
                <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-[#0a192f] underline">
                  политикой обработки персональных данных
                </a>
              </span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
              <input
                type="checkbox"
                checked={acceptedConsents.personal_data}
                onChange={() => toggleConsent('personal_data')}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-[#0a192f] focus:ring-[#0a192f]"
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

          {error && (
            <div ref={generalErrorRef} tabIndex={-1} role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700 focus:outline-none focus:ring-2 focus:ring-red-700">
              {error}
            </div>
          )}
          {/* Submit Button */}
          <button
            type="submit"
            aria-describedby={!allRequiredConsentsAccepted ? 'consents-heading' : undefined}
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

        <div className="mt-6 border-t border-slate-100 pt-4">
          <LegalLinks compact />
        </div>
      </div>
    </div>
  );
};

export default RegisterView;
