'use client';

import React from 'react';

// Daftar pilihan mobil dengan warna dan nama
export const CAR_OPTIONS = [
  { id: 'blue',   name: 'Lightning Blue',   color: '#3B82F6', glow: '#3B82F6' },
  { id: 'red',    name: 'Crimson Racer',    color: '#EF4444', glow: '#EF4444' },
  { id: 'yellow', name: 'Golden Speed',     color: '#F59E0B', glow: '#F59E0B' },
  { id: 'purple', name: 'Violet Ghost',     color: '#A855F7', glow: '#A855F7' },
  { id: 'green',  name: 'Neon Striker',     color: '#10B981', glow: '#10B981' },
  { id: 'orange', name: 'Blaze Runner',     color: '#F97316', glow: '#F97316' },
  { id: 'pink',   name: 'Rose Phantom',     color: '#EC4899', glow: '#EC4899' },
  { id: 'cyan',   name: 'Arctic Storm',     color: '#06B6D4', glow: '#06B6D4' },
];

// Komponen SVG Mobil Top-Down View
export function CarSVG({ color, size = 40 }: { color: string; size?: number }) {
  return (
    <svg width={size * 0.55} height={size} viewBox="0 0 55 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body Mobil */}
      <rect x="5" y="10" width="45" height="80" rx="10" fill={color} />
      {/* Atap / Windshield depan */}
      <rect x="12" y="18" width="31" height="20" rx="5" fill="rgba(255,255,255,0.25)" />
      {/* Windshield belakang */}
      <rect x="12" y="62" width="31" height="14" rx="4" fill="rgba(255,255,255,0.15)" />
      {/* Ban kiri depan */}
      <rect x="0" y="14" width="10" height="18" rx="4" fill="#1e1e2e" />
      {/* Ban kanan depan */}
      <rect x="45" y="14" width="10" height="18" rx="4" fill="#1e1e2e" />
      {/* Ban kiri belakang */}
      <rect x="0" y="68" width="10" height="18" rx="4" fill="#1e1e2e" />
      {/* Ban kanan belakang */}
      <rect x="45" y="68" width="10" height="18" rx="4" fill="#1e1e2e" />
      {/* Lampu depan */}
      <rect x="10" y="10" width="12" height="6" rx="2" fill="#FEF3C7" />
      <rect x="33" y="10" width="12" height="6" rx="2" fill="#FEF3C7" />
      {/* Lampu belakang */}
      <rect x="10" y="84" width="12" height="6" rx="2" fill="#FCA5A5" />
      <rect x="33" y="84" width="12" height="6" rx="2" fill="#FCA5A5" />
      {/* Garis aksen stripe tengah */}
      <rect x="24" y="38" width="7" height="26" rx="2" fill="rgba(255,255,255,0.12)" />
    </svg>
  );
}

// Komponen Pilih Mobil (Car Selector)
interface CarSelectorProps {
  selectedCar: string;
  onSelect: (carId: string) => void;
  lockedByOthers?: string[];
}

export default function CarSelector({ selectedCar, onSelect, lockedByOthers = [] }: CarSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background track lines decorative */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-full border-t border-dashed border-slate-800/50"
            style={{ top: `${(i + 1) * 12.5}%` }}
          />
        ))}
        {/* Checkered flag decorative top and bottom */}
        <div className="absolute top-0 left-0 right-0 h-6 flex">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-6 ${(i % 2 === 0) ? 'bg-white/5' : 'bg-transparent'}`}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏁</div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-1">
            Pilih Mobil Anda
          </h2>
          <p className="text-slate-400 text-sm">
            Pilih mobil keberuntungan Anda sebelum perlombaan dimulai!
          </p>
        </div>

        {/* Grid Pilihan Mobil */}
        <div className="grid grid-cols-4 gap-4">
          {CAR_OPTIONS.map((car) => {
            const isSelected = selectedCar === car.id;
            const isLocked = lockedByOthers.includes(car.id);

            return (
              <button
                key={car.id}
                onClick={() => !isLocked && onSelect(car.id)}
                disabled={isLocked}
                className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 group ${
                  isSelected
                    ? 'scale-105 border-white bg-white/10 shadow-2xl'
                    : isLocked
                    ? 'opacity-40 cursor-not-allowed border-slate-700 bg-slate-900/50'
                    : 'border-slate-700 bg-slate-900/60 hover:scale-105 hover:border-slate-400 hover:bg-slate-800/60'
                }`}
                style={isSelected ? {
                  boxShadow: `0 0 30px ${car.glow}60, 0 0 60px ${car.glow}30`,
                  borderColor: car.color,
                } : {}}
              >
                {/* Glow effect on selected */}
                {isSelected && (
                  <div
                    className="absolute inset-0 rounded-2xl opacity-20 blur-lg"
                    style={{ backgroundColor: car.color }}
                  />
                )}

                {/* Efek Nitro api belakang mobil saat selected */}
                {isSelected && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-0.5">
                    <div className="w-1.5 h-5 rounded-full animate-pulse" style={{ backgroundColor: '#F97316', opacity: 0.9 }} />
                    <div className="w-1 h-4 rounded-full animate-pulse delay-75" style={{ backgroundColor: '#FBBF24', opacity: 0.8 }} />
                    <div className="w-1.5 h-5 rounded-full animate-pulse delay-150" style={{ backgroundColor: '#F97316', opacity: 0.9 }} />
                  </div>
                )}

                <div className="relative z-10 mb-3">
                  <CarSVG color={car.color} size={48} />
                </div>

                <span
                  className="text-[10px] font-bold text-center leading-tight relative z-10"
                  style={{ color: isSelected ? car.color : '#94a3b8' }}
                >
                  {car.name}
                </span>

                {isLocked && (
                  <span className="text-[9px] text-rose-400 mt-1">Dipakai</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Info current selection */}
        {selectedCar && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-800/80 border border-slate-700">
              <CarSVG color={CAR_OPTIONS.find(c => c.id === selectedCar)?.color || '#fff'} size={28} />
              <span className="text-sm text-slate-200 font-semibold">
                {CAR_OPTIONS.find(c => c.id === selectedCar)?.name} — Siap Balapan!
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Menunggu Master memulai pertandingan...</p>
          </div>
        )}
      </div>
    </div>
  );
}
