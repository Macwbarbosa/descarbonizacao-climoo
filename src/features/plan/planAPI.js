/**
 * planAPI — acompanhamento do plano de descarbonização por empresa.
 * Persiste em `company_plans` (1 linha por empresa). A RLS garante que só o
 * admin e usuários autorizados da própria empresa gravam; a empresa lê o seu.
 *
 * Formato de `plan`:
 *   {
 *     kickoff: '2026-07',                       // mês de início (YYYY-MM) ou null
 *     stages: [
 *       { id, title, status, note, startDate, endDate,
 *         tasks: [{ id, title, done }] }
 *     ]
 *   }
 *   status ∈ 'nao_iniciado' | 'andamento' | 'concluido'
 *   startDate/endDate: 'YYYY-MM-DD' (ex.: '2026-07-15') ou null
 *
 * Quando a etapa TEM tarefas, o status é DERIVADO delas (todas marcadas =
 * concluído; alguma marcada = em andamento; nenhuma = não iniciado).
 */
import { supabase, hasSupabase, } from '@/lib/supabaseClient';
import { quarterToStartMonth, quarterToEndMonth } from './months';

const NOT_CONFIGURED = 'Banco não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).';

/** Status derivado das tarefas de uma etapa. */
export const deriveStatus = (tasks) => {
    const list = Array.isArray(tasks) ? tasks : [];
    if (!list.length) return null; // sem tarefas → status é manual
    const done = list.filter((t) => t.done).length;
    if (done === 0) return 'nao_iniciado';
    if (done === list.length) return 'concluido';
    return 'andamento';
};

/** Status efetivo de uma etapa (derivado das tarefas, se houver; senão o manual). */
export const effectiveStatus = (stage) => deriveStatus(stage.tasks) || stage.status || 'nao_iniciado';

/** Etapas padrão do método Climoo (usadas quando a empresa ainda não tem plano). */
export const DEFAULT_STAGES = [
    { id: 'inventario', title: 'Diagnóstico do inventário' },
    { id: 'metas', title: 'Definição das metas SBTi' },
    { id: 'bau', title: 'Projeção de crescimento (BAU)' },
    { id: 'iniciativas', title: 'Levantamento de iniciativas' },
    { id: 'oportunidades', title: 'Quantificação das oportunidades' },
    { id: 'cenarios', title: 'Construção dos cenários' },
    { id: 'validacao', title: 'Validação com a diretoria' },
    { id: 'submissao', title: 'Submissão e validação SBTi' },
].map((s) => ({ ...s, status: 'nao_iniciado', note: '', startDate: null, endDate: null, tasks: [] }));

/** Plano vazio (com as etapas padrão) para uma empresa recém-criada. */
export const emptyPlan = () => ({ kickoff: null, stages: DEFAULT_STAGES.map((s) => ({ ...s, tasks: [] })) });

const normalizeTasks = (tasks) =>
    (Array.isArray(tasks) ? tasks : []).map((t, j) => ({
        id: t.id || `t-${j + 1}`,
        title: t.title || `Tarefa ${j + 1}`,
        done: !!t.done,
    }));

/** Mês 'YYYY-MM' → data 'YYYY-MM-01' (migração de dados antigos). */
const monthToDate = (m) => (m ? `${m}-01` : null);

/** Normaliza o plano lido do banco (migra meses/trimestres antigos e deriva status). */
const normalize = (plan) => {
    if (!plan || !Array.isArray(plan.stages) || plan.stages.length === 0) return emptyPlan();
    return {
        kickoff: plan.kickoff || null,
        stages: plan.stages.map((s, i) => {
            const tasks = normalizeTasks(s.tasks);
            const startDate =
                s.startDate || monthToDate(s.startMonth) || monthToDate(quarterToStartMonth(s.startQuarter));
            const endDate = s.endDate || monthToDate(s.endMonth) || monthToDate(quarterToEndMonth(s.endQuarter));
            const manual = ['nao_iniciado', 'andamento', 'concluido'].includes(s.status) ? s.status : 'nao_iniciado';
            return {
                id: s.id || `etapa-${i + 1}`,
                title: s.title || `Etapa ${i + 1}`,
                status: deriveStatus(tasks) || manual,
                note: s.note || '',
                startDate: startDate || null,
                endDate: endDate || null,
                tasks,
            };
        }),
    };
};

/** Carrega o plano da empresa (ou o plano padrão se ainda não houver). */
export const getPlan = async (companyId) => {
    if (!hasSupabase) throw new Error(NOT_CONFIGURED);
    if (!companyId) return emptyPlan();
    const { data, error } = await supabase
        .from('company_plans')
        .select('plan')
        .eq('company_id', companyId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return normalize(data?.plan);
};

/** Grava o plano da empresa (upsert). */
export const savePlan = async (companyId, plan) => {
    if (!hasSupabase) throw new Error(NOT_CONFIGURED);
    if (!companyId) throw new Error('Empresa não identificada.');
    const { error } = await supabase
        .from('company_plans')
        .upsert(
            { company_id: companyId, plan: normalize(plan), updated_at: new Date().toISOString() },
            { onConflict: 'company_id' }
        );
    if (error) throw new Error(error.message);
    return true;
};

export default { DEFAULT_STAGES, emptyPlan, getPlan, savePlan, deriveStatus, effectiveStatus };
