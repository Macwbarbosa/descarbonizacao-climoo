import usePlanTargetsStore from '../targets-timeframe/store/usePlanTargetsStore';
import useDriversStore from '../drivers/store/useDriversStore';
import useBauStore from '../bau/store/useBauStore';
import useInventoryStore from '../inventory/store/useInventoryStore';
import useProjectsStore from '../projects/store/useProjectsStore';
import useScenariosStore from '../scenarios/store/useScenariosStore';
import {
    readRoot,
    writeRoot,
    ensureCompany,
    getActiveCnpj,
    getActiveCompanyName,
    NO_CNPJ,
    STORE_KEYS,
} from './decarbonizationStorage';
import { writeCompanyFile, readCompanyFile } from './decarbonizationFile';

/**
 * decarbonizationExport
 * ---------------------
 * Monta o JSON limpo/semântico do módulo POR CNPJ e o salva DENTRO do projeto
 * (via `decarbonizationFile` → middleware do Vite). Também carrega de volta e
 * cuida da re-hidratação dos stores ao trocar de empresa.
 *
 * Para a empresa ATIVA lê o estado ao vivo dos stores (o que está na tela);
 * para as demais, lê o que está persistido no localStorage (raiz por CNPJ).
 */

const liveSlices = () => ({
    plan: {
        params: usePlanTargetsStore.getState().params,
        metas: usePlanTargetsStore.getState().metas,
    },
    inventory: { activities: useInventoryStore.getState().activities },
    drivers: { drivers: useDriversStore.getState().drivers },
    bau: { targetYear: useBauStore.getState().targetYear, links: useBauStore.getState().links },
    projects: { projects: useProjectsStore.getState().projects, bank: useProjectsStore.getState().bank },
    scenarios: { scenarios: useScenariosStore.getState().scenarios, activeScenarioId: useScenariosStore.getState().activeScenarioId },
});

const storedSlices = (cnpj) => {
    const company = readRoot().companies[cnpj];
    const st = (k) => company?.stores?.[k]?.state || {};
    return {
        plan: st(STORE_KEYS.plan),
        inventory: st(STORE_KEYS.inventory),
        drivers: st(STORE_KEYS.drivers),
        bau: st(STORE_KEYS.bau),
        projects: st(STORE_KEYS.projects),
        scenarios: st(STORE_KEYS.scenarios),
    };
};

/**
 * Monta o JSON de exportação (limpo) de uma empresa.
 * @param {string} [cnpj] padrão: CNPJ ativo.
 * @returns {object}
 */
export const buildCompanyExport = (cnpj = getActiveCnpj()) => {
    const isActive = cnpj === getActiveCnpj();
    const { plan, inventory, drivers, bau, projects, scenarios } = isActive ? liveSlices() : storedSlices(cnpj);
    const company = readRoot().companies[cnpj];

    return {
        modulo: 'descarbonizacao',
        cnpj,
        empresa: (isActive ? getActiveCompanyName() : company?.companyName) || null,
        exportadoEm: new Date().toISOString(),
        atualizadoEm: company?.updatedAt || null,
        metasPeriodo: { params: plan.params || null, metas: plan.metas || [] },
        inventario: { atividades: inventory?.activities || [] },
        variaveisCrescimento: { drivers: drivers.drivers || [] },
        bau: { anoAlvo: bau.targetYear ?? null, vinculos: bau.links || {} },
        bancoIniciativas: { iniciativas: projects?.bank || [] },
        projetos: { projetos: projects?.projects || [] },
        cenarios: { cenarios: scenarios?.scenarios || [], cenarioAtivoId: scenarios?.activeScenarioId || null },
    };
};

/** Monta o JSON de todas as empresas presentes no armazenamento. */
export const buildAllExport = () => {
    const root = readRoot();
    return {
        modulo: 'descarbonizacao',
        version: root.version || 1,
        exportadoEm: new Date().toISOString(),
        empresas: Object.keys(root.companies).map((cnpj) => buildCompanyExport(cnpj)),
    };
};

/** Salva o JSON de uma empresa dentro do projeto (`decarbonization-data/<cnpj>.json`). */
export const saveCompanyToProject = async (cnpj = getActiveCnpj()) => {
    const data = buildCompanyExport(cnpj);
    await writeCompanyFile(cnpj, data);
    return data;
};

