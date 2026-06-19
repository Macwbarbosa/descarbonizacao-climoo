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
 * `getDrivers` retorna um seed de exemplo.
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
 * Seed de exemplo (mock) — espelha os drivers do wireframe de referência.
 * TODO: remover quando o GET real estiver disponível.
 * @type {Driver[]}
 */
const SEED_DRIVERS = [
    {
        id: 'prod',
        name: 'Produção',
        unit: 'ton/ano',
        type: 'Físico',
        note: 'Plano de negócios 2025–2030; nova linha em 2028. Rev. mar/2026.',
        baseValue: 120000,
        method: 'period',
        avgRate: 4,
        segments: [
            { from: 2025, to: 2027, g: 4 },
            { from: 2028, to: 2028, g: 15 },
            { from: 2029, to: 2035, g: 3 },
        ],
        yearly: {},
        history: { 2022: 104000, 2023: 110000, 2024: 115000 },
        usedBy: ['Gás natural – caldeiras', 'Emissões de processo', 'Logística terceirizada'],
        siteId: null,
    },
    {
        id: 'rec',
        name: 'Receita bruta',
        unit: 'R$ MM',
        type: 'Financeiro',
        note: 'Projeção comercial.',
        baseValue: 480,
        method: 'avg',
        avgRate: 5,
        segments: [{ from: 2025, to: 2035, g: 5 }],
        yearly: {},
        history: {},
        usedBy: ['Compras (cat. 1)'],
        siteId: null,
    },
    {
        id: 'equip',
        name: 'Nº de equipamentos',
        unit: 'un.',
        type: 'Físico',
        note: 'Plano de CAPEX de frota/maquinário.',
        baseValue: 140,
        method: 'yearly',
        avgRate: 5,
        segments: [{ from: 2025, to: 2035, g: 5 }],
        yearly: { 2026: 6, 2027: 6, 2028: 5, 2029: 4, 2030: 4, 2031: 3, 2032: 3, 2033: 2, 2034: 2, 2035: 2 },
        history: {},
        usedBy: ['Diesel – frota'],
        siteId: null,
    },
    {
        id: 'oper',
        name: 'Horas de operação',
        unit: 'h/ano',
        type: 'Operacional',
        note: 'Premissa de utilização.',
        baseValue: 7200,
        method: 'avg',
        avgRate: 3,
        segments: [{ from: 2025, to: 2035, g: 3 }],
        yearly: {},
        history: {},
        usedBy: ['Energia da rede'],
        siteId: null,
    },
    {
        id: 'team',
        name: 'Headcount',
        unit: 'pessoas',
        type: 'Operacional',
        note: 'Plano de pessoas.',
        baseValue: 850,
        method: 'avg',
        avgRate: 2,
        segments: [{ from: 2025, to: 2035, g: 2 }],
        yearly: {},
        history: {},
        usedBy: [],
        siteId: null,
    },
];

/**
 * Lê os drivers.
 *
 * TODO (backend): substituir pelo GET real, ex.:
 *   const { data } = await apiClientV2.get('/api/v0/decarbonization/growth-driver/', { headers: getAuthHeaders() });
 *   return mapBackendListToFrontend(data);
 *
 * @returns {Promise<Driver[]>}
 */
export const getDrivers = async () => SEED_DRIVERS.map((d) => ({ ...d }));

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
