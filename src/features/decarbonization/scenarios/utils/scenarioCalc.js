import { totalEmission, scopeEmission, SCOPES } from '../../bau/utils/bauProjection';
import { abatementByActivityInYear, abatementInYear, projectFinanceSummary } from '../../projects/utils/projectAbatement';

/**
 * scenarioCalc
 * ------------
 * Combina Projetos (Etapa 5) em um cenário e calcula a trajetória resultante,
 * aplicando o CAP por atividade (evita dupla contagem / abater além do BAU).
 *
 * Consome as saídas das etapas anteriores:
 *  - BAU por atividade/escopo/total (Etapa 4, `bauProjection`);
 *  - abatimento por Projeto + financeiros (Etapa 5, `projectAbatement`),
 *    aplicando overrides de abrangência/tempo por cenário (Projeto base intacto).
 *
 * `ctx` = { baseYear, endYear, activities, activitiesById, driversById }.
 */

/** @typedef {{ projetoId:string, included:boolean, overrides?:object }} ScenarioItem */
/** @typedef {{ id:string, name:string, items:ScenarioItem[] }} Scenario */

/** Itens ativos do cenário com o Projeto resolvido. */
export const activeItems = (scenario, projectsById) =>
    (scenario?.items || [])
        .filter((it) => it.included)
        .map((it) => ({ item: it, project: projectsById[it.projetoId] }))
        .filter((x) => x.project);

/**
 * Detalhe de abatimento do cenário num ano, COM cap por atividade.
 * @returns {{ byProject:Object, byScope:Object, total:number, doubleCounted:Set<string>, cappedByActivity:Object }}
 */
export const abatementDetailInYear = (scenario, year, ctx, projectsById, initiativesById) => {
    const active = activeItems(scenario, projectsById);

    // Bruto por atividade: activityId -> [{ projectId, value }]
    const rawByActivity = {};
    active.forEach(({ item, project }) => {
        const initiative = initiativesById[project.initiativeId] || null;
        const byAct = abatementByActivityInYear(project, year, initiative, ctx, item.overrides);
        Object.entries(byAct).forEach(([aid, value]) => {
            if (value > 0) (rawByActivity[aid] = rawByActivity[aid] || []).push({ projectId: project.id, value });
        });
    });

    // Abatimento ADITIVO (projetos complementares): os abatimentos somam sem cap
    // por atividade (pode ultrapassar o BAU). Sem dupla contagem aplicada.
    const doubleCounted = new Set();
    const cappedByActivity = {}; // activityId -> { projectId: value } (sem cap)
    Object.entries(rawByActivity).forEach(([aid, parts]) => {
        cappedByActivity[aid] = {};
        parts.forEach((p) => {
            cappedByActivity[aid][p.projectId] = p.value;
        });
    });

    // Agregações
    const byProject = {};
    const byScope = {};
    let total = 0;
    Object.entries(cappedByActivity).forEach(([aid, perProj]) => {
        const scope = ctx.activitiesById[aid]?.scope || 'Escopo 1';
        Object.entries(perProj).forEach(([pid, value]) => {
            byProject[pid] = (byProject[pid] || 0) + value;
            byScope[scope] = (byScope[scope] || 0) + value;
            total += value;
        });
    });

    return { byProject, byScope, total, doubleCounted, cappedByActivity };
};

/** BAU total no ano. */
export const bauTotalInYear = (ctx, year) => totalEmission(ctx.activities, year, ctx.baseYear, ctx.driversById);

/** Emissão do cenário no ano = BAU − abatimento (limitado) total. */
export const scenarioEmissionInYear = (scenario, year, ctx, projectsById, initiativesById) =>
    bauTotalInYear(ctx, year) - abatementDetailInYear(scenario, year, ctx, projectsById, initiativesById).total;

/** Série de emissão do cenário por ano. */
export const scenarioEmissionByYear = (scenario, ctx, projectsById, initiativesById) => {
    const out = [];
    for (let y = ctx.baseYear; y <= ctx.endYear; y += 1) {
        out.push({ year: y, emission: scenarioEmissionInYear(scenario, y, ctx, projectsById, initiativesById) });
    }
    return out;
};

/** Emissão do cenário restrita a um conjunto de escopos, num ano (p/ comparar com meta). */
export const scenarioScopeEmissionInYear = (scenario, scopes, year, ctx, projectsById, initiativesById) => {
    const detail = abatementDetailInYear(scenario, year, ctx, projectsById, initiativesById);
    return scopes.reduce((t, scope) => {
        const bau = scopeEmission(ctx.activities, scope, year, ctx.baseYear, ctx.driversById);
        return t + (bau - (detail.byScope[scope] || 0));
    }, 0);
};

/** BAU por escopo restrito a um conjunto de escopos, num ano. */
export const bauScopeEmissionInYear = (scopes, year, ctx) =>
    scopes.reduce((t, scope) => t + scopeEmission(ctx.activities, scope, year, ctx.baseYear, ctx.driversById), 0);

/**
 * Dados da cascata no ano-alvo: emissão do ano-base → BAU → uma barra por projeto
 * (abatimento limitado) → resultado. Quando `scopes` é informado (escopos da meta
 * em foco), TUDO é restrito a esses escopos: BAU, ano-base, abatimento por projeto
 * e resultado consideram só as emissões dos escopos da meta.
 * @param {string[]|null} [scopes] escopos cobertos pela meta (null = total).
 * @returns {{ baseEmission:number, bau:number, result:number, bars:Array<{projectId,name,value,scope}> }}
 */
