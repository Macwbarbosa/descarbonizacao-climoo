import { crescimentoNoAno } from '../../drivers/utils/driverIndex';

/**
 * bauProjection
 * -------------
 * Núcleo de cálculo da Projeção BAU (Business as Usual). Cada atividade é
 * ancorada a um driver (Etapa 3) e a um fator de acoplamento. O crescimento é
 * HERDADO do driver (somente-leitura nesta etapa); aqui só entram o vínculo
 * (driverId) e o fator.
 *
 * Funções puras — saídas reutilizáveis pelas Etapas 5 (Projetos) e 6 (Cenários):
 *  - `activityEmissionByYear` (Projetos abatem % da curva da atividade);
 *  - `bauStackedByScope` / `bauTotalPerYear` (Cenários usam a linha BAU e o mix).
 */

/** @typedef {import('../../drivers/utils/driverIndex').Driver} Driver */

/**
 * @typedef {Object} Activity
 * @property {string} id
 * @property {string} scope     'Escopo 1' | 'Escopo 2' | 'Escopo 3'
 * @property {string} category
 * @property {string} name
 * @property {number} baseEmission  Emissão do ano-base (inventário, tCO2e).
 * @property {string|null} driverId Driver vinculado (Etapa 3) ou null (sem vínculo).
 * @property {number} factor        Fator de acoplamento (default 1,0).
 */

export const SCOPES = ['Escopo 1', 'Escopo 2', 'Escopo 3'];

/** Cores por escopo (alinhadas aos wireframes/design system). */
export const SCOPE_COLORS = { 'Escopo 1': '#5B6CB5', 'Escopo 2': '#C98A3A', 'Escopo 3': '#7AA05F' };

/**
 * Vínculo especial "Não cresce": emissão CONSTANTE (crescimento 0%). É uma
 * escolha explícita (≠ "sem vínculo"/órfã) — a atividade fica vinculada mas plana.
 */
export const NO_GROWTH_DRIVER_ID = '__no_growth__';

/**
 * Crescimento da atividade no ano = crescimento herdado do driver × fator.
 * @param {Activity} activity
 * @param {number} year
 * @param {number} baseYear
 * @param {Record<string, Driver>} driversById
 * @returns {number} %/ano
 */
export const activityGrowth = (activity, year, baseYear, driversById) => {
    // Sem vínculo OU "Não cresce" → crescimento 0% (emissão constante).
    if (!activity?.driverId || activity.driverId === NO_GROWTH_DRIVER_ID) return 0;
    const driver = driversById[activity.driverId];
    if (!driver) return 0;
    const factor = activity.factor == null ? 1 : Number(activity.factor);
    return crescimentoNoAno(driver, year, baseYear) * factor;
};

/**
 * Emissão projetada da atividade em um ano (compõe a partir da emissão-base).
 * @returns {number} tCO2e
 */
export const activityEmission = (activity, year, baseYear, driversById) => {
    let v = Number(activity?.baseEmission) || 0;
    for (let yy = baseYear + 1; yy <= year; yy += 1) {
        v *= 1 + activityGrowth(activity, yy, baseYear, driversById) / 100;
    }
    return v;
};

/**
 * Série de emissão da atividade por ano (saída reutilizável — Etapa 5).
 * @returns {Array<{ year: number, emission: number }>}
 */
export const activityEmissionByYear = (activity, { baseYear, endYear }, driversById) => {
    const out = [];
    for (let y = baseYear; y <= endYear; y += 1) {
        out.push({ year: y, emission: activityEmission(activity, y, baseYear, driversById) });
    }
    return out;
};

/** Soma das emissões de uma lista de atividades em um ano. */
export const sumEmission = (activities, year, baseYear, driversById) =>
    activities.reduce((t, a) => t + activityEmission(a, year, baseYear, driversById), 0);

/** Emissão de um escopo em um ano. */
export const scopeEmission = (activities, scope, year, baseYear, driversById) =>
    sumEmission(activities.filter((a) => a.scope === scope), year, baseYear, driversById);

/** Total BAU em um ano. */
export const totalEmission = (activities, year, baseYear, driversById) =>
    sumEmission(activities, year, baseYear, driversById);

/**
 * Dados de área empilhada por escopo (saída reutilizável — Etapa 6).
 * @returns {Array<{ year: number, scope: string, value: number }>}
 */
export const bauStackedByScope = (activities, { baseYear, endYear }, driversById, scopes = SCOPES) => {
    const out = [];
    for (let y = baseYear; y <= endYear; y += 1) {
        scopes.forEach((scope) => {
            out.push({ year: y, scope, value: scopeEmission(activities, scope, y, baseYear, driversById) });
        });
    }
    return out;
};

/**
 * Total BAU por ano (saída reutilizável — Etapa 6).
 * @returns {Array<{ year: number, total: number }>}
 */
export const bauTotalPerYear = (activities, { baseYear, endYear }, driversById) => {
    const out = [];
    for (let y = baseYear; y <= endYear; y += 1) {
        out.push({ year: y, total: totalEmission(activities, y, baseYear, driversById) });
    }
    return out;
};

/**
 * Crescimento médio das emissões ao ano entre ano-base e ano-alvo (não é "CAGR").
 * @returns {number} %/ano
 */
export const averageAnnualEmissionGrowth = (activities, baseYear, targetYear, driversById) => {
    if (targetYear <= baseYear) return 0;
    const base = totalEmission(activities, baseYear, baseYear, driversById);
    const target = totalEmission(activities, targetYear, baseYear, driversById);
    if (base <= 0) return 0;
    return (target ** (1 / (targetYear - baseYear)) / base ** (1 / (targetYear - baseYear)) - 1) * 100;
};

export default {
    activityGrowth,
    activityEmission,
    activityEmissionByYear,
    sumEmission,
    scopeEmission,
    totalEmission,
    bauStackedByScope,
    bauTotalPerYear,
    averageAnnualEmissionGrowth,
    SCOPES,
    SCOPE_COLORS,
    NO_GROWTH_DRIVER_ID,
};
