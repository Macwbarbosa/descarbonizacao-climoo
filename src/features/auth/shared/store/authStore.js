import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, hasSupabase } from '@/lib/supabaseClient';

/**
 * authStore — autenticação REAL via Supabase Auth (e-mail + senha).
 * ------------------------------------------------------------------
 * Cada usuário tem um perfil em `profiles` (papel admin/user + empresa).
 * O isolamento entre empresas é garantido NO SERVIDOR pela RLS do Supabase
 * (ver supabase/schema.sql); este store só reflete a sessão no front:
 *
 *   - authEmail            e-mail da sessão autenticada
 *   - role                 'admin' | 'user'
 *   - profile              { id, email, name, role, company: {id, name, cnpj} }
 *   - user.selectedCompany { cnpj, company } — empresa ativa. Para usuário
 *                          comum é SEMPRE a empresa do perfil; o admin pode
 *                          trocar entre todas as empresas cadastradas.
 *   - ready                sessão restaurada (gate de carregamento do App)
 *
 * `token` e `clearAuth` existem para satisfazer `apiClientV2` (interceptors).
 */

const PROFILE_SELECT = 'id, email, name, role, can_edit_plan, company:companies(id, name, cnpj)';

const fetchProfile = async (userId) => {
    const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', userId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
};

let authListenerAttached = false;

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: { selectedCompany: null }, // { cnpj: string, company: string }
            token: null,
            authEmail: null,
            role: null,
            profile: null,
            ready: !hasSupabase, // sem Supabase não há sessão a restaurar

            /** Define a empresa ativa (só o admin troca). company = { cnpj, company } */
            setSelectedCompany: (company) =>
                set((state) => ({ user: { ...state.user, selectedCompany: company } })),

            /** Aplica sessão + perfil no store. Usuário comum fica preso à empresa do perfil. */
            applySession: async (session) => {
                let profile = null;
                try {
                    profile = await fetchProfile(session.user.id);
                } catch (e) {
                    profile = null; // sem perfil legível — segue só com o e-mail da sessão
                }
                const role = profile?.role || 'user';
                const company = profile?.company
                    ? { id: profile.company.id, cnpj: profile.company.cnpj, company: profile.company.name }
                    : null;
                set((state) => ({
                    authEmail: (profile?.email || session.user.email || '').toLowerCase(),
                    token: session.access_token,
                    role,
                    profile,
                    user: {
                        ...state.user,
                        // admin mantém a última empresa escolhida; usuário comum é
                        // SEMPRE re-apontado para a empresa do próprio perfil.
                        selectedCompany:
                            role === 'admin' ? state.user?.selectedCompany || company : company,
                    },
                }));
            },

            /** Restaura a sessão salva (chamado uma vez na montagem do App). */
            init: async () => {
                if (!hasSupabase) {
                    set({ ready: true });
                    return;
                }
                try {
                    const { data } = await supabase.auth.getSession();
                    if (data?.session) await get().applySession(data.session);
                    else set({ authEmail: null, role: null, profile: null, token: null });
                } catch (e) {
                    set({ authEmail: null, role: null, profile: null, token: null });
                } finally {
                    set({ ready: true });
                }
                if (!authListenerAttached) {
                    authListenerAttached = true;
                    supabase.auth.onAuthStateChange((event, session) => {
                        if (event === 'SIGNED_OUT') {
                            set({
                                authEmail: null,
                                role: null,
                                profile: null,
                                token: null,
                                user: { selectedCompany: null },
                            });
                        } else if (session) {
                            set({ token: session.access_token }); // refresh de token
                        }
                    });
                }
            },

            /**
             * Login com e-mail/senha no Supabase Auth.
             * @returns {Promise<{ ok: boolean, message?: string }>}
             */
            login: async (email, password) => {
                if (!hasSupabase) {
                    return {
                        ok: false,
                        message:
                            'Banco não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
                    };
                }
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: String(email || '').trim().toLowerCase(),
                    password: String(password || ''),
                });
                if (error) {
                    const message = /invalid login credentials/i.test(error.message)
                        ? 'E-mail ou senha inválidos.'
                        : `Falha no login: ${error.message}`;
                    return { ok: false, message };
                }
                await get().applySession(data.session);
                return { ok: true };
            },

            /** Encerra a sessão (os dados por CNPJ continuam no banco). */
            logout: async () => {
                if (hasSupabase) await supabase.auth.signOut().catch(() => {});
                set({
                    authEmail: null,
                    role: null,
                    profile: null,
                    token: null,
                    user: { selectedCompany: null },
                });
            },

            clearAuth: () =>
                set({
                    user: { selectedCompany: null },
                    token: null,
                    authEmail: null,
                    role: null,
                    profile: null,
                }),
        }),
        {
            name: 'climoo-descarb-auth',
            // Persistimos só a empresa ativa (conveniência do admin); a sessão em si
            // é do Supabase (restaurada em init()).
            partialize: (state) => ({ user: state.user }),
        }
    )
);

export default useAuthStore;