export const waterfallData = (scenario, targetYear, ctx, projectsById, initiativesById, scopes = null) => {
    const detail = abatementDetailInYear(scenario, targetYear, ctx, projectsById, initiativesById);
    const inScope = (scope) => !scopes || scopes.includes(scope);
    const scopeSet = scopes && scopes.length ? scopes : SCOPES;

    const bau = scopeSet.reduce((t, s) => t + scopeEmission(ctx.activities, s, targetYear, ctx.baseYear, ctx.driversById), 0);
    const baseEmission = scopeSet.reduce((t, s) => t + scopeEmission(ctx.activities, s, ctx.baseYear, ctx.baseYear, ctx.driversById), 0);

    // Abatimento por projeto, contando só as atividades dentro dos escopos da meta.
    const bars = [];
    let totalInScope = 0;
    Object.keys(detail.byProject).forEach((pid) => {
        let value = 0;
        const scopeTotals = {};
        Object.entries(detail.cappedByActivity).forEach(([aid, perProj]) => {
            const scope = ctx.activitiesById[aid]?.scope || 'Escopo 1';
            if (perProj[pid] && inScope(scope)) {
                value += perProj[pid];
                scopeTotals[scope] = (scopeTotals[scope] || 0) + perProj[pid];
            }
        });
        if (value <= 0) return; // projeto sem abatimento nos escopos da meta
        const scope = Object.entries(scopeTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Escopo 1';
        bars.push({ projectId: pid, name: projectsById[pid]?.name || pid, value, scope });
        totalInScope += value;
    });
    bars.sort((a, b) => b.value - a.value);

    return { baseEmission, bau, result: bau - totalInScope, bars, doubleCounted: detail.doubleCounted };
};

/**
 * Linhas MACC: projetos do cenário ordenados por custo (R$/tCO₂e); largura =
 * potencial de abatimento no ano-alvo. Para projetos INCLUÍDOS, usa o
 * abatimento LIMITADO pelo cap por atividade — o mesmo valor das barras da
 * cascata e da linha do cenário (os 3 gráficos avaliam o mesmo cenário).
 * Projetos fora do cenário mostram o potencial standalone (se incluídos).
 */
export const maccRows = (scenario, targetYear, ctx, projectsById, initiativesById) => {
    const detail = abatementDetailInYear(scenario, targetYear, ctx, projectsById, initiativesById);
    return (scenario?.items || [])
        .map((it) => {
            const project = projectsById[it.projetoId];
            if (!project) return null;
            const initiative = initiativesById[project.initiativeId] || null;
            const potential = it.included
                ? detail.byProject[project.id] || 0
                : abatementInYear(project, targetYear, initiative, ctx, it.overrides);
            const finance = projectFinanceSummary(project, initiative, ctx, it.overrides);
            return {
                projectId: project.id,
                name: project.name,
                included: !!it.included,
                costPerTon: finance.custoPorTon,
                potential,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.costPerTon - b.costPerTon);
};

/** Agrega financeiros do cenário (projetos ativos). */
export const scenarioFinance = (scenario, ctx, projectsById, initiativesById) => {
    let custoBruto = 0;
    let savings = 0;
    activeItems(scenario, projectsById).forEach(({ item, project }) => {
        const initiative = initiativesById[project.initiativeId] || null;
        const f = projectFinanceSummary(project, initiative, ctx, item.overrides);
        custoBruto += f.capex + f.opex * f.lifetimeYears;
        savings += f.savings + f.revenues;
    });
    return { custoBruto, savings };
};

/** Rótulos de escopo cobertos por uma meta (ex.: ['Escopo 1','Escopo 2']). */
export const metaScopeLabels = (meta) =>
    SCOPES.filter((s) => meta?.scopes?.[`scope${s.slice(-1)}`]);

/**
 * Valor ABSOLUTO da meta no ano (usa `trajetoriaAbsoluta` — já convertida via
 * denominador para metas de intensidade). Clampa fora do horizonte da meta.
 * @param {object} metaTarget resultado de `computeMetaTarget`
 * @param {number} year
 * @returns {number|null}
 */
export const metaTargetAbsoluteInYear = (metaTarget, year) => {
    const traj = metaTarget?.trajetoriaAbsoluta || [];
    if (!traj.length) return null;
    const exact = traj.find((p) => p.ano === year);
    if (exact) return exact.valor;
    if (year <= traj[0].ano) return traj[0].valor;
    return traj[traj.length - 1].valor; // após o horizonte da meta: mantém o alvo final
};

/**
 * Gap residual de uma meta no ano = emissão do cenário (nos escopos da meta) −
 * alvo absoluto da meta. > 0 significa acima da meta.
 */
export const metaGapInYear = (scenario, meta, metaTarget, year, ctx, projectsById, initiativesById) => {
    const scopes = metaScopeLabels(meta);
    const emission = scenarioScopeEmissionInYear(scenario, scopes, year, ctx, projectsById, initiativesById);
    const target = metaTargetAbsoluteInYear(metaTarget, year);
    if (target == null) return { emission, target: null, gap: null };
    return { emission, target, gap: emission - target };
};

export { SCOPES };

export default {
    activeItems,
    abatementDetailInYear,
    bauTotalInYear,
    scenarioEmissionInYear,
    scenarioEmissionByYear,
    scenarioScopeEmissionInYear,
    bauScopeEmissionInYear,
    waterfallData,
    maccRows,
    scenarioFinance,
};
