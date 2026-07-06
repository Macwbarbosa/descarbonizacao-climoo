/**
 * sbtiTargetService
 * -----------------
 * Encapsula a REGRA DE DEFINIÇÃO DE META do SBTi, agora POR META.
 *
 * O período do plano é único (ano-base, ano mais recente, near-term, net-zero),
 * mas podem existir VÁRIAS metas — cada uma com seus escopos, tipo, ambição e
 * horizonte. Cada meta gera sua própria trajetória, no tipo correto:
 *  - tipos absolutos → trajetória em tCO2e;
 *  - tipos de intensidade → trajetória em tCO2e por unidade do denominador,
 *    além de uma trajetória ABSOLUTA derivada via a projeção do denominador
 *    (driver da Etapa 3) — é o que os Cenários comparam.
 *
 * IMPORTANTE: a % de redução NÃO é digitada — é derivada por esta regra.
 *
 * MÉTODO IMPLEMENTADO: Contração Absoluta (ACA) da SBTi-target-setting-tool
 * ATUAL — as seções "…targets" da aba "Calculations" (Scope 1, Scope 2,
 * combinado Scope 1+2 e Scope 3), e NÃO a versão antiga que a própria planilha
 * marca como "DEPRECATED VERSION 2026-04-14" (a ancoragem em 2020). A regra:
 *  1. POR ESCOPO coberto, deriva a LARR da trajetória de net-zero:
 *       dLARR_nz = ambição_net-zero / (ano_net-zero − ano_recente)
 *     com ambição/ano fixos pela SBTi por escopo (ver SCOPE_NZ_PARAMS):
 *       E1 90%@2050 · E2 100%@2040 · E3 90%@2050 (1,5°C) ou 75%@2050 (WB2°C);
 *  2. COMBINA as dLARR ponderando pela participação de cada escopo no inventário;
 *  3. converte a ambição da trajetória de net-zero para o intervalo base→alvo;
 *  4. aplica o PISO da ambição via MAX (1,5°C = 4,2%/ano; WB2°C = 2,5%/ano);
 *  5. redução = dLARR_ajustada × (ano-alvo − ano-base), limitada a 90%;
 *  6. emissão-alvo = base × (1 − redução%); net-zero = −90% (residual ~10%).
 * Por depender do MIX de escopos, a % de redução varia com o inventário — é o
 * que faz a planilha dar, p.ex., 50,4% (E2 ≈ 40% do total) e não 63%.
 * Metas de intensidade aplicam a MESMA taxa sobre a intensidade (base/denominador)
 * e convertem para absoluto via a projeção do denominador.
 *
 * TODO (fase 2): método Setorial (SDA) — porta as abas Database/ETP/NZE/OECM e
 *       o modelo de convergência (m, d, p). Hoje 'sda_setorial' cai no ACA.
 *
 * Reuso pela tela de Cenários: importe `computeMetaTarget` / `computeAllMetaTargets`
 * — as trajetórias deixam de ser únicas e passam a ser uma por meta/agrupamento.
 */

/**
 * @typedef {('1p5'|'wb2')} AmbicaoId
 * @typedef {('absoluta'|'intensidade_fisica'|'intensidade_economica'|'sda_setorial')} TipoMeta
 */

/**
 * @typedef {Object} Meta
 * @property {string} id
 * @property {string} name
 * @property {{ scope1: boolean, scope2: boolean, scope3: boolean }} scopes Escopos cobertos.
 * @property {TipoMeta} type
 * @property {string|null} denominatorDriverId Driver da Etapa 3 (só metas de intensidade).
 * @property {AmbicaoId} ambition
 * @property {number} nearTermYear Horizonte near-term da meta.
 * @property {number|null} netZeroYear Horizonte long-term/net-zero da meta (opcional).
 */

/**
 * @typedef {Object} MetaTargetContext
 * @property {number} baseYear
 * @property {number} recentYear
 * @property {number} planNetZeroYear
 * @property {{ scope1: number, scope2: number, scope3: number }} baselineByScope
 * @property {(driverId: string) => Array<{ year: number, value: number }>|null} getDenominatorProjection
 *           Projeção absoluta do denominador por ano (ex.: baseValue × índice/100 do driver).
 */

/** Piso da taxa anual linear (LARR) do ACA por ambição, em FRAÇÃO (SBTi: min LARR). */
export const MIN_LARR = { '1p5': 0.042, wb2: 0.025 };

