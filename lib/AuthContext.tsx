'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, supabase } from '@/lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (userId: string, passwordInput: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Cek session login dari localStorage
    const savedUser = localStorage.getItem('lomba_typing_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Failed to parse saved user:', err);
        localStorage.removeItem('lomba_typing_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (userId: string, passwordInput: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Ambil user berdasarkan ID
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return { success: false, error: 'User tidak ditemukan.' };
      }

      // Validasi password (nisn)
      if (data.nisn.trim() !== passwordInput.trim()) {
        return { success: false, error: 'Password / NISN salah!' };
      }

      setUser(data as UserProfile);
      localStorage.setItem('lomba_typing_user', JSON.stringify(data));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Terjadi kesalahan login.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('lomba_typing_user');
  };

  const refreshUser = async () => {
    if (!user) return;
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (data) {
      setUser(data as UserProfile);
      localStorage.setItem('lomba_typing_user', JSON.stringify(data));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
