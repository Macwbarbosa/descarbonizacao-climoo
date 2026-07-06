import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Select, Tag, Tooltip, Checkbox, Empty, Button, Input } from 'antd';
import { WarningOutlined, CaretRightOutlined, CaretDownOutlined, SearchOutlined } from '@ant-design/icons';
import { SCOPES, SCOPE_COLORS, activityEmissionByYear } from '../../bau/utils/bauProjection';
import { activityToProjectsMap, coverageInYear, abatementByActivityInYear } from '../utils/projectAbatement';

const fmt = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const pct = (v) => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;

/**
 * Detalhe ano-a-ano de uma atividade (padrão da Projeção BAU): Emissão (BAU) e,
 * para CADA projeto que cobre a atividade, uma linha de Abrangência (a cobertura
 * definida naquele projeto) e uma de Redução (abatimento daquele projeto).
 */
function ActivityYearDetail({ activity, map, projectsById, initiativesById, ctx, baseYear, endYear, unit, denomByYear }) {
    const years = [];
    for (let y = baseYear; y <= endYear; y += 1) years.push(y);
    const covering = (map[activity.id] || []).map((pid) => projectsById[pid]).filter(Boolean);
    // Intensidade: divide o valor do ano pelo denominador projetado daquele ano.
    const disp = (v, y) => (denomByYear && denomByYear[y] ? v / denomByYear[y] : v);

    const emissao = {};
    activityEmissionByYear(activity, { baseYear, endYear }, ctx.driversById).forEach(({ year, emission }) => {
        emissao[year] = emission;
    });

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
                        <td className="border border-gray-200 px-2 py-1 text-left bg-[#f3f5f8] whitespace-nowrap font-semibold">
                            {denomByYear ? `Intensidade (${unit})` : 'Emissão (tCO2e)'}
                        </td>
                        {years.map((y) => (
                            <td key={y} className="border border-gray-200 px-2 py-1 text-right tabular-nums">{fmt(disp(emissao[y], y))}</td>
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
                                        Redução — {project.name} ({denomByYear ? unit : 'tCO2e'})
                                    </td>
                                    {years.map((y) => (
                                        <td key={y} className="border border-gray-200 px-2 py-1 text-right tabular-nums text-[#2F6F5E]">{fmt(disp(red[y], y))}</td>
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
    unit: PropTypes.string,
    // eslint-disable-next-line react/forbid-prop-types
    denomByYear: PropTypes.object,
};

ActivityYearDetail.defaultProps = { unit: 'tCO2e', denomByYear: null };

/**
 * Grade ÚNICA de atividades do projeto + cobertura. Árvore expansível
 * Escopo › Categoria › Atividade. Em cada atividade:
 *   - checkbox para INCLUIR/EXCLUIR no projeto atual (seleção do grupo);
 *   - tags dos projetos que cobrem a atividade (o atual em destaque);
 *   - ao expandir, detalhe ano-a-ano (Emissão · Abrangência · Redução).
 * Substitui os dois lugares antigos ("Atividades do grupo" + "Matriz de cobertura").
 */
function CoverageMatrixTab({ activities, projects, initiatives, ctx, baseYear, endYear, currentProjectId, memberIds, onSetMembers, unit, denomByYear }) {
    const [onlyOrphans, setOnlyOrphans] = useState(false);
    const [onlyMembers, setOnlyMembers] = useState(false);
    const [coverFilter, setCoverFilter] = useState('');
    const [q, setQ] = useState('');
    const [collapsed, setCollapsed] = useState(() => new Set());
    const [openActs, setOpenActs] = useState(() => new Set());

    const selectable = typeof onSetMembers === 'function';
    const memberSet = useMemo(() => new Set(memberIds || []), [memberIds]);

    const query = q.trim().toLowerCase();
    const initiativesById = useMemo(() => Object.fromEntries((initiatives || []).map((i) => [i.id, i])), [initiatives]);
    const map = useMemo(() => activityToProjectsMap(projects), [projects]);
    const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
    const projectName = (id) => projectsById[id]?.name || id;
    const orphanCount = activities.filter((a) => !(map[a.id] || []).length).length;

    // Filtro "Coberta por": só projetos que cobrem alguma atividade visível.
    const coverProjectOptions = useMemo(() => {
        const ids = new Set();
        activities.forEach((a) => (map[a.id] || []).forEach((pid) => ids.add(pid)));
        return projects.filter((p) => ids.has(p.id));
    }, [activities, map, projects]);

    const setMembers = (ids, checked) => {
        if (!selectable) return;
        const next = new Set(memberSet);
        ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
        onSetMembers(Array.from(next));
    };

    const visible = useMemo(() => {
        let list = activities;
        if (onlyMembers) list = list.filter((a) => memberSet.has(a.id));
        if (onlyOrphans) list = list.filter((a) => !(map[a.id] || []).length);
        if (coverFilter) list = list.filter((a) => (map[a.id] || []).includes(coverFilter));
        if (query) list = list.filter((a) => a.name.toLowerCase().includes(query) || a.category.toLowerCase().includes(query));
        return list;
    }, [activities, map, onlyMembers, onlyOrphans, coverFilter, query, memberSet]);
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
    // Em busca / "só do projeto" tudo fica forçadamente aberto (mostra resultados);
    // nesse modo, os controles de recolher não se aplicam.
    const forceOpen = Boolean(query) || onlyMembers;
    const isOpen = (key) => (forceOpen ? true : !collapsed.has(key));
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
    const colSpan = selectable ? 3 : 2;

    return (
        <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <span className="text-[12px] text-gray-500">
                    {activities.length} atividades{orphanCount ? ` · ${orphanCount} órfã(s)` : ''}
                    {selectable ? ` · ${memberSet.size} no projeto` : ''}
                </span>
                <div className="flex items-center gap-3 flex-wrap">
                    {!forceOpen && (
                        <Button type="link" size="small" className="px-0 text-[12px]" onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(allKeys))}>
                            {allCollapsed ? 'Expandir tudo' : 'Recolher tudo'}
                        </Button>
                    )}
                    {selectable && (
                        <Checkbox
                            checked={onlyMembers}
                            onChange={(e) => {
                                const c = e.target.checked;
                                setOnlyMembers(c);
                                if (c) setOnlyOrphans(false);
                            }}
                        >
                            só do projeto
                        </Checkbox>
                    )}
                    <Checkbox
                        checked={onlyOrphans}
                        onChange={(e) => {
                            const c = e.target.checked;
                            setOnlyOrphans(c);
                            if (c) {
                                setCoverFilter('');
                                setOnlyMembers(false);
                            }
                        }}
                    >
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
                    onChange={(v) => {
                        setCoverFilter(v);
                        if (v) setOnlyOrphans(false);
                    }}
                    disabled={onlyOrphans}
                    size="small"
                    style={{ minWidth: 200 }}
                    showSearch
                    optionFilterProp="label"
                    options={[{ value: '', label: 'Coberta por: todos' }, ...coverProjectOptions.map((p) => ({ value: p.id, label: `Coberta por: ${p.name}` }))]}
                />
                {(query || coverFilter) && <span className="text-[11px] text-gray-400">{visible.length} resultado(s)</span>}
                <span className="text-[11px] text-gray-400">
                    {selectable ? 'Marque a atividade para incluí-la no projeto. ' : ''}
                    Clique na atividade para ver Emissão · Abrangência · Redução ano a ano.
                </span>
            </div>

            {visible.length === 0 ? (
                <Empty description={query || coverFilter ? 'Nenhuma atividade encontrada.' : 'Nenhuma atividade.'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <div className="overflow-auto" style={{ maxHeight: 620 }}>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                                {selectable && <th className="px-3 py-2 text-center bg-[#fafbfc] sticky top-0 z-10" style={{ width: 70 }}>No projeto</th>}
                                <th className="px-3 py-2 text-left bg-[#fafbfc] sticky top-0 z-10">Escopo › Categoria › Atividade</th>
                                <th className="px-3 py-2 text-left bg-[#fafbfc] sticky top-0 z-10">Projetos (cobertura)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scopesPresent.map((scope) => {
                                const scopeActs = visible.filter((a) => a.scope === scope);
                                const cats = [...new Set(scopeActs.map((a) => a.category))];
                                const scopeOpen = isOpen(scope);
                                return (
                                    <React.Fragment key={scope}>
                                        <tr className={`bg-[#eef1f5] text-xs font-bold uppercase tracking-wide ${forceOpen ? '' : 'cursor-pointer'}`} onClick={forceOpen ? undefined : () => toggle(scope)}>
                                            <td className="px-3 py-1.5" colSpan={colSpan}>
                                                {scopeOpen ? <CaretDownOutlined className="text-gray-400 mr-1" /> : <CaretRightOutlined className="text-gray-400 mr-1" />}
                                                <span className="inline-block w-2.5 h-2.5 rounded-sm mr-2 align-middle" style={{ background: SCOPE_COLORS[scope] }} />
                                                {scope}
                                            </td>
                                        </tr>
                                        {scopeOpen &&
                                            cats.map((cat) => {
                                                const catKey = `${scope}||${cat}`;
                                                const catOpen = isOpen(catKey);
                                                const catActs = scopeActs.filter((a) => a.category === cat);
                                                const catIds = catActs.map((a) => a.id);
                                                const selCount = catIds.filter((id) => memberSet.has(id)).length;
                                                const catAll = selCount === catIds.length && catIds.length > 0;
                                                const catSome = selCount > 0 && !catAll;
                                                return (
                                                    <React.Fragment key={catKey}>
                                                        <tr className="bg-[#f6f8fa] text-xs font-semibold">
                                                            {selectable && (
                                                                <td className="px-3 py-1.5 text-center" onClick={stop}>
                                                                    <Checkbox
                                                                        checked={catAll}
                                                                        indeterminate={catSome}
                                                                        onChange={(e) => setMembers(catIds, e.target.checked)}
                                                                    />
                                                                </td>
                                                            )}
                                                            <td className={`px-3 py-1.5 ${forceOpen ? '' : 'cursor-pointer'}`} style={{ paddingLeft: 28 }} colSpan={2} onClick={forceOpen ? undefined : () => toggle(catKey)}>
                                                                {catOpen ? <CaretDownOutlined className="text-gray-400 mr-1" /> : <CaretRightOutlined className="text-gray-400 mr-1" />}
                                                                {cat}
                                                                <span className="text-[11px] text-gray-400 ml-2 font-normal">{catActs.length} ativ.</span>
                                                            </td>
                                                        </tr>
                                                        {catOpen &&
                                                            catActs.map((a) => {
                                                                const covering = map[a.id] || [];
                                                                const orphan = covering.length === 0;
                                                                const actOpen = openActs.has(a.id);
                                                                const isMember = memberSet.has(a.id);
                                                                return (
                                                                    <React.Fragment key={a.id}>
                                                                        <tr className={`border-b border-gray-100 hover:bg-[#f7f9fb] ${isMember ? 'bg-[#f6f2fd]' : ''}`}>
                                                                            {selectable && (
                                                                                <td className="px-3 py-2 text-center" onClick={stop}>
                                                                                    <Checkbox checked={isMember} onChange={(e) => setMembers([a.id], e.target.checked)} />
                                                                                </td>
                                                                            )}
                                                                            <td className="px-3 py-2 text-left cursor-pointer" style={{ paddingLeft: 44 }} onClick={() => toggleAct(a.id)}>
                                                                                {actOpen ? <CaretDownOutlined className="text-gray-400 mr-1" /> : <CaretRightOutlined className="text-gray-400 mr-1" />}
                                                                                {a.name}
                                                                                {typeof a.baseEmission === 'number' && (
                                                                                    <span className="text-[11px] text-gray-400 ml-2">
                                                                                        {fmt(denomByYear && denomByYear[baseYear] ? a.baseEmission / denomByYear[baseYear] : a.baseEmission)} {unit}
                                                                                    </span>
                                                                                )}
                                                                                {orphan && (
                                                                                    <Tooltip title="Órfã — não recebe abatimento em nenhum cenário">
                                                                                        <WarningOutlined className="text-[#b9462f] ml-2" />
                                                                                    </Tooltip>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-left" onClick={stop}>
                                                                                {orphan ? (
                                                                                    <span className="text-[11px] text-gray-400 italic">nenhum</span>
                                                                                ) : (
                                                                                    covering.map((pid) => (
                                                                                        <Tag
                                                                                            key={pid}
                                                                                            color={pid === currentProjectId ? 'purple' : undefined}
                                                                                            className="rounded-full m-0 mr-1 mb-1 text-[10px]"
                                                                                        >
                                                                                            {projectName(pid)}
                                                                                        </Tag>
                                                                                    ))
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                        {actOpen && (
                                                                            <tr>
                                                                                <td colSpan={colSpan} className="p-0">
                                                                                    <ActivityYearDetail
                                                                                        activity={a}
                                                                                        map={map}
                                                                                        projectsById={projectsById}
                                                                                        initiativesById={initiativesById}
                                                                                        ctx={ctx}
                                                                                        baseYear={baseYear}
                                                                                        endYear={endYear}
                                                                                        unit={unit}
                                                                                        denomByYear={denomByYear}
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
        </div>
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
    currentProjectId: PropTypes.string,
    memberIds: PropTypes.arrayOf(PropTypes.string),
    onSetMembers: PropTypes.func,
    unit: PropTypes.string,
    // eslint-disable-next-line react/forbid-prop-types
    denomByYear: PropTypes.object,
};

CoverageMatrixTab.defaultProps = {
    initiatives: [],
    currentProjectId: null,
    memberIds: [],
    onSetMembers: null,
    unit: 'tCO2e',
    denomByYear: null,
};

export default CoverageMatrixTab;
