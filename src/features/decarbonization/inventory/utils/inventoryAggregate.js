/**
 * Utilitários do inventário: agregação por escopo (saída reutilizável por Metas
 * e Cenários) e parsing de CSV para upload.
 */

export const SCOPES = ['Escopo 1', 'Escopo 2', 'Escopo 3'];

/**
 * Categorias por escopo — MESMA regra do módulo de Emissões (espelha o
 * `scopes` de `emissions/data-collection/utils/base-dictionary.js`). Usado para
 * o seletor de Categoria depender do Escopo no cadastro de atividade.
 */
export const CATEGORIES_BY_SCOPE = {
    'Escopo 1': [
        'Atividades agrícolas',
        'Combustão estacionária',
        'Combustão móvel',
        'Efluentes',
        'Emissões fugitivas',
        'Emissões fugitivas não quioto',
        'Mudança no Uso do Solo',
        'Processos industriais',
        'Resíduos',
    ],
    'Escopo 2': ['Energia elétrica - Método baseado na Localização', 'Energia elétrica - Método baseado no mercado'],
    'Escopo 3': [
        'Compra de bens e serviços',
        'Bens de capital',
        'Outras emissões do ciclo de vida de combustíveis e eletricidade',
        'Transporte e Distribuição (upstream)',
        'Resíduos',
        'Viagens a negócios',
        'Deslocamento de funcionários',
        'Bens arrendados (upstream)',
        'Transporte e Distribuição (downstream)',
        'Processamento de produtos vendidos',
        'Uso de bens e serviços vendidos',
        'Tratamento de fim de vida dos produtos vendidos',
        'Bens arrendados (a organização como arrendadora)',
        'Franquias',
        'Investimentos',
        'Outras emissões não categorizadas no Escopo 3',
    ],
};

/** Lista de categorias de um escopo (vazio se escopo desconhecido). */
export const categoriesForScope = (scope) => CATEGORIES_BY_SCOPE[scope] || [];

/**
 * Agrega as atividades do inventário em totais por escopo (chaves scope1/2/3).
 * @param {Array<{ scope:string, emission:number }>} activities
 * @returns {{ scope1:number, scope2:number, scope3:number }}
 */
export const aggregateByScope = (activities = []) => {
    const totals = { scope1: 0, scope2: 0, scope3: 0 };
    (activities || []).forEach((a) => {
        const v = Number(a?.emission) || 0;
        if (a.scope === 'Escopo 1') totals.scope1 += v;
        else if (a.scope === 'Escopo 2') totals.scope2 += v;
        else if (a.scope === 'Escopo 3') totals.scope3 += v;
    });
    return totals;
};

/** Normaliza o valor de escopo vindo do CSV ('1', 'scope1', 'Escopo 1'...) → 'Escopo N'. */
export const normalizeScope = (raw) => {
    const s = String(raw || '').toLowerCase().replace(/\D/g, '');
    if (s.includes('1')) return 'Escopo 1';
    if (s.includes('2')) return 'Escopo 2';
    if (s.includes('3')) return 'Escopo 3';
    return 'Escopo 1';
};

/** Converte número em formato pt-BR/eng para Number. */
export const parseNumber = (raw) => {
    if (typeof raw === 'number') return raw;
    let s = String(raw || '').trim().replace(/[^\d.,-]/g, '');
    if (s.includes(',')) {
        // pt-BR: vírgula é o decimal; pontos são milhar (1.234.567,89 → 1234567.89).
        s = s.replace(/\./g, '').replace(',', '.');
    } else if ((s.match(/\./g) || []).length > 1) {
        // Sem vírgula, mas vários pontos → todos são milhar (1.661.092.971 → 1661092971).
        s = s.replace(/\./g, '');
    }
    // Um único ponto sem vírgula é mantido (decimal en-US, ex.: 1234.56).
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
};

/** Compõe o nome da atividade prefixando o grupo com " | " quando houver. */
export const activityNameWithGroup = (group, name) => {
    const g = String(group || '').trim();
    const n = String(name || '').trim();
    return g ? `${g} | ${n}` : n;
};

