import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import {
  AUTH_SESSION_UPDATED_EVENT,
  TOKEN_KEY,
  USER_KEY,
  clearAuth,
  getUserInfo,
  setUserInfo,
  refreshUser as apiRefreshUser,
} from '../services/api';
import PasswordChangeModal from '../components/common/PasswordChangeModal';
import {
  APP_DEMO_PERSONA_KEY,
  DEMO_ACTIVE_SHIFT_STORAGE_KEY_PREFIX,
  DEMO_PERSONA_KEY,
  EXPLICIT_DEMO_LOGOUT_KEY,
  redirectToLogin,
} from '../config/demo';
import {
  DEMO_SESSION_STORAGE_KEY,
  LEGACY_DEMO_SESSION_STORAGE_KEY,
} from '../lib/demoSession';

interface LogoutOptions {
  redirectToLogin?: boolean;
  markExplicitDemoLogout?: boolean;
}

type LogoutInput =
  | LogoutOptions
  | React.MouseEvent<HTMLElement>;

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => Promise<void>;
  logout: (options?: LogoutInput) => void;
  refreshUser: () => Promise<User>;
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

  const logLogoutError = useCallback((step: string, err: unknown) => {
    console.error(`Error during logout ${step}:`, err);
  }, []);

  const removeStorageKey = useCallback(
    (storage: Storage, key: string, step: string) => {
      try {
        storage.removeItem(key);
      } catch (err) {
        logLogoutError(step, err);
      }
    },
    [logLogoutError]
  );

  const clearDemoStorage = useCallback((storage: Storage) => {
    removeStorageKey(
      storage,
      APP_DEMO_PERSONA_KEY,
      `removeItem(${APP_DEMO_PERSONA_KEY})`
    );
    removeStorageKey(
      storage,
      DEMO_PERSONA_KEY,
      `removeItem(${DEMO_PERSONA_KEY})`
    );
    removeStorageKey(
      storage,
      DEMO_SESSION_STORAGE_KEY,
      `removeItem(${DEMO_SESSION_STORAGE_KEY})`
    );
    removeStorageKey(
      storage,
      LEGACY_DEMO_SESSION_STORAGE_KEY,
      `removeItem(${LEGACY_DEMO_SESSION_STORAGE_KEY})`
    );

    let storageLength = 0;
    try {
      storageLength = storage.length;
    } catch (err) {
      logLogoutError('read localStorage.length', err);
      return;
    }

    for (let index = storageLength - 1; index >= 0; index -= 1) {
      let key: string | null = null;

      try {
        key = storage.key(index);
      } catch (err) {
        logLogoutError(`localStorage.key(${index})`, err);
        continue;
      }

      if (
        key === DEMO_ACTIVE_SHIFT_STORAGE_KEY_PREFIX ||
        key?.startsWith(`${DEMO_ACTIVE_SHIFT_STORAGE_KEY_PREFIX}_`)
      ) {
        removeStorageKey(storage, key, `removeItem(${key})`);
      }
    }
  }, [logLogoutError, removeStorageKey]);

  const logout = useCallback((input?: LogoutInput) => {
    const options =
      input && 'preventDefault' in input
        ? undefined
        : (input as LogoutOptions | undefined);
    const shouldRedirectToLogin = options?.redirectToLogin ?? false;
    const markExplicitDemoLogout = options?.markExplicitDemoLogout ?? false;

    setToken(null);
    setUser(null);
    setError(null);
    setShowPasswordModal(false);

    try {
      clearAuth();
    } catch (err) {
      logLogoutError('clearAuth()', err);
    }

    clearDemoStorage(localStorage);
    removeStorageKey(
      sessionStorage,
      EXPLICIT_DEMO_LOGOUT_KEY,
      `removeItem(${EXPLICIT_DEMO_LOGOUT_KEY})`
    );

    if (markExplicitDemoLogout) {
      try {
        sessionStorage.setItem(EXPLICIT_DEMO_LOGOUT_KEY, '1');
      } catch (err) {
        logLogoutError(`setItem(${EXPLICIT_DEMO_LOGOUT_KEY})`, err);
      }
    }

    if (shouldRedirectToLogin) {
      try {
        redirectToLogin();
      } catch (err) {
        logLogoutError('redirectToLogin()', err);
      }
    }
  }, [clearDemoStorage, logLogoutError, removeStorageKey]);

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

  const refreshUser = useCallback(async (): Promise<User> => {
    try {
      const updatedUser = await apiRefreshUser();
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка обновления профиля';
      setError(errorMessage);
      throw err;
    }
  }, []);

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
    const handleSessionUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ token?: string; user?: User | null }>;
      const nextToken = customEvent.detail?.token || localStorage.getItem(TOKEN_KEY);
      const nextUser = customEvent.detail?.user ?? getUserInfo();

      if (!nextToken || !nextUser) {
        return;
      }

      setToken(nextToken);
      setUser(nextUser);
      setError(null);

      if (nextUser.must_change_password) {
        setShowPasswordModal(true);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && !e.newValue) {
        logout();
      }
    };

    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, handleSessionUpdated as EventListener);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, handleSessionUpdated as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
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
    refreshUser,
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
