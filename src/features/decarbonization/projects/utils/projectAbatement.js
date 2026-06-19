import { activityEmission } from '../../bau/utils/bauProjection';

/**
 * projectAbatement
 * ----------------
 * Núcleo de cálculo dos Projetos de Descarbonização.
 *
 * Um Projeto agrupa atividades emissoras (muitos-para-um) e aplica uma
 * Iniciativa do banco. O abatimento combina DOIS fatores:
 *   - abrangência (quanto do grupo foi adotado, varia no tempo — do Projeto);
 *   - eficácia (quanto cada unidade reduz — da Iniciativa do banco).
 *
 * A emissão das atividades por ano vem do BAU (Etapa 4, `activityEmission`).
 *
 * Funções puras — saídas reutilizáveis pela Etapa 6 (Cenários/MACC):
 *  - `projectAbatementByYear` (barra da cascata / linha do cenário);
 *  - `projectAbatementByScopeInYear` (atribuição correta por escopo);
 *  - `projectFinanceSummary` (financeiros derivados p/ MACC);
 *  - `activityToProjectsMap` (cap de não dupla contagem nos Cenários).
 *
 * Override por cenário: `coverageInYear`/`abatement*` aceitam um `override`
 * opcional `{ coveragePoints, startYear, endYear }` que substitui os parâmetros
 * do Projeto base (usado na Etapa 6, mantendo o Projeto como base).
 */

/** @typedef {import('../../bau/utils/bauProjection').Activity} Activity */

/**
 * @typedef {Object} Initiative
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} fullDescription
 * @property {number} efficacy            % de redução por unidade convertida.
 * @property {{ scopes: string[], categories: string[] }} applicability
 * @property {string} memorial
 * @property {{ capex:number, opex:number, revenues:number, savings:number, currency:string, lifetimeYears:number }} finance
 */

/**
 * @typedef {Object} CoveragePoint
 * @property {number} year
 * @property {number} pct  0..100
 */

/**
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} name
 * @property {string|null} initiativeId
 * @property {string[]} memberActivityIds
 * @property {number} startYear
 * @property {number} endYear
 * @property {CoveragePoint[]} coveragePoints
 * @property {{ capex:number, opex:number, revenues:number, savings:number, currency:string, lifetimeYears:number }} [finance] Quantificação financeira do projeto (MACC).
 * @property {Object} [scenarioOverrides]  { [scenarioId]: { coveragePoints, startYear, endYear } } — usado na Etapa 6.
 */

const clampPct = (v) => Math.max(0, Math.min(100, Number(v) || 0));

/** Parâmetros efetivos (Projeto base ou override de cenário). */
const effectiveParams = (project, override) => ({
    startYear: override?.startYear ?? project.startYear,
    endYear: override?.endYear ?? project.endYear,
    coveragePoints: override?.coveragePoints ?? project.coveragePoints ?? [],
});

/**
 * Abrangência (%) do grupo em um ano: 0 antes do início; interpolação linear
 * entre os pontos (com (início, 0%) implícito); constante após o último ponto.
 * @param {Project} project
 * @param {number} year
 * @param {object} [override]
 * @returns {number} 0..100
 */
export const coverageInYear = (project, year, override) => {
    const { startYear, coveragePoints } = effectiveParams(project, override);
    if (year < startYear) return 0;

    // Pontos do usuário ordenados + âncora (início, 0%) implícita quando não há ponto no início.
    const user = (coveragePoints || []).map((p) => ({ year: p.year, pct: clampPct(p.pct) })).sort((a, b) => a.year - b.year);
    const pts = user.some((p) => p.year === startYear) ? [...user] : [{ year: startYear, pct: 0 }, ...user];
    if (pts.length === 0) return 0;

    if (year >= pts[pts.length - 1].year) return pts[pts.length - 1].pct; // constante após o último ponto
    for (let i = 0; i < pts.length - 1; i += 1) {
        const a = pts[i];
        const b = pts[i + 1];
        if (year >= a.year && year <= b.year) {
            const t = (year - a.year) / (b.year - a.year || 1);
            return clampPct(a.pct + (b.pct - a.pct) * t);
        }
    }
    return 0;
};

/** Emissão (BAU) de uma atividade do grupo em um ano. */
const memberEmission = (activity, year, ctx) =>
    activity ? activityEmission(activity, year, ctx.baseYear, ctx.driversById) : 0;

