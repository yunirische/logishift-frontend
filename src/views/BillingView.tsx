import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import {
  createBillingCheckout,
  getBillingPayments,
  getTenantBilling,
  ApiErrorType,
} from "../services/api";
import {
  BillingPaymentSummary,
  TenantBillingSummary,
  UserRole,
} from "../types";
import { useAuth } from "../context/AuthContext";
import { BILLING_CHECKOUT_PLAN_CODES, PUBLIC_TARIFFS } from "../config/tariffs";
import { SUPPORT_TELEGRAM_URL } from "../config/legal";

const SUPPORT_URL = SUPPORT_TELEGRAM_URL;
const CHECKOUT_UNAVAILABLE_MESSAGE =
  "Онлайн-оплата пока недоступна. Напишите в поддержку.";
const BILLING_LOAD_ERROR_MESSAGE =
  "Не удалось загрузить данные по тарифу. Попробуйте обновить страницу.";
const BILLING_CHECKOUT_ERROR_MESSAGE =
  "Не удалось начать оплату. Попробуйте позже или напишите в поддержку.";

type BillingViewProps = {
  returnMode?: "success" | "cancel";
};

const formatDate = (value?: string | null) => {
  if (!value) return "Не задано";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Не задано";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Не задано";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Не задано";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatMoney = (amount?: number, currency: string = "RUB") => {
  const value = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
};

const paymentStatusLabel = (status?: string) => {
  switch (status) {
    case "succeeded":
    case "paid":
      return "Оплачен";
    case "pending":
      return "Ожидает оплаты";
    case "waiting_for_capture":
      return "Ожидает подтверждения";
    case "canceled":
    case "cancelled":
      return "Отменен";
    case "failed":
      return "Ошибка оплаты";
    default:
      return "Статус уточняется";
  }
};

const paymentStatusClasses = (status?: string) => {
  switch (status) {
    case "succeeded":
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
    case "waiting_for_capture":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "canceled":
    case "cancelled":
    case "failed":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
};

const isCheckoutUnavailableError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  return error.message.includes("YooKassa is disabled or not configured");
};

const getSafeBillingLoadErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "type" in error) {
    const apiError = error as { type?: string };
    if (apiError.type === ApiErrorType.AUTHENTICATION) {
      return "Ошибка авторизации";
    }
    if (apiError.type === ApiErrorType.TIMEOUT) {
      return "Превышено время ожидания запроса";
    }
    if (apiError.type === ApiErrorType.NETWORK) {
      return "Ошибка сети. Проверьте подключение к интернету";
    }
  }

  return BILLING_LOAD_ERROR_MESSAGE;
};

const getSafeBillingCheckoutErrorMessage = (error: unknown) => {
  if (isCheckoutUnavailableError(error)) {
    return CHECKOUT_UNAVAILABLE_MESSAGE;
  }

  if (error && typeof error === "object" && "type" in error) {
    const apiError = error as { type?: string };
    if (apiError.type === ApiErrorType.AUTHENTICATION) {
      return "Ошибка авторизации";
    }
    if (apiError.type === ApiErrorType.TIMEOUT) {
      return "Превышено время ожидания запроса";
    }
    if (apiError.type === ApiErrorType.NETWORK) {
      return "Ошибка сети. Проверьте подключение к интернету";
    }
  }

  return BILLING_CHECKOUT_ERROR_MESSAGE;
};

