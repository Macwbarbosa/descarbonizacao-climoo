export { default as ProjectsPage } from './ProjectsPage';
// Saídas públicas reutilizáveis pela Etapa 6 (Cenários/MACC):
export {
    projectAbatementByYear, // abatimento por projeto por ano (barra da cascata / linha do cenário)
    abatementByActivityInYear, // abatimento por atividade (atribuição na cascata)
    projectAbatementByScopeInYear, // abatimento por escopo
    projectFinanceSummary, // financeiros derivados (MACC, comparativos de custo)
    activityToProjectsMap, // relação atividade → projeto(s) (cap de não dupla contagem)
    coverageInYear,
    abatementInYear,
} from './utils/projectAbatement';
