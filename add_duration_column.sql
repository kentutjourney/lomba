-- ==============================================================
-- QUERY PENAMBAHAN PENGATURAN DURASI WAKTU LOMBA (KOLOM durasi_detik)
-- Jalankan query ini di SQL Editor pada Dashboard Supabase Anda
-- ==============================================================

ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS durasi_detik INT NOT NULL DEFAULT 60;
