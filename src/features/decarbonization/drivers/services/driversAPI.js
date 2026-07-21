import { useAuthStore } from '@/features/auth/shared/store/authStore';
// import apiClientV2 from '@/apis/apiClientV2'; // TODO: habilitar na integração real

/**
 * driversAPI
 * ----------
 * Leitura/escrita das Variáveis de Crescimento (drivers). Persistimos os
 * PARÂMETROS do método (segmentos / taxa média / ano-a-ano), o valor-base, a
 * premissa e o histórico — NÃO o índice derivado (esse é calculado em
 * `utils/driverIndex`).
 *
 * STATUS: STUB. O backend atual expõe `projection-parameter` no formato
 * `{ name, comments, values }` (valores absolutos por ano) — insuficiente para
 * o modelo de driver baseado em índice/método. Enquanto o endpoint não suporta
 * o schema completo, o estado é mantido localmente (zustand persist) e
 * `getDrivers` retorna lista vazia (cada empresa cadastra os seus drivers).
 *
 * TODO (backend): persistir o schema completo de driver, p.ex. em
 *   GET/POST/PATCH/DELETE /api/v0/decarbonization/growth-driver/
 * seguindo o padrão de `projectionsAPI` (apiClientV2 + headers cnpj/year).
 */

/** @typedef {import('../utils/driverIndex').Driver} Driver */

// eslint-disable-next-line no-unused-vars
const getAuthHeaders = () => {
    const selectedCompany = useAuthStore.getState().user?.selectedCompany;
    return {
        cnpj: selectedCompany?.cnpj?.replace(/\D/g, '') || '',
        year: '2022',
    };
};

/**
 * Lê os drivers.
 *
 * Retorna SEMPRE uma lista vazia: cada empresa começa sem nenhuma variável de
 * crescimento e o usuário cadastra as suas. (Antes havia um seed de exemplo —
 * Produção, Receita bruta, Nº de equipamentos, Horas de operação, Headcount —
 * que era reinjetado toda vez que a lista ficava vazia, impedindo a exclusão.)
 *
 * TODO (backend): substituir pelo GET real, ex.:
 *   const { data } = await apiClientV2.get('/api/v0/decarbonization/growth-driver/', { headers: getAuthHeaders() });
 *   return mapBackendListToFrontend(data);
 *
 * @returns {Promise<Driver[]>}
 */
export const getDrivers = async () => [];

/**
 * Cria um driver.
 * TODO (backend): POST real.
 * @param {Driver} driver
 * @returns {Promise<Driver>}
 */
export const createDriver = async (driver) => driver;

/**
 * Atualiza um driver.
 * TODO (backend): PATCH real.
 * @param {string} driverId
 * @param {Driver} driver
 * @returns {Promise<Driver>}
 */
export const updateDriver = async (driverId, driver) => driver;

/**
 * Remove um driver.
 * TODO (backend): DELETE real.
 * @param {string} driverId
 * @returns {Promise<boolean>}
 */
// eslint-disable-next-line no-unused-vars
export const deleteDriver = async (driverId) => true;

export default { getDrivers, createDriver, updateDriver, deleteDriver };
