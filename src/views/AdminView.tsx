import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Card } from '../components/ui';
import { LogOut, Activity, Users, Truck } from 'lucide-react';

export const AdminView = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ activeShifts: 0, activeDrivers: 0 });
  const [shifts, setShifts] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, shiftsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/shifts')
        ]);
        setStats(statsRes.data);
        setShifts(shiftsRes.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Панель управления</h1>
          <p className="text-slate-500">Добро пожаловать, {user?.full_name}</p>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-lg transition">
          <LogOut className="h-5 w-5" /> Выход
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-[#0a192f]/10 rounded-lg text-[#0a192f]">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Активные смены</p>
            <p className="text-2xl font-bold mono-number">{stats.activeShifts}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-[#0a192f]/10 rounded-lg text-[#0a192f]">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Водители онлайн</p>
            <p className="text-2xl font-bold mono-number">{stats.activeDrivers}</p>
          </div>
        </Card>
      </div>

      <h2 className="text-lg font-bold mb-4">Последние смены</h2>
      <Card className="overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Водитель</th>
              <th className="p-3">Техника</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Время</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shifts.map((shift) => (
              <tr key={shift.id}>
                <td className="p-3 text-slate-400 mono-id mono-number">#{shift.id}</td>
                <td className="p-3 font-medium">{shift.driver_name || 'Неизвестно'}</td>
                <td className="p-3 mono-plate">{shift.truck_name || '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${shift.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>
                    {shift.status}
                  </span>
                </td>
                <td className="p-3 text-slate-500 mono-date">{new Date(shift.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
