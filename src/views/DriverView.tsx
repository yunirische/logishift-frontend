import {
  AlertCircle,
  Camera,
  CheckCircle2,
  LogOut,
  MapPin,
  Play,
  Square,
  Truck,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Button, Card } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export const DriverView = () => {
  const { user, logout } = useAuth();

  // Состояния данных
  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);

  // Состояния выбора для новой смены
  const [selectedTruck, setSelectedTruck] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>("");

  // Реф для вызова камеры
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Загрузка данных при входе
  const initData = async () => {
    setLoading(true);
    try {
      const currentRes = await api.get("/shifts/current");
      if (currentRes.data) {
        setActiveShift(currentRes.data);
      }

      // Если пользователь не в смене (idle), грузим списки выбора
      if (!currentRes.data) {
        const [trucksRes, sitesRes] = await Promise.all([
          api.get("/trucks"),
          api.get("/sites"),
        ]);
        setTrucks(trucksRes.data);
        setSites(sitesRes.data);
      }
    } catch (e) {
      console.error("Ошибка инициализации:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  // 2. Начать смену
  const handleStart = async () => {
    if (!selectedTruck || !selectedSite) return;
    setLoading(true);
    try {
      await api.post("/shifts/start", {
        truck_id: selectedTruck,
        site_id: selectedSite,
      });
      // После старта просто перезагружаем страницу,
      // чтобы AuthContext и стейты синхронизировались с БД
      window.location.reload();
    } catch (e: any) {
      alert(e.response?.data?.error || "Ошибка при старте смены");
      setLoading(false);
    }
  };

  // 3. Завершить смену (запрос)
  const handleEnd = async () => {
    if (!confirm("Завершить смену?")) return;
    setLoading(true);
    try {
      await api.post("/shifts/end");
      // Перезагрузка для обновления current_state (на случай, если нужно фото одометра/накладной)
      window.location.reload();
    } catch (e: any) {
      alert(e.response?.data?.error || "Ошибка завершения");
      setLoading(false);
    }
  };

  // 4. Обработка загрузки фото (Камера)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);

    setLoading(true);
    try {
      await api.post("/shifts/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // После успешной загрузки фото — перезагрузка для обновления статуса
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.error || "Ошибка при загрузке фото");
      setLoading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading && !trucks.length && !activeShift) {
    return (
      <div className="p-10 text-center animate-pulse">Загрузка данных...</div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20">
      {/* Шапка */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold">Привет, {user?.full_name}</h1>
          <p className="text-sm text-slate-500">
            {user?.current_state === "idle" ? "Свободен" : "В процессе"}
          </p>
        </div>
        <button
          onClick={logout}
          className="p-2 text-slate-400 hover:text-red-500"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Скрытый инпут для камеры */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
      />

      {/* ЛОГИКА ОТОБРАЖЕНИЯ ЭКРАНОВ */}

      {user?.current_state === "idle" ? (
        // --- ЭКРАН ВЫБОРА ---
        <div className="space-y-6">
          <Card className="p-4">
            <label className="block text-sm font-medium mb-3 text-slate-500 uppercase tracking-wider">
              Транспорт
            </label>
            <div className="grid grid-cols-2 gap-3">
              {trucks.map((truck) => (
                <div
                  key={truck.id}
                  onClick={() => setSelectedTruck(truck.id)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedTruck === truck.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-100 hover:border-blue-200"
                  }`}
                >
                  <Truck
                    className={`mb-2 ${
                      selectedTruck === truck.id
                        ? "text-blue-600"
                        : "text-slate-400"
                    }`}
                  />
                  <div className="font-bold text-sm">{truck.name}</div>
                  <div className="text-xs text-slate-400">{truck.plate}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <label className="block text-sm font-medium mb-3 text-slate-500 uppercase tracking-wider">
              Объект
            </label>
            <div className="space-y-2">
              {sites.map((site) => (
                <div
                  key={site.id}
                  onClick={() => setSelectedSite(site.id)}
                  className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                    selectedSite === site.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-100 hover:border-blue-200"
                  }`}
                >
                  <MapPin
                    size={18}
                    className={
                      selectedSite === site.id
                        ? "text-blue-600"
                        : "text-slate-400"
                    }
                  />
                  <span className="text-sm font-medium">{site.name}</span>
                </div>
              ))}
            </div>
          </Card>

          <Button
            onClick={handleStart}
            disabled={!selectedTruck || !selectedSite}
            className="w-full py-4 bg-blue-600 text-white text-lg font-bold shadow-lg shadow-blue-100 disabled:opacity-50"
            isLoading={loading}
          >
            <Play fill="currentColor" size={20} className="mr-2" />
            Начать смену
          </Button>
        </div>
      ) : user?.current_state === "active" ? (
        // --- ЭКРАН "В РАБОТЕ" ---
        <div className="space-y-6">
          <Card className="p-8 text-center bg-white border-none shadow-sm">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-1">
              Смена открыта
            </h2>
            <p className="text-slate-500 mb-6">Выполняйте работу на объекте</p>

            <div className="text-left space-y-3 bg-slate-50 p-4 rounded-xl">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Машина:</span>
                <span className="font-semibold">
                  {activeShift?.truck?.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Объект:</span>
                <span className="font-semibold">{activeShift?.site?.name}</span>
              </div>
            </div>
          </Card>

          <Button
            onClick={handleEnd}
            className="w-full py-5 bg-red-500 text-white text-xl font-bold shadow-xl shadow-red-100 flex items-center justify-center gap-2"
            isLoading={loading}
          >
            <Square fill="currentColor" size={18} />
            Завершить смену
          </Button>
        </div>
      ) : (
        // --- ЭКРАН ЗАГРУЗКИ ФОТО (ДЛЯ ВСЕХ СТАТУСОВ AWAITING_...) ---
        <div className="space-y-6">
          <Card className="p-8 text-center bg-white border-none shadow-sm">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
              <Camera size={40} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Нужна фотография
            </h2>
            <div className="p-3 bg-orange-50 rounded-lg text-orange-700 font-medium text-sm">
              {user?.current_state === "awaiting_odo_start" &&
                "Сфотографируйте одометр ПЕРЕД началом движения"}
              {user?.current_state === "awaiting_odo_end" &&
                "Сфотографируйте одометр ПОСЛЕ завершения работ"}
              {user?.current_state === "awaiting_invoice" &&
                "Сфотографируйте накладную (ТТН)"}
            </div>
          </Card>

          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-8 bg-orange-500 text-white text-2xl font-black shadow-2xl shadow-orange-200 animate-pulse flex flex-col items-center gap-2"
            isLoading={loading}
          >
            <Camera size={32} />
            СДЕЛАТЬ ФОТО
          </Button>

          <div className="flex items-start gap-2 p-4 text-slate-400 text-xs bg-slate-100 rounded-lg">
            <AlertCircle size={14} className="shrink-0" />
            <p>
              Убедитесь, что данные на фото (цифры одометра или текст накладной)
              видны четко и без бликов.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
