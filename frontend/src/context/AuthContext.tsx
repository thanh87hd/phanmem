import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

interface User {
  id: number;
  fullName: string;
  username: string;
  role?: {
    name: string;
  };
  department?: string;
  jobTitle?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(null);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch(e) { console.error('Logout error', e); }
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // If not wrapped in AuthProvider, return values from localStorage as fallback
    const storedUser = localStorage.getItem('user');
    let parsedUser = null;
    if (storedUser) {
      try {
        parsedUser = JSON.parse(storedUser);
      // eslint-disable-next-line no-empty
      } catch (e) {}
    }
    return {
      user: parsedUser,
      token: null,
      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch(e) { console.error('Logout error', e); }
        localStorage.removeItem('user');
      }
    };
  }
  return context;
};
