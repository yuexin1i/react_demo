// lib/AuthContext.tsx
import React, { createContext, useContext, useState } from 'react';
import DatabaseHelper, { User } from './DatabaseHelper'; // 🌟 匯入 DatabaseHelper

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  refreshUser: () => Promise<void>; // 🌟 新增：重整使用者狀態
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const logout = () => setUser(null);

  const refreshUser = async () => {
    if (user?.id && user.id !== -1) {
      const updatedUser = await DatabaseHelper.getUserById(user.id);
      if (updatedUser) setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}