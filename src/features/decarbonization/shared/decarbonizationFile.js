/**
 * decarbonizationFile
 * -------------------
 * Camada de persistência do módulo (uma "empresa" = um JSON por CNPJ).
 *
 * Estratégia em duas camadas:
 *  1. Supabase (banco de dados real) — usado sempre que `VITE_SUPABASE_URL` e
 *     `VITE_SUPABASE_ANON_KEY` estiverem definidos. É o que mantém os dados
 *     persistidos em produção/Vercel (e também funciona em dev).
 *  2. Middleware de DESENVOLVIMENTO do Vite (`/__decarbonization`, ver
 *     `vite.config.js`) — fallback usado quando o Supabase não está configurado.
 *     Grava em `decarbonization-data/<cnpj>.json`. Só funciona com `npm run dev`.
 *
 * Sem nenhuma das duas (ex.: build/preview sem Supabase), as escritas falham e o
 * estado permanece apenas no localStorage (separado por CNPJ).
 */
import { supabase, hasSupabase, COMPANIES_TABLE } from '@/lib/supabaseClient';

const BASE = '/__decarbonization';

const onlyDigits = (raw) => String(raw || '').replace(/\D/g, '');

const devOnlyError = (status) =>
    new Error(
        `Falha ao acessar o arquivo do projeto (HTTP ${status}). Sem Supabase configurado, a gravação só está disponível no servidor de desenvolvimento (npm run dev).`
    );

/**
 * Grava o JSON de uma empresa (Supabase quando configurado; senão, arquivo do
 * projeto via middleware do Vite).
 * @param {string} cnpj
 * @param {object} data
 * @returns {Promise<{ ok: boolean, file?: string }>}
 */
export const writeCompanyFile = async (cnpj, data) => {
    const id = onlyDigits(cnpj);

    if (hasSupabase) {
        const { error } = await supabase
            .from(COMPANIES_TABLE)
            .upsert(
                {
                    cnpj: id,
                    empresa: data?.empresa || null,
                    data,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'cnpj' }
            );
        if (error) throw new Error(`Supabase: falha ao salvar (${error.message}).`);
        return { ok: true };
    }

    const res = await fetch(`${BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: id, data }),
    });
    if (!res.ok) throw devOnlyError(res.status);
    return res.json().catch(() => ({ ok: true }));
};

/**
 * Lê o JSON salvo de uma empresa (ou `null` se não existir).
 * @param {string} cnpj
 * @returns {Promise<object|null>}
 */
export const readCompanyFile = async (cnpj) => {
    const id = onlyDigits(cnpj);

    if (hasSupabase) {
        const { data, error } = await supabase
            .from(COMPANIES_TABLE)
            .select('data')
            .eq('cnpj', id)
            .maybeSingle();
        if (error) throw new Error(`Supabase: falha ao carregar (${error.message}).`);
        return data?.data ?? null;
    }

    const res = await fetch(`${BASE}/data/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw devOnlyError(res.status);
    return res.json();
};

/**
 * Lista os CNPJs com dados salvos.
 * @returns {Promise<string[]>}
 */
export const listCompanyFiles = async () => {
    if (hasSupabase) {
        const { data, error } = await supabase
            .from(COMPANIES_TABLE)
            .select('cnpj')
            .order('updated_at', { ascending: false });
        if (error) return [];
        return (data || []).map((row) => row.cnpj);
    }

    const res = await fetch(`${BASE}/list`);
    if (!res.ok) return [];
    return res.json().catch(() => []);
};

export default { writeCompanyFile, readCompanyFile, listCompanyFiles };
