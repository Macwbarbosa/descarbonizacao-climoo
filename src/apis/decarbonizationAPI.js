import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/features/auth/shared/store/authStore';
import apiClientV2 from './apiClientV2';

// Base endpoints
const SCENARIOS_ENDPOINT = '/api/v0/decarbonization/scenario/';
const INITIATIVES_ENDPOINT = '/api/v0/decarbonization/initiative/';

// Helper functions
const getSelectedYear = () => useUIStore.getState().selectedYear;
const getSelectedCompany = () => useAuthStore.getState().user.selectedCompany;

const getBaseConfig = (params = {}) => ({
    headers: {
        'cnpj': getSelectedCompany().cnpj.replace(/\D/g, ''),
        'year': getSelectedYear(),
    },
    params
});

export const scenarioAPI = {
    // GET - Buscar todos os cenários
    getScenarios: async () => {
        const response = await apiClientV2.get(SCENARIOS_ENDPOINT, getBaseConfig());

        // Converter o objeto recebido em array
        const scenariosObj = response.data || {};
        const scenariosArray = Object.entries(scenariosObj).map(([id, scenario]) => ({
            id,
            ...scenario,
            key: id // Para o Ant Design Table
        }));

        return scenariosArray;
    },

    // POST - Criar novo cenário
    createScenario: async (scenarioData) => {
        const payload = {
            name: scenarioData.name,
            description: scenarioData.description || '',
            isActive: scenarioData.isActive ?? true,
            createdAt: Math.floor(Date.now() / 1000),
            lastUpdated: Math.floor(Date.now() / 1000),
            enabled: true
        };

        const response = await apiClientV2.post(SCENARIOS_ENDPOINT, payload, getBaseConfig());
        return response.data;
    },

    // PATCH - Atualizar cenário
    updateScenario: async (scenarioId, scenarioData) => {
        const payload = {
            data: {
                name: scenarioData.name,
                description: scenarioData.description || '',
                isActive: scenarioData.isActive ?? true,
                lastUpdated: Math.floor(Date.now() / 1000)
            },
            type: 'scenarios',
            docId: scenarioId
        };

        const response = await apiClientV2.patch(SCENARIOS_ENDPOINT, payload, getBaseConfig());
        return response.data;
    },

    // DELETE - Excluir cenário
    deleteScenario: async (scenarioId) => {
        const response = await apiClientV2.delete(`${SCENARIOS_ENDPOINT}?scenario_id=${scenarioId}`, getBaseConfig());
        return response.data;
    }
};

export const initiativeAPI = {
    // GET - Buscar todas as iniciativas
    getInitiatives: async () => {
        try {
            const response = await apiClientV2.get(INITIATIVES_ENDPOINT, getBaseConfig());

            // Converter o objeto recebido em array
            const initiativesObj = response.data || {};
            const initiativesArray = Object.entries(initiativesObj).map(([id, initiative]) => ({
                id,
                ...initiative,
                key: id // Para o Ant Design Table
            }));

            return initiativesArray;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('🔧 Erro na API getInitiatives:', error);
            throw error;
        }
    },

    // POST - Criar nova iniciativa
    createInitiative: async (initiativeData) => {
        const sanitizeTasks = (tasks = []) => tasks.map((task) => {
            const clean = {};
            Object.entries(task || {}).forEach(([k, v]) => {
                if (v !== undefined) clean[k] = v;
            });
            return clean;
        });

        const payload = {
            scenarioId: initiativeData.scenarioId,
            title: initiativeData.title,
            description: initiativeData.description || '',
            projectType: initiativeData.projectType || '',
            associatedGoal: initiativeData.associatedGoal || '',
            scope: initiativeData.scope || '',
            category: initiativeData.category || '',
            activities: initiativeData.activities || [],
            technology: initiativeData.technology || '',
            responsible: initiativeData.responsible || '',
            startDate: initiativeData.startDate ?? null,
            endDate: initiativeData.endDate ?? null,
            coverage: initiativeData.coverage || {},
            tasks: sanitizeTasks(initiativeData.tasks),
            investment: {
                totalAmount: initiativeData.investment?.totalAmount || 0,
                currency: initiativeData.investment?.currency || 'BRL',
                type: initiativeData.investment?.type || '',
                year: initiativeData.investment?.year || new Date().getFullYear(),
                description: initiativeData.investment?.description || '',
                breakdown: initiativeData.investment?.breakdown || []
            },
            createdAt: Math.floor(Date.now() / 1000),
            lastUpdated: Math.floor(Date.now() / 1000),
            enabled: true
        };

        try {
            const response = await apiClientV2.post(INITIATIVES_ENDPOINT, payload, getBaseConfig());
            return response.data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('🛑 createInitiative payload:', payload);
            // eslint-disable-next-line no-console
            console.error('🛑 createInitiative response:', error?.response?.data);
            throw error;
        }
    },

    // PATCH - Atualizar iniciativa
    updateInitiative: async (initiativeId, initiativeData) => {
        const sanitizeTasks = (tasks = []) => tasks.map((task) => {
            const clean = {};
            Object.entries(task || {}).forEach(([k, v]) => {
                if (v !== undefined) clean[k] = v;
            });
            return clean;
        });

        const payload = {
            data: {
                scenarioId: initiativeData.scenarioId,
                title: initiativeData.title,
                description: initiativeData.description || '',
                projectType: initiativeData.projectType || '',
                associatedGoal: initiativeData.associatedGoal || '',
                scope: initiativeData.scope || '',
                category: initiativeData.category || '',
                activities: initiativeData.activities || [],
                technology: initiativeData.technology || '',
                responsible: initiativeData.responsible || '',
                startDate: initiativeData.startDate ?? null,
                endDate: initiativeData.endDate ?? null,
                coverage: initiativeData.coverage || {},
                tasks: sanitizeTasks(initiativeData.tasks),
                investment: {
                    totalAmount: initiativeData.investment?.totalAmount || 0,
                    currency: initiativeData.investment?.currency || 'BRL',
                    type: initiativeData.investment?.type || '',
                    year: initiativeData.investment?.year || new Date().getFullYear(),
                    description: initiativeData.investment?.description || '',
                    breakdown: initiativeData.investment?.breakdown || []
                },
                lastUpdated: Math.floor(Date.now() / 1000)
            },
            type: 'initiatives',
            docId: initiativeId
        };

        try {
            const response = await apiClientV2.patch(INITIATIVES_ENDPOINT, payload, getBaseConfig());
            return response.data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('🛑 updateInitiative payload:', payload);
            // eslint-disable-next-line no-console
            console.error('🛑 updateInitiative response:', error?.response?.data);
            throw error;
        }
    },

    // DELETE - Excluir iniciativa
    deleteInitiative: async (initiativeId) => {
        const response = await apiClientV2.delete(`${INITIATIVES_ENDPOINT}?initiative_id=${initiativeId}`, getBaseConfig());
        return response.data;
    }
};

export default {
    scenarioAPI,
    initiativeAPI
};
