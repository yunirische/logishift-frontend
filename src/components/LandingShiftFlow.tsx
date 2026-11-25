import { ArrowDown, Camera, CheckCircle2, CheckSquare, FileSpreadsheet, ListFilter, PlayCircle, SlidersHorizontal, Truck } from "lucide-react";

const driverSteps = [
  { label: "Начал смену", Icon: PlayCircle, color: "text-[#81c9f5]" },
  { label: "Сделал фото", Icon: Camera, color: "text-[#81c9f5]" },
  { label: "Закрыл смену", Icon: CheckCircle2, color: "text-[#65e3b3]" },
];

function ShiftThumbnail({ label, reading }: { label: string; reading?: string }) {
  return (
    <li className="min-w-0 text-center">
      <svg viewBox="0 0 86 49" className="mx-auto h-auto w-full max-w-[86px]" aria-hidden="true">
        <rect width="86" height="49" rx="7" fill="#203a50" />
        {reading ? (
          <>
            <path d="M23 26a20 20 0 0 1 40 0" fill="none" stroke="#abc6dc" strokeWidth="2" strokeLinecap="round" />
            <path d="M43 26l12-15" fill="none" stroke="#f4bd55" strokeWidth="2" strokeLinecap="round" />
            <rect x="22" y="30" width="42" height="12" rx="2" fill="#dce7d9" />
            <text x="43" y="39" textAnchor="middle" fontSize="10" fontWeight="700" fill="#243b2c">{reading}</text>
          </>
        ) : (
          <>
            <rect x="26" y="4" width="34" height="41" rx="3" fill="#f3f6fa" />
            <path d="M32 11h22m-22 6h22m-22 6h22m-22 6h22" fill="none" stroke="#a0b1c2" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M40 39q5-9 8-3l7-3" fill="none" stroke="#347bd0" strokeWidth="1.4" strokeLinecap="round" />
          </>
        )}
      </svg>
      <span className="mt-1 block text-[10px] leading-tight text-[#c3d6e7] sm:text-xs">{label}</span>
      {reading && <span className="sr-only"> {reading}</span>}
    </li>
  );
}

