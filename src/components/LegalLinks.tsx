import React from "react";
import {
  PUBLIC_LEGAL_LINKS,
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
  SUPPORT_TELEGRAM_URL,
} from "../config/legal";

type LegalLinksProps = {
  className?: string;
  supportClassName?: string;
  linksClassName?: string;
  compact?: boolean;
};

const linkBaseClass =
  "text-slate-500 transition-colors hover:text-[#041627]";

const LegalLinks: React.FC<LegalLinksProps> = ({
  className = "",
  supportClassName = "",
  linksClassName = "",
  compact = false,
}) => {
  const defaultLinksClass = compact
    ? `mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm ${linkBaseClass}`
    : `mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm ${linkBaseClass}`;

  return (
    <div className={className}>
      <div
        className={
          supportClassName ||
          `flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm ${linkBaseClass}`
        }
      >
        <a href={SUPPORT_EMAIL_HREF}>{SUPPORT_EMAIL}</a>
        <a href={SUPPORT_TELEGRAM_URL} target="_blank" rel="noreferrer">
          Написать в поддержку
        </a>
      </div>
      <div
        className={
          linksClassName || defaultLinksClass
        }
      >
        {PUBLIC_LEGAL_LINKS.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
};

export default LegalLinks;
