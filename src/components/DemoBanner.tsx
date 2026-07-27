import React from 'react';
import { Truck, UserCog } from 'lucide-react';
import { getDemoRegistrationUrl } from '../lib/demoRegistrationHandoff';

type DemoPersona = 'admin' | 'driver';

interface DemoBannerProps {
  demoPersona: DemoPersona;
  setDemoPersona: (persona: DemoPersona) => void;
}

const DemoBanner: React.FC<DemoBannerProps> = ({ demoPersona, setDemoPersona }) => {
  const registrationUrl = getDemoRegistrationUrl();

  return (
    <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-amber-800">
          Демо-организация
        </p>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
          Данные тестовые, изменения симулируются и не сохраняются.{' '}
          Для реальной работы{' '}
          <a href={registrationUrl} className="underline hover:text-amber-900 transition-colors">
            создайте свою компанию
          </a>.
        </p>
        <p className="text-xs text-amber-700 mt-2 leading-relaxed">
          Попробуйте сценарий: водитель начинает смену, а диспетчер видит ее в реестре.
        </p>
      </div>
      <div className="shrink-0">
        <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest mb-1.5">
          Демо-переключатель роли
        </p>
        <p className="text-[11px] text-amber-700 mb-2">
          Переключайтесь между ролями, чтобы увидеть путь водителя и администратора.
        </p>
        <div className="flex gap-1.5">
          <button
            onClick={() => setDemoPersona('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
              demoPersona === 'admin'
                ? 'bg-amber-500 text-slate-900'
                : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <UserCog size={13} />
            Администратор
          </button>
          <button
            onClick={() => setDemoPersona('driver')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
              demoPersona === 'driver'
                ? 'bg-amber-500 text-slate-900'
                : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Truck size={13} />
            Водитель (мобильный)
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoBanner;
