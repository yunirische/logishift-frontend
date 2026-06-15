import React from "react";
import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardList,
  HardHat,
  History,
  KeyRound,
  MapPinned,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import { getDemoAppUrl, getProductionAppUrl } from "../config/demo";

const problemPoints = [
  "Кто вышел на смену и когда начал работу",
  "Какая техника закреплена за водителем",
  "Какой объект выбран для смены",
  "Где лежат фото и история подтверждений",
];

const workSteps = [
  "Создать водителей и назначить роли",
  "Добавить технику и карточки машин",
  "Добавить объекты и точки работ",
  "Запустить смены и смотреть историю в одной панели",
];

const features = [
  {
    title: "Смены",
    description: "Старт, завершение, статусы и актуальная картина по активным сменам.",
    icon: ClipboardList,
  },
  {
    title: "Фотофиксация",
    description: "Фотоподтверждения моточасов и работ без потери в мессенджерах.",
    icon: Camera,
  },
  {
    title: "Техника",
    description: "Список машин, привязка к водителям и контроль доступности техники.",
    icon: Truck,
  },
  {
    title: "Объекты",
    description: "Фиксация стройплощадок и точек работ без путаницы по заказам.",
    icon: MapPinned,
  },
  {
    title: "Роли",
    description: "Администраторы, мастера и водители с разделением доступа по задачам.",
    icon: Users,
  },
  {
    title: "История",
    description: "Единый журнал смен и событий для сверки с заказчиком и командой.",
    icon: History,
  },
  {
    title: "Восстановление доступа",
    description: "Базовый recovery-флоу уже встроен, без ручного сброса через чат.",
    icon: KeyRound,
  },
];

const betaBenefits = [
  "5–10 компаний в ограниченной тест-группе",
  "Бесплатный тестовый период для первых участников",
  "Помощь с настройкой компании, техники и водителей",
  "Льготные условия запуска для первых клиентов",
  "Влияние на продукт и приоритет по обратной связи",
];

const pricing = [
  {
    name: "Free",
    price: "до 5 машин",
    note: "Для первых тестов, чтобы собрать процесс смен и команды в одной системе.",
    bullets: [
      "Базовый учет смен",
      "Техника, водители, объекты",
      "История и фотофиксация",
    ],
  },
  {
    name: "Pilot",
    price: "по запросу",
    note: "Для компаний, которым нужен запуск с поддержкой и адаптацией под процесс.",
    bullets: [
      "Помощь с запуском",
      "Приоритетная обратная связь",
      "Условия согласуются отдельно",
    ],
  },
];

const openLogin = () => {
  window.location.href = getProductionAppUrl("/login");
};

const openRegister = () => {
  window.location.href = getProductionAppUrl("/register");
};

const openTry = () => {
  openRegister();
};

const openDemo = () => {
  window.location.href = getDemoAppUrl();
};

