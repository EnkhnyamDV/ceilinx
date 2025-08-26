import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface FormMeta {
  id: string;
  lieferantenname: string;
  status: string | null;
  kalkulation_id: string | null;
  allgemeiner_kommentar: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FormPosition {
  id: string;
  meta_id: string;
  oz: string | null;
  bezeichnung: string;
  menge: number | null;
  einheit: string | null;
  einzelpreis_netto: number | null;
  ninox_nr: string | null;
  langtext: string | null;
  kommentar: string | null;
  created_at: string | null;
  updated_at: string | null;
}