/** Piso da LARR em pontos percentuais (exibição / compatibilidade). */
export const ANNUAL_RATES = { '1p5': 4.2, wb2: 2.5 };

/**
 * Parâmetros da trajetória de NET-ZERO por escopo (SBTi Corporate Net-Zero
 * Standard), usados para derivar a LARR do near-term em cada escopo:
 *  - `ambition`: redução de net-zero exigida (fração), por ambição near-term;
 *  - `defaultNzYear`: ano de net-zero quando a meta não define um;
 *  - `capNzYear`: teto do ano de net-zero do escopo (Escopo 2 ⇒ 2040).
 * Fonte: aba "Calculations" — D111/D112/D114/D115 (E1/E2) e D195/D196/D221/D222 (E3).
 */
export const SCOPE_NZ_PARAMS = {
    scope1: { ambition: { '1p5': 0.9, wb2: 0.9 }, defaultNzYear: 2050, capNzYear: null },
    scope2: { ambition: { '1p5': 1.0, wb2: 1.0 }, defaultNzYear: 2040, capNzYear: 2040 },
    scope3: { ambition: { '1p5': 0.9, wb2: 0.75 }, defaultNzYear: 2050, capNzYear: null },
};

/** Redução exigida no net-zero (residual ~10% neutralizado). */
export const NET_ZERO_REDUCTION_PCT = 90;

/** Ano de net-zero efetivo de um escopo a partir do ano de net-zero da meta (opcional). */
const nzYearForScope = (params, anoNetZero) => {
    if (params.capNzYear) return anoNetZero && anoNetZero <= params.capNzYear ? anoNetZero : params.capNzYear;
    return anoNetZero || params.defaultNzYear;
};

export const AMBITION_OPTIONS = [
    { value: '1p5', label: '1,5°C', description: 'Contração absoluta · trajetória de net-zero por escopo (E1 90% · E2 100% · E3 90%) com piso de 4,2%/ano.' },
    { value: 'wb2', label: 'Bem abaixo de 2°C', description: 'Contração absoluta · trajetória de net-zero por escopo com piso de 2,5%/ano (E3 ⇒ ambição 75%).' },
];

/**
 * Redução near-term pelo método de Contração Absoluta (ACA) FIEL à
 * SBTi-target-setting-tool atual. Ver passos 1–5 no cabeçalho do arquivo.
 * Com ano-recente = ano-base (sem inventário de ano recente) os passos 1–3
 * simplificam para: redução = MAX(piso, Σ wᵢ·dLARR_nzᵢ) × (alvo − base).
 *
 * @param {{ anoBase:number, anoMaisRecente:number, anoAlvo:number,
 *           anoNetZero:(number|null), ambicao:AmbicaoId,
 *           emissoesPorEscopo:Object }} input
 * @returns {{ reducaoPct:number, taxaAnualPct:number, pisoPct:number,
 *             pisoAtivo:boolean, porEscopo:Array }}
 */
export const acaNearTermReduction = ({ anoBase, anoMaisRecente, anoAlvo, anoNetZero, ambicao = '1p5', emissoesPorEscopo = {} }) => {
    const floor = MIN_LARR[ambicao] ?? MIN_LARR['1p5'];
    const mryYear = Number(anoMaisRecente) > Number(anoBase) ? Number(anoMaisRecente) : Number(anoBase);
    const covered = Object.entries(emissoesPorEscopo).filter(([, v]) => Number(v) > 0);
    const totalCovered = covered.reduce((t, [, v]) => t + Number(v), 0);

    const porEscopo = covered.map(([scopeKey, v]) => {
        const p = SCOPE_NZ_PARAMS[scopeKey] || SCOPE_NZ_PARAMS.scope1;
        const ambNz = p.ambition[ambicao] ?? p.ambition['1p5'];
        const nzYear = nzYearForScope(p, anoNetZero);
        const dlarrNz = nzYear > mryYear ? ambNz / (nzYear - mryYear) : floor;
        const weight = totalCovered > 0 ? Number(v) / totalCovered : 0;
        return { scope: scopeKey, nzYear, ambicaoNetZero: ambNz, dlarrNz, weight };
    });

    const combinedDLARRnz = porEscopo.reduce((t, e) => t + e.weight * e.dlarrNz, 0);
    const anosBaseAlvo = anoAlvo - anoBase;
    // MRY_emissões == BY_emissões ⇒ ambição convertida (base→alvo) = dLARR_nz × (alvo − MRY).
    const initialAmbition = combinedDLARRnz * (anoAlvo - mryYear);
    const dlarrBYTY = anosBaseAlvo > 0 ? initialAmbition / anosBaseAlvo : floor;
    const dlarrAjustada = Math.max(floor, dlarrBYTY);
    const reducaoFrac = Math.min(0.9, Math.max(0, dlarrAjustada * anosBaseAlvo));

    return {
        reducaoPct: reducaoFrac * 100,
        taxaAnualPct: dlarrAjustada * 100,
        pisoPct: floor * 100,
        pisoAtivo: dlarrBYTY < floor,
        porEscopo,
    };
};

