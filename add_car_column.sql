-- ==============================================================
-- QUERY PENAMBAHAN KOLOM PILIHAN MOBIL DI room_participants
-- Jalankan di SQL Editor Supabase Anda
-- ==============================================================
ALTER TABLE public.room_participants
ADD COLUMN IF NOT EXISTS selected_car TEXT NOT NULL DEFAULT 'blue';
