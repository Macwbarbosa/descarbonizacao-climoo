import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Select, Tag, Tooltip, Checkbox, Empty, Button, Input } from 'antd';
import { WarningOutlined, CaretRightOutlined, CaretDownOutlined, SearchOutlined } from '@ant-design/icons';
import { Card } from '@/shared/components/ui/Card';
import { SCOPES, SCOPE_COLORS, activityEmissionByYear } from '../../bau/utils/bauProjection';
import { activityToProjectsMap, coverageInYear, abatementByActivityInYear } from '../utils/projectAbatement';

const fmt = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const pct = (v) => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;

/**
 * Detalhe ano-a-ano de uma atividade (padrão da Projeção BAU): Emissão (BAU) e,
 * para CADA projeto que cobre a atividade, uma linha de Abrangência (a cobertura
 * definida naquele projeto) e uma de Redução (abatimento daquele projeto).
 */
function ActivityYearDetail({ activity, map, projectsById, initiativesById, ctx, baseYear, endYear }) {
    const years = [];
    for (let y = baseYear; y <= endYear; y += 1) years.push(y);
    const covering = (map[activity.id] || []).map((pid) => projectsById[pid]).filter(Boolean);

    const emissao = {};
    activityEmissionByYear(activity, { baseYear, endYear }, ctx.driversById).forEach(({ year, emission }) => {
        emissao[year] = emission;
    });

    // Séries por projeto: abrangência (= cobertura do projeto) e redução.
    const perProject = covering.map((p) => {
        const initiative = initiativesById[p.initiativeId] || null;
        const cov = {};
        const red = {};
        years.forEach((y) => {
            cov[y] = coverageInYear(p, y);
            red[y] = abatementByActivityInYear(p, y, initiative, ctx)[activity.id] || 0;
        });
        return { project: p, cov, red };
    });

    return (
        <div className="bg-[#fbfcfd] px-4 py-3 overflow-auto">
            <table className="text-xs border-collapse">
                <thead>
                    <tr>
                        <th className="border border-gray-200 bg-gray-100 px-2 py-1 text-left whitespace-nowrap">Ano</th>
                        {years.map((y) => (
                            <th key={y} className="border border-gray-200 bg-gray-100 px-2 py-1">{y}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border border-gray-200 px-2 py-1 text-left bg-[#f3f5f8] whitespace-nowrap font-semibold">Emissão (tCO2e)</td>
                        {years.map((y) => (
                            <td key={y} className="border border-gray-200 px-2 py-1 text-right tabular-nums">{fmt(emissao[y])}</td>
                        ))}
                    </tr>
                    {perProject.length === 0 ? (
                        <tr>
                            <td className="border border-gray-200 px-2 py-1 text-left text-gray-400 italic" colSpan={years.length + 1}>
                                Sem projeto vinculado — sem abrangência/redução.
                            </td>
                        </tr>
                    ) : (
                        perProject.map(({ project, cov, red }) => (
                            <React.Fragment key={project.id}>
                                <tr>
                                    <td className="border border-gray-200 px-2 py-1 text-left bg-[#f8fafb] whitespace-nowrap">
                                        Abrangência — {project.name} (%)
                                    </td>
                                    {years.map((y) => (
                                        <td key={y} className="border border-gray-200 px-2 py-1 text-right tabular-nums text-gray-600">{pct(cov[y])}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="border border-gray-200 px-2 py-1 text-left bg-[#f3f5f8] whitespace-nowrap">
                                        Redução — {project.name} (tCO2e)
                                    </td>
                                    {years.map((y) => (
                                        <td key={y} className="border border-gray-200 px-2 py-1 text-right tabular-nums text-[#2F6F5E]">{fmt(red[y])}</td>
                                    ))}
                                </tr>
                            </React.Fragment>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

ActivityYearDetail.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    activity: PropTypes.object.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    map: PropTypes.object.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    projectsById: PropTypes.object.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    initiativesById: PropTypes.object.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    ctx: PropTypes.object.isRequired,
    baseYear: PropTypes.number.isRequired,
    endYear: PropTypes.number.isRequired,
};

/**
 * Aba "Matriz de cobertura": cada atividade é um nó EXPANSÍVEL. Ao expandir,
 * abre o detalhe ano-a-ano (Emissão · Abrangência · Redução), no padrão da
 * Projeção BAU. Mantém "Coberta por" e "Atribuir a projeto".
 */
function CoverageMatrixTab({ activities, projects, initiatives, ctx, baseYear, endYear, onAssign }) {
    const [onlyOrphans, setOnlyOrphans] = useState(false);
    const [coverFilter, setCoverFilter] = useState(''); // filtra por projeto que cobre (coluna "Coberta por")
    const [q, setQ] = useState('');
    const [collapsed, setCollapsed] = useState(() => new Set()); // escopos/categorias recolhidos
    const [openActs, setOpenActs] = useState(() => new Set()); // atividades expandidas

    const query = q.trim().toLowerCase();
    const initiativesById = useMemo(() => Object.fromEntries((initiatives || []).map((i) => [i.id, i])), [initiatives]);
    const map = useMemo(() => activityToProjectsMap(projects), [projects]);
    const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
    const projectName = (id) => projectsById[id]?.name || id;
    const orphanCount = activities.filter((a) => !(map[a.id] || []).length).length;

    const visible = useMemo(() => {
        let list = onlyOrphans ? activities.filter((a) => !(map[a.id] || []).length) : activities;
        if (coverFilter) list = list.filter((a) => (map[a.id] || []).includes(coverFilter));
        if (query) list = list.filter((a) => a.name.toLowerCase().includes(query) || a.category.toLowerCase().includes(query));
        return list;
    }, [activities, map, onlyOrphans, coverFilter, query]);
    const scopesPresent = SCOPES.filter((s) => visible.some((a) => a.scope === s));

    const toggle = (key) =>
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    const toggleAct = (id) =>
        setOpenActs((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    const isOpen = (key) => (query ? true : !collapsed.has(key)); // na busca, grupos expandidos
    const allKeys = useMemo(() => {
        const keys = [];
        scopesPresent.forEach((scope) => {
            keys.push(scope);
            [...new Set(visible.filter((a) => a.scope === scope).map((a) => a.category))].forEach((cat) => keys.push(`${scope}||${cat}`));
        });
        return keys;
    }, [scopesPresent, visible]);
    const allCollapsed = allKeys.length > 0 && allKeys.every((k) => collapsed.has(k));
    const stop = (e) => e.stopPropagation();

    return (
        <Card>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-base font-semibold text-[#210856]">Matriz de cobertura</h3>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] text-gray-400">
                        {activities.length} atividades{orphanCount ? ` · ${orphanCount} órfã(s)` : ''}
                    </span>
                    <Button type="link" size="small" className="px-0 text-[12px]" onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(allKeys))}>
                        {allCollapsed ? 'Expandir tudo' : 'Recolher tudo'}
                    </Button>
                    <Checkbox checked={onlyOrphans} onChange={(e) => setOnlyOrphans(e.target.checked)}>
                        só órfãs
                    </Checkbox>
                </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap mb-3">
                <Input
                    prefix={<SearchOutlined className="text-gray-400" />}
                    placeholder="Buscar atividade ou categoria…"
                    allowClear
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    size="small"
                    style={{ maxWidth: 320 }}
                />
                <Select
                    value={coverFilter}
                    onChange={setCoverFilter}
                    size="small"
                    style={{ minWidth: 200 }}
                    showSearch
                    optionFilterProp="label"
                    options={[{ value: '', label: 'Coberta por: todos' }, ...projects.map((p) => ({ value: p.id, label: `Coberta por: ${p.name}` }))]}
                />
                {(query || coverFilter) && <span className="text-[11px] text-gray-400">{visible.length} resultado(s)</span>}
                <span className="text-[11px] text-gray-400">Clique numa atividade para ver Emissão · Abrangência · Redução ano a ano.</span>
            </div>

            {visible.length === 0 ? (
                <Empty description={query || coverFilter ? 'Nenhuma atividade encontrada.' : 'Nenhuma atividade.'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <div className="overflow-auto" style={{ maxHeight: 560 }}>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                                <th className="px-3 py-2 text-left bg-[#fafbfc] sticky top-0 z-10">Escopo › Categoria › Atividade</th>
                                <th className="px-3 py-2 text-left bg-[#fafbfc] sticky top-0 z-10">Coberta por</th>
                                <th className="px-3 py-2 text-left bg-[#fafbfc] sticky top-0 z-10">Atribuir a projeto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scopesPresent.map((scope) => {
                                const scopeActs = visible.filter((a) => a.scope === scope);
                                const cats = [...new Set(scopeActs.map((a) => a.category))];
                                const scopeOpen = isOpen(scope);
                                return (
                                    <React.Fragment key={scope}>
                                        <tr className="bg-[#eef1f5] text-xs font-bold uppercase tracking-wide cursor-pointer" onClick={() => toggle(scope)}>
                                            <td className="px-3 py-1.5" colSpan={3}>
                                                {scopeOpen ? <CaretDownOutlined className="text-gray-400 mr-1" /> : <CaretRightOutlined className="text-gray-400 mr-1" />}
                                                <span className="inline-block w-2.5 h-2.5 rounded-sm mr-2 align-middle" style={{ background: SCOPE_COLORS[scope] }} />
                                                {scope}
                                            </td>
                                        </tr>
                                        {scopeOpen &&
                                            cats.map((cat) => {
                                                const catKey = `${scope}||${cat}`;
                                                const catOpen = isOpen(catKey);
                                                return (
                                                    <React.Fragment key={catKey}>
                                                        <tr className="bg-[#f6f8fa] text-xs font-semibold cursor-pointer" onClick={() => toggle(catKey)}>
                                                            <td className="px-3 py-1.5" style={{ paddingLeft: 28 }} colSpan={3}>
                                                                {catOpen ? <CaretDownOutlined className="text-gray-400 mr-1" /> : <CaretRightOutlined className="text-gray-400 mr-1" />}
                                                                {cat}
                                                            </td>
                                                        </tr>
                                                        {catOpen &&
                                                            scopeActs.filter((a) => a.category === cat).map((a) => {
                                                                const covering = map[a.id] || [];
                                                                const orphan = covering.length === 0;
                                                                const assignable = projects.filter((p) => !covering.includes(p.id));
                                                                const actOpen = openActs.has(a.id);
                                                                return (
                                                                    <React.Fragment key={a.id}>
                                                                        <tr className="border-b border-gray-100 hover:bg-[#f7f9fb] cursor-pointer" onClick={() => toggleAct(a.id)}>
                                                                            <td className="px-3 py-2 text-left" style={{ paddingLeft: 44 }}>
                                                                                {actOpen ? <CaretDownOutlined className="text-gray-400 mr-1" /> : <CaretRightOutlined className="text-gray-400 mr-1" />}
                                                                                {a.name}
                                                                                {orphan && (
                                                                                    <Tooltip title="Órfã — não recebe abatimento em nenhum cenário">
                                                                                        <WarningOutlined className="text-[#b9462f] ml-2" />
                                                                                    </Tooltip>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-left" onClick={stop}>
                                                                                {orphan ? (
                                                                                    <span className="text-[11px] text-[#b9462f] italic">órfã</span>
                                                                                ) : (
                                                                                    covering.map((pid) => (
                                                                                        <Tag key={pid} className="rounded-full m-0 mr-1 mb-1 text-[10px]">
                                                                                            {projectName(pid)}
                                                                                        </Tag>
                                                                                    ))
                                                                                )}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-left" onClick={stop}>
                                                                                <Select
                                                                                    size="small"
                                                                                    placeholder="atribuir…"
                                                                                    value={null}
                                                                                    style={{ minWidth: 160 }}
                                                                                    disabled={assignable.length === 0}
                                                                                    options={assignable.map((p) => ({ value: p.id, label: p.name }))}
                                                                                    onChange={(pid) => pid && onAssign(pid, a.id)}
                                                                                />
                                                                            </td>
                                                                        </tr>
                                                                        {actOpen && (
                                                                            <tr>
                                                                                <td colSpan={3} className="p-0">
                                                                                    <ActivityYearDetail
                                                                                        activity={a}
                                                                                        map={map}
                                                                                        projectsById={projectsById}
                                                                                        initiativesById={initiativesById}
                                                                                        ctx={ctx}
                                                                                        baseYear={baseYear}
                                                                                        endYear={endYear}
                                                                                    />
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                    </React.Fragment>
                                                );
                                            })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}

CoverageMatrixTab.propTypes = {
    activities: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
    projects: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
    initiatives: PropTypes.arrayOf(PropTypes.object), // eslint-disable-line react/forbid-prop-types
    // eslint-disable-next-line react/forbid-prop-types
    ctx: PropTypes.object.isRequired,
    baseYear: PropTypes.number.isRequired,
    endYear: PropTypes.number.isRequired,
    onAssign: PropTypes.func.isRequired,
};

CoverageMatrixTab.defaultProps = { initiatives: [] };

export default CoverageMatrixTab;
