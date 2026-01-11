
import React, { useState } from 'react';
import { loginUser } from '../services/api';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await loginUser(username, password);
      window.location.reload(); // Перезагрузка для инициализации App с токеном
    } catch (err: any) {
      setError(err.message || 'Неверный логин или пароль');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 border border-slate-50">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-[#1B254B] flex items-center justify-center gap-2">
            <span className="text-indigo-600">LOGI</span>SHIFT
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">Войдите в панель управления</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 animate-shake">
              ⚠️ {error}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Логин</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full bg-[#F4F7FE] border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#F4F7FE] border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
          >
            {isLoading ? 'Вход...' : 'Войти в систему'}
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-300 mt-8 uppercase font-bold tracking-widest">
          KONTROLSMEN v2.0 Enterprise
        </p>
      </div>
    </div>
  );
};

export default Login;
