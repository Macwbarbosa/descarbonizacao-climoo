import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import usePlanTargetsStore from '../../targets-timeframe/store/usePlanTargetsStore';
import { getDrivers, createDriver, updateDriver, deleteDriver } from '../services/driversAPI';
import { cnpjScopedStorage } from '../../shared/decarbonizationStorage';

/**
 * Estado global das Variáveis de Crescimento (drivers).
 *
 * Modelo nível EMPRESA, mas estruturado para suportar multi-site no futuro
 * (cada driver tem `siteId` opcional — não usado agora). Edição ao vivo: as
 * alterações atualizam o modelo imediatamente; a persistência é feita via
 * `savePlan`/CRUD nos serviços.
 *
 * O ano-base do horizonte vem da tela Metas & Período (fonte única).
 */

/** Cria um driver em branco coerente com o horizonte do plano. */
const makeBlankDriver = (baseYear, endYear) => ({
    id: uuidv4(),
    name: 'Novo driver',
    unit: '',
    type: 'Físico',
    note: '',
    baseValue: 0,
    method: 'period',
    avgRate: 3,
    segments: [{ from: baseYear, to: endYear, g: 3 }],
    yearly: {},
    history: {},
    usedBy: [],
    siteId: null,
});

const useDriversStore = create(
    persist(
        (set, get) => ({
            drivers: [],
            selectedId: null,
            loading: false,
            saving: false,
            error: null,

            /**
             * Carrega drivers. Não sobrescreve edições locais já persistidas:
             * só busca o seed do serviço quando ainda não há nenhum driver.
             */
            loadDrivers: async () => {
                if (get().drivers.length > 0) {
                    if (!get().selectedId) set({ selectedId: get().drivers[0].id });
                    return;
                }
                set({ loading: true, error: null });
                try {
                    const drivers = await getDrivers();
                    set({
                        drivers,
                        selectedId: drivers.length > 0 ? drivers[0].id : null,
                        loading: false,
                    });
                } catch (error) {
                    set({ loading: false, error: error?.message || 'Erro ao carregar variáveis de crescimento.' });
                    throw error;
                }
            },

            /** Seleciona o driver exibido no detalhe. */
            selectDriver: (id) => set({ selectedId: id }),

            /** Cria um novo driver em branco e o seleciona. */
            addDriver: () => {
                const { baseYear, netZeroYear } = usePlanTargetsStore.getState().params;
                const driver = makeBlankDriver(baseYear, netZeroYear);
                set((state) => ({ drivers: [...state.drivers, driver], selectedId: driver.id }));
                createDriver(driver).catch(() => {
                    /* persistência best-effort; estado local é a fonte ativa (stub) */
                });
                return driver.id;
            },

            /**
             * Aplica um patch parcial ao driver (edição ao vivo).
             * @param {string} id
             * @param {Partial<import('../utils/driverIndex').Driver>} patch
             */
            patchDriver: (id, patch) =>
                set((state) => ({
                    drivers: state.drivers.map((d) => (d.id === id ? { ...d, ...patch } : d)),
                })),

            /** Remove um driver. */
            removeDriver: (id) => {
                set((state) => {
                    const drivers = state.drivers.filter((d) => d.id !== id);
                    const selectedId = state.selectedId === id ? drivers[0]?.id ?? null : state.selectedId;
                    return { drivers, selectedId };
                });
                deleteDriver(id).catch(() => {});
            },

            /** Restaura o estado para o inicial (usado ao trocar de empresa sem dados salvos). */
            resetState: () => set({ drivers: [], selectedId: null, error: null }),

            /** Persiste todos os drivers (parâmetros do método, não o índice). */
            savePlan: async () => {
                set({ saving: true, error: null });
                try {
                    await Promise.all(get().drivers.map((d) => updateDriver(d.id, d)));
                    set({ saving: false });
                } catch (error) {
                    set({ saving: false, error: error?.message || 'Erro ao salvar variáveis de crescimento.' });
                    throw error;
                }
            },
        }),
        {
            name: 'decarbonization-drivers-store',
            storage: cnpjScopedStorage,
            partialize: (state) => ({ drivers: state.drivers, selectedId: state.selectedId }),
        }
    )
);

export default useDriversStore;
