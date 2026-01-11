import {
  Camera,
  CheckCircle2,
  Clock,
  LogOut,
  MapPin,
  Truck,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Button, Card } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export const DriverView = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initData = async () => {
    setLoading(true);
    try {
      const currentRes = await api.get("/shifts/current");
      if (currentRes.data) {
        setActiveShift(currentRes.data);
      } else {
        const [trucksRes, sitesRes] = await Promise.all([
          api.get("/trucks"),
          api.get("/sites"),
        ]);
        setTrucks(trucksRes.data);
        setSites(sitesRes.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  const handleStart = async () => {
    if (!selectedTruck || !selectedSite) return;
    setLoading(true);
    try {
      await api.post("/shifts/start", {
        truck_id: selectedTruck,
        site_id: selectedSite,
      });
      window.location.reload();
    } catch (e: any) {
      alert(e.response?.data?.error || "Ошибка старта");
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!confirm("Завершить смену?")) return;
    setLoading(true);
    try {
      await api.post("/shifts/end");
      window.location.reload();
    } catch (e: any) {
      alert(e.response?.data?.error || "Ошибка завершения");
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("photo", file);
    setLoading(true);
    try {
      await api.post("/shifts/photo", formData);
      window.location.reload();
    } catch (err: any) {
      alert(
        err.response?.data?.error ||
          "Ошибка при загрузке фото. Проверьте логи сервера."
      );
      setLoading(false);
    }
  };

  if (loading && !activeShift)
    return <div className="p-10 text-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-10">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
      />

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold">Привет, {user?.full_name}</h1>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              user?.current_state === "idle"
                ? "bg-slate-200"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {user?.current_state === "idle" ? "Вне смены" : "В процессе"}
          </span>
        </div>
        <button onClick={logout} className="p-2 text-slate-400">
          <LogOut size={20} />
        </button>
      </div>

      {user?.current_state === "idle" ? (
        // --- ВЫБОР ---
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase">
              Транспорт
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {trucks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTruck(t.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedTruck === t.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-100"
                  }`}
                >
                  <Truck size={16} className="mb-1 text-slate-400" />
                  <div className="font-bold text-sm">{t.name}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase">
              Объект
            </h3>
            <div className="space-y-2">
              {sites.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSite(s.id)}
                  className={`p-3 rounded-lg border flex items-center gap-3 ${
                    selectedSite === s.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-100"
                  }`}
                >
                  <MapPin size={16} className="text-slate-400" />
                  <span className="text-sm">{s.name}</span>
                </div>
              ))}
            </div>
          </Card>
          <Button
            onClick={handleStart}
            disabled={!selectedTruck || !selectedSite}
            className="w-full py-4 bg-blue-600 text-white font-bold"
          >
            НАЧАТЬ СМЕНУ
          </Button>
        </div>
      ) : (
        // --- АКТИВНАЯ СМЕНА ИЛИ ОЖИДАНИЕ ФОТО ---
        <div className="space-y-4">
          <Card className="p-5 border-none shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Clock size={18} />
                <span className="font-bold">Смена #{activeShift?.id}</span>
              </div>
              <div className="text-xs text-slate-400">
                {activeShift?.start_time
                  ? new Date(activeShift.start_time).toLocaleTimeString()
                  : "Оформление"}
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-500">
                  <Truck size={16} />
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold">
                    Машина
                  </div>
                  <div className="text-sm font-bold">
                    {activeShift?.truck?.name || "---"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-500">
                  <MapPin size={16} />
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold">
                    Объект
                  </div>
                  <div className="text-sm font-bold">
                    {activeShift?.site?.name || "---"}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {user?.current_state === "active" ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-700">
                <CheckCircle2 size={20} />
                <span className="text-sm font-medium">
                  Работа в процессе...
                </span>
              </div>
              <Button
                onClick={handleEnd}
                className="w-full py-4 bg-red-500 text-white font-bold"
                isLoading={loading}
              >
                ЗАВЕРШИТЬ СМЕНУ
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-6 bg-orange-50 border border-orange-100 rounded-xl text-center">
                <Camera size={32} className="mx-auto mb-2 text-orange-500" />
                <h3 className="font-bold text-orange-800">Нужна фотография</h3>
                <p className="text-xs text-orange-600 mt-1">
                  {user?.current_state === "awaiting_odo_start" &&
                    "Сфотографируйте одометр ПЕРЕД началом"}
                  {user?.current_state === "awaiting_odo_end" &&
                    "Сфотографируйте одометр ПОСЛЕ работы"}
                  {user?.current_state === "awaiting_invoice" &&
                    "Сфотографируйте накладную"}
                </p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 bg-orange-500 text-white text-xl font-black animate-pulse"
                isLoading={loading}
              >
                СДЕЛАТЬ ФОТО
              </Button>
            </div>
          )}

          {activeShift?.comment && (
            <Card className="p-3 bg-blue-50 border-none">
              <div className="text-[10px] uppercase text-blue-400 font-bold mb-1">
                Ваш комментарий
              </div>
              <p className="text-sm italic">"{activeShift.comment}"</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
