/**
 * Utilitários de mês para o cronograma do plano.
 * Mês é representado pela string 'YYYY-MM' (ex.: '2026-07').
 */

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** {year, month} a partir de 'YYYY-MM' (ou null). */
export const parseMonth = (s) => {
    const m = /^(\d{4})-(\d{2})$/.exec(String(s || ''));
    return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
};

/** Índice absoluto: 'YYYY-MM' → year*12 + (month-1). */
export const monthIndex = (s) => {
    const p = parseMonth(s);
    return p ? p.year * 12 + (p.month - 1) : null;
};

/** Índice absoluto → 'YYYY-MM'. */
export const monthFromIndex = (idx) => `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;

/** Abreviação do mês: '2026-07' → 'jul'. */
export const monthShort = (s) => {
    const p = parseMonth(s);
    return p ? MONTHS_SHORT[p.month - 1] : '';
};

/** Rótulo curto: '2026-07' → 'jul/26'. */
export const monthLabel = (s) => {
    const p = parseMonth(s);
    return p ? `${MONTHS_SHORT[p.month - 1]}/${String(p.year).slice(2)}` : '';
};

export const monthYear = (s) => parseMonth(s)?.year ?? null;

/** Lista de meses (inclusiva) entre dois 'YYYY-MM'. */
export const monthRange = (from, to) => {
    const a = monthIndex(from);
    const b = monthIndex(to);
    if (a == null || b == null || b < a) return [];
    const out = [];
    for (let i = a; i <= b; i += 1) out.push(monthFromIndex(i));
    return out;
};

/**
 * Amplitude de meses que cobre todas as etapas com datas. Retorna [] se nenhuma
 * etapa tiver datas.
 */
export const spanMonths = (stages) => {
    const idxs = [];
    (stages || []).forEach((s) => {
        const a = monthIndex(s.startMonth);
        const b = monthIndex(s.endMonth);
        if (a != null) idxs.push(a);
        if (b != null) idxs.push(b);
    });
    if (!idxs.length) return [];
    return monthRange(monthFromIndex(Math.min(...idxs)), monthFromIndex(Math.max(...idxs)));
};

/** Migração: trimestre 'YYYY-Qn' → mês inicial/final ('YYYY-MM'). */
export const quarterToStartMonth = (q) => {
    const m = /^(\d{4})-Q([1-4])$/.exec(String(q || ''));
    return m ? `${m[1]}-${String((Number(m[2]) - 1) * 3 + 1).padStart(2, '0')}` : null;
};
export const quarterToEndMonth = (q) => {
    const m = /^(\d{4})-Q([1-4])$/.exec(String(q || ''));
    return m ? `${m[1]}-${String(Number(m[2]) * 3).padStart(2, '0')}` : null;
};
