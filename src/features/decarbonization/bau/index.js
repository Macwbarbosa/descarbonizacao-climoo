export { default as BauProjectionPage } from './BauProjectionPage';
// Saídas públicas reutilizáveis pelas Etapas 5 (Projetos) e 6 (Cenários):
export {
    activityEmissionByYear, // emissão por atividade por ano (Projetos abatem % da curva)
    bauStackedByScope, // emissão por escopo por ano (mix)
    bauTotalPerYear, // BAU total por ano (linha BAU dos Cenários)
    scopeEmission,
    totalEmission,
    averageAnnualEmissionGrowth,
} from './utils/bauProjection';
