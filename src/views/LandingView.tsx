import React from "react";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  MapPinned,
  Phone,
  Truck,
} from "lucide-react";
import { getDemoEntryUrl, getProductionAppUrl } from "../config/demo";
import { getAttributionNavigationUrl } from "../lib/attribution";
import { PUBLIC_TARIFFS } from "../config/tariffs";
import BrandLogo from "../components/BrandLogo";
import LegalLinks from "../components/LegalLinks";
import PageMetadata from "../components/PageMetadata";
import {
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
  SUPPORT_PHONE,
  SUPPORT_TELEGRAM_URL,
} from "../config/legal";

const LANDING_META_DESCRIPTION =
  "LogiShift — учёт и контроль смен транспорта и спецтехники: техника, водители, объекты, фото, комментарии, история и журнал действий.";

const painPoints = [
  {
    text: "Смены остаются в таблицах и сообщениях.",
    icon: Phone,
  },
  {
    text: "Фото и накладные лежат отдельно.",
    icon: Truck,
  },
  {
    text: "Неясно, кто был на какой машине и объекте.",
    icon: MapPinned,
  },
  {
    text: "Информацию собирают, когда уже пора считать работу.",
    icon: Camera,
  },
];

const productCapabilities = [
  "учёт текущих и завершённых смен",
  "техника, водители и объекты",
  "фото к сменам",
  "комментарии к сменам",
  "история и журнал действий",
  "роли пользователей и приглашения водителей",
  "ручное создание, завершение и отмена смен",
  "тарифы и лимиты для техники, водителей и объектов",
];

const faqItems = [
  {
    question: "Как водитель начинает смену?",
    answer:
      "Водитель открывает сервис с телефона, выбирает технику и объект, добавляет необходимые фото и запускает смену.",
  },
  {
    question: "Что видит диспетчер?",
    answer:
      "Диспетчер видит активные смены, водителя, технику, объект, время, фото и сохранённую историю работы.",
  },
  {
    question: "Нужно ли устанавливать приложение?",
    answer: "Нет. LogiShift работает в браузере на телефоне и компьютере.",
  },
  {
    question: "Можно ли сначала посмотреть сервис?",
    answer:
      "Да. Откройте демо, чтобы посмотреть основные сценарии работы, или зарегистрируйте компанию бесплатно.",
  },
];

const landingMeta = [
  {
    selector: 'meta[name="description"]',
    tagName: "meta" as const,
    attributes: {
      name: "description",
      content: LANDING_META_DESCRIPTION,
    },
  },
  {
    selector: 'link[rel="canonical"]',
    tagName: "link" as const,
    attributes: {
      rel: "canonical",
      href: "https://kontrolsmen.ru/",
    },
  },
  {
    selector: 'meta[property="og:type"]',
    tagName: "meta" as const,
    attributes: {
      property: "og:type",
      content: "website",
    },
  },
  {
    selector: 'meta[property="og:title"]',
    tagName: "meta" as const,
    attributes: {
      property: "og:title",
      content: "LogiShift — учёт и контроль смен транспорта и спецтехники",
    },
  },
  {
    selector: 'meta[property="og:description"]',
    tagName: "meta" as const,
    attributes: {
      property: "og:description",
      content: LANDING_META_DESCRIPTION,
    },
  },
  {
    selector: 'meta[property="og:url"]',
    tagName: "meta" as const,
    attributes: {
      property: "og:url",
      content: "https://kontrolsmen.ru/",
    },
  },
  {
    selector: 'meta[name="twitter:card"]',
    tagName: "meta" as const,
    attributes: {
      name: "twitter:card",
      content: "summary",
    },
  },
];

const landingStructuredData = [
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "LogiShift",
        url: "https://kontrolsmen.ru/",
      },
      {
        "@type": "SoftwareApplication",
        name: "LogiShift",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: "https://kontrolsmen.ru/",
        description:
          "Сервис для учёта и контроля смен транспорта и спецтехники с объектами, фото, комментариями и историей смен.",
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  },
];

const openLogin = () => {
  window.location.href = getAttributionNavigationUrl(getProductionAppUrl("/login"));
};

const openRegister = () => {
  window.location.href = getAttributionNavigationUrl(getProductionAppUrl("/register"));
};

const openDemo = () => {
  window.location.href = getAttributionNavigationUrl(getDemoEntryUrl());
};

