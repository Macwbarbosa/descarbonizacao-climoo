import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Checkbox, Empty, Button, Input } from 'antd';
import { CaretRightOutlined, CaretDownOutlined, SearchOutlined } from '@ant-design/icons';
import { SCOPES, SCOPE_COLORS } from '../../bau/utils/bauProjection';

const fmt = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

/**
 * Árvore Escopo › Categoria › Atividade para a COBERTURA da meta. Marcar =
 * incluir na cobertura; desmarcar = excluir. Por padrão tudo vem marcado (100%).
 * Controlado por `excludedIds` (as DESMARCADAS); chama `onChange(excludedIds)`.
 * Busca por atividade/categoria + seleção/deseleção em massa (inclusive por
 * categoria — comum desconsiderar uma categoria inteira).
 */
function MetaCoverageTree({ activities, excludedIds, onChange }) {
    const excluded = useMemo(() => new Set(excludedIds), [excludedIds]);
    const [collapsed, setCollapsed] = useState(() => new Set());
    const [q, setQ] = useState('');

    const query = q.trim().toLowerCase();
    const visible = useMemo(
        () =>
            query
                ? activities.filter(
                      (a) =>
                          (a.name || '').toLowerCase().includes(query) ||
                          (a.category || '').toLowerCase().includes(query)
                  )
                : activities,
        [activities, query]
    );

    // Inclui (checked=true) → remove da exclusão; exclui → adiciona.
    const setMany = (ids, checked) => {
        const next = new Set(excluded);
        ids.forEach((id) => (checked ? next.delete(id) : next.add(id)));
        onChange(Array.from(next));
    };

    const toggle = (key) =>
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    const isOpen = (key) => (query ? true : !collapsed.has(key));

    const scopesPresent = useMemo(() => SCOPES.filter((s) => visible.some((a) => a.scope === s)), [visible]);
    const allKeys = useMemo(() => {
        const keys = [];
        scopesPresent.forEach((scope) => {
            keys.push(scope);
            [...new Set(visible.filter((a) => a.scope === scope).map((a) => a.category))].forEach((cat) => keys.push(`${scope}||${cat}`));
        });
        return keys;
    }, [scopesPresent, visible]);
    const allCollapsed = allKeys.length > 0 && allKeys.every((k) => collapsed.has(k));

    const visibleIds = useMemo(() => visible.map((a) => a.id), [visible]);
    const allVisibleIncluded = visibleIds.length > 0 && visibleIds.every((id) => !excluded.has(id));

    const includedCount = activities.filter((a) => !excluded.has(a.id)).length;
    // % ponderado por EMISSÃO (alinha o indicador ao efeito real na baseline).
    const totalEmission = activities.reduce((t, a) => t + (Number(a.emission) || 0), 0);
    const includedEmission = activities.reduce((t, a) => (excluded.has(a.id) ? t : t + (Number(a.emission) || 0)), 0);
    const pct = totalEmission > 0 ? (includedEmission / totalEmission) * 100 : 100;

    if (!activities.length) {
        return <Empty description="Selecione ao menos um escopo para definir a cobertura." image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
        <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Input
                    prefix={<SearchOutlined className="text-gray-400" />}
                    placeholder="Buscar atividade ou categoria…"
                    allowClear
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    size="small"
                    style={{ maxWidth: 320 }}
                />
                <span className="text-[11px] text-gray-500">
                    <b>{pct.toFixed(0)}%</b> das emissões cobertas · {includedCount} de {activities.length} atividades
                </span>
                {visibleIds.length > 0 && (
                    <Button type="link" size="small" className="px-0 text-[12px]" onClick={() => setMany(visibleIds, !allVisibleIncluded)}>
                        {allVisibleIncluded ? 'Desmarcar' : 'Marcar'} {query ? 'resultados' : 'todas'}
                    </Button>
                )}
                <div className="flex-1" />
                {!query && (
                    <Button type="link" size="small" className="px-0 text-[12px]" onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(allKeys))}>
                        {allCollapsed ? 'Expandir tudo' : 'Recolher tudo'}
                    </Button>
                )}
            </div>

            {visible.length === 0 ? (
                <Empty description="Nenhuma atividade encontrada." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-96 overflow-auto">
                    {scopesPresent.map((scope) => {
                        const scopeActs = visible.filter((a) => a.scope === scope);
                        const cats = [...new Set(scopeActs.map((a) => a.category))];
                        const scopeOpen = isOpen(scope);
                        const scopeIds = scopeActs.map((a) => a.id);
                        const scopeAll = scopeIds.every((id) => !excluded.has(id));
                        const scopeSome = !scopeAll && scopeIds.some((id) => !excluded.has(id));
                        return (
                            <div key={scope}>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#eef1f5]">
                                    <button type="button" onClick={() => toggle(scope)} className="text-gray-400 hover:text-gray-600 leading-none" aria-label={scopeOpen ? 'Recolher' : 'Expandir'}>
                                        {scopeOpen ? <CaretDownOutlined /> : <CaretRightOutlined />}
                                    </button>
                                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: SCOPE_COLORS[scope] }} />
                                    <Checkbox checked={scopeAll} indeterminate={scopeSome} onChange={(e) => setMany(scopeIds, e.target.checked)}>
                                        <span className="text-xs font-bold uppercase tracking-wide">{scope}</span>
                                    </Checkbox>
                                </div>
                                {scopeOpen &&
                                    cats.map((cat) => {
                                        const catActs = scopeActs.filter((a) => a.category === cat);
                                        const ids = catActs.map((a) => a.id);
                                        const inc = ids.filter((id) => !excluded.has(id));
                                        const all = inc.length === ids.length;
                                        const some = inc.length > 0 && !all;
                                        const catBase = catActs.reduce((t, a) => t + (Number(a.emission) || 0), 0);
                                        const catKey = `${scope}||${cat}`;
                                        const catOpen = isOpen(catKey);
                                        return (
                                            <div key={catKey} className="px-3 py-1.5">
                                                <div className="flex items-center gap-1">
                                                    <button type="button" onClick={() => toggle(catKey)} className="text-gray-400 hover:text-gray-600 leading-none" aria-label={catOpen ? 'Recolher categoria' : 'Expandir categoria'}>
                                                        {catOpen ? <CaretDownOutlined /> : <CaretRightOutlined />}
                                                    </button>
                                                    <Checkbox checked={all} indeterminate={some} onChange={(e) => setMany(ids, e.target.checked)}>
                                                        <span className="text-[13px] font-semibold">{cat}</span>
                                                        <span className="text-[11px] text-gray-400 ml-2">
                                                            {fmt(catBase)} tCO2e · {catActs.length} ativ.
                                                        </span>
                                                    </Checkbox>
                                                </div>
                                                {catOpen && (
                                                    <div className="pl-9 mt-1 space-y-1">
                                                        {catActs.map((a) => (
                                                            <div key={a.id}>
                                                                <Checkbox checked={!excluded.has(a.id)} onChange={(e) => setMany([a.id], e.target.checked)}>
                                                                    <span className="text-[13px]">{a.name}</span>
                                                                    <span className="text-[11px] text-gray-400 ml-2">{fmt(Number(a.emission) || 0)} tCO2e</span>
                                                                </Checkbox>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

MetaCoverageTree.propTypes = {
    activities: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
    excludedIds: PropTypes.arrayOf(PropTypes.string),
    onChange: PropTypes.func.isRequired,
};

MetaCoverageTree.defaultProps = { excludedIds: [] };

export default MetaCoverageTree;
