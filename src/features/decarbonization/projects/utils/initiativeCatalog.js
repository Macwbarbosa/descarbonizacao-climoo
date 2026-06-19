/**
 * initiativeCatalog
 * -----------------
 * Unifica as DUAS fontes de iniciativas consumidas pelos Projetos:
 *  - o CATÁLOGO GLOBAL compartilhado (Banco de tecnologias, `technologyBankStore`),
 *    convertido para o formato de Iniciativa — eficácia = potencial de redução;
 *    sem financeiro (custo 0 no MACC até alguém cadastrar);
 *  - as iniciativas EXCLUSIVAS da empresa (banco por CNPJ, `useProjectsStore.bank`),
 *    que podem ter financeiro/aplicabilidade/memorial completos.
 *
 * Cada item carrega `source: 'global' | 'empresa'` para a UI distinguir a origem.
 * Os Projetos referenciam por `initiativeId` — itens globais usam o prefixo
 * `tech-<id>` para não colidir com os uuids das exclusivas.
 */

export const GLOBAL_INITIATIVE_PREFIX = 'tech-';

/** Converte uma tecnologia do catálogo global no formato de Iniciativa. */
export const technologyToInitiative = (t) => ({
    id: `${GLOBAL_INITIATIVE_PREFIX}${t.id}`,
    name: t.name,
    description: t.description || '',
    fullDescription: t.fullDescription || '',
    efficacy: Number(t.reductionPotential) || 0,
    applicability: { scopes: [], categories: [] },
    memorial: t.fullDescription || '',
    finance: { capex: 0, opex: 0, revenues: 0, savings: 0, currency: 'BRL', lifetimeYears: 10 },
    reference: t.reference || '',
    partners: t.partners || '',
    source: 'global',
});

/** Lista unificada: exclusivas da empresa (topo) + catálogo global. */
export const mergedInitiatives = (companyBank = [], technologies = []) => [
    ...(companyBank || []).map((i) => ({ ...i, source: 'empresa' })),
    ...(technologies || []).map(technologyToInitiative),
];

/** Mapa id → iniciativa da lista unificada (p/ resolver `initiativeId` nos cálculos). */
export const mergedInitiativesById = (companyBank = [], technologies = []) =>
    Object.fromEntries(mergedInitiatives(companyBank, technologies).map((i) => [i.id, i]));

export default { GLOBAL_INITIATIVE_PREFIX, technologyToInitiative, mergedInitiatives, mergedInitiativesById };