const LandingView: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <div className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(119,194,255,0.28),_transparent_32%),linear-gradient(180deg,_#f7f9fc_0%,_#eef2f6_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,22,39,0.04)_1px,transparent_1px),linear-gradient(rgba(4,22,39,0.04)_1px,transparent_1px)] bg-[size:36px_36px]" />
        <div className="relative mx-auto flex max-w-7xl flex-col px-6 pb-16 pt-6 lg:px-10 lg:pb-24">
          <header className="mb-12 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a2b3c] text-white shadow-lg shadow-[#1a2b3c]/15">
                <HardHat className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight text-[#041627]">LogiShift</div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Контроль смен спецтехники
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
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

          <section className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#77c2ff]/60 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#004f79] shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                Ограниченный beta / pilot набор
              </div>
              <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-[#041627] sm:text-5xl lg:text-6xl">
                Контроль смен спецтехники, водителей и объектов без таблиц и хаоса
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                LogiShift помогает видеть водителей, технику, объекты, фото и историю смен в одной
                панели. MVP ориентирован на ограниченную тест-группу компаний, которым нужен быстрый
                запуск без лишнего ручного контроля.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={openRegister}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#006497] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[#006497]/20 transition-all hover:bg-[#004f79]"
                >
                  Записаться в тест-группу
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={openDemo}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#041627] bg-white px-6 py-4 text-base font-semibold text-[#041627] transition-colors hover:bg-[#041627] hover:text-white"
                >
                  Открыть демо
                </button>
                <button
                  type="button"
                  onClick={openTry}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-4 text-base font-semibold text-slate-700 transition-colors hover:border-[#006497] hover:text-[#006497]"
                >
                  Попробовать
                </button>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-500">Формат</div>
                  <div className="mt-2 text-2xl font-bold text-[#041627]">MVP beta</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-500">Участники</div>
                  <div className="mt-2 text-2xl font-bold text-[#041627]">5–10 компаний</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-500">Запуск</div>
                  <div className="mt-2 text-2xl font-bold text-[#041627]">С помощью команды</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[28px] border border-[#c4c6cd] bg-[#041627] p-5 text-white shadow-[0_30px_80px_rgba(4,22,39,0.18)]">
                <div className="rounded-[22px] border border-white/10 bg-[#0f2235] p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-300">Панель смен</div>
                      <div className="mt-1 text-2xl font-bold">Смена под контролем</div>
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
                        <div className="mt-1 text-sm text-slate-300">машин в активной работе</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">История</div>
                        <div className="mt-2 text-3xl font-bold">1 панель</div>
                        <div className="mt-1 text-sm text-slate-300">без поиска по чатам и Excel</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#77c2ff]/40 bg-[#1a2b3c] p-4">
                      <div className="text-sm font-semibold text-white">Для первых участников beta</div>
                      <ul className="mt-3 space-y-2 text-sm text-slate-200">
                        <li className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#77c2ff]" />
                          бесплатный тестовый период
                        </li>
                        <li className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#77c2ff]" />
                          помощь с настройкой и стартом
                        </li>
                        <li className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#77c2ff]" />
                          льготные условия запуска
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
        <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#006497]">
              Проблема
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#041627] sm:text-4xl">
              Когда смены живут в чатах, теряется контроль над процессом
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Лэндинг MVP сфокусирован на реальной операционной боли: менеджеру нужен не GPS-мониторинг,
              а понятная дисциплина по сменам, технике, объектам и подтверждениям.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {problemPoints.map((point) => (
              <div
                key={point}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f4ff] text-[#006497]">
                  <Building2 className="h-6 w-6" />
                </div>
                <p className="mt-4 text-lg font-semibold leading-7 text-[#041627]">{point}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#006497]">
              Как это работает
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#041627]">
              Запуск без сложной интеграции
            </h2>
            <div className="mt-8 space-y-5">
              {workSteps.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#041627] text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="pt-1 text-base font-medium leading-7 text-slate-700">{step}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[32px] border border-[#c4c6cd] bg-[#1a2b3c] p-8 text-white shadow-[0_24px_60px_rgba(26,43,60,0.14)]">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#92ccff]">
              Позиционирование
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Контроль смен, водителей и объектов</h2>
            <p className="mt-5 text-base leading-7 text-slate-200">
              LogiShift нужен там, где важно быстро зафиксировать факт работы, собрать историю и убрать
              ручную сверку. Сервис не обещает автоматические платежи на этом этапе и не пытается заменить
              специализированные GPS-платформы.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-white">Secondary CTA</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  Открыть демо-компанию и посмотреть интерфейс на реальных сценариях.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-white">Primary CTA</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  Записаться в ограниченную тест-группу для пилота и старта с сопровождением.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#006497]">
              Возможности
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#041627] sm:text-4xl">
              MVP покрывает базовый процесс пилота
            </h2>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-0.5"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef5fb] text-[#1a2b3c]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-[#041627]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-[36px] border border-[#77c2ff]/40 bg-[linear-gradient(135deg,_#041627_0%,_#1a2b3c_55%,_#004f79_100%)] p-8 text-white shadow-[0_30px_70px_rgba(4,22,39,0.18)] lg:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#92ccff]">
                Тест-группа
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">Набираем первые 5–10 компаний</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-200">
                MVP рассчитан на ограниченный круг компаний, которым важен быстрый запуск и прямой канал
                обратной связи с командой продукта.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {betaBenefits.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#92ccff]" />
                    <div className="text-sm leading-6 text-slate-100">{item}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#006497]">
              Тарифы
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#041627] sm:text-4xl">
              Прозрачный старт без обещаний по платежной автоматизации
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              На текущем этапе мы показываем структуру запуска. Полноценная payment integration будет позже.
            </p>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#006497]">
                      {plan.name}
                    </div>
                    <div className="mt-3 text-4xl font-bold tracking-tight text-[#041627]">{plan.price}</div>
                  </div>
                  <div className="rounded-full bg-[#eef5fb] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#004f79]">
                    MVP
                  </div>
                </div>
                <p className="mt-5 text-base leading-7 text-slate-600">{plan.note}</p>
                <ul className="mt-6 space-y-3">
                  {plan.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-sm leading-6 text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#27ae60]" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-[34px] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#006497]">
                CTA / contact
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#041627]">
                Посмотреть демо и подать заявку на пилот
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Если вам нужен учет смен спецтехники, водителей и объектов без таблиц и хаоса, начните с
                демо и заявки в тест-группу. Для запуска с сопровождением используйте регистрацию компании.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={openRegister}
                className="rounded-2xl bg-[#006497] px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-[#004f79]"
              >
                Записаться в тест-группу
              </button>
              <button
                type="button"
                onClick={openDemo}
                className="rounded-2xl border border-[#041627] px-6 py-4 text-base font-semibold text-[#041627] transition-colors hover:bg-[#041627] hover:text-white"
              >
                Открыть демо
              </button>
              <button
                type="button"
                onClick={openTry}
                className="rounded-2xl border border-slate-300 px-6 py-4 text-base font-semibold text-slate-700 transition-colors hover:border-[#006497] hover:text-[#006497]"
              >
                Попробовать
              </button>
              <button
                type="button"
                onClick={openLogin}
                className="rounded-2xl border border-slate-300 px-6 py-4 text-base font-semibold text-slate-700 transition-colors hover:border-[#041627] hover:text-[#041627]"
              >
                Войти
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingView;