/** Tipos de meta (rótulos e se exigem denominador). */
export const TARGET_TYPE_OPTIONS = [
    { value: 'absoluta', label: 'Redução absoluta', short: 'absoluta', intensity: false },
    { value: 'intensidade_fisica', label: 'Intensidade física', short: 'int. física', intensity: true },
    { value: 'intensidade_economica', label: 'Intensidade monetária', short: 'int. monetária', intensity: true },
    { value: 'engajamento', label: 'Engajamento (fornecedores/clientes)', short: 'engajamento', intensity: false },
    { value: 'combinada', label: 'Meta combinada (redução + engajamento)', short: 'combinada', intensity: false },
    { value: 'sda_setorial', label: 'Setorial (SDA)', short: 'SDA', intensity: false },
];

/** Sub-tipos de redução disponíveis na parte de redução de uma meta combinada. */
export const COMBINED_REDUCTION_OPTIONS = [
    { value: 'absoluta', label: 'Redução absoluta' },
    { value: 'intensidade_fisica', label: 'Intensidade física' },
    { value: 'intensidade_economica', label: 'Intensidade monetária' },
];

/** Cobertura mínima do Escopo 3 exigida para a meta combinada (SBTi: ≥ 2/3). */
export const SCOPE3_MIN_COVERAGE_PCT = 67;

/** Horizonte fixo da meta de engajamento: 5 anos a partir da submissão. */
export const ENGAGEMENT_HORIZON_YEARS = 5;

/** Reduções anteriores a este ano não contam para novas metas (regra SBTi). */
export const INTENSITY_BASELINE_FLOOR_YEAR = 2020;

/** Taxa anual mínima de redução de intensidade por ambição (SBTi), em %/ano. */
export const INTENSITY_MIN_ANNUAL_RATE = { '1p5': 7, wb2: 3 };

/** @param {TipoMeta} type */
export const isIntensityType = (type) => type === 'intensidade_fisica' || type === 'intensidade_economica';
/** @param {TipoMeta} type */
export const isEngagementType = (type) => type === 'engajamento';
/** @param {TipoMeta} type */
export const isCombinedType = (type) => type === 'combinada';
/** Tipos que carregam uma parte de engajamento (lista de fornecedores/clientes). */
export const hasEngagementPart = (type) => isEngagementType(type) || isCombinedType(type);

/** Sub-tipo da parte de REDUÇÃO de uma meta (a própria, ou o sub-tipo da combinada). */
export const reductionTypeOf = (meta) =>
    isCombinedType(meta?.type) ? meta?.combinedReductionType || 'absoluta' : meta?.type;

/** @param {TipoMeta} type */
export const needsDenominator = (type) => isIntensityType(type);
/** A meta (considerando a parte de redução da combinada) exige denominador? */
export const needsDenominatorForMeta = (meta) => isIntensityType(reductionTypeOf(meta));

/** Soma das emissões dos fornecedores/clientes engajados (tCO2e). */
export const sumEngagementEmissions = (meta) =>
    (meta?.engagement?.partners || []).reduce((total, p) => total + (Number(p.emission) || 0), 0);

export const SCOPE_KEYS = ['scope1', 'scope2', 'scope3'];

/** Soma das emissões dos escopos cobertos. */
export const sumCoveredBase = (emissoesPorEscopo = {}) =>
    Object.values(emissoesPorEscopo).reduce((total, v) => total + (Number(v) || 0), 0);

/** Emissões por escopo (ano-base) apenas dos escopos cobertos pela meta. */
export const coveredEmissions = (scopes, baselineByScope) => {
    const out = {};
    SCOPE_KEYS.forEach((k) => {
        if (scopes?.[k]) out[k] = baselineByScope?.[k] || 0;
    });
    return out;
};

const SCOPE_LABEL_TO_KEY = { 'Escopo 1': 'scope1', 'Escopo 2': 'scope2', 'Escopo 3': 'scope3' };