const LandingView: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <PageMetadata
        title="LogiShift — учёт и контроль смен транспорта и спецтехники"
        meta={landingMeta}
        structuredData={landingStructuredData}
      />
      <div className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(119,194,255,0.28),_transparent_32%),linear-gradient(180deg,_#f7f9fc_0%,_#eef2f6_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,22,39,0.04)_1px,transparent_1px),linear-gradient(rgba(4,22,39,0.04)_1px,transparent_1px)] bg-[size:36px_36px]" />
        <div className="relative mx-auto flex max-w-7xl flex-col px-5 pb-12 pt-5 sm:px-6 lg:px-10 lg:pb-20">
          <header className="mb-10 flex items-center justify-between gap-4">
            <BrandLogo
              className="min-w-0"
              loading="eager"
              imageClassName="h-auto w-[11rem] max-w-full sm:w-[13.5rem]"
            />
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
                Смены транспорта и спецтехники — без Excel и чатов
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                LogiShift — учёт смен: водитель отмечает смену с телефона, а руководитель видит водителя, технику, объект, время, фото и комментарии.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={openDemo}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#006497] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[#006497]/20 transition-all hover:bg-[#004f79]"
                >
                  Посмотреть демо
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={openRegister}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#041627] bg-white px-6 py-4 text-base font-semibold text-[#041627] transition-colors hover:bg-[#041627] hover:text-white"
                >
                  Начать бесплатно
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

      <main className="mx-auto max-w-7xl px-5 pb-12 pt-8 sm:px-6 lg:px-10 lg:pb-20 lg:pt-10">
        <section>
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#006497]">
              Проблема знакома?
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#041627] sm:text-4xl">
              В конце недели снова разбираетесь, кто где работал?
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {painPoints.map(({ text, icon: Icon }) => (
              <div key={text} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e6f4ff] text-[#006497]">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-4 text-base font-semibold leading-6 text-[#041627]">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            LogiShift фиксирует это во время самой смены.
          </p>
        </section>

        <section
          aria-label="Специальные условия на старте"
          className="mt-10 rounded-2xl border border-[#77c2ff]/70 bg-[#eef8ff] p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6 lg:mt-14"
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#006497]">
              Специальные условия на старте
            </div>
            <h2 className="mt-2 text-lg font-semibold text-[#041627]">Начните с поддержкой команды LogiShift</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Поможем настроить технику, водителей и объекты, а также предоставим расширенный доступ на период знакомства с сервисом.
            </p>
          </div>
          <a
            href={SUPPORT_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 shrink-0 rounded-xl bg-[#006497] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#004f79] sm:mt-0"
          >
            Обсудить условия
          </a>
        </section>

        <section className="mt-16 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#006497]">
              Возможности
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#041627] sm:text-4xl">
              Всё нужное для контроля смен
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Смена фиксируется сразу. Диспетчер видит текущую картину, а руководитель может вернуться к истории и журналу действий позже.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {productCapabilities.map((capability) => (
              <div key={capability} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#27ae60]" />
                <div className="text-base font-semibold leading-6 text-[#041627]">{capability}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#006497]">
              Тарифы и лимиты
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#041627] sm:text-4xl">
              Начните с бесплатного тарифа
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Бесплатный тариф включает до 2 машин, 2 водителей и 2 объектов. Для растущего парка доступны тарифы с большими лимитами.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {PUBLIC_TARIFFS.map((tariff) => (
              <div
                key={tariff.code}
                className={`rounded-2xl border p-5 shadow-sm ${
                  tariff.featured
                    ? "border-[#77c2ff] bg-[#eef8ff]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="min-h-[4.5rem]">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#006497]">
                    {tariff.name}
                  </div>
                  <div className="mt-3 text-2xl font-bold tracking-tight text-[#041627]">
                    {tariff.priceLabel}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-600">{tariff.meta}</div>
                </div>
                <ul className="mt-5 space-y-2">
                  {tariff.details.map((detail) => (
                    <li key={detail} className="flex gap-2 text-sm leading-5 text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#27ae60]" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
            Для крупного парка, отдельного внедрения или особых требований подготовим индивидуальные условия.
            Онлайн-оплата появится позже.
          </div>
        </section>

        <section className="mt-16 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#006497]">
              Частые вопросы
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#041627] sm:text-4xl">
              Что важно знать перед запуском
            </h2>
          </div>
          <dl className="mt-8 grid gap-4 lg:grid-cols-2">
            {faqItems.map(({ question, answer }) => (
              <div
                key={question}
                className="rounded-2xl border border-slate-200 bg-[#f7f9fc] p-5"
              >
                <dt className="text-lg font-semibold text-[#041627]">{question}</dt>
                <dd className="mt-3 text-sm leading-6 text-slate-600">{answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-16 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#006497]">
                Следующий шаг
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#041627]">
                Попробуйте LogiShift в работе
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Откройте демо или зарегистрируйте компанию бесплатно, чтобы начать вести реальные смены.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={openRegister}
                className="rounded-2xl bg-[#006497] px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-[#004f79]"
              >
                Начать бесплатно
              </button>
              <button
                type="button"
                onClick={openDemo}
                className="rounded-2xl border border-[#041627] px-6 py-4 text-base font-semibold text-[#041627] transition-colors hover:bg-[#041627] hover:text-white"
              >
                Открыть демо
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-10">
          <div className="max-w-xl">
            <BrandLogo loading="lazy" imageClassName="h-auto w-[12rem] max-w-full" />
            <p className="mt-4 text-sm leading-6 text-slate-600">
              LogiShift помогает организациям и ИП вести учет смен, техники, объектов и рабочих записей в одном онлайн-сервисе.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
              <a
                href={SUPPORT_EMAIL_HREF}
                className="inline-flex w-fit flex-none items-center justify-start transition-colors hover:text-[#041627]"
              >
                {SUPPORT_EMAIL}
              </a>
              <a
                href="tel:+73472163237"
                className="inline-flex w-fit flex-none items-center justify-start transition-colors hover:text-[#041627]"
              >
                {SUPPORT_PHONE}
              </a>
              <a
                href={SUPPORT_TELEGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit flex-none items-center justify-start transition-colors hover:text-[#041627]"
              >
                Написать в поддержку
              </a>
            </div>
          </div>
          <LegalLinks
            showSupport={false}
            className="lg:justify-self-end"
            supportClassName="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 lg:justify-end"
            linksClassName="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 lg:justify-end"
          />
        </div>
      </footer>
    </div>
  );
};

export default LandingView;
