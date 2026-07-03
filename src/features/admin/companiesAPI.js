/**
 * companiesAPI — CRUD de empresas direto no Supabase (tabela `companies`).
 * A RLS só permite escrita ao administrador; usuários comuns leem apenas a
 * própria empresa.
 */
import { supabase, hasSupabase } from '@/lib/supabaseClient';

const NOT_CONFIGURED = 'Banco não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).';

export const onlyDigits = (raw) => String(raw || '').replace(/\D/g, '');

/**
 * Lista os usuários vinculados a uma empresa. Funciona tanto para o admin
 * quanto para membros da própria empresa (a RLS de `profiles` libera colegas
 * da mesma empresa). Retorna [] em caso de falha.
 */
export const listCompanyUsers = async (companyId) => {
    if (!hasSupabase || !companyId) return [];
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, role, can_edit_plan')
        .eq('company_id', companyId)
        .order('name', { ascending: true });
    if (error) return [];
    return data || [];
};

/** Lista todas as empresas visíveis ao usuário (admin vê todas). */
export const listCompanies = async () => {
    if (!hasSupabase) throw new Error(NOT_CONFIGURED);
    const { data, error } = await supabase
        .from('companies')
        .select('id, name, cnpj, created_at')
        .order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
};

/** Cria uma empresa (admin). */
export const createCompany = async ({ name, cnpj }) => {
    if (!hasSupabase) throw new Error(NOT_CONFIGURED);
    const digits = onlyDigits(cnpj);
    if (digits.length !== 14) throw new Error('CNPJ deve ter 14 dígitos.');
    const { data, error } = await supabase
        .from('companies')
        .insert({ name: String(name || '').trim(), cnpj: digits })
        .select('id, name, cnpj')
        .single();
    if (error) {
        if (/duplicate|unique/i.test(error.message)) throw new Error('Já existe uma empresa com este CNPJ.');
        throw new Error(error.message);
    }
    return data;
};

/** Atualiza nome/CNPJ de uma empresa (admin). */
export const updateCompany = async (id, { name, cnpj }) => {
    if (!hasSupabase) throw new Error(NOT_CONFIGURED);
    const patch = {};
    if (name !== undefined) patch.name = String(name || '').trim();
    if (cnpj !== undefined) {
        const digits = onlyDigits(cnpj);
        if (digits.length !== 14) throw new Error('CNPJ deve ter 14 dígitos.');
        patch.cnpj = digits;
    }
    const { error } = await supabase.from('companies').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
    return true;
};

/**
 * Exclui uma empresa (admin). Os usuários vinculados ficam sem empresa (a RLS
 * bloqueia o acesso deles) e os dados do plano permanecem no banco, por CNPJ.
 */
export const deleteCompany = async (id) => {
    if (!hasSupabase) throw new Error(NOT_CONFIGURED);
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
};

export default { listCompanies, listCompanyUsers, createCompany, updateCompany, deleteCompany, onlyDigits };
