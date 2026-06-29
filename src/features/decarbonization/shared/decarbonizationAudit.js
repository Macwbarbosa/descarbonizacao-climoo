/**
 * decarbonizationAudit
 * --------------------
 * Log de ALTERAÇÕES no Supabase. A cada salvamento (auto-save) compara o estado
 * anterior com o novo e registra QUEM, QUAL empresa, QUANDO e — o principal —
 * O QUE mudou, em frases legíveis e ESPECÍFICAS, nomeando as entidades
 * (ex.: 'Projeto X: Abrangência no tempo — ano 2031 alterado para 60%';
 * 'Cenário Y: projeto "HVO em caminhões" desativado'). Apenas leitura na UI.
 */
import { supabase, hasSupabase } from '@/lib/supabaseClient';

const TABLE = 'decarbonization_audit';

/** E-mail autorizado a VISUALIZAR o log na interface. */
export const ADMIN_EMAIL = 'mac@climoo.com.br';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const byId = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]));
const byKey = (arr, key) => Object.fromEntries((arr || []).map((x) => [x[key], x]));
const num = (v) => Number(v) || 0;
const fmtPct = (v) => `${Math.round(num(v))}%`;
const fmtNum = (v) => num(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Mapa id→nome combinando arrays (o último vence). */
const nameMap = (...arrays) => {
    const map = {};
    arrays.forEach((arr) => (arr || []).forEach((x) => { if (x && x.id != null) map[x.id] = x.name || String(x.id); }));
    return map;
};

const setDiff = (a, b) => {
    const as = new Set(a || []);
    const bs = new Set(b || []);
    return {
        added: [...bs].filter((x) => !as.has(x)),
        removed: [...as].filter((x) => !bs.has(x)),
    };
};

/** Lista de nomes resolvidos, com limite (ex.: "A", "B", "C" … (+N)). */
const joinNames = (ids, resolve, max = 10) => {
    const names = ids.map((id) => `"${resolve(id)}"`);
    if (names.length <= max) return names.join(', ');
    return `${names.slice(0, max).join(', ')} … (+${names.length - max})`;
};

// ─── Diffs por seção (usam `ctx` com mapas id→nome) ──────────────────────────

const diffMetas = (prev, next, out, ctx) => {
    const aById = byId(prev?.metasPeriodo?.metas);
    const b = next?.metasPeriodo?.metas || [];
    const bById = byId(b);
    b.forEach((m) => { if (!aById[m.id]) out.push(`Meta "${m.name}" criada`); });
    (prev?.metasPeriodo?.metas || []).forEach((m) => { if (!bById[m.id]) out.push(`Meta "${m.name}" removida`); });
    b.forEach((nm) => {
        const om = aById[nm.id];
        if (!om) return;
        const name = nm.name || om.name;
        if (om.name !== nm.name) out.push(`Meta "${om.name}" renomeada para "${nm.name}"`);
        if (JSON.stringify(om.scopes) !== JSON.stringify(nm.scopes)) out.push(`Meta "${name}": escopos cobertos alterados`);
        if (om.type !== nm.type) out.push(`Meta "${name}": tipo alterado para ${nm.type}`);
        if (om.ambition !== nm.ambition) out.push(`Meta "${name}": ambição alterada para ${nm.ambition}`);
        if (om.nearTermYear !== nm.nearTermYear) out.push(`Meta "${name}": ano near-term alterado para ${nm.nearTermYear}`);
        if (om.netZeroYear !== nm.netZeroYear) out.push(`Meta "${name}": ano net-zero alterado para ${nm.netZeroYear ?? '—'}`);
        // Cobertura: excludedActivityIds (adicionar à exclusão = remover da cobertura).
        const cd = setDiff(om.excludedActivityIds, nm.excludedActivityIds);
        if (cd.added.length) out.push(`Meta "${name}": removida(s) da cobertura — ${joinNames(cd.added, (id) => ctx.act[id] || 'atividade')}`);
        if (cd.removed.length) out.push(`Meta "${name}": incluída(s) na cobertura — ${joinNames(cd.removed, (id) => ctx.act[id] || 'atividade')}`);
    });
    const pa = prev?.metasPeriodo?.params || {};
    const pb = next?.metasPeriodo?.params || {};
    if (pa.baseYear !== pb.baseYear) out.push(`Plano: ano-base alterado para ${pb.baseYear}`);
    if (pa.recentYear !== pb.recentYear) out.push(`Plano: ano mais recente alterado para ${pb.recentYear}`);
    if (pa.netZeroYear !== pb.netZeroYear) out.push(`Plano: horizonte net-zero alterado para ${pb.netZeroYear}`);
};

const diffInventory = (prev, next, out) => {
    const a = prev?.inventario?.atividades || [];
    const b = next?.inventario?.atividades || [];
    const aById = byId(a);
    const bById = byId(b);
    const added = b.filter((x) => !aById[x.id]);
    const removed = a.filter((x) => !bById[x.id]);
    if (added.length) out.push(`Inventário: atividade(s) adicionada(s) — ${joinNames(added.map((x) => x.id), (id) => bById[id]?.name || 'atividade')}`);
    if (removed.length) out.push(`Inventário: atividade(s) removida(s) — ${joinNames(removed.map((x) => x.id), (id) => aById[id]?.name || 'atividade')}`);
    b.forEach((nx) => {
        const ox = aById[nx.id];
        if (!ox) return;
        if (num(ox.emission) !== num(nx.emission)) out.push(`Inventário: "${nx.name}" — emissão alterada para ${fmtNum(nx.emission)} tCO2e`);
        if (ox.name !== nx.name) out.push(`Inventário: atividade "${ox.name}" renomeada para "${nx.name}"`);
        if (ox.scope !== nx.scope) out.push(`Inventário: "${nx.name}" — escopo alterado para ${nx.scope}`);
        if (ox.category !== nx.category) out.push(`Inventário: "${nx.name}" — categoria alterada para ${nx.category}`);
    });
};

const diffDrivers = (prev, next, out) => {
    const aById = byId(prev?.variaveisCrescimento?.drivers);
    const b = next?.variaveisCrescimento?.drivers || [];
    const bById = byId(b);
    b.forEach((d) => { if (!aById[d.id]) out.push(`Variável de crescimento "${d.name}" criada`); });
    (prev?.variaveisCrescimento?.drivers || []).forEach((d) => { if (!bById[d.id]) out.push(`Variável de crescimento "${d.name}" removida`); });
    b.forEach((nd) => {
        const od = aById[nd.id];
        if (!od) return;
        const name = nd.name || od.name;
        if (od.name !== nd.name) out.push(`Variável "${od.name}" renomeada para "${nd.name}"`);
        if (od.method !== nd.method) out.push(`Variável "${name}": método de projeção alterado`);
        if (num(od.baseValue) !== num(nd.baseValue)) out.push(`Variável "${name}": valor base alterado para ${fmtNum(nd.baseValue)}`);
        if (num(od.avgRate) !== num(nd.avgRate)) out.push(`Variável "${name}": taxa média alterada para ${fmtNum(nd.avgRate)}%`);
        // Valores ano-a-ano: lista os anos alterados (com o novo valor).
        const oy = od.yearly || {};
        const ny = nd.yearly || {};
        const years = [...new Set([...Object.keys(oy), ...Object.keys(ny)])].filter((y) => num(oy[y]) !== num(ny[y]));
        if (years.length) {
            const desc = years.slice(0, 6).map((y) => `${y}=${fmtNum(ny[y])}`).join(', ');
            out.push(`Variável "${name}": valores ano-a-ano alterados (${desc}${years.length > 6 ? ` … (+${years.length - 6})` : ''})`);
        }
        if (JSON.stringify(od.segments) !== JSON.stringify(nd.segments)) out.push(`Variável "${name}": segmentos de crescimento alterados`);
    });
};

const diffBau = (prev, next, out, ctx) => {
    const a = prev?.bau || {};
    const b = next?.bau || {};
    if (a.anoAlvo !== b.anoAlvo) out.push(`Projeção BAU: ano-alvo alterado para ${b.anoAlvo}`);
    const av = a.vinculos || {};
    const bv = b.vinculos || {};
    const keys = [...new Set([...Object.keys(av), ...Object.keys(bv)])];
    keys.forEach((k) => {
        if (JSON.stringify(av[k]) === JSON.stringify(bv[k])) return;
        const aName = ctx.act[k] || 'atividade';
        const link = bv[k];
        if (!link || link.driverId == null) out.push(`BAU: atividade "${aName}" — vínculo de driver removido`);
        else {
            const dName = ctx.drv[link.driverId] || 'driver';
            const factor = link.factor != null && Number(link.factor) !== 1 ? ` (fator ${fmtNum(link.factor)})` : '';
            out.push(`BAU: atividade "${aName}" vinculada ao driver "${dName}"${factor}`);
        }
    });
};

const FIN_LABELS = { capex: 'CAPEX', opex: 'OPEX (a.a.)', revenues: 'Receitas', savings: 'Economias', lifetimeYears: 'Vida útil (anos)', currency: 'Moeda' };

const diffCoverage = (a, b, projName, out) => {
    const aByYear = Object.fromEntries((a || []).map((p) => [p.year, p.pct]));
    const bByYear = Object.fromEntries((b || []).map((p) => [p.year, p.pct]));
    const years = new Set([...Object.keys(aByYear), ...Object.keys(bByYear)]);
    years.forEach((y) => {
        const av = aByYear[y];
        const bv = bByYear[y];
        if (av === undefined && bv !== undefined) out.push(`Projeto "${projName}": Abrangência no tempo — ano ${y} definido em ${fmtPct(bv)}`);
        else if (av !== undefined && bv === undefined) out.push(`Projeto "${projName}": Abrangência no tempo — ano ${y} removido`);
        else if (num(av) !== num(bv)) out.push(`Projeto "${projName}": Abrangência no tempo — ano ${y} alterado para ${fmtPct(bv)}`);
    });
};

const diffFinance = (a, b, projName, out) => {
    const af = a || {};
    const bf = b || {};
    Object.keys(FIN_LABELS).forEach((k) => {
        if (String(af[k] ?? '') !== String(bf[k] ?? '')) {
            const val = k === 'currency' ? bf[k] : fmtNum(bf[k]);
            out.push(`Projeto "${projName}": ${FIN_LABELS[k]} alterado para ${val}`);
        }
    });
};

const diffProjects = (prev, next, out, ctx) => {
    const a = prev?.projetos?.projetos || [];
    const b = next?.projetos?.projetos || [];
    const aById = byId(a);
    const bById = byId(b);
    b.forEach((p) => { if (!aById[p.id]) out.push(`Projeto "${p.name}" criado`); });
    a.forEach((p) => { if (!bById[p.id]) out.push(`Projeto "${p.name}" removido`); });
    b.forEach((np) => {
        const op = aById[np.id];
        if (!op) return;
        const name = np.name || op.name || 'sem nome';
        if (op.name !== np.name) out.push(`Projeto "${op.name}" renomeado para "${np.name}"`);
        if (op.initiativeId !== np.initiativeId) out.push(`Projeto "${name}": iniciativa alterada`);
        if (op.startYear !== np.startYear || op.endYear !== np.endYear) out.push(`Projeto "${name}": período alterado para ${np.startYear}–${np.endYear}`);
        const md = setDiff(op.metaIds, np.metaIds);
        md.added.forEach((id) => out.push(`Projeto "${name}": vinculado à meta "${ctx.meta[id] || 'meta'}"`));
        md.removed.forEach((id) => out.push(`Projeto "${name}": desvinculado da meta "${ctx.meta[id] || 'meta'}"`));
        const ad = setDiff(op.memberActivityIds, np.memberActivityIds);
        if (ad.added.length) out.push(`Projeto "${name}": atividade(s) adicionada(s) ao grupo — ${joinNames(ad.added, (id) => ctx.act[id] || 'atividade')}`);
        if (ad.removed.length) out.push(`Projeto "${name}": atividade(s) removida(s) do grupo — ${joinNames(ad.removed, (id) => ctx.act[id] || 'atividade')}`);
        diffCoverage(op.coveragePoints, np.coveragePoints, name, out);
        diffFinance(op.finance, np.finance, name, out);
    });
};

const diffScenarios = (prev, next, out, ctx) => {
    const a = prev?.cenarios?.cenarios || [];
    const b = next?.cenarios?.cenarios || [];
    const aById = byId(a);
    const bById = byId(b);
    b.forEach((s) => { if (!aById[s.id]) out.push(`Cenário "${s.name}" criado`); });
    a.forEach((s) => { if (!bById[s.id]) out.push(`Cenário "${s.name}" removido`); });
    b.forEach((ns) => {
        const os = aById[ns.id];
        if (!os) return;
        const name = ns.name || os.name;
        if (os.name !== ns.name) out.push(`Cenário "${os.name}" renomeado para "${ns.name}"`);
        const oItems = byKey(os.items, 'projetoId');
        const nItems = byKey(ns.items, 'projetoId');
        const pName = (pid) => ctx.proj[pid] || 'projeto';
        Object.keys(nItems).forEach((pid) => { if (!oItems[pid]) out.push(`Cenário "${name}": projeto "${pName(pid)}" adicionado`); });
        Object.keys(oItems).forEach((pid) => { if (!nItems[pid]) out.push(`Cenário "${name}": projeto "${pName(pid)}" removido`); });
        Object.keys(nItems).forEach((pid) => {
            if (!oItems[pid]) return;
            if (oItems[pid].included !== nItems[pid].included) {
                out.push(`Cenário "${name}": projeto "${pName(pid)}" ${nItems[pid].included ? 'ativado' : 'desativado'}`);
            }
            if (JSON.stringify(oItems[pid].overrides) !== JSON.stringify(nItems[pid].overrides)) {
                out.push(`Cenário "${name}": projeto "${pName(pid)}" — override de abrangência alterado`);
            }
        });
    });
};

/**
 * Lista de frases legíveis e específicas descrevendo o que mudou entre dois
 * snapshots da empresa (objetos de buildCompanyExport, sem timestamps).
 * @returns {string[]}
 */
export const describeChanges = (prev, next) => {
    if (!prev || !next) return [];
    const out = [];
    try {
        // Mapas id→nome (combinando anterior + novo, para nomear removidos também).
        const ctx = {
            act: nameMap(prev?.inventario?.atividades, next?.inventario?.atividades),
            proj: nameMap(prev?.projetos?.projetos, next?.projetos?.projetos),
            meta: nameMap(prev?.metasPeriodo?.metas, next?.metasPeriodo?.metas),
            drv: nameMap(prev?.variaveisCrescimento?.drivers, next?.variaveisCrescimento?.drivers),
        };
        diffMetas(prev, next, out, ctx);
        diffInventory(prev, next, out, ctx);
        diffDrivers(prev, next, out, ctx);
        diffBau(prev, next, out, ctx);
        diffProjects(prev, next, out, ctx);
        diffScenarios(prev, next, out, ctx);
    } catch (e) {
        /* diff best-effort — nunca quebra o salvamento */
    }
    const MAX = 80;
    if (out.length > MAX) return [...out.slice(0, MAX), `… e mais ${out.length - MAX} alteração(ões)`];
    return out;
};

// ─── Persistência do log ─────────────────────────────────────────────────────

/** Registra um evento de salvamento com a lista de alterações (fire-and-forget). */
export const logSave = async ({ cnpj, empresa, email, changes }) => {
    if (!hasSupabase) return;
    try {
        await supabase.from(TABLE).insert({
            cnpj: cnpj || null,
            empresa: empresa || null,
            user_email: email || null,
            action: 'save',
            changes: Array.isArray(changes) ? changes : [],
        });
    } catch (e) {
        /* silencioso — o log não pode atrapalhar o salvamento */
    }
};

/** Lê os eventos mais recentes (opcionalmente filtrando por CNPJ). */
export const fetchAudit = async ({ cnpj, limit = 500 } = {}) => {
    if (!hasSupabase) return [];
    try {
        let q = supabase.from(TABLE).select('*').order('created_at', { ascending: false }).limit(limit);
        if (cnpj) q = q.eq('cnpj', cnpj);
        const { data, error } = await q;
        if (error) return [];
        return data || [];
    } catch (e) {
        return [];
    }
};

export default { ADMIN_EMAIL, describeChanges, logSave, fetchAudit };
