import React from 'react';
import { getDemoRegistrationUrl } from '../lib/demoRegistrationHandoff';
import { recordDemoRegistrationCtaClick } from '../lib/demoFunnelEvents';

const DemoBanner: React.FC = () => {
  const registrationUrl = getDemoRegistrationUrl();

  return (
    <div className="mb-3 flex flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
      <p className="text-xs font-semibold leading-5 text-amber-800">
        Демо · Тестовые данные, изменения не сохраняются.
      </p>
      <a
        href={registrationUrl}
        onClick={recordDemoRegistrationCtaClick}
        className="shrink-0 text-xs font-bold text-amber-900 underline decoration-amber-500 underline-offset-2 transition-colors hover:text-amber-700"
      >
        Создать компанию
      </a>
    </div>
  );
};

export default DemoBanner;
