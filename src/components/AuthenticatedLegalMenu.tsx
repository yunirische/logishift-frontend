import React from "react";
import {
  PUBLIC_LEGAL_LINKS,
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
  SUPPORT_TELEGRAM_URL,
} from "../config/legal";

interface AuthenticatedLegalMenuProps {
  onLinkClick: () => void;
}

const AuthenticatedLegalMenu: React.FC<AuthenticatedLegalMenuProps> = ({ onLinkClick }) => (
  <section
    id="authenticated-legal-menu-panel"
    data-testid="authenticated-legal-menu-panel"
    aria-label="Документы и поддержка"
    className="absolute right-0 top-full mt-2 max-h-[70dvh] w-64 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
  >
    <div className="space-y-1">
      {PUBLIC_LEGAL_LINKS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          onClick={onLinkClick}
          className="flex min-h-10 items-center rounded-lg px-3 py-2 text-sm leading-5 text-slate-700 transition-colors hover:bg-slate-100"
        >
          <span className="break-words">{item.label}</span>
        </a>
      ))}
    </div>

    <div className="space-y-1 border-t border-slate-200 pt-2">
      <a
        href={SUPPORT_EMAIL_HREF}
        onClick={onLinkClick}
        className="flex min-h-10 items-center rounded-lg px-3 py-2 text-sm leading-5 text-slate-700 transition-colors hover:bg-slate-100"
      >
        <span className="break-all">{SUPPORT_EMAIL}</span>
      </a>
      <a
        href={SUPPORT_TELEGRAM_URL}
        target="_blank"
        rel="noreferrer"
        onClick={onLinkClick}
        className="flex min-h-10 items-center rounded-lg px-3 py-2 text-sm leading-5 text-slate-700 transition-colors hover:bg-slate-100"
      >
        <span className="break-words">Написать в поддержку</span>
      </a>
    </div>
  </section>
);

export default AuthenticatedLegalMenu;
