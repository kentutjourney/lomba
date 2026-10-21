-- ==============================================================
-- SKEMA DATABASE LOMBA MENGETIK (TYPING COMPETITION)
-- Jalankan query ini di SQL Editor pada Dashboard Supabase Anda
-- ==============================================================

-- 1. Tabel Users (Master & Siswa)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    kelas TEXT DEFAULT 'Master',
    nisn TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('master', 'siswa')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Texts (Bank Teks Perlombaan)
CREATE TABLE IF NOT EXISTS public.texts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul TEXT NOT NULL,
    konten TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Rooms (Ruangan Lomba yang dibuat Master)
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_room TEXT NOT NULL,
    text_id UUID REFERENCES public.texts(id) ON DELETE SET NULL,
    teks_konten TEXT NOT NULL, -- snapshot teks saat room dibuat
    judul_teks TEXT NOT NULL,
    max_peserta INT NOT NULL DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'countdown', 'in_progress', 'finished')),
    countdown_start_time TIMESTAMP WITH TIME ZONE,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabel Room Participants (Peserta yang masuk ke Room)
CREATE TABLE IF NOT EXISTS public.room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    wpm NUMERIC(5,2) DEFAULT 0,
    accuracy NUMERIC(5,2) DEFAULT 0,
    progress INT DEFAULT 0, -- persentase progress mengetik 0 - 100
    is_finished BOOLEAN DEFAULT FALSE,
    finished_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(room_id, user_id)
);

-- 5. Aktifkan Row Level Security (RLS) & Berikan Akses Anon
-- Supaya aplikasi web Next.js dapat membaca & update data dengan mudah
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS (Public Access untuk Anon Key)
DROP POLICY IF EXISTS "Public Users Access" ON public.users;
DROP POLICY IF EXISTS "Public Texts Access" ON public.texts;
DROP POLICY IF EXISTS "Public Rooms Access" ON public.rooms;
DROP POLICY IF EXISTS "Public Participants Access" ON public.room_participants;

CREATE POLICY "Public Users Access" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Texts Access" ON public.texts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Rooms Access" ON public.rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Participants Access" ON public.room_participants FOR ALL USING (true) WITH CHECK (true);

-- 6. Aktifkan SUPABASE REALTIME pada tabel rooms dan room_participants
-- Sangat penting agar perubahan status room, live progress mengetik & siswa yang join langsung ter-update di layar!
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;


-- ==============================================================
-- DATA AWAL MASTER & SISWA
-- ==============================================================

-- Akun Master (Ziqi raehan - password awal 12345678)
INSERT INTO public.users (nama, kelas, nisn, role) 
VALUES ('Ziqi raehan', 'Master', '12345678', 'master')
ON CONFLICT (nisn) DO NOTHING;

