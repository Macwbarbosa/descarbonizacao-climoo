import { useAuthStore } from '@/features/auth/shared/store/authStore';

/**
 * decarbonizationStorage
 * ----------------------
 * Persistência local do módulo de Descarbonização SEPARADA POR CNPJ.
 *
 * Como não há permissão para o backend, todo o estado do módulo (Metas &
 * Período, Variáveis de Crescimento, Projeção BAU) é guardado no localStorage
 * sob uma única raiz, particionada por CNPJ da empresa selecionada (authStore).
 * Esse mesmo conteúdo é o que será exportado em JSON (ver `decarbonizationExport`).
 *
 * `cnpjScopedStorage` é um `PersistStorage` do zustand: cada store grava/lê a
 * sua fatia dentro de `companies[<cnpj>].stores[<nomeDoStore>]`.
 */

export const ROOT_KEY = 'climoo-decarbonization-data';
export const NO_CNPJ = '_sem_cnpj';

/** Nomes (chaves) de cada store dentro de uma empresa. */
export const STORE_KEYS = {
    plan: 'decarbonization-plan-targets-store',
    inventory: 'decarbonization-inventory-store',
    drivers: 'decarbonization-drivers-store',
    bau: 'decarbonization-bau-store',
    projects: 'decarbonization-projects-store',
    scenarios: 'decarbonization-scenarios-store',
};

export const getSelectedCompany = () => useAuthStore.getState().user?.selectedCompany || null;

/** CNPJ ativo (somente dígitos) ou `_sem_cnpj` quando não houver empresa. */
export const getActiveCnpj = () => {
    const company = getSelectedCompany();
    const digits = company?.cnpj ? String(company.cnpj).replace(/\D/g, '') : '';
    return digits || NO_CNPJ;
};

export const getActiveCompanyName = () => getSelectedCompany()?.company || null;

/** Formata CNPJ (14 dígitos) para exibição. */
export const formatCnpj = (digits) => {
    const d = String(digits || '').replace(/\D/g, '');
    if (d.length !== 14) return digits || '—';
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

export const readRoot = () => {
    try {
        return JSON.parse(localStorage.getItem(ROOT_KEY)) || { version: 1, companies: {} };
    } catch (e) {
        return { version: 1, companies: {} };
    }
};

export const writeRoot = (root) => {
    try {
        localStorage.setItem(ROOT_KEY, JSON.stringify(root));
    } catch (e) {
        // localStorage indisponível/quota — ignora (estado em memória continua válido)
    }
};

/** Garante (e retorna) o nó da empresa na raiz. */
export const ensureCompany = (root, cnpj) => {
    if (!root.companies[cnpj]) {
        // eslint-disable-next-line no-param-reassign
        root.companies[cnpj] = { cnpj, companyName: getActiveCompanyName(), updatedAt: null, stores: {} };
    }
    return root.companies[cnpj];
};

/**
 * `PersistStorage` do zustand, escopado pelo CNPJ ativo. Lida com objetos
 * (`{ state, version }`) — sem stringificação extra — para o JSON exportado
 * ficar limpo e aninhado.
 */
export const cnpjScopedStorage = {
    getItem: (name) => {
        const root = readRoot();
        const cnpj = getActiveCnpj();
        return root.companies[cnpj]?.stores?.[name] ?? null;
    },
    setItem: (name, value) => {
        const root = readRoot();
        const cnpj = getActiveCnpj();
        const company = ensureCompany(root, cnpj);
        company.stores[name] = value;
        company.companyName = getActiveCompanyName() || company.companyName;
        company.updatedAt = new Date().toISOString();
        writeRoot(root);
    },
    removeItem: (name) => {
        const root = readRoot();
        const cnpj = getActiveCnpj();
        if (root.companies[cnpj]?.stores) {
            delete root.companies[cnpj].stores[name];
            writeRoot(root);
        }
    },
};
