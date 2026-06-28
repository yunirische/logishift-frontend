import React from "react";
import { FileText, ChevronDown } from "lucide-react";
import {
  PUBLIC_LEGAL_LINKS,
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
  SUPPORT_TELEGRAM_URL,
} from "../config/legal";

interface AuthenticatedLegalMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onLinkClick: () => void;
}

const AuthenticatedLegalMenu: React.FC<AuthenticatedLegalMenuProps> = ({
  isOpen,
  onToggle,
  onLinkClick,
}) => {
  return (
    <section
      className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-3"
      aria-label="Справка"
    >
      <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        Справка
      </p>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="authenticated-legal-menu-panel"
        className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-[#111827]"
      >
        <span className="flex min-w-0 items-center gap-3">
          <FileText className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">Документы и поддержка</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id="authenticated-legal-menu-panel"
          data-testid="authenticated-legal-menu-panel"
          className="mt-3 space-y-4 border-t border-slate-800 px-2 pt-4"
        >
          <div className="space-y-1">
            {PUBLIC_LEGAL_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                className="flex min-h-10 items-center rounded-lg px-3 py-2 text-sm leading-5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <span className="break-words">{item.label}</span>
              </a>
            ))}
          </div>

          <div className="space-y-1 border-t border-slate-800 pt-4">
            <a
              href={SUPPORT_EMAIL_HREF}
              onClick={onLinkClick}
              className="flex min-h-10 items-center rounded-lg px-3 py-2 text-sm leading-5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <span className="break-all">{SUPPORT_EMAIL}</span>
            </a>
            <a
              href={SUPPORT_TELEGRAM_URL}
              target="_blank"
              rel="noreferrer"
              onClick={onLinkClick}
              className="flex min-h-10 items-center rounded-lg px-3 py-2 text-sm leading-5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <span className="break-words">Написать в поддержку</span>
            </a>
          </div>
        </div>
      )}
    </section>
  );
};

export default AuthenticatedLegalMenu;
