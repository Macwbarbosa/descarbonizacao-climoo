import {
    getBaselineEmissions,
    updateBaselineEmission,
} from '../../settings/services/baselineEmissionsAPI';

/**
 * bauAPI
 * ------
 * Leitura do inventário POR ATIVIDADE (reusa `baselineEmissionsAPI`) e escrita
 * do VÍNCULO de cada atividade (driver + fator de acoplamento).
 *
 * A projeção em si é derivada (`utils/bauProjection`) e NÃO é persistida.
 * Persistimos apenas, por atividade: o driver vinculado e o fator.
 *
 * Mapeamento de campos (reuso do schema de baseline-emission):
 *  - `anchorage` carrega o id do driver vinculado (campo já existente, antes
 *    usado para o parâmetro de projeção — os drivers o substituem);
 *  - `factor` é o fator de acoplamento (novo campo; persistência best-effort).
 *
 * TODO (backend): confirmar suporte ao campo `factor` em baseline-emission ou
 *       criar endpoint dedicado de vínculo atividade↔driver.
 */

/** @typedef {import('../utils/bauProjection').Activity} Activity */

const SCOPES = ['Escopo 1', 'Escopo 2', 'Escopo 3'];

/**
 * Seed de exemplo (mock) — espelha as atividades do wireframe, com drivers da
 * Etapa 3 (prod/rec/equip/oper/team). Usado só quando o inventário vem vazio.
 * TODO: remover quando o inventário real estiver populado.
 * @type {Activity[]}
 */
const SEED_ACTIVITIES = [
    { id: 'act-diesel', scope: 'Escopo 1', category: 'Combustão móvel', name: 'Diesel – frota', baseEmission: 14000, driverId: 'equip', factor: 1 },
    { id: 'act-gasolina', scope: 'Escopo 1', category: 'Combustão móvel', name: 'Gasolina – frota leve', baseEmission: 4000, driverId: 'equip', factor: 1 },
    { id: 'act-gn', scope: 'Escopo 1', category: 'Combustão estacionária', name: 'Gás natural – caldeiras', baseEmission: 11000, driverId: 'prod', factor: 1 },
    { id: 'act-glp', scope: 'Escopo 1', category: 'Combustão estacionária', name: 'GLP – fornos', baseEmission: 3000, driverId: 'prod', factor: 1 },
    { id: 'act-proc', scope: 'Escopo 1', category: 'Processos industriais', name: 'Emissões de processo', baseEmission: 9000, driverId: 'prod', factor: 0.9 },
    { id: 'act-energia', scope: 'Escopo 2', category: 'Energia elétrica - Método baseado na Localização', name: 'Energia da rede', baseEmission: 22000, driverId: 'oper', factor: 1 },
    { id: 'act-log', scope: 'Escopo 3', category: 'Transporte e Distribuição (upstream)', name: 'Logística terceirizada', baseEmission: 12000, driverId: 'prod', factor: 1 },
    { id: 'act-viagens', scope: 'Escopo 3', category: 'Viagens a negócios', name: 'Viagens a negócio', baseEmission: 4000, driverId: 'team', factor: 1 },
    { id: 'act-compras', scope: 'Escopo 3', category: 'Compra de bens e serviços', name: 'Compras (cat. 1)', baseEmission: 14000, driverId: 'rec', factor: 0.8 },
    { id: 'act-embalagens', scope: 'Escopo 3', category: 'Compra de bens e serviços', name: 'Embalagens', baseEmission: 7000, driverId: 'prod', factor: 1 },
];

/** Mapeia um item de baseline-emission para o modelo de Atividade do BAU. */
const mapToActivity = (item) => ({
    id: String(item.id),
    scope: SCOPES.includes(item.scope) ? item.scope : 'Escopo 1',
    category: item.category || '—',
    name: item.activity || item.name || 'Atividade',
    baseEmission: Number(item.emission) || 0,
    driverId: item.anchorage || item.driverId || null,
    factor: item.factor == null ? 1 : Number(item.factor),
});

/**
 * Lê as atividades do inventário (reuso do serviço de baseline). Faz fallback
 * para o seed de exemplo quando o inventário está vazio.
 * @returns {Promise<Activity[]>}
 */
export const getActivities = async () => {
    const items = await getBaselineEmissions();
    const list = Array.isArray(items) ? items : Object.values(items || {});
    if (list.length === 0) return SEED_ACTIVITIES.map((a) => ({ ...a }));
    return list.filter((it) => it && it.enabled !== false).map(mapToActivity);
};

/**
 * Persiste o vínculo (driver + fator) de uma atividade via baseline-emission.
 * Best-effort: ids de seed (não existentes no backend) são ignorados.
 * @param {string} activityId
 * @param {{ driverId: string|null, factor: number }} link
 * @returns {Promise<boolean>}
 */
export const saveActivityLink = async (activityId, { driverId, factor }) => {
    if (String(activityId).startsWith('act-')) return true; // seed (mock) — sem persistência
    await updateBaselineEmission(activityId, { anchorage: driverId || null, factor });
    return true;
};

export default { getActivities, saveActivityLink };
