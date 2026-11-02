import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthResponse } from '../types';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (data: Parameters<typeof authService.login>[0]) => Promise<void>;
  register: (data: Parameters<typeof authService.register>[0]) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved && saved !== 'undefined' ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const normalizeUser = (u: any): User => ({
    ...u,
    firstName: u.firstName || u.first_name || '',
    lastName: u.lastName || u.last_name || '',
    avatarStoragePath: u.avatarStoragePath || u.avatar_storage_path || null,
    roles: Array.isArray(u.roles) ? u.roles : ['customer'],
  });

  const refreshUser = useCallback(async () => {
    try {
      const me = await authService.getMe();
      if (me && me.id) {
        const normalized = normalizeUser(me);
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
      } else {
        throw new Error('Invalid user payload');
      }
    } catch {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && token !== 'undefined') {
      refreshUser();
    } else {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setIsLoading(false);
    }
  }, [refreshUser]);

  const handleAuthSuccess = (data: any) => {
    const payload: AuthResponse = data?.data || data;
    if (payload?.tokens?.accessToken) {
      localStorage.setItem('access_token', payload.tokens.accessToken);
    }
    if (payload?.tokens?.refreshToken) {
      localStorage.setItem('refresh_token', payload.tokens.refreshToken);
    }
    if (payload?.user) {
      const normalized = normalizeUser(payload.user);
      localStorage.setItem('user', JSON.stringify(normalized));
      setUser(normalized);
    }
  };

  const login = async (credentials: Parameters<typeof authService.login>[0]) => {
    const data = await authService.login(credentials);
    handleAuthSuccess(data);
  };

  const register = async (credentials: Parameters<typeof authService.register>[0]) => {
    const data = await authService.register(credentials);
    handleAuthSuccess(data);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
        // Continue clearing local state even if remote fails
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = Boolean(user?.roles?.some((r) => ['admin', 'support', 'production_manager'].includes(r)));

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
