/**
 * Função serverless da Vercel: /api/admin/users
 * Gestão de usuários (criar/listar/atualizar/excluir) — exclusiva do admin.
 * A lógica vive em api/_lib/adminUsers.js (compartilhada com o dev server).
 */
import { handleAdminUsers } from '../_lib/adminUsers.js';

export default function handler(req, res) {
    return handleAdminUsers(req, res, process.env);
}
