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
    { value: 'intensidade_economica', label: 'Intensidade econômica', short: 'int. econômica', intensity: true },
    { value: 'sda_setorial', label: 'Setorial (SDA)', short: 'SDA', intensity: false },
];

/** @param {TipoMeta} type */
export const isIntensityType = (type) => type === 'intensidade_fisica' || type === 'intensidade_economica';
/** @param {TipoMeta} type */
export const needsDenominator = (type) => isIntensityType(type);

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
    const reducaoNearTermPct = aca.reducaoPct;
    const taxaAnual = aca.taxaAnualPct; // taxa anual linear EFETIVA (base→alvo), em %.
    const reducaoNetZeroPct = hasNetZero ? NET_ZERO_REDUCTION_PCT : null;

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
    let denominadorAusente = false;

    if (intensity) {
        unidade = 'intensidade';
        if (denomBase && denomBase > 0) {
            valorBase = baseCoberta / denomBase;
        } else {
            valorBase = null;
            denominadorAusente = true;
        }
        valorNearTerm = valorBase != null ? valorBase * (1 - reducaoNearTermPct / 100) : null;
        valorNetZero = hasNetZero && valorBase != null ? valorBase * (1 - NET_ZERO_REDUCTION_PCT / 100) : null;
    } else {
        // 'absoluta' e 'sda_setorial' (SDA cai no ACA até a fase 2 — ver TODO no topo).
        unidade = 'absoluto';
        valorBase = baseCoberta;
        valorNearTerm = baseCoberta * (1 - reducaoNearTermPct / 100);
        valorNetZero = hasNetZero ? baseCoberta * (1 - NET_ZERO_REDUCTION_PCT / 100) : null;
    }

    const trajetoria =
        valorBase == null
            ? []
            : buildTargetTrajectory({ anoBase, anoNearTerm, anoNetZero, valorBase, valorNearTerm, valorNetZero });

    // Conversão para absoluto (Cenários comparam emissões absolutas).
    // Para metas absolutas: já é absoluto. Para intensidade: valor × denominador(ano).
    const trajetoriaAbsoluta = !intensity
        ? trajetoria
        : trajetoria.map((p) => {
              const denom = denomAt(p.ano) ?? denomBase;
              return { ano: p.ano, valor: denom != null ? p.valor * denom : null, marco: p.marco, tipo: p.tipo };
          });

    return {
        unidade,
        tipoMeta,
        baseCoberta,
        taxaAnual,
        reducaoNearTermPct,
        reducaoNetZeroPct,
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

/**
 * Deriva a meta a partir de um objeto Meta + contexto (ergonômico/reutilizável).
 * @param {Meta} meta
 * @param {MetaTargetContext} ctx
 * @returns {Object} resultado de `computeSbtiTarget` + `metaId`.
 */
export const computeMetaTarget = (meta, ctx) => {
    // Se houver inventário do ano-base, respeita a COBERTURA por atividade
    // (escopos + exclusões da meta); senão, usa os totais por escopo.
    const emissoesPorEscopo = ctx.baseActivities
        ? coveredBaselineByScope(meta, ctx.baseActivities)
        : coveredEmissions(meta.scopes, ctx.baselineByScope);
    const denominadorPorAno =
        needsDenominator(meta.type) && meta.denominatorDriverId && ctx.getDenominatorProjection
            ? ctx.getDenominatorProjection(meta.denominatorDriverId)
            : null;

    return {
        metaId: meta.id,
        ...computeSbtiTarget({
            anoBase: ctx.baseYear,
            anoMaisRecente: ctx.recentYear,
            anoNearTerm: meta.nearTermYear,
            anoNetZero: meta.netZeroYear ?? null,
            ambicao: meta.ambition,
            tipoMeta: meta.type,
            emissoesPorEscopo,
            denominadorPorAno,
        }),
    };
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
    isIntensityType,
    needsDenominator,
    autoMetaName,
    scopesLabel,
    ANNUAL_RATES,
    MIN_LARR,
    SCOPE_NZ_PARAMS,
    NET_ZERO_REDUCTION_PCT,
    AMBITION_OPTIONS,
    TARGET_TYPE_OPTIONS,
};
