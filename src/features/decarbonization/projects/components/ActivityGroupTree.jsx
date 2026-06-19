import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Checkbox, Empty, Button, Input } from 'antd';
import { CaretRightOutlined, CaretDownOutlined, SearchOutlined } from '@ant-design/icons';
import { SCOPES, SCOPE_COLORS } from '../../bau/utils/bauProjection';

const fmt = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/**
 * Árvore Escopo › Categoria › Atividade com checkboxes e seleção em massa por
 * categoria (marcar a categoria seleciona todas). Busca por atividade/categoria
 * (filtra o inventário e expande os resultados). Cada nível pode ser
 * expandido/recolhido. Controlado por `selectedIds`.
 */
function ActivityGroupTree({ activities, selectedIds, onChange }) {
    const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
    // Conjunto de chaves recolhidas (escopo = `scope`; categoria = `scope||cat`).
    const [collapsed, setCollapsed] = useState(() => new Set());
    const [q, setQ] = useState('');
    const [onlySelected, setOnlySelected] = useState(false);

    const query = q.trim().toLowerCase();
    // Filtra o inventário pela busca (atividade ou categoria) e/ou "somente selecionadas".
    const visible = useMemo(() => {
        let list = query
            ? activities.filter((a) => a.name.toLowerCase().includes(query) || a.category.toLowerCase().includes(query))
            : activities;
        if (onlySelected) list = list.filter((a) => selected.has(a.id));
        return list;
    }, [activities, query, onlySelected, selected]);

    const setMany = (ids, checked) => {
        const next = new Set(selected);
        ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
        onChange(Array.from(next));
    };

    const toggle = (key) =>
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    // Durante a busca / "somente selecionadas" tudo fica expandido (para mostrar os resultados).
    const isOpen = (key) => (query || onlySelected ? true : !collapsed.has(key));

    const scopesPresent = useMemo(() => SCOPES.filter((s) => visible.some((a) => a.scope === s)), [visible]);

    // Todas as chaves (escopos + categorias) — para o botão expandir/recolher tudo.
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
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

    if (!activities.length) return <Empty description="Sem atividades no inventário." image={Empty.PRESENTED_IMAGE_SIMPLE} />;

    return (
        <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Input
                    prefix={<SearchOutlined className="text-gray-400" />}
                    placeholder="Buscar atividade ou categoria no inventário…"
                    allowClear
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    size="small"
                    style={{ maxWidth: 320 }}
                />
                {query && (
                    <>
                        <span className="text-[11px] text-gray-400">{visible.length} resultado(s)</span>
                        {visibleIds.length > 0 && (
                            <Button type="link" size="small" className="px-0 text-[12px]" onClick={() => setMany(visibleIds, !allVisibleSelected)}>
                                {allVisibleSelected ? 'Desmarcar resultados' : 'Selecionar resultados'}
                            </Button>
                        )}
                    </>
                )}
                <div className="flex-1" />
                <Button
                    type={onlySelected ? 'primary' : 'default'}
                    size="small"
                    className={onlySelected ? 'bg-[#210856] border-[#210856] text-[12px]' : 'text-[12px]'}
                    onClick={() => setOnlySelected((v) => !v)}
                >
                    {onlySelected ? 'Ver todas' : `Somente selecionadas (${selected.size})`}
                </Button>
                {!query && !onlySelected && (
                    <Button type="link" size="small" className="px-0 text-[12px]" onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(allKeys))}>
                        {allCollapsed ? 'Expandir tudo' : 'Recolher tudo'}
                    </Button>
                )}
            </div>
            {visible.length === 0 ? (
                <Empty
                    description={onlySelected ? 'Nenhuma atividade selecionada.' : 'Nenhuma atividade encontrada.'}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            ) : (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-80 overflow-auto">
                    {scopesPresent.map((scope) => {
                        const scopeActs = visible.filter((a) => a.scope === scope);
                        const cats = [...new Set(scopeActs.map((a) => a.category))];
                        const scopeOpen = isOpen(scope);
                        return (
                            <div key={scope}>
                                <button
                                    type="button"
                                    onClick={() => toggle(scope)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 bg-[#eef1f5] text-xs font-bold uppercase tracking-wide text-left"
                                >
                                    {scopeOpen ? <CaretDownOutlined className="text-gray-400" /> : <CaretRightOutlined className="text-gray-400" />}
                                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: SCOPE_COLORS[scope] }} />
                                    {scope}
                                </button>
                                {scopeOpen &&
                                    cats.map((cat) => {
                                        const catActs = scopeActs.filter((a) => a.category === cat);
                                        const ids = catActs.map((a) => a.id);
                                        const sel = ids.filter((id) => selected.has(id));
                                        const all = sel.length === ids.length;
                                        const some = sel.length > 0 && !all;
                                        const catBase = catActs.reduce((t, a) => t + a.baseEmission, 0);
                                        const catKey = `${scope}||${cat}`;
                                        const catOpen = isOpen(catKey);
                                        return (
                                            <div key={catKey} className="px-3 py-1.5">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggle(catKey)}
                                                        className="text-gray-400 hover:text-gray-600 leading-none"
                                                        aria-label={catOpen ? 'Recolher categoria' : 'Expandir categoria'}
                                                    >
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
                                                                <Checkbox checked={selected.has(a.id)} onChange={(e) => setMany([a.id], e.target.checked)}>
                                                                    <span className="text-[13px]">{a.name}</span>
                                                                    <span className="text-[11px] text-gray-400 ml-2">{fmt(a.baseEmission)} tCO2e</span>
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

ActivityGroupTree.propTypes = {
    activities: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
    selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired,
};

export default ActivityGroupTree;
