import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { saveActivityLink } from '../services/bauAPI';
import useInventoryStore from '../../inventory/store/useInventoryStore';
import usePlanTargetsStore from '../../targets-timeframe/store/usePlanTargetsStore';
import { activitiesForYear } from '../../inventory/utils/inventoryAggregate';
import { cnpjScopedStorage } from '../../shared/decarbonizationStorage';

/**
 * Estado da Projeção BAU. As ATIVIDADES vêm do Inventário (fonte única); aqui
 * só persistimos o VÍNCULO editável por atividade (`links[id] = { driverId,
 * factor }`) e o ano-alvo. `activities` (em memória) = inventário + links.
 */

/** Vínculos padrão p/ o seed do inventário (demo pré-vinculada). */
const DEFAULT_LINKS = {
    'act-diesel': { driverId: 'equip', factor: 1 },
    'act-gasolina': { driverId: 'equip', factor: 1 },
    'act-gn': { driverId: 'prod', factor: 1 },
    'act-glp': { driverId: 'prod', factor: 1 },
    'act-proc': { driverId: 'prod', factor: 0.9 },
    'act-energia': { driverId: 'oper', factor: 1 },
    'act-log': { driverId: 'prod', factor: 1 },
    'act-viagens': { driverId: 'team', factor: 1 },
    'act-compras': { driverId: 'rec', factor: 0.8 },
    'act-embalagens': { driverId: 'prod', factor: 1 },
};

const useBauStore = create(
    persist(
        (set, get) => ({
            activities: [], // em memória: inventário + vínculos
            links: {}, // { [activityId]: { driverId, factor } } — persistido
            targetYear: 2030,
            loading: false,
            saving: false,
            error: null,

            /** Carrega atividades do Inventário (fonte única) e sobrepõe os vínculos. */
            loadActivities: async () => {
                set({ loading: true, error: null });
                try {
                    await useInventoryStore.getState().loadInventory();
                    // Só o inventário do ANO-BASE do plano alimenta o BAU.
                    const baseYear = usePlanTargetsStore.getState().params?.baseYear;
                    const inventory = activitiesForYear(useInventoryStore.getState().activities, baseYear, baseYear);
                    let { links } = get();
                    // Semeia vínculos da demo se ainda não há nenhum vínculo salvo.
                    if (Object.keys(links).length === 0) {
                        links = {};
                        inventory.forEach((a) => {
                            if (DEFAULT_LINKS[a.id]) links[a.id] = { ...DEFAULT_LINKS[a.id] };
                        });
                    }
                    const activities = inventory.map((a) => ({
                        ...a,
                        baseEmission: Number(a.emission) || 0,
                        driverId: links[a.id]?.driverId ?? null,
                        factor: links[a.id]?.factor ?? 1,
                    }));
                    set({ activities, links, loading: false });
                } catch (error) {
                    set({ loading: false, error: error?.message || 'Erro ao carregar as atividades.' });
                    throw error;
                }
            },

            setTargetYear: (year) => set({ targetYear: year }),

            resetState: () => set({ activities: [], links: {}, targetYear: 2030, error: null }),

            /** Atualiza um vínculo (driver e/ou fator) de uma atividade. */
            updateLink: (activityId, patch) =>
                set((state) => {
                    const activities = state.activities.map((a) => (a.id === activityId ? { ...a, ...patch } : a));
                    const current = activities.find((a) => a.id === activityId);
                    return {
                        activities,
                        links: { ...state.links, [activityId]: { driverId: current.driverId, factor: current.factor } },
                    };
                }),

            setDriver: (activityId, driverId) => get().updateLink(activityId, { driverId: driverId || null }),
            setFactor: (activityId, factor) => get().updateLink(activityId, { factor: Number(factor) || 0 }),

            /**
             * Aplica vínculos em massa (upload de planilha). `entries` = lista de
             * `{ activityId, driverId, factor }` — só atualiza atividades existentes.
             * @returns {number} quantas atividades foram atualizadas.
             */
            applyLinks: (entries) => {
                let applied = 0;
                set((state) => {
                    const byId = Object.fromEntries((entries || []).map((e) => [e.activityId, e]));
                    const links = { ...state.links };
                    const activities = state.activities.map((a) => {
                        const e = byId[a.id];
                        if (!e) return a;
                        applied += 1;
                        const next = {
                            ...a,
                            driverId: e.driverId || null,
                            factor: e.factor == null ? a.factor : Number(e.factor) || 0,
                        };
                        links[a.id] = { driverId: next.driverId, factor: next.factor };
                        return next;
                    });
                    return { activities, links };
                });
                return applied;
            },

            /** Atribuição em massa: aplica um driver a todas as atividades de uma categoria. */
            bulkAssignCategory: (scope, category, driverId) =>
                set((state) => {
                    const links = { ...state.links };
                    const activities = state.activities.map((a) => {
                        if (a.scope !== scope || a.category !== category) return a;
                        const next = { ...a, driverId: driverId || null };
                        links[a.id] = { driverId: next.driverId, factor: next.factor };
                        return next;
                    });
                    return { activities, links };
                }),

            /** Persiste os vínculos (driver + fator) de todas as atividades. */
            saveLinks: async () => {
                set({ saving: true, error: null });
                try {
                    await Promise.all(
                        get().activities.map((a) => saveActivityLink(a.id, { driverId: a.driverId, factor: a.factor }))
                    );
                    set({ saving: false });
                } catch (error) {
                    set({ saving: false, error: error?.message || 'Erro ao salvar os vínculos.' });
                    throw error;
                }
            },
        }),
        {
            name: 'decarbonization-bau-store',
            storage: cnpjScopedStorage,
            partialize: (state) => ({ targetYear: state.targetYear, links: state.links }),
        }
    )
);

export default useBauStore;
