'use client';

import React from 'react';
import { RoomParticipant } from '@/lib/supabase';
import { CAR_OPTIONS, CarSVG } from './CarSelector';

interface RacingTrackProps {
  participants: RoomParticipant[];
  status: 'waiting' | 'countdown' | 'in_progress' | 'finished';
  countdown?: number | null;
  isFullscreen?: boolean;
}

export default function RacingTrack({ participants, status, countdown, isFullscreen }: RacingTrackProps) {
  // Saat fullscreen, perbesar lane agar track mengisi layar
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 700;
  const LANE_HEIGHT = isFullscreen
    ? Math.max(80, Math.min(140, Math.floor(screenH * 0.68 / Math.max(participants.length, 1))))
    : 90;
  const trackHeight = Math.max(participants.length * LANE_HEIGHT, isFullscreen ? 300 : 200);

  return (
    <div className="w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-800 select-none"
      style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}
    >
      {/* Header Grandstand / Tribune */}
      <div className="relative h-10 overflow-hidden flex items-center"
        style={{ background: 'linear-gradient(90deg, #2d1b69, #1e3a5f, #2d1b69)' }}
      >
        {/* Crowd silhouettes */}
        <div className="absolute inset-0 flex items-end pb-0 overflow-hidden opacity-50">
          {[...Array(32)].map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0">
              <div
                className="rounded-full"
                style={{
                  width: 10, height: 10,
                  backgroundColor: ['#ef4444','#f59e0b','#10b981','#3b82f6','#a855f7','#ec4899'][i % 6],
                }}
              />
              <div className="w-3 h-4 rounded-t-full" style={{
                backgroundColor: ['#7f1d1d','#78350f','#064e3b','#1e3a8a','#581c87','#831843'][i % 6],
              }} />
            </div>
          ))}
        </div>
        <p className="relative z-10 text-center w-full text-white font-extrabold text-xs uppercase tracking-[0.2em]">
          🏁 ARENA BALAP LOMBA MENGETIK 🏁
        </p>
      </div>

      {/* Track Container */}
      <div className="relative" style={{ height: trackHeight, minHeight: 200 }}>
        {/* Asphalt background lanes */}
        {participants.map((_, i) => (
          <div
            key={i}
            className="absolute w-full border-b border-dashed"
            style={{
              top: i * LANE_HEIGHT,
              height: LANE_HEIGHT,
              borderColor: 'rgba(255,255,255,0.08)',
              background: i % 2 === 0
                ? 'rgba(255,255,255,0.015)'
                : 'transparent',
            }}
          />
        ))}

        {/* Garis Start */}
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-10"
          style={{ left: '8%', width: 24 }}
        >
          {/* Checkered start pattern */}
          <div className="absolute inset-y-0 flex flex-col" style={{ width: 12 }}>
            {[...Array(16)].map((_, i) => (
              <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-white/80' : 'bg-black/60'}`} />
            ))}
          </div>
          <span className="relative z-10 text-[8px] font-black text-slate-200 tracking-widest rotate-90 whitespace-nowrap mt-1"
            style={{ textShadow: '0 0 6px #000' }}>
            START
          </span>
        </div>

        {/* Garis Finish */}
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-10"
          style={{ right: '4%', width: 24 }}
        >
          <div className="absolute inset-y-0 flex flex-col" style={{ width: 12 }}>
            {[...Array(16)].map((_, i) => (
              <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-white/80' : 'bg-black/60'}`} />
            ))}
          </div>
          <span className="relative z-10 text-[8px] font-black text-yellow-300 tracking-widest rotate-90 whitespace-nowrap"
            style={{ textShadow: '0 0 6px #000' }}>
            FINISH
          </span>
        </div>

        {/* Countdown overlay besar di tengah track */}
        {(status === 'countdown' && countdown != null && countdown > 0) && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <div
              className="text-[120px] font-black text-white animate-ping"
              style={{
                textShadow: '0 0 40px rgba(255,255,255,0.8), 4px 4px 0 #000, -2px -2px 0 #000',
                lineHeight: 1,
              }}
            >
              {countdown}
            </div>
          </div>
        )}
        {(status === 'countdown' && (countdown == null || countdown === 0)) && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <div
              className="text-[80px] font-black animate-bounce"
              style={{
                color: '#10B981',
                textShadow: '0 0 40px rgba(16,185,129,0.8), 4px 4px 0 #000',
                lineHeight: 1,
              }}
            >
              GO!
            </div>
          </div>
        )}

        {/* Mobil peserta di lintasan */}
        {participants.map((p, i) => {
          const carOption = CAR_OPTIONS.find(c => c.id === (p.selected_car || 'blue')) || CAR_OPTIONS[0];
          // Kalkulasi posisi X: start dari 9% ke 91% berdasarkan progress
          const trackLeft = 9;
          const trackRight = 92;
          const carX = trackLeft + ((trackRight - trackLeft) * (p.progress || 0)) / 100;

          return (
            <div
              key={p.id}
              className="absolute flex items-center"
              style={{
                top: i * LANE_HEIGHT,
                height: LANE_HEIGHT,
                width: '100%',
              }}
            >
              {/* Nama peserta di pojok kiri */}
              <div
                className="absolute flex items-center gap-1.5 z-20"
                style={{ left: 8, top: '50%', transform: 'translateY(-50%)' }}
              >
                <span
                  className="px-2 py-0.5 rounded font-bold text-[11px] text-white shadow"
                  style={{
                    backgroundColor: carOption.color,
                    boxShadow: `0 0 8px ${carOption.color}80`,
                  }}
                >
                  {p.users?.nama?.split(' ')[0] || `P${i + 1}`}
                </span>
              </div>

              {/* Mobil bergerak */}
              <div
                className="absolute z-20 transition-all duration-700"
                style={{
                  left: `${carX}%`,
                  top: '50%',
                  transform: 'translateY(-50%) rotate(90deg)',
                }}
              >
                {/* Efek asap/nitro di belakang mobil saat bergerak */}
                {p.progress > 0 && !p.is_finished && (
                  <div
                    className="absolute animate-ping"
                    style={{ top: -6, left: '50%', transform: 'translateX(-50%)', width: 6, height: 10 }}
                  >
                    <div className="w-full h-full rounded-full opacity-70"
                      style={{ backgroundColor: carOption.color }} />
                  </div>
                )}

                {/* Efek Finish / Selesai */}
                {p.is_finished && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-lg animate-bounce">🏆</div>
                )}

                <CarSVG color={carOption.color} size={52} />
              </div>

              {/* WPM badge di kanan */}
              <div className="absolute right-4 z-20" style={{ top: '50%', transform: 'translateY(-50%)' }}>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold" style={{ color: carOption.color }}>
                    {Math.round(p.wpm || 0)}
                    <span className="text-[9px] text-slate-500 ml-0.5">WPM</span>
                  </span>
                  <div className="text-[9px] text-slate-600">{p.progress || 0}%</div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Jika belum ada peserta */}
        {participants.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-slate-500 text-sm">Menunggu peserta bergabung...</p>
          </div>
        )}
      </div>

      {/* Footer speedometer area */}
      <div className="h-10 flex items-center px-4 gap-4 border-t border-slate-800/80"
        style={{ background: '#0f0f1a' }}
      >
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Race Monitor</span>
        </div>
        <div className="flex gap-3 ml-auto">
          {CAR_OPTIONS.slice(0, 8).map((c) => {
            const hasDriver = participants.some(p => (p.selected_car || 'blue') === c.id);
            return hasDriver ? (
              <div key={c.id} className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} title={c.name} />
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}
