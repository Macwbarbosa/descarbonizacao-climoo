import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { getInventory } from '../services/inventoryAPI';
import { cnpjScopedStorage } from '../../shared/decarbonizationStorage';

/**
 * Inventário de emissões por atividade — FONTE ÚNICA (Metas/BAU/Cenários).
 * Persistido por CNPJ (`cnpjScopedStorage`) e exportado no JSON do módulo.
 */

const useInventoryStore = create(
    persist(
        (set, get) => ({
            activities: [],
            // Multi-ano: abas de ano. `years` = abas criadas explicitamente (inclui
            // anos vazios); o ano-base do plano é sempre uma aba. `activeYear` = aba ativa.
            years: [],
            activeYear: null,
            loading: false,
            saving: false,
            error: null,
            loaded: false,

            /** Carrega o inventário (seed só quando ainda não há nada). */
            loadInventory: async () => {
                if (get().loaded || get().activities.length > 0) {
                    set({ loaded: true });
                    return;
                }
                set({ loading: true, error: null });
                try {
                    const activities = await getInventory();
                    set({ activities, loading: false, loaded: true });
                } catch (error) {
                    set({ loading: false, error: error?.message || 'Erro ao carregar o inventário.' });
                    throw error;
                }
            },

            resetState: () => set({ activities: [], years: [], activeYear: null, error: null, loaded: false }),

            /** Aba de ano ativa (e garante que ela exista em `years`). */
            setActiveYear: (year) =>
                set((s) => ({ activeYear: year, years: s.years.includes(year) ? s.years : [...s.years, year] })),

            /** Cria uma aba de ano e a torna ativa. */
            addYear: (year) =>
                set((s) => ({ years: s.years.includes(year) ? s.years : [...s.years, year], activeYear: year })),

            /** Remove uma aba de ano e as atividades daquele ano. */
            removeYear: (year, baseYear) =>
                set((s) => {
                    const years = s.years.filter((y) => y !== year);
                    const activities = s.activities.filter((a) => (a.year ?? baseYear) !== year);
                    const activeYear = s.activeYear === year ? baseYear ?? years[0] ?? null : s.activeYear;
                    return { years, activities, activeYear };
                }),

            addActivity: (activity, year) =>
                set((s) => ({
                    activities: [
                        ...s.activities,
                        { id: uuidv4(), emission: 0, scope: 'Escopo 1', category: '—', name: '', ...(year != null ? { year } : {}), ...activity },
                    ],
                })),

            /** Adiciona várias atividades de uma vez (import/upload), marcando o ano. */
            addActivities: (list, year) =>
                set((s) => ({
                    activities: [...s.activities, ...(list || []).map((a) => (year != null && a.year == null ? { ...a, year } : a))],
                    years: year != null && !s.years.includes(year) ? [...s.years, year] : s.years,
                })),

            patchActivity: (id, patch) =>
                set((s) => ({ activities: s.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

            removeActivity: (id) => set((s) => ({ activities: s.activities.filter((a) => a.id !== id) })),

            /** Remove várias atividades por id (exclusão em massa). */
            removeActivities: (ids) => {
                const toRemove = new Set(ids || []);
                set((s) => ({ activities: s.activities.filter((a) => !toRemove.has(a.id)) }));
            },

            /** Esvazia o inventário de um ano (mantém a aba). */
            clearYear: (year, baseYear) =>
                set((s) => ({ activities: s.activities.filter((a) => (a.year ?? baseYear) !== year) })),

            clearActivities: () => set({ activities: [] }),
        }),
        {
            name: 'decarbonization-inventory-store',
            storage: cnpjScopedStorage,
            partialize: (state) => ({ activities: state.activities, years: state.years, activeYear: state.activeYear }),
        }
    )
);

export default useInventoryStore;
