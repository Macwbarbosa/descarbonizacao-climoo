import apiClientV2 from '@/apis/apiClientV2';
import { useAuthStore } from '@/features/auth/shared/store/authStore';

const getSelectedCompany = () => useAuthStore.getState().user.selectedCompany;

const getBaseConfig = (params = {}) => ({
    headers: {
        'cnpj': getSelectedCompany().cnpj.replace(/\D/g, ''),
        'year': '2022'
    },
    params
});

/**
 * Mapeia dados do backend para o formato do frontend
 * @param {Object} backendData - Dados no formato do backend
 * @returns {Object} Dados no formato do frontend
 */
const mapBackendToFrontend = (backendData) => {
    if (!backendData) return null;

    return {
        id: backendData.id || backendData.goal_id,
        goalName: backendData.goalName || backendData.goal_name,
        timeframe: backendData.timeframe,
        goalType: backendData.goalType || backendData.goal_type,
        scope: backendData.scope,
        baseYear: backendData.baseYear || backendData.base_year,
        targetYear: backendData.targetYear || backendData.target_year,
        sector: backendData.sector,
        reductionValue: backendData.reductionValue || backendData.reduction_value,
        enabled: backendData.enabled,
        createdAt: backendData.createdAt || backendData.created_at,
        updatedAt: backendData.updatedAt || backendData.updated_at
    };
};

/**
 * Converte objeto de metas (com IDs como chaves) em array
 * @param {Object} goalsObject - Objeto com IDs como chaves e metas como valores
 * @returns {Array} Array de metas no formato do frontend
 */
const convertGoalsObjectToArray = (goalsObject) => {
    if (!goalsObject || typeof goalsObject !== 'object') return [];

    return Object.values(goalsObject).map(goal => mapBackendToFrontend(goal));
};

/**
 * Mapeia lista de dados do backend para o formato do frontend
 * @param {Array|Object} backendData - Lista ou objeto de dados no formato do backend
 * @returns {Array} Lista de dados no formato do frontend
 */
export const mapBackendListToFrontend = (backendData) => {
    if (Array.isArray(backendData)) {
        return backendData.map(mapBackendToFrontend);
    }
    if (backendData && typeof backendData === 'object') {
        return convertGoalsObjectToArray(backendData);
    }
    return [];
};

export const getReductionGoals = async (goalId = null, variables = null) => {
    try {
        const params = {};
        if (goalId) params.goal_id = goalId;
        if (variables) params.variables = variables;

        const response = await apiClientV2.get('/api/v0/decarbonization/reduction-goal/', getBaseConfig(params));

        // A API retorna um objeto com IDs como chaves e metas como valores
        return mapBackendListToFrontend(response.data || {});
    } catch (error) {
        // 404 significa que não existem metas cadastradas, não é um erro
        if (error.response && error.response.status === 404) {
            return [];
        }
        // Para outros erros, relançar a exceção
        throw error;
    }
};

export const createReductionGoal = async (goalData) => {
    // Mapear dados do frontend para o formato esperado pelo backend
    const backendData = {
        goalName: goalData.goalName,
        timeframe: goalData.timeframe,
        goalType: goalData.goalType,
        scope: goalData.scope,
        baseYear: goalData.baseYear,
        targetYear: goalData.targetYear,
        sector: goalData.sector,
        reductionValue: goalData.reductionValue
    };

    const response = await apiClientV2.post('/api/v0/decarbonization/reduction-goal/', backendData, getBaseConfig());

    // A resposta do POST pode vir em diferentes formatos
    // Se for um objeto com ID como chave, extrair o valor
    if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        // Se tem um ID como propriedade direta, usar diretamente
        if (response.data.id) {
            return mapBackendToFrontend(response.data);
        }
        // Se é um objeto com IDs como chaves, pegar o primeiro valor
        const keys = Object.keys(response.data);
        if (keys.length > 0) {
            return mapBackendToFrontend(response.data[keys[0]]);
        }
    }

    // Fallback para formato direto
    return mapBackendToFrontend(response.data);
};

export const updateReductionGoal = async (goalId, goalData) => {
    // Mapear dados do frontend para o formato esperado pelo backend na edição
    const dataPayload = {
        goalName: goalData.goalName,
        timeframe: goalData.timeframe,
        goalType: goalData.goalType,
        scope: goalData.scope,
        baseYear: goalData.baseYear,
        targetYear: goalData.targetYear,
        sector: goalData.sector,
        reductionValue: goalData.reductionValue
    };

    // Formato específico para PATCH/edição
    const backendData = {
        data: dataPayload,
        type: "reduction_goals",
        docId: goalId
    };

    const response = await apiClientV2.patch('/api/v0/decarbonization/reduction-goal/', backendData, getBaseConfig({
        goal_id: goalId
    }));

    // A resposta do PATCH pode vir em diferentes formatos
    // Se for um objeto com ID como chave, extrair o valor
    if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        // Se tem um ID como propriedade direta, usar diretamente
        if (response.data.id) {
            return mapBackendToFrontend(response.data);
        }
        // Se é um objeto com IDs como chaves, pegar o primeiro valor
        const keys = Object.keys(response.data);
        if (keys.length > 0) {
            return mapBackendToFrontend(response.data[keys[0]]);
        }
    }

    // Fallback para formato direto
    return mapBackendToFrontend(response.data);
};

export const deleteReductionGoal = async (goalId) => {
    await apiClientV2.delete('/api/v0/decarbonization/reduction-goal/', getBaseConfig({
        goal_id: goalId
    }));
    return true;
};
