/**
 * adminUsersAPI — cliente da API de administração de usuários (/api/admin/users).
 * As operações de usuário (criar/alterar senha/excluir) exigem a service role
 * key do Supabase e por isso rodam NO SERVIDOR (função Vercel; em dev, o
 * middleware do Vite). Toda chamada envia o token da sessão do admin.
 */
import { supabase, hasSupabase } from '@/lib/supabaseClient';

const call = async (method, body) => {
    if (!hasSupabase) throw new Error('Banco não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('Sessão expirada. Entre novamente.');

    const res = await fetch('/api/admin/users', {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || `Falha na API de administração (HTTP ${res.status}).`);
    return out;
};

/** Lista usuários (perfil + empresa). */
export const listUsers = async () => (await call('GET')).users;

/** Cria usuário: { email, password, name, companyId }. */
export const createUser = (payload) => call('POST', payload);

/** Atualiza usuário: { id, name?, companyId?, password? }. */
export const updateUser = (payload) => call('PATCH', payload);

/** Exclui usuário pelo id. */
export const deleteUser = (id) => call('DELETE', { id });

/** Gera uma senha aleatória legível (sem caracteres ambíguos). */
export const generatePassword = (length = 12) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const values = crypto.getRandomValues(new Uint32Array(length));
    return Array.from(values, (v) => chars[v % chars.length]).join('');
};

export default { listUsers, createUser, updateUser, deleteUser, generatePassword };