/**
 * Emissões por escopo (ano-base) considerando a COBERTURA da meta no nível de
 * ATIVIDADE: soma só as atividades nos escopos cobertos e fora da lista de
 * exclusão (`meta.excludedActivityIds`). Substitui `coveredEmissions` quando há
 * inventário do ano-base disponível.
 * @param {Meta} meta
 * @param {Array<{id:string, scope:string, emission:number}>} baseActivities atividades do ano-base
 * @returns {{ scope1:number, scope2:number, scope3:number }}
 */
export const coveredBaselineByScope = (meta, baseActivities) => {
    const excluded = new Set(meta?.excludedActivityIds || []);
    const out = { scope1: 0, scope2: 0, scope3: 0 };
    (baseActivities || []).forEach((a) => {
        const k = SCOPE_LABEL_TO_KEY[a.scope];
        if (!k || !meta?.scopes?.[k]) return; // fora dos escopos da meta
        if (excluded.has(a.id)) return; // excluída da cobertura
        out[k] += Number(a.emission) || 0;
    });
    return out;
};

/**
 * Emissões do Escopo 3 COBERTAS pela meta, agrupadas por categoria (respeita as
 * exclusões). Usado para descontar o engajamento por categoria na meta combinada.
 * @returns {Object<string, number>} categoria → tCO2e cobertos
 */
export const coveredScope3ByCategory = (meta, baseActivities) => {
    const excluded = new Set(meta?.excludedActivityIds || []);
    const out = {};
    if (!meta?.scopes?.scope3) return out;
    (baseActivities || []).forEach((a) => {
        if (a.scope !== 'Escopo 3' || excluded.has(a.id)) return;
        const cat = a.category || '—';
        out[cat] = (out[cat] || 0) + (Number(a.emission) || 0);
    });
    return out;
};

/** Emissão TOTAL do Escopo 3 por categoria (todas as atividades, sem exclusões). */
export const scope3TotalsByCategory = (baseActivities) => {
    const out = {};
    (baseActivities || []).forEach((a) => {
        if (a.scope !== 'Escopo 3' || !a.category) return;
        out[a.category] = (out[a.category] || 0) + (Number(a.emission) || 0);
    });
    return out;
};

/**
 * Cobertura do engajamento relativa às categorias dos parceiros: % das emissões
 * DAS CATEGORIAS engajadas que estão cobertas pelos fornecedores/clientes.
 * @returns {{ partnerCategories:string[], categoriesTotal:number, sharePct:number }}
 */
export const engagementCategoryShare = (meta, baseActivities) => {
    const partners = meta?.engagement?.partners || [];
    const partnerCategories = [...new Set(partners.map((p) => p.category).filter(Boolean))];
    const totals = scope3TotalsByCategory(baseActivities);
    const categoriesTotal = partnerCategories.reduce((t, c) => t + (totals[c] || 0), 0);
    const engag = sumEngagementEmissions(meta);
    const sharePct = categoriesTotal > 0 ? (engag / categoriesTotal) * 100 : 0;
    return { partnerCategories, categoriesTotal, sharePct };
};

/**
 * Desconto do engajamento por categoria: para cada parceiro, subtrai a emissão
 * associada da categoria correspondente na cobertura de REDUÇÃO (limitado ao que
 * há coberto naquela categoria — evita cobertura > 100%). Parceiros sem categoria
 * (ou em categoria não coberta pela redução) somam-se por fora.
 * @returns {{ deducted:number }} total efetivamente descontado da redução.
 */
export const engagementDeduction = (meta, baseActivities) => {
    const remaining = coveredScope3ByCategory(meta, baseActivities);
    let deducted = 0;
    (meta?.engagement?.partners || []).forEach((p) => {
        const e = Number(p.emission) || 0;
        const cat = p.category;
        if (!cat || remaining[cat] == null) return; // categoria não coberta → soma por fora
        const d = Math.min(e, remaining[cat]);
        deducted += d;
        remaining[cat] -= d;
    });
    return { deducted };
};

const interpolateYears = (fromYear, fromValue, toYear, toValue) => {
    const pts = [];
    const span = toYear - fromYear;
    if (span <= 0) return pts;
    for (let yr = fromYear + 1; yr <= toYear; yr += 1) {
        const t = (yr - fromYear) / span;
        pts.push({ ano: yr, valor: fromValue + (toValue - fromValue) * t });
    }
    return pts;
};

