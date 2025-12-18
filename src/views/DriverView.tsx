import React from 'react';
import { useAuth } from '../context/AuthContext';

export const DriverView = () => {
  const { logout } = useAuth();
  return (
    <div className="p-6 text-center">
      <h1 className="text-xl font-bold mb-4">Кабинет водителя</h1>
      <p className="mb-4 text-slate-500">Мобильный интерфейс в разработке</p>
      <button onClick={logout} className="text-red-500">Выйти</button>
    </div>
  );
};
