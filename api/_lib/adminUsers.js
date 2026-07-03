/**
 * Handler da API de administração de usuários (/api/admin/users).
 * ----------------------------------------------------------------
 * Roda com a SERVICE ROLE KEY do Supabase (só no servidor — nunca no browser):
 * é ela que permite criar/alterar/excluir usuários do Supabase Auth.
 *
 * Segurança: toda chamada exige um Bearer token de uma sessão válida do
 * Supabase Auth CUJO PERFIL SEJA admin. Qualquer outro usuário recebe 403.
 *
 * Usado em dois lugares (mesma lógica):
 *   • Produção: função serverless da Vercel (api/admin/users.js)
 *   • Dev:      middleware do Vite (vite.config.js)
 *
 * Rotas (por método HTTP):
 *   GET     → lista usuários (perfil + empresa)
 *   POST    → cria usuário   { email, password, name, companyId }
 *   PATCH   → atualiza       { id, name?, companyId?, password? }
 *   DELETE  → exclui         { id }
 */
import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
};

/** Corpo JSON: usa req.body quando o runtime já parseou (Vercel); senão lê o stream (Vite). */
const readBody = async (req) => {
    if (req.body !== undefined && req.body !== null) {
        return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
    }
    let raw = '';
    // eslint-disable-next-line no-restricted-syntax
    for await (const chunk of req) raw += chunk;
    return raw ? JSON.parse(raw) : {};
};

const normalizeEmail = (raw) => String(raw || '').trim().toLowerCase();

export async function handleAdminUsers(req, res, env = process.env) {
    const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        return json(res, 500, {
            error:
                'Supabase não configurado no servidor: defina SUPABASE_SERVICE_ROLE_KEY (e VITE_SUPABASE_URL) nas variáveis de ambiente.',
        });
    }

    const svc = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Autorização: só o administrador usa esta API ─────────────────────────
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return json(res, 401, { error: 'Não autenticado.' });

    const { data: userData, error: userErr } = await svc.auth.getUser(token);
    if (userErr || !userData?.user) return json(res, 401, { error: 'Sessão inválida ou expirada. Entre novamente.' });
    const caller = userData.user;

    const { data: callerProfile } = await svc
        .from('profiles')
        .select('role')
        .eq('id', caller.id)
        .maybeSingle();
    if (callerProfile?.role !== 'admin') {
        return json(res, 403, { error: 'Apenas o administrador pode gerenciar usuários.' });
    }

    try {
        // ── GET: lista usuários (perfil + empresa) ───────────────────────────
        if (req.method === 'GET') {
            const { data, error } = await svc
                .from('profiles')
                .select('id, email, name, role, created_at, company:companies(id, name, cnpj)')
                .order('created_at', { ascending: true });
            if (error) return json(res, 500, { error: error.message });
            return json(res, 200, { users: data || [] });
        }

        // ── POST: cria usuário no Auth + completa o perfil ───────────────────
        if (req.method === 'POST') {
            const body = await readBody(req);
            const email = normalizeEmail(body.email);
            const password = String(body.password || '');
            const name = String(body.name || '').trim() || null;
            const companyId = body.companyId || null;

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 400, { error: 'E-mail inválido.' });
            if (password.length < 8) return json(res, 400, { error: 'A senha deve ter pelo menos 8 caracteres.' });

            const { data: created, error } = await svc.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // sem fluxo de confirmação: o admin entrega a senha
                user_metadata: { name },
            });
            if (error) {
                const msg = /already.*registered|already exists/i.test(error.message)
                    ? 'Já existe um usuário com este e-mail.'
                    : error.message;
                return json(res, 400, { error: msg });
            }

            // O trigger handle_new_user já criou o perfil; completa nome/empresa.
            const { error: profErr } = await svc
                .from('profiles')
                .upsert({ id: created.user.id, email, name, company_id: companyId }, { onConflict: 'id' });
            if (profErr) return json(res, 500, { error: `Usuário criado, mas falhou ao gravar o perfil: ${profErr.message}` });

            return json(res, 200, { ok: true, id: created.user.id });
        }

        // ── PATCH: atualiza nome/empresa/senha ───────────────────────────────
        if (req.method === 'PATCH') {
            const body = await readBody(req);
            const id = String(body.id || '');
            if (!id) return json(res, 400, { error: 'Informe o usuário (id).' });

            if (body.password !== undefined) {
                const password = String(body.password || '');
                if (password.length < 8) return json(res, 400, { error: 'A senha deve ter pelo menos 8 caracteres.' });
                const { error } = await svc.auth.admin.updateUserById(id, { password });
                if (error) return json(res, 400, { error: `Falha ao redefinir a senha: ${error.message}` });
            }

            const patch = {};
            if (body.name !== undefined) patch.name = String(body.name || '').trim() || null;
            if (body.companyId !== undefined) patch.company_id = body.companyId || null;
            if (Object.keys(patch).length) {
                const { error } = await svc.from('profiles').update(patch).eq('id', id);
                if (error) return json(res, 400, { error: `Falha ao atualizar o perfil: ${error.message}` });
            }

            return json(res, 200, { ok: true });
        }

        // ── DELETE: exclui usuário do Auth (perfil sai em cascata) ───────────
        if (req.method === 'DELETE') {
            const body = await readBody(req);
            const id = String(body.id || '');
            if (!id) return json(res, 400, { error: 'Informe o usuário (id).' });
            if (id === caller.id) return json(res, 400, { error: 'Você não pode excluir o próprio usuário.' });

            const { error } = await svc.auth.admin.deleteUser(id);
            if (error) return json(res, 400, { error: `Falha ao excluir: ${error.message}` });
            return json(res, 200, { ok: true });
        }

        return json(res, 405, { error: `Método ${req.method} não suportado.` });
    } catch (err) {
        return json(res, 500, { error: String(err?.message || err) });
    }
}

export default handleAdminUsers;
