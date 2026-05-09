import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { UserInfo } from '../types/api';
import { HttpError } from '../services/http';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ password_required: boolean }>;
  register: (email: string, password: string, nickname: string, code: string) => Promise<void>;
  sendCode: (email: string) => Promise<void>;
  setPassword: (newPassword: string, oldPassword?: string) => Promise<void>;
  updateProfile: (payload: { nickname?: string; avatar_url?: string | null }) => Promise<void>;
  googleLogin: (code: string) => Promise<{ password_required: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    const hasToken = api.isAuthenticated();

    if (!hasToken) {
      setIsAuthenticated(false);
      setUser(null);
      return;
    }

    try {
      const userInfo = await api.getCurrentUser();
      setUser(userInfo);
      setIsAuthenticated(true);
    } catch (error) {
      if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
        setIsAuthenticated(false);
        setUser(null);
        api.logout();
        return;
      }

      setIsAuthenticated(true);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (api.isAuthenticated()) {
          await refreshUser();
        }
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await api.login(email, password);
    await refreshUser();
    return { password_required: result.password_required || false };
  };

  const register = async (email: string, password: string, nickname: string, code: string) => {
    await api.register({ email, password, nickname, code });
  };

  const sendCode = async (email: string) => {
    await api.sendCode({ email });
  };

  const setPassword = async (newPassword: string, oldPassword?: string) => {
    await api.setPassword({ new_password: newPassword, old_password: oldPassword });
    await refreshUser();
  };

  const updateProfile = async (payload: { nickname?: string; avatar_url?: string | null }) => {
    const userInfo = await api.updateProfile(payload);
    setUser(userInfo);
    setIsAuthenticated(true);
  };

  const googleLogin = async (code: string) => {
    const result = await api.googleCallback(code);
    await refreshUser();
    return { password_required: result.password_required || false };
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        sendCode,
        setPassword,
        updateProfile,
        googleLogin,
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
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
