/**
 * supabaseClient
 * --------------
 * Cliente Supabase para persistir os dados do módulo de Descarbonização em um
 * banco de dados real (necessário em produção/Vercel, onde o middleware de
 * desenvolvimento do Vite não existe).
 *
 * Configuração via variáveis de ambiente (prefixo VITE_ para o build do Vite):
 *   VITE_SUPABASE_URL       URL do projeto Supabase
 *   VITE_SUPABASE_ANON_KEY  chave pública (anon) do projeto
 *
 * Se as variáveis não estiverem definidas, `hasSupabase` é `false` e a camada de
 * dados (`decarbonizationFile`) cai automaticamente para o middleware do Vite
 * (em `npm run dev`) / localStorage.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Indica se o Supabase está configurado (URL + anon key presentes). */
export const hasSupabase = Boolean(url && anonKey);

/** Tabela onde o JSON de cada empresa é gravado (uma linha por CNPJ). */
export const COMPANIES_TABLE = 'decarbonization_companies';

/** Cliente Supabase, ou `null` quando não configurado. */
export const supabase = hasSupabase ? createClient(url, anonKey) : null;

export default supabase;
