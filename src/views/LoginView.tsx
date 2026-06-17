import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { normalizeLoginEmail } from '../services/api';
import { Button, Input, Card } from '../components/ui';
import { User, Lock, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../constants';
import BrandLogo from '../components/BrandLogo';

export const LoginView = () => {
  const { login } = useAuth();
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const normalizedForm = {
      ...form,
      login: normalizeLoginEmail(form.login),
    };
    
    try {
      const res = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка авторизации');
      login(data.token, data.user);
    } catch (err) {
      setError('Неверные учетные данные');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex justify-center">
          <BrandLogo imageClassName="h-auto w-full max-w-[15rem]" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Логин</label>
            <Input 
              icon={User} 
              value={form.login}
              onChange={(e: any) => setForm({...form, login: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Пароль</label>
            <Input 
              type="password"
              icon={Lock}
              value={form.password}
              onChange={(e: any) => setForm({...form, password: e.target.value})}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          <Button
            className="w-full bg-[#0a192f] text-white hover:bg-[#152238]"
            isLoading={loading}
          >
            Войти
          </Button>
        </form>
      </Card>
    </div>
  );
};
