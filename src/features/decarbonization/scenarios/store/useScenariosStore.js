import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { getScenarios } from '../services/scenariosAPI';
import { cnpjScopedStorage } from '../../shared/decarbonizationStorage';

/**
 * Estado dos Cenários. Persistido por CNPJ (`cnpjScopedStorage`) e exportado no
 * JSON do módulo. Emissão/abatimento/gap são derivados (`utils/scenarioCalc`).
 */

// Cada cenário pertence a UMA meta (metaId). Trocou a meta → vê só os seus cenários.
const makeScenario = (overrides = {}) => ({ id: uuidv4(), name: 'Novo cenário', metaId: null, items: [], ...overrides });

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

            addScenario: (metaId = null) => {
                const scenario = makeScenario({ metaId });
                set((s) => ({ scenarios: [...s.scenarios, scenario], activeScenarioId: scenario.id }));
                return scenario.id;
            },
            patchScenario: (id, patch) =>
                set((s) => ({ scenarios: s.scenarios.map((sc) => (sc.id === id ? { ...sc, ...patch } : sc)) })),
            removeScenario: (id) =>
                set((s) => {
                    const removed = s.scenarios.find((sc) => sc.id === id);
                    const scenarios = s.scenarios.filter((sc) => sc.id !== id);
                    let activeScenarioId = s.activeScenarioId;
                    if (s.activeScenarioId === id) {
                        // Escolhe o próximo da MESMA meta (não vaza para outra meta).
                        const sameMeta = scenarios.filter((sc) => sc.metaId === removed?.metaId);
                        activeScenarioId = sameMeta[0]?.id ?? scenarios[0]?.id ?? null;
                    }
                    return { scenarios, activeScenarioId };
                }),

            /** Migração one-shot: vincula cenários sem meta à meta informada. */
            assignOrphanScenarios: (metaId) => {
                if (!metaId || !get().scenarios.some((sc) => !sc.metaId)) return;
                set((s) => ({ scenarios: s.scenarios.map((sc) => (sc.metaId ? sc : { ...sc, metaId })) }));
            },

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