const BillingView: React.FC<BillingViewProps> = ({ returnMode }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const isReturnMode = Boolean(returnMode);
  const publicCheckoutPlans = useMemo(
    () => PUBLIC_TARIFFS.filter((plan) => BILLING_CHECKOUT_PLAN_CODES.includes(plan.code)),
    []
  );

  const [billing, setBilling] = useState<TenantBillingSummary | null>(null);
  const [payments, setPayments] = useState<BillingPaymentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutPlanCode, setCheckoutPlanCode] = useState<string | null>(null);
  const [redirectingPlanCode, setRedirectingPlanCode] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadBilling = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [billingData, paymentsData] = await Promise.all([
          getTenantBilling(),
          isAdmin ? getBillingPayments() : Promise.resolve([]),
        ]);

        if (!isMounted) return;

        setBilling(billingData);
        setPayments(paymentsData);
      } catch (error) {
        if (!isMounted) return;
        setLoadError(getSafeBillingLoadErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsPaymentsLoading(false);
        }
      }
    };

    void loadBilling();

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  const refreshBilling = async () => {
    setIsPaymentsLoading(isAdmin);
    setLoadError(null);

    try {
      const billingData = await getTenantBilling();
      setBilling(billingData);

      if (isAdmin) {
        const paymentsData = await getBillingPayments();
        setPayments(paymentsData);
      }
    } catch (error) {
      setLoadError(getSafeBillingLoadErrorMessage(error));
    } finally {
      setIsPaymentsLoading(false);
    }
  };

  const handleCheckout = async (planCode: string) => {
    if (!isAdmin) {
      setCheckoutError("Оплату может запустить только администратор компании.");
      return;
    }

    setCheckoutPlanCode(planCode);
    setCheckoutError(null);

    try {
      const result = await createBillingCheckout(planCode);
      if (result.confirmation_url) {
        setRedirectingPlanCode(planCode);
        window.location.href = result.confirmation_url;
        return;
      }

      setCheckoutError(CHECKOUT_UNAVAILABLE_MESSAGE);
    } catch (error) {
      setCheckoutError(getSafeBillingCheckoutErrorMessage(error));
    } finally {
      setCheckoutPlanCode(null);
    }
  };

  const currentPlan = billing?.current_plan ?? null;
  const lastPayment = billing?.last_payment ?? null;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#0a192f]" />
          <p className="text-sm font-medium">Загрузка данных по тарифу...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#006497]">
                Текущий тариф
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#041627]">
                {currentPlan?.name || "Тариф не назначен"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Код: <span className="font-semibold text-slate-700">{currentPlan?.code || "—"}</span>
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e6f4ff] text-[#006497]">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Машины
              </div>
              <div className="mt-2 text-lg font-semibold text-[#041627]">
                {currentPlan ? currentPlan.limit_machines : "—"}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Водители
              </div>
              <div className="mt-2 text-lg font-semibold text-[#041627]">
                {currentPlan ? currentPlan.limit_drivers : "—"}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Объекты
              </div>
              <div className="mt-2 text-lg font-semibold text-[#041627]">
                {currentPlan ? currentPlan.limit_sites : "—"}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Оплачено до
              </div>
              <div className="mt-2 text-lg font-semibold text-[#041627]">
                {formatDate(billing?.subscription_expires_at)}
              </div>
            </div>
          </div>

          {isReturnMode && (
            <div
              className={`mt-6 rounded-xl border p-4 ${
                returnMode === "success"
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                {returnMode === "success" ? (
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                )}
                <div>
                  <p className="text-sm font-semibold text-[#041627]">
                    {returnMode === "success"
                      ? "Платеж проверяется"
                      : "Оплата не завершена"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {returnMode === "success"
                      ? "Страница возврата не подтверждает оплату сама по себе. Мы повторно читаем состояние подписки с сервера."
                      : "Подписка не меняется, пока backend не подтвердит оплату."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {lastPayment && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Последний платеж
                  </div>
                  <div className="mt-2 text-base font-semibold text-[#041627]">
                    {lastPayment.plan_name || lastPayment.plan_code || "Без тарифа"} ·{" "}
                    {formatMoney(lastPayment.amount, lastPayment.currency)}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Создан: {formatDateTime(lastPayment.created_at)}
                    {lastPayment.paid_at ? ` · Оплачен: ${formatDateTime(lastPayment.paid_at)}` : ""}
                  </div>
                </div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${paymentStatusClasses(
                    lastPayment.status
                  )}`}
                >
                  {paymentStatusLabel(lastPayment.status)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#006497]">
                Оплата и доступ
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#041627]">
                Подготовка перехода на платные тарифы
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void refreshBilling()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-[#041627]"
            >
              {isPaymentsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
              Обновить
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm leading-6 text-slate-600">
                Фронтенд не подтверждает оплату сам. После возврата из платежной формы состояние тарифа
                перечитывается с backend.
              </p>
            </div>

            {!isAdmin && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-[#041627]">
                      Оплата доступна администратору
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Диспетчер видит тариф и историю, но не запускает checkout.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {checkoutError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-[#041627]">Оплата пока недоступна</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{checkoutError}</p>
                    <a
                      href={SUPPORT_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#006497] hover:text-[#004f79]"
                    >
                      Написать в поддержку
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {loadError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-[#041627]">Не удалось загрузить раздел</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{loadError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#006497]">
            Тарифы
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#041627]">
            Публичные планы для подключения
          </h2>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {publicCheckoutPlans.map((plan) => {
            const isCurrentPlan = currentPlan?.code === plan.code;
            const isBusy = checkoutPlanCode === plan.code || redirectingPlanCode === plan.code;

            return (
              <div
                key={plan.code}
                className={`flex h-full flex-col rounded-2xl border p-5 ${
                  isCurrentPlan
                    ? "border-[#77c2ff] bg-[#eef8ff]"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#006497]">
                      {plan.name}
                    </div>
                    <div className="mt-3 text-3xl font-semibold tracking-tight text-[#041627]">
                      {plan.priceLabel}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-600">{plan.meta}</div>
                  </div>
                  {isCurrentPlan && (
                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Текущий
                    </span>
                  )}
                </div>

                <ul className="mt-5 space-y-2 text-sm text-slate-600">
                  {plan.details.map((detail) => (
                    <li key={detail} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {detail}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex-1" />

                <button
                  type="button"
                  onClick={() => void handleCheckout(plan.code)}
                  disabled={!isAdmin || isBusy || isCurrentPlan}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    !isAdmin || isCurrentPlan
                      ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                      : "bg-[#041627] text-white hover:bg-[#1a2b3c]"
                  }`}
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {redirectingPlanCode === plan.code
                        ? "Переходим к оплате..."
                        : "Готовим оплату..."}
                    </>
                  ) : isCurrentPlan ? (
                    "Уже подключен"
                  ) : !isAdmin ? (
                    "Доступно администратору"
                  ) : (
                    "Перейти к оплате"
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#006497]">
              История платежей
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#041627]">
              Последние операции
            </h2>
          </div>
        </div>

        {!isAdmin ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            История платежей показывается администратору компании.
          </div>
        ) : payments.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Платежей пока нет.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="text-base font-semibold text-[#041627]">
                    {payment.plan_name || payment.plan_code || "Без тарифа"}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Создан: {formatDateTime(payment.created_at)}
                    {payment.paid_at ? ` · Оплачен: ${formatDateTime(payment.paid_at)}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-[#041627]">
                    {formatMoney(payment.amount, payment.currency)}
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${paymentStatusClasses(
                      payment.status
                    )}`}
                  >
                    {paymentStatusLabel(payment.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default BillingView;
