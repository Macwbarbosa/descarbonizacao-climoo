/**
 * inventoryAPI
 * ------------
 * Inventário de emissões POR ATIVIDADE (Escopo › Categoria › Atividade). É a
 * FONTE ÚNICA consumida por: Metas (totais por escopo), BAU (atividades) e
 * Cenários. Substitui a antiga "Emissões Ano-Base" do wizard removido.
 *
 * STATUS: STUB com seed. Sem backend editável, o estado é mantido por CNPJ
 * (`cnpjScopedStorage`) e persistido no JSON do módulo.
 *
 * TODO (backend): integrar com `/api/v0/decarbonization/baseline-emission/`
 * (serviço `baselineEmissionsAPI`) — mapear { scope, category, activity, emission }.
 */

/**
 * @typedef {Object} InventoryActivity
 * @property {string} id
 * @property {string} scope     'Escopo 1' | 'Escopo 2' | 'Escopo 3'
 * @property {string} category
 * @property {string} name
 * @property {number} emission  Emissão do ano-base (tCO2e).
 */

/** Seed de exemplo (mock) — espelha as atividades usadas no BAU. */
const SEED_ACTIVITIES = [
    { id: 'act-diesel', scope: 'Escopo 1', category: 'Combustão móvel', name: 'Diesel – frota', emission: 14000 },
    { id: 'act-gasolina', scope: 'Escopo 1', category: 'Combustão móvel', name: 'Gasolina – frota leve', emission: 4000 },
    { id: 'act-gn', scope: 'Escopo 1', category: 'Combustão estacionária', name: 'Gás natural – caldeiras', emission: 11000 },
    { id: 'act-glp', scope: 'Escopo 1', category: 'Combustão estacionária', name: 'GLP – fornos', emission: 3000 },
    { id: 'act-proc', scope: 'Escopo 1', category: 'Processos industriais', name: 'Emissões de processo', emission: 9000 },
    { id: 'act-energia', scope: 'Escopo 2', category: 'Energia elétrica - Método baseado na Localização', name: 'Energia da rede', emission: 22000 },
    { id: 'act-log', scope: 'Escopo 3', category: 'Transporte e Distribuição (upstream)', name: 'Logística terceirizada', emission: 12000 },
    { id: 'act-viagens', scope: 'Escopo 3', category: 'Viagens a negócios', name: 'Viagens a negócio', emission: 4000 },
    { id: 'act-compras', scope: 'Escopo 3', category: 'Compra de bens e serviços', name: 'Compras (cat. 1)', emission: 14000 },
    { id: 'act-embalagens', scope: 'Escopo 3', category: 'Compra de bens e serviços', name: 'Embalagens', emission: 7000 },
];

/** Lê o inventário (seed). @returns {Promise<InventoryActivity[]>} */
export const getInventory = async () => SEED_ACTIVITIES.map((a) => ({ ...a }));

/** Persiste o inventário (best-effort — stub). */
export const saveInventory = async (activities) => activities;

export default { getInventory, saveInventory };