-- Data Siswa (NISN sebagai password siswa)
INSERT INTO public.users (nisn, nama, kelas, role) VALUES
('3159191427', 'ACHMAD MAULANA', 'Kelas 6A', 'siswa'),
('3156626838', 'Ahmad Yasin', 'Kelas 6A', 'siswa'),
('3154399170', 'ALYA SHAFIRA', 'Kelas 6A', 'siswa'),
('0144569912', 'ANISA PUTRI RAMADHANI', 'Kelas 6A', 'siswa'),
('3147856793', 'ANNISA NURSYIFA QOLBI', 'Kelas 6A', 'siswa'),
('0155640171', 'AQILA AZZAHRA', 'Kelas 6A', 'siswa'),
('3152829489', 'Arinta Dewi Saputri', 'Kelas 6A', 'siswa'),
('3148337810', 'ARRAYYAN ATHFAL', 'Kelas 6A', 'siswa'),
('3159813815', 'BAZIL BALYAN GHALIBY', 'Kelas 6A', 'siswa'),
('3154852687', 'DHAFITA NUR AZIZAH', 'Kelas 6A', 'siswa'),
('3155581317', 'Fikri WInarto', 'Kelas 6A', 'siswa'),
('0144019421', 'GENDIS ADDARA PUTRI', 'Kelas 6A', 'siswa'),
('3149321024', 'Maulana Al Hafis', 'Kelas 6A', 'siswa'),
('3140290195', 'MUHAMAD NOUFAL KHAIRI RAHMAN', 'Kelas 6A', 'siswa'),
('3140154094', 'Muhammad Rifky Hidayat', 'Kelas 6A', 'siswa'),
('3148999111', 'MUHAMMAD SAHLAN AL JAZLI', 'Kelas 6A', 'siswa'),
('3141798673', 'NADIVA HUMAIRA AZZARA', 'Kelas 6A', 'siswa'),
('3148376344', 'RAYAN ABRAHAM', 'Kelas 6A', 'siswa'),
('3140203877', 'SALWA NAURA KAMILA', 'Kelas 6A', 'siswa'),
('3150900034', 'SARAH PUTRI HAZANI', 'Kelas 6A', 'siswa'),
('0155496776', 'Sayyidah Dayyinah Batrisya', 'Kelas 6A', 'siswa'),
('0152745484', 'SHARFINA CHANTIKA PUTRI', 'Kelas 6A', 'siswa'),
('3148839739', 'SYAHILA AZZAHRA', 'Kelas 6A', 'siswa'),
('3146088677', 'TASYA NUR HAFIFAH', 'Kelas 6A', 'siswa'),
('0testing6a', 'testing6a', 'Kelas 6A', 'siswa'),
('0142208046', 'Adelia Herlinda', 'Kelas 6B', 'siswa'),
('3159221260', 'Adelliya Putri', 'Kelas 6B', 'siswa'),
('3147748299', 'AFNAN ARDANI', 'Kelas 6B', 'siswa'),
('3146322566', 'ALDIS ARHAMUDIN', 'Kelas 6B', 'siswa'),
('3145711828', 'ARYA PUTRA AL FAKHIR', 'Kelas 6B', 'siswa'),
('3149628013', 'DAFI AZRIL PERMANA', 'Kelas 6B', 'siswa'),
('3146294319', 'DEVANDRA AL GIFARY', 'Kelas 6B', 'siswa'),
('3142226756', 'Fadillah Akbar Saputra', 'Kelas 6B', 'siswa'),
('3143204098', 'FAKHIRA SHAKILA ZAHRA', 'Kelas 6B', 'siswa'),
('3144832064', 'GEISHA ALENA NAURI SUKANDAR', 'Kelas 6B', 'siswa'),
('0148330321', 'Haninda Aulia Ramadhani', 'Kelas 6B', 'siswa'),
('3140542790', 'KHEYZA ELDYNA SETIAWAN', 'Kelas 6B', 'siswa'),
('3157969104', 'MOHAMAD RIZIQ KURNIAWAN', 'Kelas 6B', 'siswa'),
('0146733914', 'Muhamad Fachrul Rozi', 'Kelas 6B', 'siswa'),
('0145943914', 'MUHAMAD ZIDAN ABQORI AL FARIZKI', 'Kelas 6B', 'siswa'),
('3157893456', 'MUHAMMAD FATIR AL FARIDZY', 'Kelas 6B', 'siswa'),
('3141192530', 'MUHAMMAD HAFIS RAMADAN', 'Kelas 6B', 'siswa'),
('3146574780', 'MUHAMMAD HAFIZ YASIN', 'Kelas 6B', 'siswa'),
('3141068648', 'NASYAFA DARA DAVIANSYAH', 'Kelas 6B', 'siswa'),
('3139224926', 'NIKITA', 'Kelas 6B', 'siswa'),
('3153621635', 'OMAR ATSEMANI', 'Kelas 6B', 'siswa'),
('0144494625', 'Ranaa Alifah Oktavia', 'Kelas 6B', 'siswa'),
('3156186258', 'SABRINA ADIA RAHMAN', 'Kelas 6B', 'siswa'),
('3141442807', 'SAKYA NAJID AL HADI', 'Kelas 6B', 'siswa'),
('3145379380', 'SHALAHUDDIN AL AYYUBI', 'Kelas 6B', 'siswa'),
('11111111', 'testing a', 'Kelas 6B', 'siswa'),
('22222222', 'testing b', 'Kelas 6B', 'siswa'),
('33333333', 'testing c', 'Kelas 6B', 'siswa')
ON CONFLICT (nisn) DO NOTHING;

-- Data Sampel Bank Teks Perlombaan
INSERT INTO public.texts (judul, konten) VALUES
('Pendidikan di Era Digital', 'Teknologi informasi berkembang dengan sangat pesat di era modern ini. Kita dituntut untuk dapat beradaptasi dan memanfaatkan kemajuan teknologi dengan bijak serta penuh tanggung jawab.'),
('Semangat Belajar Generasi Muda', 'Belajar adalah proses sepanjang hayat yang tidak pernah ada batasnya. Kejujuran, kedisiplinan, serta ketekunan adalah kunci utama dalam meraih cita-cita dan kesuksesan di masa depan.'),
('Keindahan Nusantara Indonesia', 'Indonesia merupakan negara kepulauan yang sangat kaya akan keberagaman budaya, suku bangsa, dan bahasa. Mari kita jaga persatuan dan kesatuan demi keutuhan bangsa Indonesia.')
ON CONFLICT DO NOTHING;
