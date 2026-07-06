import {
    SCOPE_KEYS,
    needsDenominatorForMeta,
    isEngagementType,
    isCombinedType,
    isIntensityType,
    reductionTypeOf,
    hasEngagementPart,
    sumEngagementEmissions,
    SCOPE3_MIN_COVERAGE_PCT,
    INTENSITY_MIN_ANNUAL_RATE,
} from '../services/sbtiTargetService';

/**
 * Validações das metas (consolidado e por meta). Inline, não bloqueantes.
 *
 * Regras:
 *  - cada escopo coberto por no máximo UMA meta absoluta (sem dupla contagem);
 *  - avisar se um escopo (com emissão) ficar sem nenhuma meta;
 *  - regra dos 40%: se Escopo 3 ≥ 40% do total, exigir uma meta de Escopo 3;
 *  - metas de intensidade exigem um denominador selecionado;
 *  - horizontes das metas dentro do período do plano.
 */

export const SCOPE3_THRESHOLD = 40;

const SCOPE_SHORT = { scope1: 'E1', scope2: 'E2', scope3: 'E3' };

/** É um tipo "absoluto" (conta para dupla contagem)? Engajamento não conta. */
const isAbsoluteType = (type) => type === 'absoluta' || type === 'sda_setorial' || type === 'combinada';

/**
 * @param {import('../services/sbtiTargetService').Meta[]} metas
 * @param {{ baselineByScope: Object, params: Object, targets?: Object }} ctx
 *   `targets` (opcional): mapa metaId → resultado de computeMetaTarget, usado
 *   para checar a cobertura conjunta ≥ 67% das metas combinadas.
 */
export const validateMetas = (metas, { baselineByScope, params, targets = {} }) => {
    const total = SCOPE_KEYS.reduce((sum, k) => sum + (baselineByScope[k] || 0), 0);
    const scope3Share = total > 0 ? (baselineByScope.scope3 / total) * 100 : 0;

    // Cobertura por escopo
    const coverage = { scope1: [], scope2: [], scope3: [] };
    const absoluteCount = { scope1: 0, scope2: 0, scope3: 0 };
    metas.forEach((m) => {
        SCOPE_KEYS.forEach((k) => {
            if (m.scopes?.[k]) {
                coverage[k].push(m);
                if (isAbsoluteType(m.type)) absoluteCount[k] += 1;
            }
        });
    });

    // Escopos com emissão e sem nenhuma meta
    const scopesWithoutMeta = SCOPE_KEYS.filter((k) => (baselineByScope[k] || 0) > 0 && coverage[k].length === 0);

    // Escopos cobertos por mais de uma meta ABSOLUTA (dupla contagem)
    const doubleCounted = SCOPE_KEYS.filter((k) => absoluteCount[k] > 1);

    // Regra dos 40%
    const scope3HasMeta = coverage.scope3.length > 0;
    const scope3RuleViolated = scope3Share >= SCOPE3_THRESHOLD && !scope3HasMeta;

    // Por meta
    const metaIssues = {};
    metas.forEach((m) => {
        const issues = [];
        const submissionYear = m.submissionYear ?? new Date().getFullYear();
        const ntMin = submissionYear + 5;
        const ntMax = submissionYear + 10;
        const coversAny = SCOPE_KEYS.some((k) => m.scopes?.[k]);
        if (!coversAny) issues.push('selecione ao menos um escopo');
        if (needsDenominatorForMeta(m) && !m.denominatorDriverId) {
            issues.push('metas de intensidade exigem um denominador (driver da Etapa 3)');
        }
        // Intensidade: taxa anual não pode ficar abaixo do mínimo SBTi da ambição.
        if (isIntensityType(reductionTypeOf(m))) {
            const minRate = INTENSITY_MIN_ANNUAL_RATE[m.ambition] ?? INTENSITY_MIN_ANNUAL_RATE['1p5'];
            const rate = m.intensityAnnualRate ?? minRate;
            if (rate < minRate) {
                issues.push(`taxa de intensidade ${rate}%/ano < mínimo SBTi (${minRate}%/ano) para a ambição`);
            }
        }
        // Engajamento: exige ao menos um fornecedor/cliente com emissão.
        if (hasEngagementPart(m.type) && sumEngagementEmissions(m) <= 0) {
            issues.push('cadastre ao menos um fornecedor/cliente com a emissão associada');
        }
        // Meta combinada: cobertura conjunta (redução + engajamento) ≥ 67% do Escopo 3.
        if (isCombinedType(m.type)) {
            const t = targets[m.id];
            if (t && !t.meets67) {
                issues.push(
                    `cobertura conjunta ${Number(t.combinedCoveragePct || 0).toFixed(0)}% < ${SCOPE3_MIN_COVERAGE_PCT}% do Escopo 3`
                );
            }
        }
        // Engajamento tem horizonte fixo (submissão + 5 anos) — não valida o intervalo.
        if (!isEngagementType(m.type) && (m.nearTermYear < ntMin || m.nearTermYear > ntMax)) {
            issues.push(`near-term deve ficar entre ${ntMin} e ${ntMax} (5–10 anos da submissão ${submissionYear})`);
        }
        if (m.netZeroYear != null) {
            if (m.netZeroYear <= m.nearTermYear) issues.push('long-term deve ser posterior ao near-term');
            if (m.netZeroYear > params.netZeroYear) {
                issues.push(`long-term não pode exceder o net-zero do plano (${params.netZeroYear})`);
            }
        }
        metaIssues[m.id] = issues;
    });

    const globalErrors = [];
    scopesWithoutMeta.forEach((k) => globalErrors.push(`${SCOPE_SHORT[k]} tem emissão mas nenhuma meta`));
    doubleCounted.forEach((k) => globalErrors.push(`${SCOPE_SHORT[k]} coberto por mais de uma meta absoluta (dupla contagem)`));
    if (scope3RuleViolated) {
        globalErrors.push(`Escopo 3 = ${scope3Share.toFixed(0)}% (≥ ${SCOPE3_THRESHOLD}%) — SBTi exige meta de Escopo 3`);
    }

    return {
        total,
        scope3Share,
        scope3HasMeta,
        scope3RuleViolated,
        coverage,
        scopesWithoutMeta,
        doubleCounted,
        metaIssues,
        globalErrors,
        ok: globalErrors.length === 0 && Object.values(metaIssues).every((arr) => arr.length === 0),
    };
};

export default validateMetas;
