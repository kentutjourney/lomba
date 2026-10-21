'use client';

import { useAuth, AuthProvider } from '@/lib/AuthContext';
import LoginPage from '@/components/LoginPage';
import MasterDashboard from '@/components/MasterDashboard';
import StudentDashboard from '@/components/StudentDashboard';

function MainRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Memuat Arena Lomba Mengetik...</p>
      </div>
    );
  }

  // Jika belum login, tampilkan halaman Login
  if (!user) {
    return <LoginPage />;
  }

  // Jika login sebagai Master
  if (user.role === 'master') {
    return <MasterDashboard />;
  }

  // Jika login sebagai Siswa
  return <StudentDashboard />;
}

export default function Home() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