export default function LandingShiftFlow() {
  return (
    <figure className="min-w-0 rounded-3xl bg-[#071b2b] p-3.5 text-[#f2f7fc] shadow-[0_20px_50px_rgba(4,22,39,0.16)] sm:p-5 xl:p-6">
      <figcaption className="mb-3 text-xl font-bold leading-tight sm:text-2xl">Как проходит смена</figcaption>

      <ol aria-label="Как работает учёт смен">
        <li className="rounded-xl bg-[#142c42] px-3 py-2.5 sm:px-4 sm:py-3">
          <p className="flex items-center gap-2 text-sm font-semibold leading-tight sm:text-base">
            <SlidersHorizontal className="h-5 w-5 shrink-0 text-[#81c9f5] sm:h-6 sm:w-6" aria-hidden="true" />
            Вы задаёте требования к объекту
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs sm:gap-x-10 sm:text-sm">
            {["Накладная", "Одометр", "Фотоотчёт"].map(label => (
              <li key={label} className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-[#65e3b3] sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </li>

        <li>
          <ArrowDown className="mx-auto my-1.5 h-4 w-4 text-[#81c9f5] sm:h-5 sm:w-5" aria-hidden="true" />
          <p className="mb-2 text-[10px] font-semibold uppercase text-[#a9c4db] sm:text-xs">Водитель · с телефона</p>
          <ol className="grid grid-cols-3 gap-1.5 sm:gap-3">
            {driverSteps.map(({ label, Icon, color }) => (
              <li key={label} className="flex flex-col items-center gap-1.5 rounded-xl bg-[#142c42] px-1 py-2.5 text-center sm:gap-2 sm:py-3">
                <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${color}`} aria-hidden="true" />
                <span className="text-[11px] font-semibold leading-tight sm:text-sm">{label}</span>
              </li>
            ))}
          </ol>
        </li>

        <li>
          <ArrowDown className="mx-auto my-1.5 h-4 w-4 text-[#81c9f5] sm:h-5 sm:w-5" aria-hidden="true" />
          <p className="mb-2 text-base font-semibold leading-tight sm:text-lg">Вы получаете готовый результат</p>
          <div className="rounded-xl border border-[#355069] bg-[#142c42] px-2.5 py-2.5 sm:px-4 sm:py-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Truck className="h-7 w-7 shrink-0 text-[#81c9f5] sm:h-10 sm:w-10" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold leading-tight sm:text-lg">КамАЗ 65115</p>
                <p className="mt-0.5 text-[11px] leading-tight text-[#b8cde0] sm:text-xs">Алексей Смирнов · ЖК Северный</p>
                <p className="mt-0.5 text-xs font-semibold tabular-nums sm:text-sm">08:00–16:00</p>
              </div>
              <p className="shrink-0 whitespace-nowrap text-2xl font-bold leading-none tabular-nums text-[#65e3b3] sm:text-[33px]">8 ч</p>
            </div>
            <ul className="mt-2.5 grid grid-cols-3 gap-2 border-t border-[#355069] pt-2">
              <ShiftThumbnail label="Накладная" />
              <ShiftThumbnail label="Одометр до" reading="12540" />
              <ShiftThumbnail label="Одометр после" reading="12630" />
            </ul>
            <ul aria-label="Рабочие фотографии с подписями" className="mt-2 grid grid-cols-3 gap-2">
              {["Ход работы", "Результат", "Препятствие"].map((label, index) => (
                <li key={label} className="min-w-0 text-center">
                  <svg viewBox="0 0 86 49" className="mx-auto h-auto w-full max-w-[86px] rounded-md" aria-hidden="true">
                    <path fill="#385770" d="M0 0h86v49H0z" />
                    <path fill="#29424c" d="M0 29h86v20H0z" />
                    {index === 0 ? (
                      <g fill="#f4bd55">
                        <path d="M20 34h22v5H20zM25 25h14l3 9H23zM34 26l14-13 13 9-2 3-11-7-11 11z" />
                        <path d="M58 23h9v6h-9z" />
                      </g>
                    ) : index === 1 ? (
                      <path fill="#8badaf" d="M38 29h10l20 20H18zM8 24h15v5H8zM60 20h17v9H60z" />
                    ) : (
                      <g fill="#f4bd55">
                        <path d="M21 27h44v6H21zM25 33h4v9h-4zM57 33h4v9h-4z" />
                        <path fill="#29424c" d="M30 27h5l-4 6h-5zM45 27h5l-4 6h-5zM60 27h5l-4 6h-5z" />
                      </g>
                    )}
                  </svg>
                  <span className="mt-1 block text-[10px] leading-tight text-[#c3d6e7] sm:text-xs">{label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium leading-tight text-[#65e3b3] sm:text-[13px]">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              Снимки и подписи сохранены в истории смены
            </p>
          </div>
        </li>
      </ol>

      <div className="mt-3 space-y-2 border-t border-[#355069] pt-2.5 sm:mt-3.5">
        <div className="flex items-start gap-2.5">
          <ListFilter className="mt-0.5 h-5 w-5 shrink-0 text-[#81c9f5] sm:h-6 sm:w-6" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold leading-tight sm:text-sm">История и отчёты</p>
            <p className="mt-0.5 text-[11px] leading-tight text-[#b8cde0] sm:text-xs">Техника · Водитель · Объект · Период</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-[#65e3b3] sm:h-6 sm:w-6" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold leading-tight sm:text-sm">Excel и архив фотографий</p>
            <p className="mt-0.5 text-[11px] leading-tight text-[#b8cde0] sm:text-xs">С платного тарифа «Старт»</p>
          </div>
        </div>
      </div>
    </figure>
  );
}
