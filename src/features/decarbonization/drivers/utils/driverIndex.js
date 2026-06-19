/**
 * driverIndex
 * -----------
 * Núcleo de cálculo das Variáveis de Crescimento (drivers).
 *
 * Cada driver é normalizado, qualquer que seja o método de entrada, para uma
 * **série de índice base 100 no ano-base**. É essa série (`indicePorAno`) que a
 * Etapa 4 (Projeção BAU) consome — importe estas funções de cá em vez de
 * reimplementar a regra.
 *
 * Funções puras (sem estado/efeitos): seguras para usar em render e memo.
 */

/**
 * @typedef {('period'|'avg'|'yearly')} DriverMethod
 * @typedef {('Físico'|'Financeiro'|'Operacional')} DriverType
 */

/**
 * @typedef {Object} DriverSegment
 * @property {number} from  Ano inicial do trecho (inclusive).
 * @property {number} to    Ano final do trecho (inclusive).
 * @property {number} g     Crescimento %/ano aplicado no trecho.
 */

/**
 * @typedef {Object} Driver
 * @property {string} id
 * @property {string} name
 * @property {string} unit                Unidade (ex.: 'ton/ano', 'R$ MM', 'un.', 'pessoas').
 * @property {DriverType} type
 * @property {string} note                Premissa / fonte (memorial).
 * @property {number} baseValue           Valor no ano-base (só contexto/histórico; BAU usa o índice).
 * @property {DriverMethod} method
 * @property {number} avgRate             Taxa média única (%/ano) — método 'avg'.
 * @property {DriverSegment[]} segments   Trechos — método 'period'.
 * @property {Record<number, number>} yearly   VALORES ABSOLUTOS por ano (na unidade do driver) — método 'yearly'. O crescimento/índice é derivado tendo `baseValue` como âncora no ano-base.
 * @property {Record<number, number>} history  Valores absolutos por ano anterior ao ano-base.
 * @property {string[]} usedBy            Atividades emissoras vinculadas (preenchido na Etapa 4).
 * @property {string|null} [siteId]       Escopo opcional de unidade (multi-site futuro; não usado agora).
 */

/**
 * @typedef {Object} Horizon
 * @property {number} baseYear Ano-base (fonte única: tela Metas & Período).
 * @property {number} endYear  Último ano do horizonte do plano.
 */

/** Limiar (%/ano) acima do qual o crescimento é sinalizado como implausível. */
export const IMPLAUSIBLE_RATE_THRESHOLD = 20;

/**
 * Crescimento (%/ano) de um driver em um ano, conforme o método.
 * @param {Driver} driver
 * @param {number} year
 * @param {number} baseYear
 * @returns {number}
 */
export const crescimentoNoAno = (driver, year, baseYear) => {
    if (!driver || year <= baseYear) return 0;
    if (driver.method === 'avg') return Number(driver.avgRate) || 0;
    if (driver.method === 'yearly') {
        // `yearly` guarda VALORES ABSOLUTOS — deriva o crescimento %/ano a partir
        // do valor do ano anterior (ano-base usa `baseValue`). Ano sem valor (0) = sem variação.
        const base = Number(driver.baseValue) || 0;
        const prevRaw = year - 1 <= baseYear ? base : Number(driver.yearly?.[year - 1]);
        const prev = prevRaw > 0 ? prevRaw : base;
        const curr = Number(driver.yearly?.[year]);
        if (!(prev > 0) || !Number.isFinite(curr) || curr <= 0) return 0;
        return ((curr - prev) / prev) * 100;
    }
    // 'period'
    const seg = (driver.segments || []).find((s) => year >= s.from && year <= s.to);
    return seg ? Number(seg.g) || 0 : 0;
};

/**
 * Índice (base 100 no ano-base) de um driver em um ano.
 * @param {Driver} driver
 * @param {number} year
 * @param {number} baseYear
 * @returns {number}
 */
export const indice = (driver, year, baseYear) => {
    let v = 100;
    for (let yy = baseYear + 1; yy <= year; yy += 1) {
        v *= 1 + crescimentoNoAno(driver, yy, baseYear) / 100;
    }
    return v;
};

/**
 * Série de índice anual (ano-base → endYear). Saída pública reutilizável pela Etapa 4.
 * @param {Driver} driver
 * @param {Horizon} horizon
 * @returns {Array<{ year: number, index: number }>}
 */
export const indicePorAno = (driver, { baseYear, endYear }) => {
    const out = [];
    for (let y = baseYear; y <= endYear; y += 1) {
        out.push({ year: y, index: indice(driver, y, baseYear) });
    }
    return out;
};

/**
 * Deriva crescimento %/ano a partir de uma série de valores ABSOLUTOS por ano.
 * Usado pela ação "colar valores absolutos" do método ano-a-ano.
 *
 * TODO: refinar heurística de alinhamento (ex.: detectar cabeçalho de anos,
 *       lidar com lacunas) ao integrar com importação de planilha real.
 *
 * @param {Record<number, number>} absByYear Mapa { ano: valorAbsoluto }.
 * @param {number} baseYear
 * @returns {Record<number, number>} Mapa { ano: crescimento %/ano } para anos > baseYear.
 */
export const derivarCrescimentoDeAbsolutos = (absByYear, baseYear) => {
    const years = Object.keys(absByYear)
        .map(Number)
        .filter((y) => Number.isFinite(y))
        .sort((a, b) => a - b);

    const yearly = {};
    for (let i = 1; i < years.length; i += 1) {
        const year = years[i];
        const prev = Number(absByYear[years[i - 1]]);
        const curr = Number(absByYear[year]);
        if (year > baseYear && prev > 0 && Number.isFinite(curr)) {
            yearly[year] = Number((((curr - prev) / prev) * 100).toFixed(2));
        }
    }
    return yearly;
};

/**
 * Sinaliza crescimento implausível (taxa muito alta sustentada). Não bloqueante.
 * @param {Driver} driver
 * @param {Horizon} horizon
 * @param {number} [threshold]
 * @returns {{ implausible: boolean, maxRate: number }}
 */
export const detectImplausibleGrowth = (driver, { baseYear, endYear }, threshold = IMPLAUSIBLE_RATE_THRESHOLD) => {
    let maxRate = 0;
    for (let y = baseYear + 1; y <= endYear; y += 1) {
        const r = crescimentoNoAno(driver, y, baseYear);
        if (r > maxRate) maxRate = r;
    }
    return { implausible: maxRate > threshold, maxRate };
};

export default {
    crescimentoNoAno,
    indice,
    indicePorAno,
    derivarCrescimentoDeAbsolutos,
    detectImplausibleGrowth,
};
