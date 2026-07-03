/**
 * Utilitários de trimestre para o cronograma do plano.
 * Trimestre é representado pela string 'YYYY-Qn' (ex.: '2026-Q3').
 */

/** {year, q} a partir de 'YYYY-Qn' (ou null). */
export const parseQuarter = (s) => {
    const m = /^(\d{4})-Q([1-4])$/.exec(String(s || ''));
    return m ? { year: Number(m[1]), q: Number(m[2]) } : null;
};

/** Índice absoluto (para ordenar/contar): 'YYYY-Qn' → year*4 + (q-1). */
export const quarterIndex = (s) => {
    const p = parseQuarter(s);
    return p ? p.year * 4 + (p.q - 1) : null;
};

/** Índice absoluto → 'YYYY-Qn'. */
export const quarterFromIndex = (idx) => `${Math.floor(idx / 4)}-Q${(idx % 4) + 1}`;

/** Rótulo curto: '2026-Q3' → 'T3 2026'. */
export const quarterLabel = (s) => {
    const p = parseQuarter(s);
    return p ? `T${p.q} ${p.year}` : '';
};

/** Ano de um trimestre ('2026-Q3' → 2026). */
export const quarterYear = (s) => parseQuarter(s)?.year ?? null;

/** Lista de trimestres (inclusiva) entre dois 'YYYY-Qn'. */
export const quarterRange = (from, to) => {
    const a = quarterIndex(from);
    const b = quarterIndex(to);
    if (a == null || b == null || b < a) return [];
    const out = [];
    for (let i = a; i <= b; i += 1) out.push(quarterFromIndex(i));
    return out;
};

/** Opções de trimestre para selects, de 2025-Q1 a 2029-Q4. */
export const QUARTER_OPTIONS = (() => {
    const out = [];
    for (let year = 2025; year <= 2029; year += 1) {
        for (let q = 1; q <= 4; q += 1) out.push({ value: `${year}-Q${q}`, label: `T${q} ${year}` });
    }
    return out;
})();

/**
 * Amplitude de trimestres que cobre todas as etapas com datas (com uma folga de
 * um trimestre em cada ponta). Retorna [] se nenhuma etapa tiver datas.
 */
export const spanQuarters = (stages) => {
    const idxs = [];
    (stages || []).forEach((s) => {
        const a = quarterIndex(s.startQuarter);
        const b = quarterIndex(s.endQuarter);
        if (a != null) idxs.push(a);
        if (b != null) idxs.push(b);
    });
    if (!idxs.length) return [];
    const min = Math.min(...idxs);
    const max = Math.max(...idxs);
    return quarterRange(quarterFromIndex(min), quarterFromIndex(max));
};