/**
 * Constrói a trajetória anual da meta (ano-base → near-term [→ net-zero]).
 * Genérica quanto à unidade: `valor` é tCO2e (absoluto) ou intensidade.
 *
 * @param {{ anoBase:number, anoNearTerm:number, anoNetZero:(number|null),
 *           valorBase:number, valorNearTerm:number, valorNetZero:(number|null) }} args
 * @returns {Array<{ ano:number, valor:number, marco:boolean, tipo:(string|null) }>}
 */
export const buildTargetTrajectory = ({ anoBase, anoNearTerm, anoNetZero, valorBase, valorNearTerm, valorNetZero }) => {
    const traj = [{ ano: anoBase, valor: valorBase, marco: true, tipo: 'base' }];

    interpolateYears(anoBase, valorBase, anoNearTerm, valorNearTerm).forEach((p) => {
        traj.push({ ...p, marco: p.ano === anoNearTerm, tipo: p.ano === anoNearTerm ? 'near-term' : null });
    });

    if (anoNetZero && anoNetZero > anoNearTerm && valorNetZero != null) {
        interpolateYears(anoNearTerm, valorNearTerm, anoNetZero, valorNetZero).forEach((p) => {
            traj.push({ ...p, marco: p.ano === anoNetZero, tipo: p.ano === anoNetZero ? 'net-zero' : null });
        });
    }
    return traj;
};

/**
 * Deriva a meta SBTi de UMA meta pelo método de Contração Absoluta (ACA),
 * fiel à SBTi-target-setting-tool (aba "Calculations", D77/D78/D67).
 *
 * @param {Object} input
 * @param {number} input.anoBase
 * @param {number} input.anoMaisRecente
 * @param {number} input.anoNearTerm
 * @param {number|null} input.anoNetZero
 * @param {AmbicaoId} input.ambicao
 * @param {TipoMeta} input.tipoMeta
 * @param {Object} input.emissoesPorEscopo Emissões dos escopos cobertos (tCO2e, ano-base).
 * @param {Array<{year:number,value:number}>|null} [input.denominadorPorAno] Projeção do denominador (intensidade).
 * @returns {Object}
 */
