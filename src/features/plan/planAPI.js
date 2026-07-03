/**
 * planAPI — acompanhamento do plano de descarbonização por empresa.
 * Persiste em `company_plans` (1 linha por empresa). A RLS garante que só o
 * admin e usuários autorizados da própria empresa gravam; a empresa lê o seu.
 *
 * Formato de `plan`:
 *   {
 *     kickoff: '2026-07',                       // mês de início (YYYY-MM) ou null
 *     stages: [
 *       { id, title, status, note, startQuarter, endQuarter }
 *     ]
 *   }
 *   status ∈ 'nao_iniciado' | 'andamento' | 'concluido'
 *   startQuarter/endQuarter: 'YYYY-Qn' (ex.: '2026-Q3') ou null
 */
import { supabase, hasSupabase } from '@/lib/supabaseClient';

const NOT_CONFIGURED = 'Banco não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).';

/** Etapas padrão do método Climoo (usadas quando a empresa ainda não tem plano). */
export const DEFAULT_STAGES = [
    { id: 'inventario', title: 'Diagnóstico do inventário', status: 'nao_iniciado', note: '', startQuarter: null, endQuarter: null },
    { id: 'metas', title: 'Definição das metas SBTi', status: 'nao_iniciado', note: '', startQuarter: null, endQuarter: null },
    { id: 'bau', title: 'Projeção de crescimento (BAU)', status: 'nao_iniciado', note: '', startQuarter: null, endQuarter: null },
    { id: 'iniciativas', title: 'Levantamento de iniciativas', status: 'nao_iniciado', note: '', startQuarter: null, endQuarter: null },
    { id: 'oportunidades', title: 'Quantificação das oportunidades', status: 'nao_iniciado', note: '', startQuarter: null, endQuarter: null },
    { id: 'cenarios', title: 'Construção dos cenários', status: 'nao_iniciado', note: '', startQuarter: null, endQuarter: null },
    { id: 'validacao', title: 'Validação com a diretoria', status: 'nao_iniciado', note: '', startQuarter: null, endQuarter: null },
    { id: 'submissao', title: 'Submissão e validação SBTi', status: 'nao_iniciado', note: '', startQuarter: null, endQuarter: null },
];

/** Plano vazio (com as etapas padrão) para uma empresa recém-criada. */
export const emptyPlan = () => ({ kickoff: null, stages: DEFAULT_STAGES.map((s) => ({ ...s })) });

/** Normaliza o plano lido do banco (garante array de stages e campos esperados). */
const normalize = (plan) => {
    if (!plan || !Array.isArray(plan.stages) || plan.stages.length === 0) return emptyPlan();
    return {
        kickoff: plan.kickoff || null,
        stages: plan.stages.map((s, i) => ({
            id: s.id || `etapa-${i + 1}`,
            title: s.title || `Etapa ${i + 1}`,
            status: ['nao_iniciado', 'andamento', 'concluido'].includes(s.status) ? s.status : 'nao_iniciado',
            note: s.note || '',
            startQuarter: s.startQuarter || null,
            endQuarter: s.endQuarter || null,
        })),
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

export default { DEFAULT_STAGES, emptyPlan, getPlan, savePlan };
