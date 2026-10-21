'use client';

import React, { useEffect, useRef } from 'react';
import { RoomParticipant } from '@/lib/supabase';
import { CAR_OPTIONS, CarSVG } from './CarSelector';
import confetti from 'canvas-confetti';

interface ResultsScreenProps {
  participants: RoomParticipant[];
  onClose?: () => void;
  isFullscreen?: boolean;
}

const MEDAL = ['🥇', '🥈', '🥉'];
const PODIUM_HEIGHTS = ['h-40', 'h-28', 'h-20'];
const PODIUM_ORDER = [1, 0, 2]; // index: left=2nd, center=1st, right=3rd
const PODIUM_BG = [
  'from-amber-400 to-yellow-500',   // 1st
  'from-slate-300 to-slate-400',    // 2nd
  'from-amber-600 to-amber-800',    // 3rd
];

export default function ResultsScreen({ participants, onClose, isFullscreen }: ResultsScreenProps) {
  const sorted = [...participants].sort((a, b) => {
    if (a.is_finished && b.is_finished) {
      // Keduanya selesai, urutkan berdasarkan finished_at
      return new Date(a.finished_at!).getTime() - new Date(b.finished_at!).getTime();
    }
    if (a.is_finished) return -1;
    if (b.is_finished) return 1;
    // Keduanya belum selesai, urutkan berdasarkan progress lalu WPM
    if ((b.progress || 0) !== (a.progress || 0)) return (b.progress || 0) - (a.progress || 0);
    return (b.wpm || 0) - (a.wpm || 0);
  });

  const top3 = sorted.slice(0, 3);

  // Confetti saat pertama kali tampil
  useEffect(() => {
    const duration = 5000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ['#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#A855F7'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ['#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#A855F7'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const getCarColor = (p: RoomParticipant) => {
    return CAR_OPTIONS.find(c => c.id === (p.selected_car || 'blue'))?.color || '#3B82F6';
  };

  const formatTime = (p: RoomParticipant) => {
    if (!p.finished_at || !p.is_finished) return '—';
    return '✓ Selesai';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a2e 40%, #16213e 70%, #0f3460 100%)',
      }}
    >
      {/* Particle stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: ['#F59E0B', '#fff', '#3B82F6', '#10B981'][i % 4],
              animationDelay: `${Math.random() * 2}s`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 text-center pt-8 pb-2 px-4 flex-shrink-0">
        <div className="text-5xl mb-2 animate-bounce">🏁</div>
        <h1
          className="text-4xl md:text-5xl font-black text-transparent bg-clip-text"
          style={{ backgroundImage: 'linear-gradient(90deg, #F59E0B, #FCD34D, #F59E0B)' }}
        >
          HASIL PERLOMBAAN
        </h1>
        <p className="text-slate-400 text-sm mt-1 tracking-widest uppercase">
          Lomba Mengetik — Peringkat Final
        </p>
      </div>

      {/* Podium */}
      <div className="relative z-10 flex-shrink-0 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-end justify-center gap-4">
          {PODIUM_ORDER.map((rankIdx, colIdx) => {
            const p = top3[rankIdx];
            if (!p) return <div key={colIdx} className="flex-1" />;
            const carColor = getCarColor(p);
            const podiumHeights = ['h-40', 'h-28', 'h-20'];
            const isFirst = rankIdx === 0;
            return (
              <div
                key={colIdx}
                className="flex-1 flex flex-col items-center"
                style={{
                  animation: `slideUp 0.6s ease-out ${colIdx * 0.2}s both`,
                }}
              >
                {/* Medal & Car */}
                <div className="flex flex-col items-center mb-2">
                  <span className="text-3xl">{MEDAL[rankIdx]}</span>
                  <div
                    className={`transition-all duration-700 ${isFirst ? 'scale-125' : ''}`}
                    style={{ filter: `drop-shadow(0 0 12px ${carColor}80)` }}
                  >
                    <CarSVG color={carColor} size={isFirst ? 52 : 40} />
                  </div>
                </div>

                {/* Nama */}
                <div className="text-center mb-2 px-1">
                  <p
                    className={`font-black leading-tight ${isFirst ? 'text-sm' : 'text-xs'} text-white`}
                    style={{ textShadow: `0 0 10px ${carColor}` }}
                  >
                    {p.users?.nama?.split(' ').slice(0, 2).join(' ') || 'Peserta'}
                  </p>
                  <p className="text-[10px] text-slate-400">{p.users?.kelas || ''}</p>
                  <p
                    className="text-lg font-black mt-0.5"
                    style={{ color: carColor }}
                  >
                    {Math.round(p.wpm || 0)} <span className="text-[10px] font-normal text-slate-400">WPM</span>
                  </p>
                </div>

                {/* Podium block */}
                <div
                  className={`w-full ${podiumHeights[rankIdx]} rounded-t-xl flex items-center justify-center`}
                  style={{
                    background: [
                      'linear-gradient(180deg, #F59E0B, #B45309)',
                      'linear-gradient(180deg, #CBD5E1, #64748B)',
                      'linear-gradient(180deg, #92400E, #451A03)',
                    ][rankIdx],
                    boxShadow: `0 -4px 20px ${carColor}40`,
                  }}
                >
                  <span className="text-3xl font-black text-white/80">{rankIdx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Leaderboard Table */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3 text-center">
            📋 Daftar Lengkap Hasil Peserta
          </h2>
          <div className="rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl">
            {/* Header tabel */}
            <div
              className="grid grid-cols-12 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-400"
              style={{ background: 'rgba(15,15,30,0.8)' }}
            >
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-4">Nama</div>
              <div className="col-span-2 text-center">WPM</div>
              <div className="col-span-2 text-center">Akurasi</div>
              <div className="col-span-2 text-center">Progress</div>
              <div className="col-span-1 text-center">✓</div>
            </div>

            {sorted.map((p, idx) => {
              const carColor = getCarColor(p);
              const isTop3 = idx < 3;
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-12 px-4 py-3 items-center border-t border-slate-800/60 transition-all"
                  style={{
                    background: isTop3
                      ? `linear-gradient(90deg, ${carColor}18 0%, transparent 60%)`
                      : idx % 2 === 0
                      ? 'rgba(255,255,255,0.02)'
                      : 'transparent',
                    animation: `fadeIn 0.4s ease-out ${idx * 0.05}s both`,
                  }}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex justify-center">
                    {idx < 3 ? (
                      <span className="text-lg">{MEDAL[idx]}</span>
                    ) : (
                      <span className="text-sm font-bold text-slate-500">{idx + 1}</span>
                    )}
                  </div>

                  {/* Nama + Mobil */}
                  <div className="col-span-4 flex items-center gap-2">
                    <div style={{ filter: `drop-shadow(0 0 4px ${carColor}60)` }}>
                      <CarSVG color={carColor} size={22} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200 leading-tight">
                        {p.users?.nama || 'Peserta'}
                      </p>
                      <p className="text-[10px] text-slate-500">{p.users?.kelas || ''}</p>
                    </div>
                  </div>

                  {/* WPM */}
                  <div className="col-span-2 text-center">
                    <span
                      className="text-sm font-bold"
                      style={{ color: p.wpm > 0 ? carColor : '#475569' }}
                    >
                      {Math.round(p.wpm || 0)}
                    </span>
                  </div>

                  {/* Akurasi */}
                  <div className="col-span-2 text-center">
                    <span className="text-xs font-semibold text-emerald-400">
                      {Math.round(p.accuracy || 0)}%
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="col-span-2 flex items-center gap-1.5">
                    <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${p.progress || 0}%`,
                          backgroundColor: carColor,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 w-6">{p.progress || 0}%</span>
                  </div>

                  {/* Selesai */}
                  <div className="col-span-1 text-center">
                    {p.is_finished ? (
                      <span className="text-emerald-400 text-base">✓</span>
                    ) : (
                      <span className="text-slate-600 text-base">✗</span>
                    )}
                  </div>
                </div>
              );
            })}

            {sorted.length === 0 && (
              <div className="py-10 text-center text-slate-500 text-sm">
                Tidak ada data peserta
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tombol Tutup / Kembali */}
      {onClose && (
        <div className="relative z-10 flex-shrink-0 pb-6 flex justify-center px-4">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold rounded-xl transition-all text-sm shadow-xl"
          >
            ✕ Tutup Hasil & Kembali
          </button>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
