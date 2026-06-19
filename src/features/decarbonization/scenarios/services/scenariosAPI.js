/**
 * scenariosAPI
 * ------------
 * Cenários de descarbonização (combinações de Projetos). STUB com seed.
 * Sem backend editável: estado mantido por CNPJ (`cnpjScopedStorage`) e
 * persistido no JSON do módulo (`shared/decarbonizationExport`).
 *
 * TODO (backend): persistir via `scenarioAPI` (/api/v0/decarbonization/scenario/)
 * quando o schema de itens (projetoId + overrides) for suportado.
 */

/** @typedef {import('../utils/scenarioCalc').Scenario} Scenario */

/** Cenários de exemplo, referenciando o projeto seed (proj-veiculos-etanol). */
const SEED_SCENARIOS = [
    {
        id: 'scn-conservador',
        name: 'Conservador',
        items: [
            {
                projetoId: 'proj-veiculos-etanol',
                included: true,
                overrides: { coveragePoints: [{ year: 2030, pct: 40 }, { year: 2035, pct: 55 }] },
            },
        ],
    },
    {
        id: 'scn-ambicioso',
        name: 'Ambicioso',
        items: [{ projetoId: 'proj-veiculos-etanol', included: true }],
    },
    {
        id: 'scn-netzero',
        name: 'Net-zero',
        items: [
            {
                projetoId: 'proj-veiculos-etanol',
                included: true,
                overrides: { coveragePoints: [{ year: 2030, pct: 90 }, { year: 2035, pct: 100 }] },
            },
        ],
    },
];

/** Lê os cenários (seed). @returns {Promise<Scenario[]>} */
export const getScenarios = async () => SEED_SCENARIOS.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i })) }));

/** Persiste um cenário (best-effort — stub). */
export const saveScenario = async (scenario) => scenario;

export default { getScenarios, saveScenario };
