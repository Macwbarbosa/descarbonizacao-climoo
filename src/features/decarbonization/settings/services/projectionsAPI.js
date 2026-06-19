import apiClientV2 from '@/apis/apiClientV2';
import { useAuthStore } from '@/features/auth/shared/store/authStore';

// Função para obter headers de autenticação
const getAuthHeaders = () => {
    const selectedCompany = useAuthStore.getState().user?.selectedCompany;

    return {
        'cnpj': selectedCompany?.cnpj?.replace(/\D/g, '') || '',
        'year': '2022'
    };
};

const API_BASE_PATH = '/api/v0/decarbonization/projection-parameter/';

/**
 * Mapeamento de dados do backend para frontend
 */
const mapBackendToFrontend = (backendData) => ({
    id: backendData.id,
    name: backendData.name || backendData.parameter_name,
    comments: backendData.comments || backendData.description || '',
    values: backendData.values || backendData.yearly_values || {},
    createdAt: backendData.createdAt || backendData.created_at,
    updatedAt: backendData.updatedAt || backendData.updated_at || backendData.lastUpdated
});

/**
 * Mapeamento de dados do frontend para backend
 */
const mapFrontendToBackend = (frontendData) => ({
    name: frontendData.name,
    comments: frontendData.comments || '',
    values: frontendData.values || {}
});

/**
 * Buscar todos os parâmetros de projeção
 */
export const getProjectionParametersAPI = async () => {
    try {
        const headers = getAuthHeaders();

        const response = await apiClientV2.get(API_BASE_PATH, { headers });

        // Handle different response formats
        const data = response.data?.data || response.data || {};

        // Se for um array, mapear diretamente
        if (Array.isArray(data)) {
            return data.map(mapBackendToFrontend);
        }

        // Se for um objeto com IDs como chaves, converter para array
        if (typeof data === 'object' && data !== null) {
            const parametersArray = Object.values(data);
            return parametersArray.map(mapBackendToFrontend);
        }

        return [];
    } catch (error) {
        if (error.response?.status === 404) {
            // 404 significa que não há dados ainda, retornar array vazio
            return [];
        }
        throw error;
    }
};/**
 * Criar novo parâmetro de projeção
 */
export const createProjectionParameterAPI = async (parameterData) => {
    const headers = getAuthHeaders();

    const payload = mapFrontendToBackend(parameterData);

    const response = await apiClientV2.post(API_BASE_PATH, payload, { headers });

    const createdData = response.data?.data || response.data;
    return mapBackendToFrontend(createdData);
};

/**
 * Atualizar parâmetro de projeção existente
 */
export const updateProjectionParameterAPI = async (parameterId, parameterData) => {
    const headers = getAuthHeaders();

    const payload = {
        data: mapFrontendToBackend(parameterData),
        type: "projection_parameters",
        docId: parameterId
    };

    const response = await apiClientV2.patch(API_BASE_PATH, payload, { headers });

    const updatedData = response.data?.data || response.data;
    return mapBackendToFrontend(updatedData);
};

/**
 * Remover parâmetro de projeção
 */
export const deleteProjectionParameterAPI = async (parameterId) => {
    const headers = getAuthHeaders();

    await apiClientV2.delete(`${API_BASE_PATH}?parameter_id=${parameterId}`, { headers });

    return true;
};
