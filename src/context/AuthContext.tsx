import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { TOKEN_KEY, USER_KEY, getUserInfo, setUserInfo } from '../services/api';
import PasswordChangeModal from '../components/common/PasswordChangeModal';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Error during logout:', err);
    }
  }, []);

  const login = useCallback(async (newToken: string, newUser: User) => {
    try {
      setError(null);
      setIsLoading(true);

      // Validate token format (basic JWT structure check)
      if (!newToken || newToken.split('.').length !== 3) {
        throw new Error('Недействительный формат токена');
      }

      // Validate user object
      if (!newUser || !newUser.id || !newUser.full_name) {
        throw new Error('Недействительные данные пользователя');
      }

      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);

      // Check if password change is required
      if (newUser.must_change_password) {
        setShowPasswordModal(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка авторизации';
      setError(errorMessage);
      logout(); // Clear any partial state
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        const storedUser = localStorage.getItem(USER_KEY);
        const storedToken = localStorage.getItem(TOKEN_KEY);

        if (storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);

            // Validate stored data
            if (parsedUser && parsedUser.id && parsedUser.full_name) {
              setUser(parsedUser);
              setToken(storedToken);

              // Check if password change is required
              if (parsedUser.must_change_password) {
                setShowPasswordModal(true);
              }
            } else {
              // Invalid stored data, clear it
              logout();
            }
          } catch (parseError) {
            console.error('Error parsing stored user data:', parseError);
            logout();
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [logout]);

  // Auto-logout on storage events (e.g., logout from another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && !e.newValue) {
        logout();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [logout]);

  const handlePasswordChangeSuccess = useCallback(() => {
    // Update user object to remove must_change_password flag
    if (user) {
      const updatedUser = { ...user, must_change_password: false };
      setUserInfo(updatedUser);
      setUser(updatedUser);
    }
    setShowPasswordModal(false);
  }, [user]);

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    isLoading,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showPasswordModal && (
        <PasswordChangeModal onSuccess={handlePasswordChangeSuccess} />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