/** Salva o JSON de todas as empresas conhecidas dentro do projeto. */
export const saveAllToProject = async () => {
    const cnpjs = Object.keys(readRoot().companies);
    await Promise.all(cnpjs.map((cnpj) => saveCompanyToProject(cnpj)));
    return cnpjs.length;
};

/** Re-hidrata os stores do CNPJ ativo (ou reseta, se a empresa não tiver dados). */
export const rehydrateActive = async () => {
    const root = readRoot();
    const cnpj = getActiveCnpj();
    const company = root.companies[cnpj];
    const pairs = [
        [usePlanTargetsStore, STORE_KEYS.plan],
        [useInventoryStore, STORE_KEYS.inventory],
        [useDriversStore, STORE_KEYS.drivers],
        [useBauStore, STORE_KEYS.bau],
        [useProjectsStore, STORE_KEYS.projects],
        [useScenariosStore, STORE_KEYS.scenarios],
    ];
    await Promise.all(
        pairs.map(async ([store, key]) => {
            if (company?.stores?.[key]) await store.persist.rehydrate();
            else store.getState().resetState();
        })
    );
};

/** Re-hidrata e recarrega os dados derivados (inventário/drivers) do CNPJ ativo. */
export const reloadActive = async () => {
    await rehydrateActive();
    await Promise.allSettled([
        usePlanTargetsStore.getState().loadPlanData(),
        useInventoryStore.getState().loadInventory(),
        useDriversStore.getState().loadDrivers(),
        useBauStore.getState().loadActivities(),
        useProjectsStore.getState().loadProjects(),
        useScenariosStore.getState().loadScenarios(),
    ]);
};

/**
 * Aplica um JSON (formato de `buildCompanyExport`) ao armazenamento e, se for o
 * CNPJ ativo, re-hidrata/recarrega os stores.
 * @param {object} json
 * @returns {Promise<string>} cnpj aplicado.
 */
export const importCompanyJson = async (json) => {
    const cnpj = String(json?.cnpj || '').replace(/\D/g, '') || NO_CNPJ;
    const root = readRoot();
    const company = ensureCompany(root, cnpj);
    if (json.empresa) company.companyName = json.empresa;

    const metas = json.metasPeriodo?.metas || [];
    const drivers = json.variaveisCrescimento?.drivers || [];

    const planState = { metas, selectedMetaId: metas[0]?.id || null };
    if (json.metasPeriodo?.params) planState.params = json.metasPeriodo.params;
    company.stores[STORE_KEYS.plan] = { state: planState, version: 0 };

    // Inventário por atividade (aceita o formato novo `inventario.atividades`).
    company.stores[STORE_KEYS.inventory] = { state: { activities: json.inventario?.atividades || [] }, version: 0 };
    company.stores[STORE_KEYS.drivers] = { state: { drivers, selectedId: drivers[0]?.id || null }, version: 0 };
    company.stores[STORE_KEYS.bau] = {
        state: { targetYear: json.bau?.anoAlvo ?? 2030, links: json.bau?.vinculos || {} },
        version: 0,
    };

    const projetos = json.projetos?.projetos || [];
    const iniciativas = json.bancoIniciativas?.iniciativas || [];
    company.stores[STORE_KEYS.projects] = {
        state: { projects: projetos, bank: iniciativas, selectedProjectId: projetos[0]?.id || null },
        version: 0,
    };

    const cenarios = json.cenarios?.cenarios || [];
    company.stores[STORE_KEYS.scenarios] = {
        state: { scenarios: cenarios, activeScenarioId: json.cenarios?.cenarioAtivoId || cenarios[0]?.id || null },
        version: 0,
    };
    company.updatedAt = new Date().toISOString();
    writeRoot(root);

    if (cnpj === getActiveCnpj()) await reloadActive();
    return cnpj;
};

/** Carrega do projeto o JSON salvo da empresa ativa e o aplica. */
export const loadCompanyFromProject = async (cnpj = getActiveCnpj()) => {
    const data = await readCompanyFile(cnpj);
    if (!data) return null;
    return importCompanyJson(data);
};
