import React, { useCallback, useEffect, useState } from "react";
import { API_ENDPOINTS } from "../constants";
import api from "../services/api";
import { DriverState, Shift, User, UserRole } from "../types";

const Dashboard: React.FC = () => {
  // ВСЕ useState должны быть в самом начале, до любых условных return
  const [currentUser, setCurrentUser] = useState<User | null>(
    api.getUserInfo()
  );
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [selectedTruck, setSelectedTruck] = useState<number | null>(null);
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const [step, setStep] = useState<
    "idle" | "selecting_truck" | "selecting_site"
  >("idle");
  const [stats, setStats] = useState({ activeShifts: 0, activeDrivers: 0 });

  const isAdminView =
    currentUser?.role === UserRole.ADMIN ||
    currentUser?.role === UserRole.FOREMAN;

  // Функция обновления состояния (БЕЗ запроса к /auth/me)

  //api.get(API_ENDPOINTS.TRUCKS),
  //api.get(API_ENDPOINTS.SITES),

  const refreshStatus = useCallback(async () => {
    try {
      // 1. Запрашиваем текущую смену из бэкенда
      // Этот эндпоинт — главный источник правды
      const shiftRes = await api.get(API_ENDPOINTS.CURRENT_SHIFT);
      setActiveShift(shiftRes);

      // 2. СИНХРОНИЗАЦИЯ СОСТОЯНИЯ (Для связки с ТГ-ботом)
      if (currentUser) {
        let realStateInDb = currentUser.current_state;

        if (shiftRes) {
          // Если в базе есть смена, её статус (active, awaiting_...)
          // является реальным состоянием водителя
          realStateInDb = shiftRes.status as DriverState;
        } else {
          // Если смены в базе нет, но в PWA мы не заняты локальным выбором (step === 'idle')
          // значит водитель точно отдыхает (IDLE)
          if (step === "idle") {
            realStateInDb = DriverState.IDLE;
          }
        }

        // Если состояние в браузере отличается от того, что пришло с сервера — исправляем
        if (currentUser.current_state !== realStateInDb) {
          const updatedUser = { ...currentUser, current_state: realStateInDb };
          setCurrentUser(updatedUser);
          api.setUserInfo(updatedUser); // Обновляем localStorage
        }
      }

      // 3. ЗАГРУЗКА СПИСКОВ (Машины и Объекты)
      // Грузим их только если водитель не в активной смене и списки еще пустые
      if (!shiftRes && trucks.length === 0) {
        const [trucksData, sitesData] = await Promise.all([
          api.get(API_ENDPOINTS.TRUCKS),
          api.get(API_ENDPOINTS.SITES),
        ]);

        setTrucks(Array.isArray(trucksData) ? trucksData : []);
        setSites(Array.isArray(sitesData) ? sitesData : []);
      }
    } catch (e: any) {
      console.error("Ошибка синхронизации стейта:", e);
      // Если сервер ответил 401 (токен протух), apiRequest сам сделает релоад
    } finally {
      // Убираем скелетон-загрузку только после первого успешного (или неуспешного) запроса
      setLoading(false);
    }
  }, [currentUser, trucks.length, step]);
  // В зависимости добавили step, чтобы функция знала, когда мы в процессе выбора

  // ВСЕ useEffect должны быть здесь, после useState и useCallback
  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 15000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  useEffect(() => {
    // Таймер для отображения времени работы
    if (
      currentUser?.current_state === DriverState.ACTIVE &&
      activeShift?.started_at
    ) {
      const timer = setInterval(() => {
        const start = new Date(
          activeShift.start_time || activeShift.started_at || Date.now()
        ).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, now - start);

        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        setElapsedTime(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
            .toString()
            .padStart(2, "0")}`
        );
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentUser?.current_state, activeShift?.started_at]);

  useEffect(() => {
    if (isAdminView) {
      api
        .get(API_ENDPOINTS.DASHBOARD_STATS)
        .then((res) => {
          setStats(res);
        })
        .catch(console.error);
    }
  }, [isAdminView]);

  // Функция для выполнения действий с обновлением состояния
  const performAction = async (action: () => Promise<any>) => {
    setIsActionLoading(true);
    try {
      await action();
      await refreshStatus();
    } catch (err: any) {
      alert(err.message || "Ошибка действия");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Обработчик загрузки фото
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsActionLoading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);

      const response = await fetch(API_ENDPOINTS.UPLOAD_PHOTO, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api.getAuthToken()}`,
        },
        body: fd,
      });

      if (!response.ok) throw new Error("Ошибка загрузки фото");

      await refreshStatus();
    } catch (err) {
      alert("Сеть нестабильна. Попробуйте еще раз.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ТОЛЬКО ТЕПЕРЬ можно делать условный return
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Синхронизация стейт-машины...
        </p>
      </div>
    );
  }

  if (isAdminView) {
    return (
      <div className="space-y-8 animate-in fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl mb-4">
              ⏱️
            </div>
            <p className="text-3xl font-black text-[#1B254B]">
              {stats.activeShifts}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Активные смены
            </p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-4">
              🚛
            </div>
            <p className="text-3xl font-black text-[#1B254B]">
              {stats.activeDrivers}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Водителей в рейсе
            </p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-slate-100">
          <h3 className="text-lg font-black text-[#1B254B] mb-6">Мониторинг</h3>
          <p className="text-slate-400 text-sm">
            Панель администратора в режиме просмотра данных.
          </p>
        </div>
      </div>
    );
  }

  // Рендер UI для водителя
  const renderDriverUI = () => {
    const state = currentUser?.current_state || DriverState.IDLE;

    // --- ЛОГИКА СТАРТА (Если водитель еще не в смене по базе данных) ---
    if (state === DriverState.IDLE) {
      // Шаг 1: Кнопка "Начать"
      if (step === "idle") {
        return (
          <div className="text-center py-10 animate-in zoom-in-95">
            <div className="w-32 h-32 bg-slate-100 rounded-[40px] flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner text-slate-300">
              💤
            </div>
            <h2 className="text-4xl font-black text-[#1B254B] mb-4">
              Вы отдыхаете
            </h2>
            <p className="text-slate-400 mb-10 max-w-xs mx-auto font-medium">
              Готовы начать новый рабочий день? Выберите машину и объект.
            </p>
            <button
              onClick={() => setStep("selecting_truck")}
              className="w-full max-w-sm py-8 bg-indigo-600 text-white rounded-[32px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all"
            >
              🚀 Начать смену
            </button>
          </div>
        );
      }

      // Шаг 2: Выбор машины (локальный)
      if (step === "selecting_truck") {
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-2xl font-black text-[#1B254B]">
                🚜 Выберите машину
              </h2>
              <button
                onClick={() => setStep("idle")}
                className="text-slate-400 text-sm font-bold"
              >
                Отмена
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {trucks.length > 0 ? (
                trucks.map((truck) => (
                  <button
                    key={truck.id}
                    onClick={() => {
                      setSelectedTruck(truck.id);
                      setStep("selecting_site");
                    }}
                    className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:border-indigo-600 text-left flex items-center justify-between group transition-all"
                  >
                    <div>
                      <p className="text-lg font-black text-[#1B254B]">
                        {truck.plate || truck.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Доступна для работы
                      </p>
                    </div>
                    <span className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      ➔
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-10 text-center text-slate-400 italic">
                  Нет свободных машин
                </div>
              )}
            </div>
          </div>
        );
      }

      // Шаг 3: Выбор объекта и Финальный старт
      if (step === "selecting_site") {
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-2xl font-black text-[#1B254B]">
                🏗️ Выберите объект
              </h2>
              <button
                onClick={() => setStep("selecting_truck")}
                className="text-slate-400 text-sm font-bold"
              >
                Назад
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {sites.map((site) => (
                <button
                  key={site.id}
                  disabled={isActionLoading}
                  onClick={() =>
                    performAction(async () => {
                      await api.post(API_ENDPOINTS.START_SHIFT, {
                        truck_id: selectedTruck,
                        site_id: site.id,
                      });
                      setStep("idle");
                      // refreshStatus вызовется автоматически внутри performAction
                    })
                  }
                  className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:border-indigo-600 text-left flex items-center justify-between group transition-all"
                >
                  <div>
                    <p className="text-lg font-black text-[#1B254B]">
                      {site.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Активный объект
                    </p>
                  </div>
                  <span className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    ➔
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      }
    }

    // --- ЛОГИКА ФОТО (Если сервер перевел юзера в ожидание фото) ---
    if (
      [
        DriverState.AWAITING_ODO_START,
        DriverState.AWAITING_ODO_END,
        DriverState.AWAITING_INVOICE,
      ].includes(state)
    ) {
      const isStart = state === DriverState.AWAITING_ODO_START;
      const isEnd = state === DriverState.AWAITING_ODO_END;
      const title = isStart
        ? "📸 Фото одометра (СТАРТ)"
        : isEnd
        ? "📸 Фото одометра (ФИНИШ)"
        : "📸 Фото накладной";

      return (
        <div className="text-center py-8 animate-in zoom-in-95">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6">
              📷
            </div>
            <h3 className="text-xl font-black text-[#1B254B] mb-2">{title}</h3>
            <p className="text-slate-400 text-sm mb-8">
              Сфотографируйте документ или панель приборов для продолжения.
            </p>

            <label className="block">
              <div className="w-full py-6 bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-widest cursor-pointer hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                {isActionLoading ? "Загрузка..." : "Открыть камеру"}
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={isActionLoading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const fd = new FormData();
                    fd.append("photo", file); // Поле 'photo' как ждет бэкенд
                    performAction(async () => {
                      await fetch(API_ENDPOINTS.UPLOAD_PHOTO, {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${api.getAuthToken()}`,
                        },
                        body: fd,
                      });
                    });
                  }
                }}
              />
            </label>
          </div>
          {/* Кнопка отмены для черновика (только на старте) */}
          {isStart && (
            <button
              onClick={() =>
                performAction(() =>
                  api.post(`${API_ENDPOINTS.SHIFTS}/cancel`, {})
                )
              }
              className="mt-6 text-slate-300 font-bold text-[10px] uppercase tracking-widest"
            >
              Отменить смену
            </button>
          )}
        </div>
      );
    }

    // --- ЛОГИКА АКТИВНОЙ СМЕНЫ (В работе) ---
    if (state === DriverState.ACTIVE) {
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-[#1B254B] p-10 rounded-[40px] text-center text-white shadow-2xl shadow-indigo-200">
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-4">
              Время в работе
            </p>
            <h2 className="text-6xl font-black tracking-tighter mb-8 font-mono">
              {elapsedTime}
            </h2>
            <div className="flex justify-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[10px] font-bold uppercase text-emerald-400">
                Смена активна
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase">
                🚛 Машина
              </span>
              <span className="text-sm font-black text-[#1B254B]">
                {activeShift?.truck?.name || activeShift?.vehicle_plate || "—"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase">
                🏗️ Объект
              </span>
              <span className="text-sm font-black text-[#1B254B]">
                {activeShift?.site?.name || activeShift?.work_object || "—"}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (confirm("Завершить смену?"))
                performAction(() => api.post(API_ENDPOINTS.END_SHIFT, {}));
            }}
            disabled={isActionLoading}
            className="w-full py-8 bg-red-500 text-white rounded-[32px] font-black uppercase tracking-widest shadow-xl shadow-red-100 active:scale-95 transition-all"
          >
            🏁 Завершить смену
          </button>
        </div>
      );
    }

    return (
      <div className="p-20 text-center text-slate-300">
        <p>Неизвестное состояние системы</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-indigo-600 font-bold"
        >
          Обновить
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-xl mx-auto pb-10">
      <header className="flex justify-between items-center mb-8 px-4">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Статус
          </p>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                currentUser?.current_state === DriverState.IDLE
                  ? "bg-slate-300"
                  : "bg-emerald-500 animate-pulse"
              }`}
            ></div>
            <p className="text-sm font-black text-[#1B254B] uppercase tracking-tighter">
              {currentUser?.current_state === DriverState.IDLE
                ? "Отдых"
                : "В работе"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Время
          </p>
          <p className="text-sm font-black text-[#1B254B]">
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </header>

      {renderDriverUI()}
    </div>
  );
};

export default Dashboard;
