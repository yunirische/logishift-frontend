import React, { useState, useEffect } from 'react';
import { MapPin, Camera, FileText } from 'lucide-react';
import api from '../services/api';
import { API_ENDPOINTS } from '../constants';

const Objects: React.FC = () => {
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(API_ENDPOINTS.SITES).then(res => {
      setSites(Array.isArray(res) ? res : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-10 text-center">Загрузка объектов...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
      {sites.map(s => (
        <div key={s.id} className={`bg-white p-6 rounded-[24px] border shadow-sm ${s.is_active ? 'border-slate-50' : 'border-slate-200 opacity-60'}`}>
          <div className="flex justify-between items-start">
            <span className="text-3xl">🏗️</span>
            {!s.is_active && <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500">Неактивен</span>}
          </div>
          <h4 className="mt-4 font-bold text-[#1B254B]">{s.name}</h4>
          <div className="flex flex-wrap gap-2 mt-3">
            {s.odometer_required && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold">
                <Camera size={12} />
                <span>Одометр</span>
              </div>
            )}
            {s.invoice_required && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold">
                <FileText size={12} />
                <span>Накладная</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Objects;
