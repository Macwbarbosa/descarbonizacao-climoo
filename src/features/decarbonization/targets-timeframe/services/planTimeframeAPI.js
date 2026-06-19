import { useAuthStore } from '@/features/auth/shared/store/authStore';
// import apiClientV2 from '@/apis/apiClientV2'; // TODO: habilitar quando o endpoint existir

/**
 * planTimeframeAPI
 * ----------------
 * Leitura/escrita dos PARÂMETROS do plano de descarbonização: o PERÍODO único
 * (eixo temporal compartilhado) + a LISTA DE METAS (cada uma com escopos, tipo,
 * ambição, denominador e horizonte).
 *
 * A trajetória resultante de cada meta NÃO é persistida como entrada do usuário
 * — é derivada pelo `sbtiTargetService`. Persistimos apenas os parâmetros; o
 * output calculado pode ser persistido junto caso a plataforma já faça isso.
 *
 * STATUS: STUB. Ainda não existe endpoint dedicado no backend para estes
 * parâmetros. Enquanto isso, o estado é mantido localmente (zustand persist).
 * Os métodos abaixo definem a INTERFACE TIPADA e o ponto de integração.
 *
 * TODO: ligar a um endpoint real, ex.
 *   GET    /api/v0/decarbonization/plan-timeframe/
 *   POST   /api/v0/decarbonization/plan-timeframe/
 * seguindo o padrão de `reductionGoalsAPI` (apiClientV2 + headers cnpj/year).
 */

/**
 * @typedef {Object} PlanPeriodParams
 * @property {number} baseYear       Ano-base do inventário.
 * @property {number} recentYear     Ano mais recente com dados de inventário.
 * @property {number} submissionYear Ano de submissão ao SBTi (base da janela do near-term).
 * @property {number} nearTermYear   Ano near-term do período do plano.
 * @property {number} netZeroYear    Ano net-zero do período do plano.
 * @property {boolean} inventoryDone Inventário do ano-base concluído/verificado.
 */

/**
 * @typedef {Object} PlanTimeframePayload
 * @property {PlanPeriodParams} params Período único do plano.
 * @property {import('./sbtiTargetService').Meta[]} metas Lista de metas (parâmetros).
 */

// eslint-disable-next-line no-unused-vars
const getAuthHeaders = () => {
    const selectedCompany = useAuthStore.getState().user?.selectedCompany;
    return {
        cnpj: selectedCompany?.cnpj?.replace(/\D/g, '') || '',
        year: '2022',
    };
};

/**
 * Lê o período e as metas do plano.
 *
 * TODO (SBTi v2.5 / backend): substituir pelo GET real, ex.:
 *   const { data } = await apiClientV2.get('/api/v0/decarbonization/plan-timeframe/', { headers: getAuthHeaders() });
 *   return mapBackendToFrontend(data);
 *
 * @returns {Promise<PlanTimeframePayload|null>} `null` quando ainda não há nada salvo.
 */
export const getPlanTimeframe = async () => null;

/**
 * Persiste o período + a lista de metas (parâmetros, não o resultado derivado).
 *
 * TODO (SBTi v2.5 / backend): substituir pelo POST/PATCH real, ex.:
 *   const { data } = await apiClientV2.post('/api/v0/decarbonization/plan-timeframe/', payload, { headers: getAuthHeaders() });
 *   return mapBackendToFrontend(data);
 *
 * @param {PlanTimeframePayload} payload
 * @returns {Promise<PlanTimeframePayload>} o payload efetivamente persistido.
 */
export const savePlanTimeframe = async (payload) => payload;

export default { getPlanTimeframe, savePlanTimeframe };
