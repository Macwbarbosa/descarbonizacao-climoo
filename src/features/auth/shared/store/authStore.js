import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { checkCredentials } from '../credentials';

/**
 * authStore (shim standalone)
 * ---------------------------
 * Na plataforma Climoo este store é populado pelo login e expõe a empresa
 * selecionada. Aqui, na ferramenta isolada, ele guarda apenas a empresa/CNPJ
 * ativos — que é tudo que o módulo de Descarbonização consome:
 *
 *   - useAuthStore.getState().user?.selectedCompany?.cnpj
 *   - useAuthStore.getState().user?.selectedCompany?.company
 *   - reativo: useAuthStore((s) => s.user?.selectedCompany?.company / .cnpj)
 *
 * `token` e `clearAuth` existem só para satisfazer `apiClientV2` (interceptors).
 * A persistência por CNPJ dos dados continua em `decarbonizationStorage`
 * (localStorage) + `decarbonization-data/<cnpj>.json` (dev middleware).
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      user: { selectedCompany: null }, // { cnpj: string, company: string }
      token: null,
      authEmail: null, // e-mail logado no gate de acesso (login "fake")

      /** Define a empresa ativa. company = { cnpj, company } */
      setSelectedCompany: (company) =>
        set((state) => ({ user: { ...state.user, selectedCompany: company } })),

      /**
       * Valida o login do gate de acesso. Retorna `true` se autenticou.
       * @param {string} email
       * @param {string} password
       */
      login: (email, password) => {
        const ok = checkCredentials(email, password);
        if (ok) set({ authEmail: ok });
        return Boolean(ok);
      },

      /** Sai do gate de acesso (mantém os dados por CNPJ no localStorage). */
      logout: () => set({ authEmail: null }),

      clearAuth: () => set({ user: { selectedCompany: null }, token: null, authEmail: null }),
    }),
    {
      name: 'climoo-descarb-auth',
      partialize: (state) => ({ user: state.user, authEmail: state.authEmail }),
    }
  )
);

export default useAuthStore;
