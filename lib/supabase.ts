import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserProfile = {
  id: string;
  nama: string;
  kelas: string;
  nisn: string;
  role: 'master' | 'siswa';
  created_at: string;
};

export type TextItem = {
  id: string;
  judul: string;
  konten: string;
  created_at: string;
};

export type Room = {
  id: string;
  kode_room: string;
  text_id: string;
  teks_konten: string;
  judul_teks: string;
  max_peserta: number;
  durasi_detik?: number;
  status: 'waiting' | 'countdown' | 'in_progress' | 'finished';
  countdown_start_time: string | null;
  start_time: string | null;
  end_time: string | null;
  created_by: string;
  created_at: string;
};

export type RoomParticipant = {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  wpm: number;
  accuracy: number;
  progress: number;
  is_finished: boolean;
  finished_at: string | null;
  selected_car: string;
  users?: UserProfile;
};
