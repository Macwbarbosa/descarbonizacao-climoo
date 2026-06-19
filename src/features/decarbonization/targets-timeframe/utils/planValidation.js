/**
 * Validações do PERÍODO do plano (inline, não bloqueantes).
 *
 * O período é o eixo temporal compartilhado: ano-base, ano mais recente e o
 * horizonte (net-zero do plano = teto temporal). A regra do near-term (5–10 anos
 * da submissão) e o alvo de longo prazo são POR META (ver `metaValidation`).
 *
 * Regras aqui:
 *  - inventário do ano-base concluído;
 *  - ano mais recente ≥ ano-base;
 *  - horizonte (net-zero) ≤ 2050.
 */

/** Limite superior do net-zero. */
export const NET_ZERO_MAX_YEAR = 2050;

/**
 * @typedef {Object} PlanValidationResult
 * @property {boolean} ok
 * @property {string[]} errors
 */

/**
 * @param {import('../services/planTimeframeAPI').PlanPeriodParams} params
 * @returns {PlanValidationResult}
 */
export const validatePlan = (params) => {
    const { baseYear, recentYear, netZeroYear, inventoryDone } = params;
    const errors = [];

    if (!inventoryDone) errors.push('inventário do ano-base não concluído');
    if (recentYear < baseYear) errors.push('ano mais recente não pode ser anterior ao ano-base');
    if (netZeroYear > NET_ZERO_MAX_YEAR) errors.push(`horizonte (net-zero) deve ser até ${NET_ZERO_MAX_YEAR}`);

    return { ok: errors.length === 0, errors };
};

export default validatePlan;
