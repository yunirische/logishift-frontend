import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './views/LoginView';
import { AdminView } from './views/AdminView';
import { DriverView } from './views/DriverView';
import { Loader2 } from 'lucide-react';

const AppContent = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  if (user?.role === 'admin') {
    return <AdminView />;
  }

  return <DriverView />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}