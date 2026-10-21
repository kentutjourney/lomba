'use client';

import React, { useEffect, useState } from 'react';
import { supabase, UserProfile } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Keyboard, Lock, User, ArrowRight, AlertCircle, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [filterKelas, setFilterKelas] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('nama', { ascending: true });

      if (error) {
        console.error('Error fetching users:', error);
        setErrorMessage('Gagal memuat data pengguna dari database. Pastikan koneksi Supabase & SQL sudah dijalankan.');
      } else if (data) {
        setUsers(data as UserProfile[]);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Koneksi ke Supabase belum terkonfigurasi di .env.local.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setErrorMessage('Silakan pilih nama Anda terlebih dahulu!');
      return;
    }
    if (!password) {
      setErrorMessage('Silakan masukkan kata sandi / NISN Anda!');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const res = await login(selectedUserId, password);
    setSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Login gagal.');
    }
  };

  // Filter daftar user berdasarkan kelas jika ingin mempermudah pencarian nama
  const filteredUsers = users.filter((u) => {
    if (filterKelas === 'all') return true;
    return u.kelas === filterKelas;
  });

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md">
        {/* Header App */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
            <Keyboard className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            Lomba Mengetik Cepat
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Pilih nama Anda di bawah ini dan masukkan NISN / Sandi untuk masuk
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Filter kelas jika opsi banyak */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Filter Kelas (Opsional)
                </label>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['all', 'Master', 'Kelas 6A', 'Kelas 6B'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFilterKelas(k)}
                    className={`py-1.5 text-xs font-medium rounded-lg transition-all border ${
                      filterKelas === k
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {k === 'all' ? 'Semua' : k}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdown Nama */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Pilih Nama Siswa / Master
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-5 h-5" />
                </div>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={loadingUsers}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 appearance-none cursor-pointer"
                >
                  <option value="">
                    {loadingUsers ? 'Sedang memuat peserta...' : '-- Pilih Nama Anda --'}
                  </option>
                  {filteredUsers.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100">
                      {u.nama} ({u.kelas}) {u.role === 'master' ? '👑 Master' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {selectedUser && (
                <div className="mt-2 flex items-center gap-2 text-xs text-indigo-300">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800">
                    {selectedUser.kelas}
                  </span>
                  <span>Role: {selectedUser.role.toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* Input Password / NISN */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                {selectedUser?.role === 'master' ? 'Kata Sandi Master' : 'NISN (Kata Sandi)'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    selectedUser?.role === 'master'
                      ? 'Masukkan kata sandi master'
                      : 'Masukkan NISN sesuai data sekolah'
                  }
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-600"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                {selectedUser?.role === 'master'
                  ? 'Sandi awal default: 12345678'
                  : 'NISN Anda tercatat saat pendaftaran lomba.'}
              </p>
            </div>

            {/* Tombol Masuk */}
            <button
              type="submit"
              disabled={submitting || loadingUsers}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Arena</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info footer */}
        <div className="text-center mt-6 text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
          <span>Realtime Typing Arena • Supabase Sync</span>
        </div>
      </div>
    </div>
  );
}
