export { default as TargetsTimeframePage } from './TargetsTimeframePage';
// Saída pública reutilizável pela tela de Cenários: trajetória POR META
// (absoluta ou intensidade, com conversão para absoluto via denominador).
export {
    computeMetaTarget,
    computeAllMetaTargets,
    computeSbtiTarget,
    buildTargetTrajectory,
} from './services/sbtiTargetService';