/**
 * Mapeia linhas de planilha (objetos com cabeçalho) em atividades do inventário.
 * Cabeçalhos pt/en: escopo/scope, categoria/category, atividade/activity/nome,
 * emissao/emission, grupo/group (vai para o nome via " | "), ano/year (opcional;
 * cai no `fallbackYear` quando ausente).
 * @param {Array<Object>} rows
 * @param {(prefix:string)=>string} makeId gerador de id
 * @param {number} [fallbackYear] ano usado quando a linha não traz coluna ano
 * @returns {{ activities: Array, skipped: number }}
 */
export const rowsToActivities = (rows, makeId, fallbackYear) => {
    const pick = (row, keys) => {
        const found = Object.keys(row).find((k) => keys.includes(k.trim().toLowerCase()));
        return found ? row[found] : undefined;
    };
    let skipped = 0;
    const activities = [];
    (rows || []).forEach((row) => {
        const name = pick(row, ['atividade', 'activity', 'nome', 'name']);
        const scope = pick(row, ['escopo', 'scope']);
        const category = pick(row, ['categoria', 'category']);
        const group = pick(row, ['grupo', 'group']);
        const emission = pick(row, ['emissao', 'emissão', 'emission', 'tco2e']);
        const yearRaw = pick(row, ['ano', 'year']);
        if (!name || emission == null || emission === '') {
            skipped += 1;
            return;
        }
        const year = yearRaw != null && String(yearRaw).trim() !== '' ? Math.round(parseNumber(yearRaw)) : fallbackYear;
        activities.push({
            id: makeId('act'),
            scope: normalizeScope(scope),
            category: String(category || '—').trim() || '—',
            name: activityNameWithGroup(group, name),
            emission: parseNumber(emission),
            ...(year != null ? { year } : {}),
        });
    });
    return { activities, skipped };
};

/** Atividades de um ano específico (`a.year ?? baseYear` p/ inventários legados sem ano). */
export const activitiesForYear = (activities, year, baseYear) =>
    (activities || []).filter((a) => (a.year ?? baseYear) === year);

/** Anos presentes no inventário (distintos), considerando o ano-base p/ legados. */
export const yearsPresent = (activities, baseYear, extraYears = []) => {
    const set = new Set([baseYear, ...extraYears].filter((y) => y != null));
    (activities || []).forEach((a) => set.add(a.year ?? baseYear));
    return [...set].sort((a, b) => a - b);
};

/**
 * Converte os dados da "Tabela de Emissões" (módulo Emissões) em atividades do
 * inventário: agrupa por escopo|categoria|grupo|atividade e SOMA o tCO2e (a tabela
 * tem uma linha por mês). O **grupo** entra no NOME via " | " (`grupo | atividade`).
 * Escopo normalizado; cada atividade recebe o `year` informado.
 * @param {Array<{ scope?:string, group?:string, category?:string, summary?:string, tCO2e?:(number|string) }>} emissions
 * @param {(prefix:string)=>string} makeId
 * @param {number} [year] ano a marcar nas atividades importadas
 * @param {(groupId:string)=>string} [resolveGroup] resolve o ID do grupo no NOME
 *        (a Tabela de Emissões guarda o grupo como ID); retorna '' p/ omitir.
 * @returns {Array<{ id, scope, category, name, emission, year? }>}
 */
export const emissionsToInventory = (emissions, makeId, year, resolveGroup) => {
    const groups = {};
    (emissions || []).forEach((e) => {
        const activity = String(e.summary || '').trim();
        if (!activity) return;
        const scope = normalizeScope(e.scope);
        const category = String(e.category || '—').trim() || '—';
        const groupLabel = resolveGroup ? resolveGroup(e.group) : '';
        const name = activityNameWithGroup(groupLabel, activity);
        const key = `${scope}||${category}||${name}`;
        if (!groups[key]) groups[key] = { id: makeId('act'), scope, category, name, emission: 0, ...(year != null ? { year } : {}) };
        groups[key].emission += parseNumber(e.tCO2e);
    });
    return Object.values(groups);
};

export default {
    aggregateByScope,
    normalizeScope,
    parseNumber,
    rowsToActivities,
    emissionsToInventory,
    activityNameWithGroup,
    activitiesForYear,
    yearsPresent,
    categoriesForScope,
    SCOPES,
    CATEGORIES_BY_SCOPE,
};
