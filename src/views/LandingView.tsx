import React from "react";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  MapPinned,
  Phone,
  Truck,
} from "lucide-react";
import { getDemoAppUrl, getProductionAppUrl } from "../config/demo";

const workSteps = [
  {
    title: "Водители",
    text: "Водитель открывает телефон и начинает смену без звонков диспетчеру.",
    icon: Phone,
  },
  {
    title: "Техника",
    text: "В смене видно, какая машина работает и кто за нее отвечает.",
    icon: Truck,
  },
  {
    title: "Объекты",
    text: "Каждая смена привязана к объекту, чтобы не искать детали в чатах.",
    icon: MapPinned,
  },
  {
    title: "Смены с фото",
    text: "Фото, время начала и завершения сохраняются в истории.",
    icon: Camera,
  },
];

const benefits = [
  "меньше звонков и таблиц",
  "видно, кто и где работает",
  "фото и история смен под рукой",
  "проще контролировать технику",
];

const openLogin = () => {
  window.location.href = getProductionAppUrl("/login");
};

const openRegister = () => {
  window.location.href = getProductionAppUrl("/register");
};

const openDemo = () => {
  window.location.href = getDemoAppUrl();
};

const LandingView: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <div className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(119,194,255,0.28),_transparent_32%),linear-gradient(180deg,_#f7f9fc_0%,_#eef2f6_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,22,39,0.04)_1px,transparent_1px),linear-gradient(rgba(4,22,39,0.04)_1px,transparent_1px)] bg-[size:36px_36px]" />
        <div className="relative mx-auto flex max-w-7xl flex-col px-5 pb-12 pt-5 sm:px-6 lg:px-10 lg:pb-20">
          <header className="mb-10 flex items-center justify-between gap-4">
            <div>
              <div className="text-xl font-bold tracking-tight text-[#041627]">LogiShift</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Контроль смен
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={openDemo}
                className="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-[#041627] hover:text-[#041627] sm:inline-flex"
              >
                Открыть демо
              </button>
              <button
                type="button"
                onClick={openLogin}
                className="rounded-full bg-[#041627] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a2b3c]"
              >
                Войти
              </button>
            </div>
          </header>

          <section className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-center">
            <div className="max-w-3xl">
              <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-[#041627] sm:text-5xl lg:text-6xl">
                Контроль смен спецтехники без таблиц и путаницы
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Водитель начинает смену с телефона. Вы видите технику, объект, время и фото.
                История смен сохраняется и остается под рукой.
              </p>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                Подходит для небольших парков, подрядчиков и строительных компаний.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={openDemo}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#006497] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[#006497]/20 transition-all hover:bg-[#004f79]"
                >
                  Открыть демо
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={openRegister}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#041627] bg-white px-6 py-4 text-base font-semibold text-[#041627] transition-colors hover:bg-[#041627] hover:text-white"
                >
                  Подключиться
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[28px] border border-[#c4c6cd] bg-[#041627] p-4 text-white shadow-[0_30px_80px_rgba(4,22,39,0.18)] sm:p-5">
                <div className="rounded-[22px] border border-white/10 bg-[#0f2235] p-5">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-300">Сегодня</div>
                      <div className="mt-1 text-2xl font-bold">Смены под контролем</div>
                    </div>
                    <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                      online
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">Экскаватор Volvo EC200</div>
                          <div className="mt-1 text-xs text-slate-300">Иванов А. • ЖК Северный</div>
                        </div>
                        <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                          В смене
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Техника</div>
                        <div className="mt-2 text-3xl font-bold">12</div>
                        <div className="mt-1 text-sm text-slate-300">машин в работе</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Фото</div>
                        <div className="mt-2 text-3xl font-bold">36</div>
                        <div className="mt-1 text-sm text-slate-300">подтверждений за день</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#77c2ff]/40 bg-[#1a2b3c] p-4">
                      <div className="text-sm font-semibold text-white">Что видно в смене</div>
                      <ul className="mt-3 space-y-2 text-sm text-slate-200">
                        {["водитель", "техника", "объект", "время и фото"].map((item) => (
                          <li key={item} className="flex gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#77c2ff]" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-10 lg:py-20">
        <section>
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#006497]">
              Как работает
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#041627] sm:text-4xl">
              Простая схема для ежедневных смен
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workSteps.map(({ title, text, icon: Icon }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e6f4ff] text-[#006497]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#041627]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#006497]">
              Польза
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#041627] sm:text-4xl">
              Меньше ручной сверки
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Смена фиксируется сразу. Диспетчер видит текущую картину, а руководитель может вернуться к истории позже.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#27ae60]" />
                <div className="text-base font-semibold leading-6 text-[#041627]">{benefit}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-[28px] border border-[#77c2ff]/40 bg-[linear-gradient(135deg,_#041627_0%,_#1a2b3c_58%,_#004f79_100%)] p-6 text-white shadow-[0_30px_70px_rgba(4,22,39,0.18)] sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#92ccff]">
                Временное предложение
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                Сейчас набираем первые компании для тестового подключения
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-200">
                Поможем настроить компанию, водителей, технику и объекты. Первым участникам предложим бесплатный тестовый период и ранние условия запуска.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {["5-10 компаний", "помощь с настройкой", "бесплатный тестовый период", "ранние условия запуска"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#92ccff]" />
                    <div className="text-sm font-medium leading-6 text-slate-100">{item}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#006497]">
              Тарифы
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#041627] sm:text-4xl">
              Простой старт
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Онлайн-оплата появится позже. Сейчас можно начать с базового варианта или обсудить расширенный запуск.
            </p>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#006497]">Free</div>
              <div className="mt-3 text-3xl font-bold tracking-tight text-[#041627]">до 5 машин</div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Базовый учет смен, техники, водителей, объектов, фото и истории.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#006497]">Расширенный</div>
              <div className="mt-3 text-3xl font-bold tracking-tight text-[#041627]">по заявке</div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Для компаний, которым нужна помощь с запуском и настройкой процесса.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#006497]">
                Следующий шаг
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#041627]">
                Посмотрите демо или подключите компанию
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Демо покажет путь водителя и диспетчера. Для реального запуска используйте регистрацию компании.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={openDemo}
                className="rounded-2xl bg-[#006497] px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-[#004f79]"
              >
                Открыть демо
              </button>
              <button
                type="button"
                onClick={openRegister}
                className="rounded-2xl border border-[#041627] px-6 py-4 text-base font-semibold text-[#041627] transition-colors hover:bg-[#041627] hover:text-white"
              >
                Подключиться
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingView;
