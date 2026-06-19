import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { getInitiativeBank, getProjects } from '../services/projectsAPI';
import { cnpjScopedStorage } from '../../shared/decarbonizationStorage';

/**
 * Estado dos Projetos de Descarbonização + Banco de Iniciativas.
 * Persistido por CNPJ (`cnpjScopedStorage`) e exportado no JSON do módulo.
 * O abatimento é derivado (`utils/projectAbatement`), não persistido.
 */

const makeProject = (overrides = {}) => ({
    id: uuidv4(),
    name: 'Novo projeto',
    initiativeId: null,
    memberActivityIds: [],
    startYear: overrides.startYear ?? 2026,
    endYear: overrides.endYear ?? 2035,
    coveragePoints: [],
    // Quantificação financeira POR PROJETO (a iniciativa traz só a eficácia).
    finance: { capex: 0, opex: 0, revenues: 0, savings: 0, currency: 'BRL', lifetimeYears: 10 },
    scenarioOverrides: {},
    ...overrides,
});

const makeInitiative = (overrides = {}) => ({
    id: uuidv4(),
    name: 'Nova iniciativa',
    description: '',
    fullDescription: '',
    efficacy: 50,
    applicability: { scopes: [], categories: [] },
    memorial: '',
    finance: { capex: 0, opex: 0, revenues: 0, savings: 0, currency: 'BRL', lifetimeYears: 10 },
    ...overrides,
});

const useProjectsStore = create(
    persist(
        (set, get) => ({
            projects: [],
            bank: [],
            selectedProjectId: null,
            loading: false,
            saving: false,
            error: null,

            /** Carrega banco e projetos (seed só quando ainda não há nada). */
            loadProjects: async () => {
                const hasData = get().projects.length > 0 || get().bank.length > 0;
                if (hasData) {
                    if (!get().selectedProjectId && get().projects[0]) set({ selectedProjectId: get().projects[0].id });
                    return;
                }
                set({ loading: true, error: null });
                try {
                    const [bank, projects] = await Promise.all([getInitiativeBank(), getProjects()]);
                    set({
                        bank,
                        projects,
                        selectedProjectId: projects[0]?.id ?? null,
                        loading: false,
                    });
                } catch (error) {
                    set({ loading: false, error: error?.message || 'Erro ao carregar projetos.' });
                    throw error;
                }
            },

            resetState: () => set({ projects: [], bank: [], selectedProjectId: null, error: null }),

            selectProject: (id) => set({ selectedProjectId: id }),

            addProject: () => {
                const project = makeProject();
                set((s) => ({ projects: [...s.projects, project], selectedProjectId: project.id }));
                return project.id;
            },

            patchProject: (id, patch) =>
                set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

            removeProject: (id) =>
                set((s) => {
                    const projects = s.projects.filter((p) => p.id !== id);
                    const selectedProjectId = s.selectedProjectId === id ? projects[0]?.id ?? null : s.selectedProjectId;
                    return { projects, selectedProjectId };
                }),

            /** Atribui uma atividade a um projeto (usado na Matriz de cobertura). */
            assignActivityToProject: (projectId, activityId) =>
                set((s) => ({
                    projects: s.projects.map((p) =>
                        p.id === projectId && !p.memberActivityIds.includes(activityId)
                            ? { ...p, memberActivityIds: [...p.memberActivityIds, activityId] }
                            : p
                    ),
                })),

            // Banco de iniciativas
            addInitiative: () => {
                const initiative = makeInitiative();
                set((s) => ({ bank: [...s.bank, initiative] }));
                return initiative.id;
            },
            patchInitiative: (id, patch) =>
                set((s) => ({ bank: s.bank.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
            removeInitiative: (id) => set((s) => ({ bank: s.bank.filter((i) => i.id !== id) })),

            saveAll: async () => {
                set({ saving: true, error: null });
                try {
                    set({ saving: false });
                } catch (error) {
                    set({ saving: false, error: error?.message || 'Erro ao salvar.' });
                    throw error;
                }
            },
        }),
        {
            name: 'decarbonization-projects-store',
            storage: cnpjScopedStorage,
            partialize: (state) => ({ projects: state.projects, bank: state.bank, selectedProjectId: state.selectedProjectId }),
        }
    )
);

export default useProjectsStore;
