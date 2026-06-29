/**
 * metaScopes
 * ----------
 * Helpers para relacionar METAS (escopos) ↔ ATIVIDADES (inventário) ↔ PROJETOS.
 *
 * Uma meta tem `scopes: { scope1, scope2, scope3 }`. As atividades têm
 * `scope: 'Escopo 1' | 'Escopo 2' | 'Escopo 3'`. Um projeto pode estar vinculado
 * a VÁRIAS metas (`project.metaIds: string[]`, N:N). Os escopos disponíveis de um
 * projeto são a UNIÃO dos escopos das suas metas.
 */

export const SCOPES = ['Escopo 1', 'Escopo 2', 'Escopo 3'];

/** Rótulos de escopo do inventário cobertos por uma meta (ex.: ['Escopo 1','Escopo 2']). */
export const metaScopeLabels = (meta) => SCOPES.filter((s) => meta?.scopes?.[`scope${s.slice(-1)}`]);

/** Metas vinculadas a um projeto (compat: array vazio se ausente). */
export const projectMetaIds = (project) => (Array.isArray(project?.metaIds) ? project.metaIds : []);

/** Nomes das metas de um projeto (para tags/colunas). */
export const metaNamesOf = (project, metasById) =>
    projectMetaIds(project)
        .map((id) => metasById[id]?.name)
        .filter(Boolean);

/**
 * União dos escopos das metas do projeto. Vazio quando o projeto não tem meta
 * (ou as metas não têm escopo) — nesse caso, sem filtro (todas as atividades).
 */
export const allowedScopesForProject = (project, metasById) => {
    const set = new Set();
    projectMetaIds(project).forEach((id) => metaScopeLabels(metasById[id]).forEach((s) => set.add(s)));
    return [...set];
};

/**
 * Atividades disponíveis para um projeto: dentro dos escopos das suas metas,
 * MAIS as já selecionadas (membro) — para nunca "sumir" com seleções existentes
 * ao trocar a meta. Sem meta/escopo → todas as atividades.
 */
export const activitiesForProject = (activities, project, metasById) => {
    const allowed = allowedScopesForProject(project, metasById);
    if (allowed.length === 0) return activities;
    const members = new Set(project?.memberActivityIds || []);
    return activities.filter((a) => allowed.includes(a.scope) || members.has(a.id));
};

/** Atividades EXCLUÍDAS da cobertura de uma meta (Set). */
export const metaExcludedSet = (meta) => new Set(meta?.excludedActivityIds || []);

/**
 * Uma atividade é COBERTA por uma meta quando seu escopo está nos escopos da
 * meta E ela não está na lista de exclusão. Default (sem exclusões) = 100%.
 */
export const metaCoversActivity = (meta, activity, excluded = metaExcludedSet(meta)) =>
    metaScopeLabels(meta).includes(activity?.scope) && !excluded.has(activity?.id);

/** Atividades cobertas por uma meta (dentro dos escopos e não excluídas). */
export const metaCoveredActivities = (meta, activities) => {
    const excluded = metaExcludedSet(meta);
    const scopes = metaScopeLabels(meta);
    return (activities || []).filter((a) => scopes.includes(a.scope) && !excluded.has(a.id));
};

export default {
    SCOPES,
    metaScopeLabels,
    projectMetaIds,
    metaNamesOf,
    allowedScopesForProject,
    activitiesForProject,
    metaExcludedSet,
    metaCoversActivity,
    metaCoveredActivities,
};
