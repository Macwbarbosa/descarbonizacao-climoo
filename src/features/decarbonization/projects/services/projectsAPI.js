/**
 * projectsAPI
 * -----------
 * Banco de Iniciativas (templates) + Projetos (instâncias) do módulo.
 *
 * STATUS: STUB com seed. Sem acesso ao backend, tudo é mantido localmente
 * (zustand + `cnpjScopedStorage`) e persistido no JSON por CNPJ
 * (ver `shared/decarbonizationExport`). O seed do banco espelha o "technologies
 * bank" existente (eficácia = reductionPotential) acrescido de financeiro,
 * aplicabilidade e memorial.
 *
 * TODO (backend): persistir banco e projetos em endpoint dedicado, reaproveitando
 * `technologiesBankAPI` (banco) e `initiativeAPI` (projetos) quando possível.
 */

/** @typedef {import('../utils/projectAbatement').Initiative} Initiative */
/** @typedef {import('../utils/projectAbatement').Project} Project */

/**
 * Catálogo de iniciativas (banco) — seed de exemplo.
 * @type {Initiative[]}
 */
const SEED_INITIATIVES = [
    {
        id: 'init-etanol',
        name: 'Veículo flex: gasolina → etanol',
        description: 'Conversão do uso de gasolina para etanol na frota flex.',
        fullDescription:
            'Programa de troca de combustível da frota flex de gasolina para etanol, com treinamento de motoristas e monitoramento de consumo.',
        efficacy: 80,
        applicability: { scopes: ['Escopo 1'], categories: ['Combustão móvel'] },
        memorial:
            'Abatimento = emissão da atividade × abrangência adotada × eficácia (80%). A eficácia reflete a menor intensidade de carbono do etanol vs. gasolina (well-to-wheel).',
        finance: { capex: 0, opex: 120000, revenues: 0, savings: 80000, currency: 'BRL', lifetimeYears: 10 },
    },
    {
        id: 'init-eletrificacao',
        name: 'Eletrificação de veículos leves',
        description: 'Substituição de veículos leves a combustão por elétricos.',
        fullDescription:
            'Eletrificação gradual da frota leve, com instalação de infraestrutura de recarga e energia renovável associada.',
        efficacy: 99,
        applicability: { scopes: ['Escopo 1'], categories: ['Combustão móvel'] },
        memorial: 'Abatimento = emissão × abrangência × 99%. Resíduo associado a perdas e energia de recarga não renovável.',
        finance: { capex: 1800000, opex: 60000, revenues: 0, savings: 150000, currency: 'BRL', lifetimeYears: 12 },
    },
    {
        id: 'init-biodiesel',
        name: 'Biodiesel (B20+) na frota pesada',
        description: 'Adoção de biodiesel B20 ou superior.',
        fullDescription: 'Uso de biodiesel em veículos pesados e combustão móvel a diesel, com adaptações e monitoramento.',
        efficacy: 18,
        applicability: { scopes: ['Escopo 1'], categories: ['Combustão móvel'] },
        memorial: 'Abatimento = emissão × abrangência × 18% (fração renovável da mistura).',
        finance: { capex: 0, opex: 90000, revenues: 0, savings: 0, currency: 'BRL', lifetimeYears: 8 },
    },
    {
        id: 'init-ecodriving',
        name: 'Direção econômica',
        description: 'Treinamento em direção eficiente.',
        fullDescription: 'Capacitação de motoristas em técnicas de economia de combustível e manutenção preventiva.',
        efficacy: 12,
        applicability: { scopes: ['Escopo 1'], categories: ['Combustão móvel', 'Combustão estacionária'] },
        memorial: 'Abatimento = emissão × abrangência × 12% (economia média observada).',
        finance: { capex: 0, opex: 30000, revenues: 0, savings: 50000, currency: 'BRL', lifetimeYears: 5 },
    },
    {
        id: 'init-irec',
        name: 'Eletricidade renovável (I-RECs)',
        description: 'Certificados de energia renovável.',
        fullDescription: 'Aquisição de I-RECs para cobrir o consumo elétrico, zerando as emissões de Escopo 2 (market-based).',
        efficacy: 100,
        applicability: { scopes: ['Escopo 2'], categories: ['Energia elétrica - Método baseado na Localização', 'Energia elétrica - Método baseado no mercado'] },
        memorial: 'Abatimento = emissão de Escopo 2 × abrangência × 100% (market-based).',
        finance: { capex: 0, opex: 200000, revenues: 0, savings: 0, currency: 'BRL', lifetimeYears: 10 },
    },
];

/**
 * Projetos de exemplo (seed) — usa ids de atividade do seed do BAU.
 * @type {Project[]}
 */
const SEED_PROJECTS = [
    {
        id: 'proj-veiculos-etanol',
        name: 'Veículos leves: gasolina → etanol',
        initiativeId: 'init-etanol',
        memberActivityIds: ['act-gasolina'],
        startYear: 2026,
        endYear: 2035,
        coveragePoints: [
            { year: 2030, pct: 76 },
            { year: 2035, pct: 85 },
        ],
        scenarioOverrides: {},
    },
];

/** Lê o banco de iniciativas (seed). @returns {Promise<Initiative[]>} */
export const getInitiativeBank = async () => SEED_INITIATIVES.map((i) => ({ ...i }));

/** Lê os projetos (seed). @returns {Promise<Project[]>} */
export const getProjects = async () => SEED_PROJECTS.map((p) => ({ ...p }));

/** Persiste um projeto (best-effort — stub). */
export const saveProject = async (project) => project;
/** Persiste uma iniciativa do banco (best-effort — stub). */
export const saveInitiative = async (initiative) => initiative;

export default { getInitiativeBank, getProjects, saveProject, saveInitiative };
