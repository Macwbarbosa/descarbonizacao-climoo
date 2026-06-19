import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { getScenarios } from '../services/scenariosAPI';
import { cnpjScopedStorage } from '../../shared/decarbonizationStorage';

/**
 * Estado dos Cenários. Persistido por CNPJ (`cnpjScopedStorage`) e exportado no
 * JSON do módulo. Emissão/abatimento/gap são derivados (`utils/scenarioCalc`).
 */

const makeScenario = (overrides = {}) => ({ id: uuidv4(), name: 'Novo cenário', items: [], ...overrides });

const useScenariosStore = create(
    persist(
        (set, get) => ({
            scenarios: [],
            activeScenarioId: null,
            compare: false,
            loading: false,
            saving: false,
            error: null,

            loadScenarios: async () => {
                if (get().scenarios.length > 0) {
                    if (!get().activeScenarioId) set({ activeScenarioId: get().scenarios[0].id });
                    return;
                }
                set({ loading: true, error: null });
                try {
                    const scenarios = await getScenarios();
                    set({ scenarios, activeScenarioId: scenarios[0]?.id ?? null, loading: false });
                } catch (error) {
                    set({ loading: false, error: error?.message || 'Erro ao carregar cenários.' });
                    throw error;
                }
            },

            resetState: () => set({ scenarios: [], activeScenarioId: null, compare: false, error: null }),

            setActive: (id) => set({ activeScenarioId: id }),
            setCompare: (compare) => set({ compare }),

            addScenario: () => {
                const scenario = makeScenario();
                set((s) => ({ scenarios: [...s.scenarios, scenario], activeScenarioId: scenario.id }));
                return scenario.id;
            },
            patchScenario: (id, patch) =>
                set((s) => ({ scenarios: s.scenarios.map((sc) => (sc.id === id ? { ...sc, ...patch } : sc)) })),
            removeScenario: (id) =>
                set((s) => {
                    const scenarios = s.scenarios.filter((sc) => sc.id !== id);
                    const activeScenarioId = s.activeScenarioId === id ? scenarios[0]?.id ?? null : s.activeScenarioId;
                    return { scenarios, activeScenarioId };
                }),

            /** Atualiza um item (projeto) do cenário; cria se não existir. */
            upsertItem: (scenarioId, projetoId, patch) =>
                set((s) => ({
                    scenarios: s.scenarios.map((sc) => {
                        if (sc.id !== scenarioId) return sc;
                        const exists = sc.items.some((it) => it.projetoId === projetoId);
                        const items = exists
                            ? sc.items.map((it) => (it.projetoId === projetoId ? { ...it, ...patch } : it))
                            : [...sc.items, { projetoId, included: true, ...patch }];
                        return { ...sc, items };
                    }),
                })),

            removeItem: (scenarioId, projetoId) =>
                set((s) => ({
                    scenarios: s.scenarios.map((sc) =>
                        sc.id === scenarioId ? { ...sc, items: sc.items.filter((it) => it.projetoId !== projetoId) } : sc
                    ),
                })),
        }),
        {
            name: 'decarbonization-scenarios-store',
            storage: cnpjScopedStorage,
            partialize: (state) => ({ scenarios: state.scenarios, activeScenarioId: state.activeScenarioId }),
        }
    )
);

export default useScenariosStore;
