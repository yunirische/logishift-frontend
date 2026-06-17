import React, { useEffect } from "react";
import BrandLogo from "../components/BrandLogo";
import LegalLinks from "../components/LegalLinks";
import {
  LEGAL_DOCUMENTS,
  LEGAL_REVISION_LABEL,
  LegalDocumentKey,
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
  SUPPORT_PHONE,
  SUPPORT_TELEGRAM_URL,
} from "../config/legal";

type LegalDocumentViewProps = {
  documentKey: LegalDocumentKey;
};

const renderInlineLinks = (text: string) => {
  const parts = text.split(
    /(support@kontrolsmen\.ru|\+7 347 216-32-37|https:\/\/t\.me\/logishift_support|https:\/\/kontrolsmen\.ru|https:\/\/app\.kontrolsmen\.ru|https:\/\/api\.kontrolsmen\.ru)/
  );

  return parts.map((part, index) => {
    if (part === SUPPORT_EMAIL) {
      return (
        <a key={`${part}-${index}`} href={SUPPORT_EMAIL_HREF} className="text-[#006497] hover:text-[#004f79]">
          {part}
        </a>
      );
    }

    if (part === SUPPORT_TELEGRAM_URL) {
      return (
        <a
          key={`${part}-${index}`}
          href={SUPPORT_TELEGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[#006497] hover:text-[#004f79]"
        >
          {part}
        </a>
      );
    }

    if (
      part === "https://kontrolsmen.ru" ||
      part === "https://app.kontrolsmen.ru" ||
      part === "https://api.kontrolsmen.ru"
    ) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="text-[#006497] hover:text-[#004f79]"
        >
          {part}
        </a>
      );
    }

    if (part === SUPPORT_PHONE) {
      return (
        <a key={`${part}-${index}`} href="tel:+73472163237" className="text-[#006497] hover:text-[#004f79]">
          {part}
        </a>
      );
    }

    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
};

const LegalDocumentView: React.FC<LegalDocumentViewProps> = ({ documentKey }) => {
  const legalDocument = LEGAL_DOCUMENTS[documentKey];

  useEffect(() => {
    const previousTitle = window.document.title;
    window.document.title = LEGAL_DOCUMENTS[documentKey].pageTitle;

    return () => {
      window.document.title = previousTitle;
    };
  }, [documentKey]);

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(119,194,255,0.22),_transparent_36%),linear-gradient(180deg,_#f7f9fc_0%,_#eef2f6_100%)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-5 py-6 sm:px-6 lg:px-10">
          <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <a href="/" className="inline-flex max-w-full">
                <BrandLogo className="min-w-0" imageClassName="h-auto w-[12rem] max-w-full sm:w-[13.5rem]" />
              </a>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#006497]">
                {LEGAL_REVISION_LABEL}
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-[#041627] sm:text-4xl">
                {legalDocument.title}
              </h1>
            </div>
            <div className="flex gap-3">
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-[#041627] hover:text-[#041627]"
              >
                На главную
              </a>
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-[#041627] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a2b3c]"
              >
                Войти
              </a>
            </div>
          </header>

          {legalDocument.intro && (
            <div className="max-w-3xl space-y-4 text-base leading-7 text-slate-600">
              {legalDocument.intro.map((paragraph) => (
                <p key={paragraph}>{renderInlineLinks(paragraph)}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:px-10 lg:py-14">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="space-y-8">
            {legalDocument.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold tracking-tight text-[#041627] sm:text-2xl">
                  {section.title}
                </h2>
                {section.paragraphs && (
                  <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-base">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{renderInlineLinks(paragraph)}</p>
                    ))}
                  </div>
                )}
                {section.bullets && (
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600 sm:text-base">
                    {section.bullets.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#006497]" />
                        <span>{renderInlineLinks(item)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 lg:px-10">
          <LegalLinks />
        </div>
      </footer>
    </div>
  );
};

export default LegalDocumentView;
