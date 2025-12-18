import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button, Card } from '../components/ui';
import { Truck, MapPin, Play, Square, LogOut, CheckCircle2 } from 'lucide-react';

export const DriverView = () => {
  const { user, logout } = useAuth();
  
  // Состояния
  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  
  // Выбор для новой смены
  const [selectedTruck, setSelectedTruck] = useState<string>('');
  const [selectedSite, setSelectedSite] = useState<string>('');

  // Загрузка данных при входе
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Проверяем, есть ли активная смена
        const currentRes = await api.get('/shifts/current');
        if (currentRes.data) {
          setActiveShift(currentRes.data);
        } else {
          // 2. Если нет, грузим списки для выбора
          const [trucksRes, sitesRes] = await Promise.all([
            api.get('/trucks'),
            api.get('/sites')
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
    init();
  }, []);

  // Начать смену
  const handleStart = async () => {
    if (!selectedTruck || !selectedSite) return;
    setLoading(true);
    try {
      const res = await api.post('/shifts/start', {
        truck_id: selectedTruck,
        site_id: selectedSite
      });
      setActiveShift(res.data);
    } catch (e) {
      alert('Ошибка при старте смены');
    } finally {
      setLoading(false);
    }
  };

  // Закончить смену
  const handleEnd = async () => {
    if (!confirm('Завершить смену?')) return;
    setLoading(true);
    try {
      await api.post('/shifts/end');
      setActiveShift(null);
      // Перезагружаем списки
      const [trucksRes, sitesRes] = await Promise.all([
        api.get('/trucks'),
        api.get('/sites')
      ]);
      setTrucks(trucksRes.data);
      setSites(sitesRes.data);
      setSelectedTruck('');
      setSelectedSite('');
    } catch (e) {
      alert('Ошибка завершения');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !trucks.length && !activeShift) return <div className="p-10 text-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20">
      {/* Шапка */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold">Привет, {user?.full_name?.split(' ')[0]}</h1>
          <p className="text-sm text-slate-500">{activeShift ? 'Смена активна' : 'Нет активной смены'}</p>
        </div>
        <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500">
          <LogOut size={20} />
        </button>
      </div>

      {activeShift ? (
        // ЭКРАН АКТИВНОЙ СМЕНЫ
        <div className="space-y-6">
          <Card className="p-8 text-center bg-green-50 border-green-200">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Работа идет</h2>
            <p className="text-slate-600">Смена началась: {new Date(activeShift.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          </Card>

          <Button 
            onClick={handleEnd}
            className="w-full py-4 bg-red-600 text-white text-lg hover:bg-red-700 flex items-center justify-center gap-2"
          >
            <Square fill="currentColor" size={20} />
            Завершить смену
          </Button>
        </div>
      ) : (
        // ЭКРАН НАЧАЛА СМЕНЫ
        <div className="space-y-6">
          <Card className="p-4">
            <label className="block text-sm font-medium mb-3 text-slate-500">Выберите транспорт</label>
            <div className="grid grid-cols-2 gap-3">
              {trucks.map(truck => (
                <div 
                  key={truck.id}
                  onClick={() => setSelectedTruck(truck.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedTruck === truck.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200'}`}
                >
                  <Truck className={`mb-2 ${selectedTruck === truck.id ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div className="font-bold text-sm">{truck.name}</div>
                  <div className="text-xs text-slate-400">{truck.plate}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <label className="block text-sm font-medium mb-3 text-slate-500">Выберите объект</label>
            <div className="space-y-2">
              {sites.map(site => (
                <div 
                  key={site.id}
                  onClick={() => setSelectedSite(site.id)}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 ${selectedSite === site.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`}
                >
                  <MapPin size={18} className={selectedSite === site.id ? 'text-blue-600' : 'text-slate-400'} />
                  <span className="text-sm font-medium">{site.name}</span>
                </div>
              ))}
            </div>
          </Card>

          <Button 
            onClick={handleStart}
            disabled={!selectedTruck || !selectedSite}
            className="w-full py-4 bg-blue-600 text-white text-lg font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
          >
            <Play fill="currentColor" size={20} />
            Начать смену
          </Button>
        </div>
      )}
    </div>
  );
};
