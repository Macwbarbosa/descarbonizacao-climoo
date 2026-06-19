import apiClientV2 from './apiClientV2';

const TECHNOLOGIES_BANK_ENDPOINT = '/api/v0/decarbonization/technologies-bank/';

export const technologiesBankAPI = {
    // GET - Buscar todas as tecnologias
    getTechnologies: async () => {
        const response = await apiClientV2.get(TECHNOLOGIES_BANK_ENDPOINT);

        // Converter o objeto recebido em array
        const technologiesObj = response.data || {};
        const technologiesArray = Object.values(technologiesObj).map(tech => ({
            ...tech,
            key: tech.id // Para o Ant Design Table
        }));

        return technologiesArray;
    },

    // POST - Criar nova tecnologia
    createTechnology: async (technologyData) => {
        const payload = {
            name: technologyData.name,
            description: technologyData.description || '',
            fullDescription: technologyData.fullDescription || '',
            reductionPotential: technologyData.reductionPotential?.toString() || '0',
            reference: technologyData.reference || '',
            partners: technologyData.partners || '',
            createdAt: Math.floor(Date.now() / 1000),
            lastUpdated: Math.floor(Date.now() / 1000),
            enabled: true
        };

        const response = await apiClientV2.post(TECHNOLOGIES_BANK_ENDPOINT, payload);
        return response.data;
    },

    // PATCH - Atualizar tecnologia
    updateTechnology: async (technologyId, technologyData) => {
        const payload = {
            data: {
                name: technologyData.name,
                description: technologyData.description || '',
                fullDescription: technologyData.fullDescription || '',
                reductionPotential: technologyData.reductionPotential?.toString() || '0',
                reference: technologyData.reference || '',
                partners: technologyData.partners || '',
                lastUpdated: Math.floor(Date.now() / 1000)
            },
            type: 'technologies_bank',
            docId: technologyId
        };

        const response = await apiClientV2.patch(TECHNOLOGIES_BANK_ENDPOINT, payload);
        return response.data;
    },

    // DELETE - Excluir tecnologia
    deleteTechnology: async (technologyId) => {
        const response = await apiClientV2.delete(`${TECHNOLOGIES_BANK_ENDPOINT}?technology_id=${technologyId}`);
        return response.data;
    }
};

export default technologiesBankAPI;
