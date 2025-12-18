import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button, Input, Card } from '../components/ui';
import { User, Lock, AlertCircle } from 'lucide-react';

export const LoginView = () => {
  const { login } = useAuth();
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
    } catch (err) {
      setError('Íåâåðíûå ó÷åòíûå äàííûå');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Âõîä LogiShift</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ëîãèí</label>
            <Input 
              icon={User} 
              value={form.login}
              onChange={(e: any) => setForm({...form, login: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ïàðîëü</label>
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
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
            isLoading={loading}
          >
            Âîéòè
          </Button>
        </form>
      </Card>
    </div>
  );

};
