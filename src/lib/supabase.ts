import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iakvrpgivggrbmpzyoyw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlha3ZycGdpdmdncmJtcHp5b3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NTA4MTUsImV4cCI6MjA2NTIyNjgxNX0.pizN0qMeENwq4JunhHEJ6dWaN_X3yyMnBxXux-vnBk4';

// Temporary debugging - will remove after fix
console.log('Build-time env check:', {
  supabaseUrl: supabaseUrl ? `Present (${supabaseUrl.substring(0, 20)}...)` : 'MISSING',
  supabaseAnonKey: supabaseAnonKey ? 'Present' : 'MISSING',
  allViteEnvs: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables are missing during build!');
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