/** Emissão do grupo (soma das atividades-membro) em um ano. */
export const groupEmissionInYear = (project, year, ctx) =>
    (project.memberActivityIds || []).reduce((t, id) => t + memberEmission(ctx.activitiesById[id], year, ctx), 0);

/**
 * Abatimento do Projeto em um ano = grupo × abrangência/100 × eficácia/100.
 * @param {Project} project
 * @param {number} year
 * @param {Initiative|null} initiative
 * @param {{ baseYear:number, driversById:object, activitiesById:object }} ctx
 * @param {object} [override]
 * @returns {number} tCO2e
 */
export const abatementInYear = (project, year, initiative, ctx, override) => {
    const efficacy = Number(initiative?.efficacy) || 0;
    if (!efficacy) return 0;
    const cov = coverageInYear(project, year, override);
    return (groupEmissionInYear(project, year, ctx) * cov * efficacy) / 10000;
};

/** Série de abatimento por ano (reutilizável p/ a cascata/cenário). */
export const projectAbatementByYear = (project, initiative, ctx, override) => {
    const out = [];
    for (let y = ctx.baseYear; y <= ctx.endYear; y += 1) {
        out.push({ year: y, abatement: abatementInYear(project, y, initiative, ctx, override) });
    }
    return out;
};

/** Abatimento por atividade-membro em um ano (para atribuir na cascata). */
export const abatementByActivityInYear = (project, year, initiative, ctx, override) => {
    const efficacy = Number(initiative?.efficacy) || 0;
    const cov = coverageInYear(project, year, override);
    const factor = (cov * efficacy) / 10000;
    const out = {};
    (project.memberActivityIds || []).forEach((id) => {
        out[id] = memberEmission(ctx.activitiesById[id], year, ctx) * factor;
    });
    return out;
};

/** Abatimento por escopo em um ano (reutilizável p/ a cascata por escopo). */
export const projectAbatementByScopeInYear = (project, year, initiative, ctx, override) => {
    const byAct = abatementByActivityInYear(project, year, initiative, ctx, override);
    const out = {};
    Object.entries(byAct).forEach(([id, value]) => {
        const scope = ctx.activitiesById[id]?.scope || 'Escopo 1';
        out[scope] = (out[scope] || 0) + value;
    });
    return out;
};

/**
 * Financeiros do Projeto (quantificação POR PROJETO — `project.finance`) ×
 * abatimento (p/ MACC). A quantificação financeira é configurada em cada projeto
 * (a iniciativa do banco traz só a eficácia/potencial de redução).
 * PLACEHOLDER simples — TODO: modelo financeiro completo (amortização, fluxo de
 * caixa anual, NPV) na consolidação do MACC (Etapa 6).
 * @returns {{ capex:number, opex:number, revenues:number, savings:number, currency:string, totalAbatement:number, custoLiquido:number, custoPorTon:number }}
 */
export const projectFinanceSummary = (project, initiative, ctx, override) => {
    const f = project?.finance || {};
    const capex = Number(f.capex) || 0;
    const opex = Number(f.opex) || 0;
    const revenues = Number(f.revenues) || 0;
    const savings = Number(f.savings) || 0;
    const lifetime = Number(f.lifetimeYears) || Math.max(1, ctx.endYear - (project.startYear || ctx.baseYear));

    const series = projectAbatementByYear(project, initiative, ctx, override);
    const totalAbatement = series.reduce((t, p) => t + p.abatement, 0);

    // TODO (MACC): substituir pela regra oficial. Aqui: custo líquido sobre o horizonte.
    const custoLiquido = capex + opex * lifetime - revenues - savings;
    const custoPorTon = totalAbatement > 0 ? custoLiquido / totalAbatement : 0;

    return { capex, opex, revenues, savings, currency: f.currency || 'BRL', lifetimeYears: lifetime, totalAbatement, custoLiquido, custoPorTon };
};

/**
 * Relação atividade → projeto(s) (para o cap de não dupla contagem nos Cenários).
 * @param {Project[]} projects
 * @returns {Record<string, string[]>}
 */
export const activityToProjectsMap = (projects) => {
    const map = {};
    (projects || []).forEach((p) => {
        (p.memberActivityIds || []).forEach((id) => {
            if (!map[id]) map[id] = [];
            map[id].push(p.id);
        });
    });
    return map;
};

export default {
    coverageInYear,
    groupEmissionInYear,
    abatementInYear,
    projectAbatementByYear,
    abatementByActivityInYear,
    projectAbatementByScopeInYear,
    projectFinanceSummary,
    activityToProjectsMap,
};
