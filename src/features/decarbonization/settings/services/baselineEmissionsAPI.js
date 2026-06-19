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

/**
 * Buscar todos os itens de emissões baseline
 * @param {Object} filters - Filtros opcionais
 * @param {string} filters.scope - Filtro por escopo
 * @param {string} filters.category - Filtro por categoria  
 * @param {string} filters.activity - Filtro por atividade
 * @returns {Promise<Array>} Lista de itens de emissões
 */
export const getBaselineEmissions = async (filters = {}) => {
    try {
        const headers = getAuthHeaders();

        // Construir query parameters
        const queryParams = new URLSearchParams();
        if (filters.scope) queryParams.append('scope', filters.scope);
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.activity) queryParams.append('activity', filters.activity);

        const queryString = queryParams.toString();
        const url = `/api/v0/decarbonization/baseline-emission/${queryString ? `?${queryString}` : ''}`;

        const response = await apiClientV2.get(url, { headers });

        // Verificar se response.data existe
        if (response?.data) {
            // Se response.data é um array, retornar diretamente
            if (Array.isArray(response.data)) {
                return response.data;
            }

            // Se response.data é um objeto com propriedade data que é array
            if (response.data.data && Array.isArray(response.data.data)) {
                return response.data.data;
            }

            // Se response.data é um objeto onde as chaves são IDs (como retornado pela API)
            if (typeof response.data === 'object' && !Array.isArray(response.data)) {
                // Converter objeto em array de valores
                const dataArray = Object.values(response.data);

                // Se os valores são objetos com estrutura de emissão, retornar array
                if (dataArray.length > 0 && typeof dataArray[0] === 'object' && dataArray[0].scope) {
                    return dataArray;
                }

                // Se response.data é um objeto com outras propriedades que contêm arrays
                const possibleDataKeys = ['items', 'results', 'emissions', 'baseline_emissions'];
                for (const key of possibleDataKeys) {
                    if (response.data[key] && Array.isArray(response.data[key])) {
                        return response.data[key];
                    }
                }
            }
        }

        // Se nenhum formato conhecido foi encontrado, retornar array vazio
        return [];

    } catch (error) {
        // Se for erro 404, retornar array vazio (nenhuma emissão cadastrada ainda)
        if (error.response?.status === 404) {
            return [];
        }

        throw new Error(error.response?.data?.message || 'Erro ao carregar emissões baseline');
    }
};

/**
 * Criar novo item de emissão baseline
 * @param {Object} emissionData - Dados da emissão
 * @param {string} emissionData.scope - Escopo das emissões
 * @param {string} emissionData.category - Categoria das emissões
 * @param {string} emissionData.activity - Descrição da atividade
 * @param {number} emissionData.emission - Valor da emissão em tCO2e
 * @param {string|null} emissionData.goal - ID da meta associada
 * @param {string|null} emissionData.anchorage - ID do parâmetro de projeção
 * @returns {Promise<Object>} Emissão criada
 */
export const createBaselineEmission = async (emissionData) => {
    try {
        const headers = getAuthHeaders();

        const response = await apiClientV2.post(
            '/api/v0/decarbonization/baseline-emission/',
            emissionData,
            { headers }
        );

        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Erro ao criar emissão baseline');
    }
};

/**
 * Atualizar item de emissão baseline existente
 * @param {string|number} emissionId - ID da emissão
 * @param {Object} emissionData - Dados atualizados da emissão
 * @returns {Promise<Object>} Emissão atualizada
 */
export const updateBaselineEmission = async (emissionId, emissionData) => {
    try {
        const headers = getAuthHeaders();

        const payload = {
            data: emissionData,
            type: "baseline_emissions",
            docId: emissionId
        };

        const response = await apiClientV2.patch(
            `/api/v0/decarbonization/baseline-emission/`,
            payload,
            { headers }
        );

        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Erro ao atualizar emissão baseline');
    }
};

/**
 * Excluir item de emissão baseline
 * @param {string|number} emissionId - ID da emissão
 * @returns {Promise<void>}
 */
export const deleteBaselineEmission = async (emissionId) => {
    try {
        const headers = getAuthHeaders();

        await apiClientV2.delete(
            `/api/v0/decarbonization/baseline-emission/?emission_id=${emissionId}`,
            { headers }
        );

        return true;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Erro ao excluir emissão baseline');
    }
};

export default {
    getBaselineEmissions,
    createBaselineEmission,
    updateBaselineEmission,
    deleteBaselineEmission
};
