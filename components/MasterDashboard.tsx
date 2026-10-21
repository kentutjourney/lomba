'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase, Room, RoomParticipant, TextItem, UserProfile } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { 
  Crown, Plus, Users, Play, Trophy, Settings, Key, 
  Trash2, LogOut, CheckCircle2, Clock, AlertTriangle, Shuffle, RefreshCw, Maximize, Minimize
} from 'lucide-react';
import RacingTrack from './RacingTrack';
import ResultsScreen from './ResultsScreen';
import { useFullscreen } from '@/lib/useFullscreen';

export default function MasterDashboard() {
  const { user, logout, refreshUser } = useAuth();
  
  // State Active Room & Lobby
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [loadingRoom, setLoadingRoom] = useState<boolean>(true);

  // Modal / Form Buat Room
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string>('random');
  const [maxParticipants, setMaxParticipants] = useState<number>(10);
  const [durasiLomba, setDurasiLomba] = useState<number>(60);
  const [creatingRoom, setCreatingRoom] = useState<boolean>(false);

  // Tab View di Dashboard Master ('lobby' | 'texts' | 'students' | 'password')
  const [activeTab, setActiveTab] = useState<'lobby' | 'texts' | 'students' | 'password'>('lobby');

  // Manajemen Teks
  const [newTextTitle, setNewTextTitle] = useState<string>('');
  const [newTextContent, setNewTextContent] = useState<string>('');
  const [savingText, setSavingText] = useState<boolean>(false);

  // Ganti Password Master
  const [newPassword, setNewPassword] = useState<string>('');
  const [passwordSuccess, setPasswordSuccess] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  // Tambah Siswa Baru
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentNisn, setNewStudentNisn] = useState<string>('');
  const [newStudentKelas, setNewStudentKelas] = useState<string>('Kelas 6A');
  const [studentSuccess, setStudentSuccess] = useState<string>('');
  const [studentList, setStudentList] = useState<UserProfile[]>([]);

  // Fullscreen & Results — menggunakan ref untuk target hanya area arena balap
  const [showResults, setShowResults] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen, enterFullscreen, exitFullscreen } = useFullscreen(trackRef);

  // ⏱️ Timer countdown di sisi Master — auto-finish & show results saat waktu habis
  useEffect(() => {
    if (activeRoom?.status === 'in_progress' && activeRoom.durasi_detik) {
      const duration = activeRoom.durasi_detik;
      setTimeLeft(duration);

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            // Waktu habis → finish room dan tampilkan hasil
            supabase
              .from('rooms')
              .update({ status: 'finished', end_time: new Date().toISOString() })
              .eq('id', activeRoom.id)
              .then(() => {
                setShowResults(true);
              });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setTimeLeft(null);
    }
  }, [activeRoom?.status, activeRoom?.id, activeRoom?.durasi_detik]);

  // 🏁 Auto-show results jika SEMUA peserta sudah selesai sebelum waktu habis
  useEffect(() => {
    if (
      activeRoom?.status === 'in_progress' &&
      participants.length > 0 &&
      participants.every(p => p.is_finished) &&
      !showResults
    ) {
      // Delay 2 detik supaya animasi selesai dilihat dulu
      const t = setTimeout(async () => {
        await supabase
          .from('rooms')
          .update({ status: 'finished', end_time: new Date().toISOString() })
          .eq('id', activeRoom.id);
        setShowResults(true);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [participants, activeRoom?.status, activeRoom?.id, showResults]);

  // Fetch initial data
  useEffect(() => {
    fetchLatestRoom();
    fetchTexts();
    fetchStudentList();

    // Subscribe ke perubahan tabel rooms secara Realtime
    const roomChannel = supabase
      .channel('master_rooms_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedRoom = payload.new as Room;
            setActiveRoom((prev) => {
              if (!prev || prev.id === updatedRoom.id) {
                return updatedRoom;
              }
              return prev;
            });
          } else if (payload.eventType === 'DELETE') {
            setActiveRoom((prev) => (prev?.id === payload.old.id ? null : prev));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, []);

  // Subscribe ke participants jika ada activeRoom
  useEffect(() => {
    if (!activeRoom) {
      setParticipants([]);
      return;
    }

    fetchParticipants(activeRoom.id);

    const partChannel = supabase
      .channel(`participants_${activeRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${activeRoom.id}`,
        },
        () => {
          fetchParticipants(activeRoom.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(partChannel);
    };
  }, [activeRoom?.id]);

  const fetchLatestRoom = async () => {
    setLoadingRoom(true);
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .in('status', ['waiting', 'countdown', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    setActiveRoom(data as Room | null);
    setLoadingRoom(false);
  };

  const fetchTexts = async () => {
    const { data } = await supabase.from('texts').select('*').order('created_at', { ascending: false });
    if (data) setTexts(data as TextItem[]);
  };

  const fetchStudentList = async () => {
    const { data } = await supabase.from('users').select('*').order('nama', { ascending: true });
    if (data) setStudentList(data as UserProfile[]);
  };

  const fetchParticipants = async (roomId: string) => {
    const { data } = await supabase
      .from('room_participants')
      .select('*, users(*)')
      .eq('room_id', roomId)
      .order('progress', { ascending: false })
      .order('wpm', { ascending: false });

    if (data) setParticipants(data as any[]);
  };

  // Buat Room Baru
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreatingRoom(true);

    try {
      let chosenText: TextItem | null = null;
      if (selectedTextId === 'random') {
        if (texts.length === 0) {
          alert('Belum ada teks lomba di bank teks! Silakan buat teks terlebih dahulu di tab Pengaturan Teks.');
          setCreatingRoom(false);
          return;
        }
        const randomIndex = Math.floor(Math.random() * texts.length);
        chosenText = texts[randomIndex];
      } else {
        chosenText = texts.find((t) => t.id === selectedTextId) || texts[0];
      }

      const kode = Math.random().toString(36).substring(2, 7).toUpperCase();

      const { data, error } = await supabase
        .from('rooms')
        .insert({
          kode_room: kode,
          text_id: chosenText.id,
          judul_teks: chosenText.judul,
          teks_konten: chosenText.konten,
          max_peserta: maxParticipants,
          durasi_detik: durasiLomba,
          status: 'waiting',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        alert('Gagal membuat room: ' + error.message);
      } else {
        setActiveRoom(data as Room);
        setShowCreateModal(false);
        setActiveTab('lobby');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setCreatingRoom(false);
    }
  };

  // Mulai Countdown dan Pertandingan
  const handleStartGame = async () => {
    if (!activeRoom) return;

    // Ubah status ke countdown (5 detik)
    const countdownTime = new Date().toISOString();
    await supabase
      .from('rooms')
      .update({
        status: 'countdown',
        countdown_start_time: countdownTime,
      })
      .eq('id', activeRoom.id);

    // Otomatis ubah ke in_progress setelah 5 detik
    setTimeout(async () => {
      await supabase
        .from('rooms')
        .update({
          status: 'in_progress',
          start_time: new Date().toISOString(),
        })
        .eq('id', activeRoom.id);
    }, 5000);
  };

  // Selesaikan / Tutup Room — Tampilkan hasil dulu
  const handleFinishRoom = async () => {
    if (!activeRoom) return;
    // Langsung tampilkan layar hasil
    await supabase
      .from('rooms')
      .update({
        status: 'finished',
        end_time: new Date().toISOString(),
      })
      .eq('id', activeRoom.id);
    setShowResults(true);
  };

  // Tutup results screen dan reset
  const handleCloseResults = async () => {
    setShowResults(false);
    await exitFullscreen();
    setActiveRoom(null);
  };

  // Simpan Teks Baru
  const handleSaveText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTextTitle.trim() || !newTextContent.trim()) return;

    setSavingText(true);
    const { error } = await supabase.from('texts').insert({
      judul: newTextTitle.trim(),
      konten: newTextContent.trim(),
    });

    setSavingText(false);
    if (error) {
      alert('Gagal menambah teks: ' + error.message);
    } else {
      setNewTextTitle('');
      setNewTextContent('');
      fetchTexts();
      alert('Teks lomba berhasil ditambahkan ke Bank Teks!');
    }
  };

  // Hapus Teks
  const handleDeleteText = async (textId: string) => {
    if (confirm('Hapus teks ini dari Bank Teks?')) {
      await supabase.from('texts').delete().eq('id', textId);
      fetchTexts();
    }
  };

  // Ganti Password Master
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPassword.trim()) return;
    setPasswordError('');
    setPasswordSuccess('');

    const { error } = await supabase
      .from('users')
      .update({ nisn: newPassword.trim() })
      .eq('id', user.id);

    if (error) {
      setPasswordError('Gagal mengubah kata sandi: ' + error.message);
    } else {
      setPasswordSuccess('Kata sandi berhasil diperbarui!');
      setNewPassword('');
      refreshUser();
    }
  };

  // Tambah Siswa Baru
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentNisn.trim()) return;
    setStudentSuccess('');

    const { error } = await supabase.from('users').insert({
      nama: newStudentName.trim(),
      nisn: newStudentNisn.trim(),
      kelas: newStudentKelas,
      role: 'siswa',
    });

    if (error) {
      alert('Gagal menambahkan siswa: ' + error.message);
    } else {
      setStudentSuccess('Peserta baru berhasil ditambahkan!');
      setNewStudentName('');
      setNewStudentNisn('');
      fetchStudentList();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">

      {/* ===== RESULTS SCREEN OVERLAY ===== */}
      {showResults && (
        <ResultsScreen
          participants={participants}
          onClose={handleCloseResults}
        />
      )}

      {/* Auto-show results saat semua peserta selesai */}
      {activeRoom?.status === 'in_progress' &&
        participants.length > 0 &&
        participants.every(p => p.is_finished) &&
        !showResults && (
          // Auto tampilkan setelah 2 detik delay
          (() => {
            setTimeout(() => setShowResults(true), 2000);
            return null;
          })()
        )
      }

      {/* Navbar Master */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg flex items-center gap-2">
                Panel Master
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {user?.nama}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol Lihat Hasil — shortcut di navbar */}
            {activeRoom && participants.length > 0 && (
              <button
                onClick={() => setShowResults(true)}
                className="px-3 py-1.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors flex items-center gap-1.5 border border-amber-500/20"
              >
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Lihat Hasil</span>
              </button>
            )}
            <button
              onClick={logout}
              className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1.5 border border-rose-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Tab Sub-Nav */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('lobby')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 border ${
              activeTab === 'lobby'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Room & Arena Lomba</span>
            {activeRoom && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('texts')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 border ${
              activeTab === 'texts'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Bank Teks Lomba ({texts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 border ${
              activeTab === 'students'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Tambah & Data Peserta</span>
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 border ${
              activeTab === 'password'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Ganti Sandi Master</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* TAB 1: LOBBY & ARENA ROOM */}
        {activeTab === 'lobby' && (
          <div className="space-y-6">
            {!activeRoom ? (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto mt-12 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 ml-1" />
                </div>
                <h2 className="text-xl font-bold mb-2">Belum Ada Room Lomba Aktif</h2>
                <p className="text-sm text-slate-400 mb-6">
                  Buat room lomba baru sekarang untuk memulai sesi perlombaan mengetik dengan siswa.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Buat Room Baru</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Kolom Kiri: Info Room & Kontrol */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800">
                          Room Aktif
                        </span>
                        <h2 className="text-xl font-bold mt-1 text-white">Kode: {activeRoom.kode_room}</h2>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase border ${
                          activeRoom.status === 'waiting'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : activeRoom.status === 'countdown'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 animate-pulse'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {activeRoom.status === 'waiting' && '⏳ Menunggu Siswa'}
                          {activeRoom.status === 'countdown' && '🚨 Bersiap (Countdown)'}
                          {activeRoom.status === 'in_progress' && '⚡ Pertandingan Berlangsung'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
                        <span className="text-xs text-slate-500 block mb-1">Judul Teks Lomba:</span>
                        <p className="font-semibold text-slate-200">{activeRoom.judul_teks}</p>
                      </div>

                      <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
                        <span className="text-xs text-slate-500 block mb-1">Kutipan Teks:</span>
                        <p className="text-xs text-slate-400 italic line-clamp-3">"{activeRoom.teks_konten}"</p>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
                        <span className="text-xs text-slate-500">Kuota Maksimal:</span>
                        <span className="font-semibold text-indigo-400">{activeRoom.max_peserta} Siswa</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
                        <span className="text-xs text-slate-500">Durasi Waktu:</span>
                        <span className="font-semibold text-amber-400">
                          {activeRoom.durasi_detik ? (activeRoom.durasi_detik >= 60 ? `${activeRoom.durasi_detik / 60} Menit` : `${activeRoom.durasi_detik} Detik`) : '60 Detik'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
                        <span className="text-xs text-slate-500">Siswa Bergabung:</span>
                        <span className="font-semibold text-emerald-400">{participants.length} Siswa</span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi Master */}
                  <div className="pt-6 space-y-2 border-t border-slate-800 mt-6">
                    {activeRoom.status === 'waiting' && (
                      <button
                        onClick={handleStartGame}
                        disabled={participants.length === 0}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        <span>Mulai Pertandingan Sekarang</span>
                      </button>
                    )}

                    {activeRoom.status === 'countdown' && (
                      <div className="w-full py-3 bg-purple-600/20 border border-purple-500/40 text-purple-300 rounded-xl text-center font-bold text-sm animate-pulse">
                        Hitung Mundur Sedang Dimulai... (5 Detik)
                      </div>
                    )}

                    <button
                      onClick={handleFinishRoom}
                      className="w-full py-2.5 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 font-semibold rounded-xl transition-all text-xs flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Tutup & Selesaikan Room Ini</span>
                    </button>
                  </div>
                </div>

                {/* Kolom Kanan: Live Participants & Klasemen Realtime */}
                <div className="lg:col-span-2 flex flex-col gap-5">

                  {/* ⏱️ Timer Countdown Master — tampil saat in_progress */}
                  {activeRoom.status === 'in_progress' && timeLeft !== null && (
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl border border-slate-800 bg-slate-900/80">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400 font-medium">Sisa Waktu</span>
                      </div>
                      <div className={`font-black text-2xl font-mono tabular-nums transition-colors ${
                        timeLeft <= 10 ? 'text-rose-400 animate-pulse' :
                        timeLeft <= 30 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {timeLeft >= 60
                          ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`
                          : `${timeLeft}s`
                        }
                      </div>
                      {/* Progress bar waktu */}
                      <div className="flex-1 mx-4 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            timeLeft <= 10 ? 'bg-rose-500' :
                            timeLeft <= 30 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${(timeLeft / (activeRoom.durasi_detik || 60)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500">
                        / {activeRoom.durasi_detik! >= 60
                          ? `${activeRoom.durasi_detik! / 60} Menit`
                          : `${activeRoom.durasi_detik}s`}
                      </span>
                    </div>
                  )}

                  {/* 🏁 RACING TRACK — Tampil saat countdown/in_progress */}
                  {(activeRoom.status === 'in_progress' || activeRoom.status === 'countdown') && (
                    <div
                      ref={trackRef}
                      className="w-full relative group rounded-3xl overflow-hidden"
                      style={isFullscreen ? {
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        borderRadius: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'stretch',
                        background: '#0a0a14',
                        padding: '32px 40px',
                        gap: '16px',
                      } : {}}
                    >
                      {/* Tombol Fullscreen overlay di pojok kanan atas track */}
                      <button
                        onClick={toggleFullscreen}
                        title={isFullscreen ? 'Keluar Fullscreen Arena' : 'Fullscreen Arena Balap'}
                        className={`absolute z-30 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition-all shadow-lg ${
                          isFullscreen
                            ? 'top-5 right-5 bg-slate-900/90 border-slate-600 text-white hover:bg-slate-800'
                            : 'top-3 right-3 bg-slate-900/80 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-900 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {isFullscreen
                          ? <><Minimize className="w-3.5 h-3.5" /> Keluar Fullscreen</>
                          : <><Maximize className="w-3.5 h-3.5" /> Fullscreen Arena</>
                        }
                      </button>

                      {/* Timer di fullscreen mode — pojok kiri atas */}
                      {isFullscreen && activeRoom.status === 'in_progress' && timeLeft !== null && (
                        <div className="absolute top-5 left-5 z-30 flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span
                            className={`text-2xl font-black font-mono tabular-nums ${
                              timeLeft <= 10 ? 'text-rose-400 animate-pulse' :
                              timeLeft <= 30 ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {timeLeft >= 60
                              ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`
                              : `${timeLeft}s`
                            }
                          </span>
                          <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                timeLeft <= 10 ? 'bg-rose-500' :
                                timeLeft <= 30 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${(timeLeft / (activeRoom.durasi_detik || 60)) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Wrapper tengah vertikal khusus saat fullscreen */}
                      <div className={isFullscreen ? 'flex-1 flex flex-col justify-center' : ''}>
                        <RacingTrack
                          participants={[...participants].sort((a, b) => (b.progress || 0) - (a.progress || 0))}
                          status={activeRoom.status as 'waiting' | 'countdown' | 'in_progress' | 'finished'}
                          countdown={null}
                          isFullscreen={isFullscreen}
                        />
                      </div>

                      {/* Tombol Lihat Hasil saat in_progress dan ada peserta selesai */}
                      {activeRoom.status === 'in_progress' && participants.some(p => p.is_finished) && (
                        <div className={`flex justify-center mt-3 ${isFullscreen ? '' : 'hidden group-hover:flex'}`}>
                          <button
                            onClick={() => setShowResults(true)}
                            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg transition-all flex items-center gap-2"
                          >
                            <Trophy className="w-4 h-4" />
                            Lihat Hasil Sementara
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Live Peserta */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                      <h3 className="font-bold text-base flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <span>Live Peserta & Kecepatan Mengetik</span>
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>Realtime Update</span>
                      </div>
                    </div>

                  {participants.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-500">
                      <Users className="w-12 h-12 mb-3 stroke-1" />
                      <p className="font-medium text-sm">Menunggu siswa masuk ke room...</p>
                      <p className="text-xs text-slate-600 mt-1">
                        Siswa yang login dari akun masing-masing dapat melihat dan mengklik Masuk Room.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                      {participants.map((p, idx) => (
                        <div
                          key={p.id}
                          className="p-3.5 bg-slate-950/60 border border-slate-800/90 rounded-xl flex flex-col gap-2 transition-all"
                        >
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  idx === 0
                                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                                    : idx === 1
                                    ? 'bg-slate-300 text-slate-950 font-bold'
                                    : idx === 2
                                    ? 'bg-amber-700 text-white font-bold'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-semibold text-slate-200">
                                  {p.users?.nama || 'Siswa'}
                                </span>
                                <span className="text-[11px] text-slate-400 ml-2">
                                  ({p.users?.kelas || '-'})
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-mono">
                              <div className="text-right">
                                <span className="text-slate-400 text-[10px] block">WPM</span>
                                <span className="font-bold text-indigo-400 text-sm">
                                  {Math.round(p.wpm || 0)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400 text-[10px] block">Akurasi</span>
                                <span className="font-bold text-emerald-400">
                                  {Math.round(p.accuracy || 100)}%
                                </span>
                              </div>
                              {p.is_finished ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Selesai
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">
                                  {p.progress || 0}%
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar Siswa */}
                          <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                p.is_finished
                                  ? 'bg-emerald-500'
                                  : 'bg-gradient-to-r from-indigo-500 to-blue-500'
                              }`}
                              style={{ width: `${p.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BANK TEKS */}
        {activeTab === 'texts' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form Tambah Teks */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Tambah Teks Lomba Baru</span>
              </h3>
              <form onSubmit={handleSaveText} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Judul Teks
                  </label>
                  <input
                    type="text"
                    value={newTextTitle}
                    onChange={(e) => setNewTextTitle(e.target.value)}
                    placeholder="Contoh: Semangat Menuntut Ilmu"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Isi Paragraf / Teks Lomba
                  </label>
                  <textarea
                    rows={6}
                    value={newTextContent}
                    onChange={(e) => setNewTextContent(e.target.value)}
                    placeholder="Tuliskan teks yang akan diketik siswa saat lomba..."
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Total Karakter: {newTextContent.length} | Kata: {newTextContent.trim() ? newTextContent.trim().split(/\s+/).length : 0}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={savingText}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all"
                >
                  {savingText ? 'Menyimpan...' : 'Simpan ke Bank Teks'}
                </button>
              </form>
            </div>

            {/* List Teks yang sudah ada */}
            <div className="md:col-span-2 space-y-3">
              <h3 className="font-bold text-base mb-2">Daftar Teks Tersimpan ({texts.length})</h3>
              {texts.map((t) => (
                <div
                  key={t.id}
                  className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-start justify-between gap-4"
                >
                  <div>
                    <h4 className="font-semibold text-indigo-300 text-sm">{t.judul}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.konten}</p>
                    <span className="text-[10px] text-slate-500 mt-2 block">
                      {t.konten.split(/\s+/).length} kata
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteText(t.id)}
                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/10 flex-shrink-0"
                    title="Hapus teks"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TAMBAH & DATA PESERTA */}
        {activeTab === 'students' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Tambah Peserta Baru</span>
              </h3>
              {studentSuccess && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  {studentSuccess}
                </div>
              )}
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Nama Lengkap Siswa
                  </label>
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="Nama lengkap"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Kelas
                  </label>
                  <select
                    value={newStudentKelas}
                    onChange={(e) => setNewStudentKelas(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Kelas 6A">Kelas 6A</option>
                    <option value="Kelas 6B">Kelas 6B</option>
                    <option value="Kelas Lain">Kelas Lain</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    NISN (Digunakan untuk Password Login)
                  </label>
                  <input
                    type="text"
                    value={newStudentNisn}
                    onChange={(e) => setNewStudentNisn(e.target.value)}
                    placeholder="Contoh: 3140123456"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all"
                >
                  Simpan Peserta
                </button>
              </form>
            </div>

            <div className="md:col-span-2 space-y-3">
              <h3 className="font-bold text-base mb-2">Total Peserta Terdaftar ({studentList.length})</h3>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-300 font-semibold uppercase text-[10px] tracking-wider sticky top-0">
                    <tr>
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">Nama</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3">NISN / Password</th>
                      <th className="px-4 py-3">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {studentList.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-2.5 text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-slate-200 font-semibold">{s.nama}</td>
                        <td className="px-4 py-2.5 text-indigo-400">{s.kelas}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">{s.nisn}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            s.role === 'master' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {s.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GANTI PASSWORD MASTER */}
        {activeTab === 'password' && (
          <div className="max-w-md mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl mt-6">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400" />
              <span>Ganti Kata Sandi Master</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Ubah kata sandi akun Anda ({user?.nama}) dari password default (12345678).
            </p>

            {passwordSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Kata Sandi Baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all"
              >
                Simpan Kata Sandi Baru
              </button>
            </form>
          </div>
        )}
      </main>

      {/* MODAL BUAT ROOM */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              <span>Buat Room Perlombaan</span>
            </h3>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Jumlah Maksimal Anggota yang Ikut
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Pengaturan Batas Waktu Mengetik
                </label>
                <select
                  value={durasiLomba}
                  onChange={(e) => setDurasiLomba(parseInt(e.target.value) || 60)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                >
                  <option value={30}>⏱️ 30 Detik (Sangat Singkat / Sprint)</option>
                  <option value={45}>⏱️ 45 Detik</option>
                  <option value={60}>⏱️ 1 Menit (Standar)</option>
                  <option value={120}>⏱️ 2 Menit</option>
                  <option value={180}>⏱️ 3 Menit</option>
                  <option value={300}>⏱️ 5 Menit</option>
                  <option value={600}>⏱️ 10 Menit (Maksimal)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Lomba akan otomatis berakhir saat waktu habis atau saat siswa selesai mengetik.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Pilihan Teks Lomba
                </label>
                <div className="relative">
                  <select
                    value={selectedTextId}
                    onChange={(e) => setSelectedTextId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="random">🎲 Acak Otomatis dari Bank Teks</option>
                    {texts.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.judul} ({t.konten.split(/\s+/).length} kata)
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Jika memilih acak, sistem otomatis memilih salah satu teks saat room dimulai.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingRoom}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5"
                >
                  {creatingRoom ? 'Membuat...' : 'Buat Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
