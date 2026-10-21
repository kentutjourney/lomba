'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase, Room, RoomParticipant } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { 
  Keyboard, LogOut, Users, Trophy, Clock, CheckCircle2, 
  AlertCircle, Zap, RefreshCw, Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import CarSelector, { CAR_OPTIONS, CarSVG } from './CarSelector';

export default function StudentDashboard() {
  const { user, logout } = useAuth();

  // State Room & Partisipasi
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [myParticipant, setMyParticipant] = useState<RoomParticipant | null>(null);
  const [roomParticipants, setRoomParticipants] = useState<RoomParticipant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [joining, setJoining] = useState<boolean>(false);
  const [selectedCar, setSelectedCar] = useState<string>('blue');
  const [savingCar, setSavingCar] = useState<boolean>(false);

  // Countdown & Typing Engine State
  const [countdown, setCountdown] = useState<number | null>(null);
  const [inputVal, setInputVal] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(100);
  const [progress, setProgress] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Room Aktif & Pasang Realtime Listener
  useEffect(() => {
    fetchActiveRoom();

    const roomChannel = supabase
      .channel('student_rooms_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRoom = payload.new as Room;
            if (['waiting', 'countdown', 'in_progress'].includes(newRoom.status)) {
              setActiveRoom(newRoom);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Room;
            setActiveRoom((prev) => {
              if (updated.status === 'finished') return null;
              if (prev?.id === updated.id || ['waiting', 'countdown', 'in_progress'].includes(updated.status)) {
                return updated;
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

  // 2. Fetch Partisipasi Saya di Room saat Active Room Berubah
  useEffect(() => {
    if (!activeRoom || !user) {
      setMyParticipant(null);
      setRoomParticipants([]);
      resetTypingState();
      return;
    }

    checkMyParticipation(activeRoom.id);
    fetchParticipants(activeRoom.id);

    // Subscribe realtime participants
    const partChannel = supabase
      .channel(`student_part_${activeRoom.id}`)
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
  }, [activeRoom?.id, user?.id]);

  // 3. Efek Countdown Sinkron dengan Status Room
  useEffect(() => {
    if (activeRoom?.status === 'countdown') {
      let count = 5;
      setCountdown(count);
      const timer = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(timer);
          setCountdown(0);
        } else {
          setCountdown(count);
        }
      }, 1000);

      return () => clearInterval(timer);
    } else if (activeRoom?.status === 'in_progress') {
      setCountdown(null);
      if (!startTime) {
        setStartTime(Date.now());
      }
      // Fokus ke input mengetik
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      // Inisialisasi hitung mundur durasi waktu lomba
      const duration = activeRoom.durasi_detik || 60;
      setTimeLeft(duration);
      setIsTimeUp(false);

      const durationTimer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(durationTimer);
            setIsTimeUp(true);
            setIsFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(durationTimer);
    } else {
      setCountdown(null);
      setTimeLeft(null);
    }
  }, [activeRoom?.status, activeRoom?.durasi_detik]);

  const resetTypingState = () => {
    setInputVal('');
    setStartTime(null);
    setWpm(0);
    setAccuracy(100);
    setProgress(0);
    setIsFinished(false);
    setTimeLeft(null);
    setIsTimeUp(false);
  };

  const fetchActiveRoom = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .in('status', ['waiting', 'countdown', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    setActiveRoom(data as Room | null);
    setLoading(false);
  };

  const checkMyParticipation = async (roomId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (data) {
      setMyParticipant(data as RoomParticipant);
      if (data.is_finished) {
        setIsFinished(true);
        setWpm(data.wpm);
        setAccuracy(data.accuracy);
        setProgress(100);
      }
    } else {
      setMyParticipant(null);
    }
  };

  const fetchParticipants = async (roomId: string) => {
    const { data } = await supabase
      .from('room_participants')
      .select('*, users(*)')
      .eq('room_id', roomId)
      .order('is_finished', { ascending: false })
      .order('wpm', { ascending: false });

    if (data) setRoomParticipants(data as any[]);
  };

  // Masuk ke dalam Room
  const handleJoinRoom = async () => {
    if (!activeRoom || !user) return;
    setJoining(true);

    try {
      // Cek apakah kuota penuh
      if (roomParticipants.length >= activeRoom.max_peserta) {
        alert('Maaf, kapasitas room ini sudah penuh!');
        setJoining(false);
        return;
      }

      const { data, error } = await supabase
        .from('room_participants')
        .insert({
          room_id: activeRoom.id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        // Jika sudah terdaftar, ambil lagi
        checkMyParticipation(activeRoom.id);
      } else {
        setMyParticipant(data as RoomParticipant);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setJoining(false);
    }
  };

  // Logika Mengetik Cepat (Strict: Wajib hapus jika salah)
  const [hasError, setHasError] = useState<boolean>(false);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeRoom || isFinished || activeRoom.status !== 'in_progress') return;

    const val = e.target.value;
    const targetText = activeRoom.teks_konten;

    // Jika user menghapus ke belakang (Backspace), periksa apakah error sudah hilang
    const targetPrefix = targetText.slice(0, val.length);
    const isCurrentlyWrong = val !== targetPrefix;

    // Jika sedang dalam kondisi salah dan siswa mencoba mengetik huruf baru tanpa menghapus kesalahan dulu:
    if (hasError && val.length > inputVal.length) {
      // Tolak penambahan huruf baru sampai huruf yang salah dihapus!
      return;
    }

    // Hitung karakter benar yang berurutan dari awal
    let correctChars = 0;
    while (correctChars < val.length && val[correctChars] === targetText[correctChars]) {
      correctChars++;
    }

    setHasError(isCurrentlyWrong);
    setInputVal(val);

    const currentAcc = val.length > 0 ? (correctChars / val.length) * 100 : 100;
    const currentProgress = Math.min(100, Math.floor((correctChars / targetText.length) * 100));

    // Hitung WPM: (Karakter Benar / 5) / (Waktu Berlalu dalam Menit)
    const timeElapsedSec = startTime ? (Date.now() - startTime) / 1000 : 1;
    const calculatedWpm = timeElapsedSec > 1 ? (correctChars / 5) / (timeElapsedSec / 60) : 0;

    setAccuracy(Math.round(currentAcc));
    setProgress(currentProgress);
    setWpm(Math.round(calculatedWpm));

    // Kirim progress update ke Supabase setiap beberapa karakter benar
    if (val.length % 5 === 0 || val.length === targetText.length) {
      syncProgressToDatabase(calculatedWpm, currentAcc, currentProgress, false);
    }

    // Cek apakah selesai
    if (val === targetText) {
      setIsFinished(true);
      setHasError(false);
      syncProgressToDatabase(calculatedWpm, currentAcc, 100, true);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  const syncProgressToDatabase = async (
    currentWpm: number,
    currentAcc: number,
    currentProg: number,
    finished: boolean
  ) => {
    if (!myParticipant) return;
    await supabase
      .from('room_participants')
      .update({
        wpm: Math.round(currentWpm),
        accuracy: Math.round(currentAcc),
        progress: currentProg,
        is_finished: finished,
        finished_at: finished ? new Date().toISOString() : null,
      })
      .eq('id', myParticipant.id);
  };

  // Ref untuk auto-scroll kursor teks aktif
  const activeCharRef = useRef<HTMLSpanElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeCharRef.current) {
      activeCharRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }, [inputVal]);

  // Render Karakter Teks dengan Pewarnaan Dinamis
  const renderTargetText = () => {
    if (!activeRoom) return null;
    const target = activeRoom.teks_konten;
    const typed = inputVal;

    return (
      <div 
        ref={textContainerRef}
        className="font-mono text-base sm:text-xl leading-relaxed select-none break-words max-h-40 overflow-y-auto pr-2 scroll-smooth scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        {target.split('').map((char, index) => {
          let colorClass = 'text-slate-500';
          let bgClass = '';
          const isActive = index === typed.length;

          if (index < typed.length) {
            if (typed[index] === char) {
              colorClass = 'text-emerald-400 font-bold';
            } else {
              colorClass = 'text-rose-400 font-bold';
              bgClass = 'bg-rose-500/20 rounded';
            }
          } else if (isActive) {
            // Karakter yang sedang aktif / kursor
            bgClass = 'bg-indigo-500 text-white animate-pulse rounded px-0.5';
          }

          return (
            <span 
              key={index} 
              ref={isActive ? activeCharRef : undefined}
              className={`${colorClass} ${bgClass} transition-colors`}
            >
              {char}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">

      {/* Navbar Siswa */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg flex items-center gap-2">
                Arena Siswa
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {user?.nama} ({user?.kelas})
                </span>
              </h1>
            </div>
          </div>

          <button
            onClick={logout}
            className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1.5 border border-rose-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {/* KONDISI 1: TIDAK ADA ROOM YANG DIBUAT MASTER */}
        {!activeRoom ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-2xl">
            <div className="w-20 h-20 rounded-3xl bg-slate-800/80 border border-slate-700/80 text-slate-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
              <Clock className="w-10 h-10 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Tidak Ada Room Lomba</h2>
            <p className="text-sm text-slate-400 mb-6">
              Saat ini belum ada room lomba yang dibuka oleh Master. Halaman ini akan otomatis terhubung saat Master membuat room baru!
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 text-xs text-slate-400 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Menunggu Master Ziqi membuat room...</span>
            </div>
          </div>
        ) : (
          /* KONDISI 2: ROOM TERSEDIA */
          <div className="space-y-6">
            {/* SUB-KONDISI: BELUM MASUK ROOM */}
            {!myParticipant ? (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 text-center max-w-md mx-auto shadow-2xl">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800 mb-4 inline-block">
                  Room Ditemukan!
                </span>
                <h2 className="text-2xl font-bold mb-1">Kode: {activeRoom.kode_room}</h2>
                <p className="text-sm text-indigo-300 font-medium mb-4">{activeRoom.judul_teks}</p>

                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 mb-6 text-xs text-slate-400 space-y-2">
                  <div className="flex justify-between">
                    <span>Kuota Maksimal:</span>
                    <span className="font-semibold text-slate-200">{activeRoom.max_peserta} Peserta</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sudah Masuk:</span>
                    <span className="font-semibold text-emerald-400">{roomParticipants.length} Peserta</span>
                  </div>
                </div>

                <button
                  onClick={handleJoinRoom}
                  disabled={joining || roomParticipants.length >= activeRoom.max_peserta}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {joining ? (
                    'Memasuki room...'
                  ) : roomParticipants.length >= activeRoom.max_peserta ? (
                    'Room Penuh'
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Masuk ke Room Ini</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* SUB-KONDISI: SUDAH MASUK ROOM */
              <div className="space-y-6">
                {/* LOBBY: PILIH MOBIL (WAITING) */}
                {activeRoom.status === 'waiting' && (
                  <div>
                    <CarSelector
                      selectedCar={selectedCar}
                      onSelect={async (carId) => {
                        setSelectedCar(carId);
                        if (myParticipant) {
                          await supabase
                            .from('room_participants')
                            .update({ selected_car: carId })
                            .eq('id', myParticipant.id);
                        }
                      }}
                      lockedByOthers={
                        roomParticipants
                          .filter(p => p.user_id !== user?.id)
                          .map(p => p.selected_car || 'blue')
                      }
                    />
                  </div>
                )}

                {/* HITUNG MUNDUR (COUNTDOWN) — Siswa juga lihat countdown */}
                {activeRoom.status === 'countdown' && (
                  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
                    {/* Tampilkan mobil yang dipilih siswa saat countdown */}
                    <div className="animate-bounce">
                      <CarSVG
                        color={CAR_OPTIONS.find(c => c.id === selectedCar)?.color || '#3B82F6'}
                        size={80}
                      />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold uppercase tracking-widest text-purple-400 block mb-2">
                        Pertandingan Dimulai Dalam
                      </span>
                      <div
                        className="text-9xl font-black text-white font-mono"
                        style={{ textShadow: '0 0 40px rgba(255,255,255,0.5)' }}
                      >
                        {countdown !== null && countdown > 0 ? countdown : 'GO!'}
                      </div>
                      <p className="text-xs text-slate-400 mt-4">Letakkan jari Anda pada keyboard sekarang!</p>
                    </div>
                  </div>
                )}


                {/* ARENA PERTANDINGAN (IN_PROGRESS) */}
                {(activeRoom.status === 'in_progress' || isFinished) && (
                  <div className="space-y-6">
                    {/* Statistik WPM, Akurasi, Progress & Sisa Waktu */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      {/* Kartu Sisa Waktu */}
                      <div className={`p-4 rounded-2xl border text-center transition-all ${
                        timeLeft !== null && timeLeft <= 10 && !isFinished
                          ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-500/10 animate-pulse'
                          : 'bg-slate-900/80 border-slate-800'
                      }`}>
                        <span className="text-xs text-slate-400 block mb-1">Sisa Waktu</span>
                        <span className={`text-2xl sm:text-4xl font-extrabold font-mono ${
                          timeLeft !== null && timeLeft <= 10 && !isFinished
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}>
                          {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '0:00'}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
                        <span className="text-xs text-slate-400 block mb-1">Kecepatan (WPM)</span>
                        <span className="text-2xl sm:text-4xl font-extrabold font-mono text-indigo-400">
                          {wpm}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
                        <span className="text-xs text-slate-400 block mb-1">Akurasi</span>
                        <span className="text-2xl sm:text-4xl font-extrabold font-mono text-emerald-400">
                          {accuracy}%
                        </span>
                      </div>
                      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
                        <span className="text-xs text-slate-400 block mb-1">Progress</span>
                        <span className="text-2xl sm:text-4xl font-extrabold font-mono text-blue-400">
                          {progress}%
                        </span>
                      </div>
                    </div>

                    {/* Kotak Teks Perlombaan */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                        <span className="text-xs font-semibold text-indigo-400">{activeRoom.judul_teks}</span>
                        {isFinished && (
                          <span className={`text-xs font-bold flex items-center gap-1 ${
                            isTimeUp ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            <CheckCircle2 className="w-4 h-4" />
                            {isTimeUp ? 'Waktu Habis!' : 'Selesai Diketik!'}
                          </span>
                        )}
                      </div>

                      {/* Display Paragraf */}
                      <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 mb-6">
                        {renderTargetText()}
                      </div>

                      {/* Input Mengetik */}
                      {!isFinished ? (
                        <div>
                          <input
                            ref={inputRef}
                            type="text"
                            value={inputVal}
                            onChange={handleTyping}
                            placeholder="Mulai ketik teks di atas di sini..."
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            className={`w-full px-5 py-4 bg-slate-950 border-2 rounded-2xl text-lg text-slate-100 font-mono focus:outline-none transition-all ${
                              hasError
                                ? 'border-rose-500 shadow-lg shadow-rose-500/20 ring-2 ring-rose-500/30 animate-[shake_0.2s_ease-in-out]'
                                : 'border-indigo-500 focus:ring-4 focus:ring-indigo-500/20'
                            }`}
                          />
                          {hasError ? (
                            <p className="text-xs text-rose-400 mt-2 text-center font-semibold flex items-center justify-center gap-1.5 animate-pulse">
                              <AlertCircle className="w-4 h-4" />
                              <span>Huruf salah! Tekan <b>Backspace</b> untuk menghapus dan perbaiki sebelum lanjut.</span>
                            </p>
                          ) : (
                            <p className="text-xs text-slate-500 mt-2 text-center">
                              Ketikkan setiap huruf persis seperti teks di atas.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className={`p-6 border rounded-2xl text-center ${
                          isTimeUp 
                            ? 'bg-amber-500/10 border-amber-500/20' 
                            : 'bg-emerald-500/10 border-emerald-500/20'
                        }`}>
                          <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2" />
                          <h3 className="text-xl font-bold text-white mb-1">
                            {isTimeUp ? 'Waktu Perlombaan Telah Habis!' : 'Luar Biasa, Anda Berhasil Selesai!'}
                          </h3>
                          <p className="text-xs text-slate-400">
                            Skor akhir Anda: <strong className="text-indigo-400">{wpm} WPM</strong> dengan akurasi{' '}
                            <strong className="text-emerald-400">{accuracy}%</strong> dan progress{' '}
                            <strong className="text-blue-400">{progress}%</strong>.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Klasemen Sementara / Live Leaderboard Room */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
                      <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <span>Peringkat Peserta di Room Ini</span>
                      </h3>

                      <div className="space-y-2.5">
                        {roomParticipants.map((p, idx) => (
                          <div
                            key={p.id}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                              p.user_id === user?.id
                                ? 'bg-indigo-950/50 border-indigo-500/50 text-indigo-200'
                                : 'bg-slate-950/50 border-slate-800/80 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                  idx === 0
                                    ? 'bg-amber-500 text-slate-950'
                                    : idx === 1
                                    ? 'bg-slate-300 text-slate-950'
                                    : idx === 2
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-semibold text-sm">
                                  {p.users?.nama} {user && p.user_id === user.id && '(Anda)'}
                                </span>
                                <span className="text-[10px] text-slate-500 ml-2">
                                  ({p.users?.kelas})
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <span>WPM: <strong className="text-indigo-400">{p.wpm}</strong></span>
                              <span>Acc: <strong className="text-emerald-400">{p.accuracy}%</strong></span>
                              {p.is_finished ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                  Selesai
                                </span>
                              ) : (
                                <span className="text-slate-500">{p.progress}%</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
