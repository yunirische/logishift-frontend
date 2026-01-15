import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { API_ENDPOINTS } from '../constants';

const Fleet: React.FC = () => {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(API_ENDPOINTS.TRUCKS).then(res => {
      setTrucks(Array.isArray(res) ? res : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-10 text-center">Загрузка автопарка...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
      {trucks.map(t => (
        <div key={t.id} className="bg-white p-6 rounded-[24px] border border-slate-50 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-3xl">🚛</span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${t.is_busy ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {t.is_busy ? 'В рейсе' : 'Свободна'}
            </span>
          </div>
          <h4 className="mt-4 font-bold text-[#1B254B]">{t.name}</h4>
          <p className="text-xs text-slate-400 font-mono mt-1">{t.plate || 'Без номера'}</p>
        </div>
      ))}
    </div>
  );
};

export default Fleet;
