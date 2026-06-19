import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { getPlanTimeframe, savePlanTimeframe } from '../services/planTimeframeAPI';
import { autoMetaName } from '../services/sbtiTargetService';
import { cnpjScopedStorage } from '../../shared/decarbonizationStorage';

/**
 * Estado global da tela "Metas & Período".
 *
 * O PERÍODO do plano é o eixo temporal compartilhado (ano-base, ano mais
 * recente, horizonte/net-zero). Abaixo dele há uma LISTA DE METAS — cada meta
 * tem escopos, tipo, ambição, denominador (se intensidade), ano de submissão e
 * horizonte; a trajetória é derivada pelo `sbtiTargetService` (não persistida).
 *
 * As emissões do ano-base por escopo NÃO ficam aqui — são derivadas do
 * Inventário (fonte única, `inventory/`) pela tela.
 */

const DEFAULT_PARAMS = {
    baseYear: 2025,
    recentYear: 2025,
    // Horizonte do plano (net-zero como teto temporal; o alvo de longo prazo é por meta).
    netZeroYear: 2050,
    inventoryDone: true,
};

/**
 * Cria uma meta a partir de overrides, com nome automático (a menos que dado).
 * Cada meta tem seu ano de submissão e near-term (5–10 anos da submissão); a
 * meta de longo prazo (net-zero) é OPCIONAL (netZeroYear null por padrão).
 * @param {Object} overrides
 */
const makeMeta = (overrides = {}) => {
    const submissionYear = overrides.submissionYear ?? new Date().getFullYear();
    const base = {
        id: uuidv4(),
        scopes: { scope1: true, scope2: true, scope3: false },
        type: 'absoluta',
        denominatorDriverId: null,
        ambition: '1p5',
        submissionYear,
        nearTermYear: submissionYear + 5,
        netZeroYear: null,
        ...overrides,
    };
    return { ...base, name: overrides.name || autoMetaName(base), autoName: !overrides.name };
};

const usePlanTargetsStore = create(
    persist(
        (set, get) => ({
            params: { ...DEFAULT_PARAMS },
            metas: [],
            selectedMetaId: null,

            loading: false,
            saving: false,
            error: null,

            /** Carrega os parâmetros salvos do plano e semeia uma meta padrão. */
            loadPlanData: async () => {
                set({ loading: true, error: null });
                try {
                    const saved = await getPlanTimeframe();
                    set((state) => {
                        const params = saved?.params ? { ...state.params, ...saved.params } : state.params;
                        let { metas, selectedMetaId } = state;
                        if (saved?.metas?.length) metas = saved.metas;
                        else if (metas.length === 0) {
                            metas = [makeMeta({ scopes: { scope1: true, scope2: true, scope3: false } })];
                        }
                        if (!selectedMetaId || !metas.some((m) => m.id === selectedMetaId)) {
                            selectedMetaId = metas[0]?.id ?? null;
                        }
                        return { params, metas, selectedMetaId, loading: false };
                    });
                } catch (error) {
                    set({ loading: false, error: error?.message || 'Erro ao carregar dados do plano.' });
                    throw error;
                }
            },

            /** Atualiza um campo do período (eixo temporal compartilhado). */
            setParam: (field, value) => set((state) => ({ params: { ...state.params, [field]: value } })),

            selectMeta: (id) => set({ selectedMetaId: id }),

            /** Cria uma nova meta e a seleciona. */
            addMeta: (overrides = {}) => {
                const meta = makeMeta(overrides);
                set((state) => ({ metas: [...state.metas, meta], selectedMetaId: meta.id }));
                return meta.id;
            },

            /**
             * Template do padrão SBTi intersetorial: cria "Escopo 1+2 absoluta" e
             * "Escopo 3 absoluta" (substituindo as metas atuais).
             */
            applySbtiTemplate: () => {
                const e12 = makeMeta({ scopes: { scope1: true, scope2: true, scope3: false }, type: 'absoluta' });
                const e3 = makeMeta({ scopes: { scope1: false, scope2: false, scope3: true }, type: 'absoluta' });
                set({ metas: [e12, e3], selectedMetaId: e12.id });
            },

            /** Aplica patch a uma meta; reaplica nome automático se ainda não foi editado manualmente. */
            patchMeta: (id, patch) =>
                set((state) => ({
                    metas: state.metas.map((m) => {
                        if (m.id !== id) return m;
                        const next = { ...m, ...patch };
                        if ('name' in patch) {
                            next.autoName = false;
                        } else if (next.autoName) {
                            next.name = autoMetaName(next);
                        }
                        return next;
                    }),
                })),

            removeMeta: (id) =>
                set((state) => {
                    const metas = state.metas.filter((m) => m.id !== id);
                    const selectedMetaId = state.selectedMetaId === id ? metas[0]?.id ?? null : state.selectedMetaId;
                    return { metas, selectedMetaId };
                }),

            /** Restaura o estado para os padrões (usado ao trocar de empresa sem dados salvos). */
            resetState: () => set({ params: { ...DEFAULT_PARAMS }, metas: [], selectedMetaId: null, error: null }),

            /** Persiste período + metas (parâmetros, não o resultado derivado). */
            savePlan: async () => {
                set({ saving: true, error: null });
                try {
                    const saved = await savePlanTimeframe({ params: get().params, metas: get().metas });
                    if (saved?.params) set((state) => ({ params: { ...state.params, ...saved.params } }));
                    set({ saving: false });
                } catch (error) {
                    set({ saving: false, error: error?.message || 'Erro ao salvar o plano.' });
                    throw error;
                }
            },
        }),
        {
            name: 'decarbonization-plan-targets-store',
            storage: cnpjScopedStorage,
            partialize: (state) => ({ params: state.params, metas: state.metas, selectedMetaId: state.selectedMetaId }),
        }
    )
);

export default usePlanTargetsStore;