export const computeSbtiTarget = ({
    anoBase,
    anoMaisRecente,
    anoNearTerm,
    anoNetZero = null,
    ambicao = '1p5',
    tipoMeta = 'absoluta',
    emissoesPorEscopo = {},
    denominadorPorAno = null,
    intensityAnnualRate = 7,
}) => {
    const baseCoberta = sumCoveredBase(emissoesPorEscopo);
    const hasNetZero = anoNetZero != null && anoNetZero > anoNearTerm;
    const intensity = isIntensityType(tipoMeta);

    // --- Contração Absoluta (ACA): trajetória de net-zero por escopo + piso ----
    // Método ATUAL da SBTi-target-setting-tool (NÃO a ancoragem em 2020 deprecada).
    // A % de redução depende do MIX de escopos do inventário (ver acaNearTermReduction).
    const aca = acaNearTermReduction({
        anoBase,
        anoMaisRecente,
        anoAlvo: anoNearTerm,
        anoNetZero,
        ambicao,
        emissoesPorEscopo,
    });
    // Redução ABSOLUTA (contração ACA) — referência para metas absolutas/SDA.
    const reducaoAbsolutaNearTermPct = aca.reducaoPct;
    const reducaoAbsolutaNetZeroPct = hasNetZero ? NET_ZERO_REDUCTION_PCT : null;

    const denomAt = (year) => {
        if (!Array.isArray(denominadorPorAno)) return null;
        const found = denominadorPorAno.find((p) => p.year === year);
        return found ? found.value : null;
    };
    const denomBase = denomAt(anoBase);

    let unidade;
    let valorBase;
    let valorNearTerm;
    let valorNetZero;
    let trajetoria;
    let trajetoriaAbsoluta;
    let taxaAnual;
    let denominadorAusente = false;
    let reducaoNearTermPct;
    let reducaoNetZeroPct;

    if (intensity) {
        // Meta de INTENSIDADE (SBTi): redução cumulativa = 1 − (1 − r)^n, onde
        // r = taxa anual informada (mín. 7%/ano p/ 1,5°C) e
        // n = ano − max(ano-base, 2020) (reduções pré-2020 não contam).
        // Fórmula idêntica p/ intensidade física e monetária; muda só a taxa r.
        unidade = 'intensidade';
        const r = Math.max(0, Number(intensityAnnualRate) || 0) / 100;
        taxaAnual = r * 100;
        const anoInicio = Math.max(Number(anoBase), INTENSITY_BASELINE_FLOOR_YEAR);
        const reduAt = (ano) => 1 - Math.pow(1 - r, Math.max(0, ano - anoInicio)); // fração
        reducaoNearTermPct = reduAt(anoNearTerm) * 100;
        reducaoNetZeroPct = hasNetZero ? reduAt(anoNetZero) * 100 : null;

        if (denomBase && denomBase > 0) {
            const denomOr = (ano) => denomAt(ano) ?? denomBase;
            valorBase = baseCoberta / denomBase;
            const intAt = (ano) => valorBase * (1 - reduAt(ano)); // = valorBase·(1−r)^n
            valorNearTerm = intAt(anoNearTerm);
            valorNetZero = hasNetZero ? intAt(anoNetZero) : null;
            const endYear = hasNetZero ? anoNetZero : anoNearTerm;
            trajetoria = [];
            for (let y = anoBase; y <= endYear; y += 1) {
                const tipo =
                    y === anoBase ? 'base' : y === anoNearTerm ? 'near-term' : hasNetZero && y === anoNetZero ? 'net-zero' : null;
                trajetoria.push({ ano: y, valor: intAt(y), marco: !!tipo, tipo });
            }
            // Absoluto = intensidade × projeção do denominador (Cenários comparam isto).
            trajetoriaAbsoluta = trajetoria.map((p) => ({ ...p, valor: p.valor * denomOr(p.ano) }));
        } else {
            denominadorAusente = true;
            valorBase = null;
            valorNearTerm = null;
            valorNetZero = null;
            trajetoria = [];
            trajetoriaAbsoluta = [];
        }
    } else {
        // 'absoluta' e 'sda_setorial' (SDA cai no ACA até a fase 2 — ver TODO no topo).
        unidade = 'absoluto';
        taxaAnual = aca.taxaAnualPct;
        reducaoNearTermPct = reducaoAbsolutaNearTermPct;
        reducaoNetZeroPct = reducaoAbsolutaNetZeroPct;
        valorBase = baseCoberta;
        valorNearTerm = baseCoberta * (1 - reducaoAbsolutaNearTermPct / 100);
        valorNetZero = hasNetZero ? baseCoberta * (1 - NET_ZERO_REDUCTION_PCT / 100) : null;
        trajetoria = buildTargetTrajectory({ anoBase, anoNearTerm, anoNetZero, valorBase, valorNearTerm, valorNetZero });
        trajetoriaAbsoluta = trajetoria;
    }

    return {
        unidade,
        tipoMeta,
        baseCoberta,
        taxaAnual,
        reducaoNearTermPct,
        reducaoNetZeroPct,
        // Redução absoluta equivalente (âncora SBTi) — para contexto nas metas de intensidade.
        reducaoAbsolutaNearTermPct,
        reducaoAbsolutaNetZeroPct,
        valorBase,
        valorNearTerm,
        valorNetZero,
        hasNetZero,
        trajetoria,
        trajetoriaAbsoluta,
        denominadorAusente,
        larrFloorPct: aca.pisoPct,
        pisoAtivo: aca.pisoAtivo,
        larrPorEscopo: aca.porEscopo,
        recentYearInformativo: Number(anoMaisRecente) > Number(anoBase),
    };
};

/** Emissão TOTAL do Escopo 3 no ano-base (independe da cobertura/escopos da meta). */
const totalScope3Base = (ctx) => {
    if (ctx.baseActivities) {
        return coveredBaselineByScope(
            { scopes: { scope1: false, scope2: false, scope3: true }, excludedActivityIds: [] },
            ctx.baseActivities
        ).scope3;
    }
    return ctx.baselineByScope?.scope3 || 0;
};

/** Emissão do Escopo 3 COBERTA pela meta (parte de redução), respeitando exclusões. */
const coveredScope3 = (meta, ctx) => {
    if (ctx.baseActivities) return coveredBaselineByScope(meta, ctx.baseActivities).scope3;
    return meta.scopes?.scope3 ? ctx.baselineByScope?.scope3 || 0 : 0;
};

/**
 * Deriva a meta a partir de um objeto Meta + contexto (ergonômico/reutilizável).
 * Suporta metas de redução (absoluta/intensidade/SDA), de ENGAJAMENTO e COMBINADA.
 * @param {Meta} meta
 * @param {MetaTargetContext} ctx
 * @returns {Object} resultado + `metaId` + `kind`.
 */
