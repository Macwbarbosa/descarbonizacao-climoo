import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

      /** Define a empresa ativa. company = { cnpj, company } */
      setSelectedCompany: (company) =>
        set((state) => ({ user: { ...state.user, selectedCompany: company } })),

      clearAuth: () => set({ user: { selectedCompany: null }, token: null }),
    }),
    {
      name: 'climoo-descarb-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

export default useAuthStore;
