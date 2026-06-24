/**
 * Credenciais do gate de acesso (login "fake", client-side).
 * -----------------------------------------------------------
 * ATENÇÃO: isto NÃO é segurança real — as credenciais ficam no bundle do
 * navegador e servem apenas para restringir o acesso casual à demonstração.
 * Para autenticação de verdade, use o Supabase Auth.
 *
 * Para alterar: edite a lista de e-mails e/ou a senha abaixo.
 */

/** E-mails autorizados (comparação sem distinção de maiúsculas/espaços). */
export const ALLOWED_EMAILS = [
    'psleal@mills.com.br',
    'monique.cesila@mills.com.br',
    'mac@climoo.com.br',
];

/** Senha compartilhada por todos os e-mails autorizados. */
export const SHARED_PASSWORD = 'climoo2026';

/** Valida um par e-mail/senha contra a lista autorizada. */
export const checkCredentials = (email, password) => {
    const normalized = String(email || '').trim().toLowerCase();
    const ok = ALLOWED_EMAILS.includes(normalized) && password === SHARED_PASSWORD;
    return ok ? normalized : null;
};