export const computeMetaTarget = (meta, ctx) => {
    const submissionYear = meta.submissionYear ?? new Date().getFullYear();
    const scope3Total = totalScope3Base(ctx);

    // ── Meta de ENGAJAMENTO: sem trajetória de redução própria ──────────────
    if (isEngagementType(meta.type)) {
        const engagementEmissions = sumEngagementEmissions(meta);
        const coveragePct = scope3Total > 0 ? (engagementEmissions / scope3Total) * 100 : 0;
        const catShare = engagementCategoryShare(meta, ctx.baseActivities);
        return {
            metaId: meta.id,
            kind: 'engagement',
            engagementEmissions,
            scope3Total,
            coveragePct,
            partnerCategories: catShare.partnerCategories,
            engagementShareOfCategoriesPct: catShare.sharePct,
            targetYear: submissionYear + ENGAGEMENT_HORIZON_YEARS,
            partners: meta.engagement?.partners || [],
            meets67: coveragePct >= SCOPE3_MIN_COVERAGE_PCT,
            // Chaves neutras para os Cenários (engajamento não reduz o inventário próprio).
            trajetoria: [],
            trajetoriaAbsoluta: [],
            valorBase: null,
            reducaoNearTermPct: 0,
        };
    }

    // ── Parte de REDUÇÃO (própria, ou sub-tipo da combinada) ────────────────
    const reductionType = reductionTypeOf(meta);
    const emissoesPorEscopo = ctx.baseActivities
        ? coveredBaselineByScope(meta, ctx.baseActivities)
        : coveredEmissions(meta.scopes, ctx.baselineByScope);
    const denominadorPorAno =
        isIntensityType(reductionType) && meta.denominatorDriverId && ctx.getDenominatorProjection
            ? ctx.getDenominatorProjection(meta.denominatorDriverId)
            : null;

    const base = computeSbtiTarget({
        anoBase: ctx.baseYear,
        anoMaisRecente: ctx.recentYear,
        anoNearTerm: meta.nearTermYear,
        anoNetZero: meta.netZeroYear ?? null,
        ambicao: meta.ambition,
        tipoMeta: reductionType,
        emissoesPorEscopo,
        denominadorPorAno,
        // Taxa de intensidade é FIXA pela ambição (SBTi 1,5°C: 7%/ano) — não editável.
        intensityAnnualRate: INTENSITY_MIN_ANNUAL_RATE[meta.ambition] ?? 7,
    });

    // ── Meta COMBINADA: redução + engajamento; cobertura conjunta ≥ 67% ─────
    // O engajamento por categoria é DESCONTADO da cobertura de redução (evita
    // dupla contagem e cobertura > 100%): total = redução_ajustada + engajamento.
    if (isCombinedType(meta.type)) {
        const engagementEmissions = sumEngagementEmissions(meta);
        const reductionCoveredFull = coveredScope3(meta, ctx);
        const { deducted } = ctx.baseActivities ? engagementDeduction(meta, ctx.baseActivities) : { deducted: 0 };
        const reductionCoveredScope3 = Math.max(0, reductionCoveredFull - deducted);
        const combinedCoveredEmissions = Math.min(
            scope3Total || Infinity,
            reductionCoveredScope3 + engagementEmissions
        );
        const combinedCoveragePct = scope3Total > 0 ? (combinedCoveredEmissions / scope3Total) * 100 : 0;
        const catShare = engagementCategoryShare(meta, ctx.baseActivities);
        return {
            metaId: meta.id,
            kind: 'combined',
            ...base,
            engagementEmissions,
            engagementDeducted: deducted,
            partnerCategories: catShare.partnerCategories,
            engagementShareOfCategoriesPct: catShare.sharePct,
            partners: meta.engagement?.partners || [],
            reductionCoveredScope3,
            reductionCoveredFull,
            scope3Total,
            combinedCoveredEmissions,
            combinedCoveragePct,
            engagementTargetYear: submissionYear + ENGAGEMENT_HORIZON_YEARS,
            meets67: combinedCoveragePct >= SCOPE3_MIN_COVERAGE_PCT,
        };
    }

    return { metaId: meta.id, kind: 'reduction', ...base };
};

/**
 * Deriva TODAS as metas (saída pública reutilizável pela tela de Cenários).
 * @param {Meta[]} metas
 * @param {MetaTargetContext} ctx
 * @returns {Array<{ meta: Meta, target: Object }>}
 */
export const computeAllMetaTargets = (metas, ctx) =>
    (metas || []).map((meta) => ({ meta, target: computeMetaTarget(meta, ctx) }));

/** Rótulo de escopos cobertos, ex.: 'E1+E2'. */
export const scopesLabel = (scopes) =>
    SCOPE_KEYS.filter((k) => scopes?.[k])
        .map((k) => `E${k.slice(-1)}`)
        .join('+');

const fmtPct1 = (v) => `${Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** Frase dos escopos cobertos, ex.: 'suas emissões de Escopo 3' / '... de Escopos 1 e 2'. */
export const scopePhrase = (scopes) => {
    const nums = SCOPE_KEYS.filter((k) => scopes?.[k]).map((k) => k.slice(-1));
    if (!nums.length) return 'suas emissões';
    if (nums.length === 1) return `suas emissões de Escopo ${nums[0]}`;
    return `suas emissões de Escopos ${nums.slice(0, -1).join(', ')} e ${nums[nums.length - 1]}`;
};

/**
 * Texto do compromisso da PARTE DE REDUÇÃO (absoluta ou intensidade), no padrão:
 * "{EMPRESA} compromete-se a reduzir {escopos} em {X}% [por unidade de {unid}]
 *  até {ano}, tendo {ano-base} como ano-base."
 */
export const reductionCommitmentText = ({ companyName, meta, target, baseYear, denominatorUnit }) => {
    const scope = scopePhrase(meta.scopes);
    const yr = target?.trajetoria?.find((p) => p.tipo === 'near-term')?.ano ?? meta.nearTermYear;
    const red = fmtPct1(target?.reducaoNearTermPct);
    const unit = target?.unidade === 'intensidade' ? ` por unidade de ${denominatorUnit || 'valor agregado'}` : '';
    return `${companyName} compromete-se a reduzir ${scope} em ${red}${unit} até ${yr}, tendo ${baseYear} como ano-base.`;
};

/**
 * Texto do compromisso da PARTE DE ENGAJAMENTO, no padrão:
 * "[Adicionalmente, a empresa|{EMPRESA}] assegura que {XX}% de seus fornecedores
 *  e clientes (considerando as emissões abrangidas pela {categoria}) estabelecerão
 *  metas climáticas baseadas na ciência até {ano de submissão + 5}."
 */
export const engagementCommitmentText = ({ companyName, target, standalone = false }) => {
    const share = fmtPct1(target?.engagementShareOfCategoriesPct ?? target?.coveragePct ?? 0);
    const cats = (target?.partnerCategories || []).join(', ');
    const catPhrase = cats ? ` (considerando as emissões abrangidas pela ${cats})` : '';
    const year = target?.engagementTargetYear ?? target?.targetYear;
    const subject = standalone ? `${companyName} assegura` : 'Adicionalmente, a empresa assegura';
    return `${subject} que ${share} de seus fornecedores e clientes${catPhrase} estabelecerão metas climáticas baseadas na ciência até ${year}.`;
};

/** Nome automático sugerido para a meta (editável pelo usuário). */
export const autoMetaName = (meta) => {
    const typeOpt = TARGET_TYPE_OPTIONS.find((t) => t.value === meta.type);
    const scopeTxt = scopesLabel(meta.scopes) || '—';
    const prefix = meta.netZeroYear ? 'Long-term' : 'Near-term';
    return `${prefix} Escopo ${scopeTxt} (${typeOpt?.short || meta.type})`;
};

export default {
    computeSbtiTarget,
    computeMetaTarget,
    computeAllMetaTargets,
    acaNearTermReduction,
    buildTargetTrajectory,
    coveredEmissions,
    coveredBaselineByScope,
    coveredScope3ByCategory,
    engagementDeduction,
    isIntensityType,
    isEngagementType,
    isCombinedType,
    hasEngagementPart,
    reductionTypeOf,
    needsDenominator,
    needsDenominatorForMeta,
    sumEngagementEmissions,
    SCOPE3_MIN_COVERAGE_PCT,
    ENGAGEMENT_HORIZON_YEARS,
    INTENSITY_BASELINE_FLOOR_YEAR,
    INTENSITY_MIN_ANNUAL_RATE,
    COMBINED_REDUCTION_OPTIONS,
    autoMetaName,
    scopesLabel,
    ANNUAL_RATES,
    MIN_LARR,
    SCOPE_NZ_PARAMS,
    NET_ZERO_REDUCTION_PCT,
    AMBITION_OPTIONS,
    TARGET_TYPE_OPTIONS,
};
