import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Input, Select, InputNumber, Checkbox, Button, Tag, Tooltip } from 'antd';
import { CaretRightOutlined, WarningOutlined, SearchOutlined } from '@ant-design/icons';
import Sparkline from '../../drivers/components/Sparkline';
import {
    activityEmission,
    activityEmissionByYear,
    activityGrowth,
    scopeEmission,
    SCOPES,
    SCOPE_COLORS,
    NO_GROWTH_DRIVER_ID,
} from '../utils/bauProjection';

const fmt = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const NO_GROWTH_OPTION = { value: NO_GROWTH_DRIVER_ID, label: 'Não cresce (constante)' };

/** Editor de período (detalhe da atividade): crescimento herdado por ano (somente-leitura) + memorial. */
function PeriodDetail({ activity, baseYear, endYear, driversById }) {
    const years = [];
    for (let y = baseYear + 1; y <= endYear; y += 1) years.push(y);
    const driver = activity.driverId ? driversById[activity.driverId] : null;

    return (
        <div className="bg-[#fbfcfd] px-4 py-3">
            <div className="text-xs text-gray-500 mb-2">
                Crescimento <b>somente-leitura</b> — herdado do driver <b>{driver?.name || '—'}</b> (definido na Etapa 3)
                × fator {Number(activity.factor).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}. Para alterar a
                curva, edite o driver na Etapa 3.
            </div>
            <div className="overflow-auto">
                <table className="text-xs border-collapse">
                    <thead>
                        <tr>
                            <th className="border border-gray-200 bg-gray-100 px-2 py-1 text-left">Ano</th>
                            {years.map((y) => (
                                <th key={y} className="border border-gray-200 bg-gray-100 px-2 py-1">
                                    {y}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-gray-200 px-2 py-1 text-left bg-[#f8fafb] text-gray-500">
                                Cresc. herdado (%)
                            </td>
                            {years.map((y) => (
                                <td key={y} className="border border-gray-200 px-2 py-1 text-center bg-[#f8fafb] text-gray-500 tabular-nums">
                                    {activityGrowth(activity, y, baseYear, driversById).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className="border border-gray-200 px-2 py-1 text-left bg-[#f3f5f8]">Emissão (tCO2e)</td>
                            {years.map((y) => (
                                <td key={y} className="border border-gray-200 px-2 py-1 text-center tabular-nums">
                                    {fmt(activityEmission(activity, y, baseYear, driversById))}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="mt-2 text-[11px] text-gray-500 bg-white border border-dashed border-gray-200 rounded-md px-3 py-2">
                <b className="text-gray-700">Memorial:</b> emissão(ano) = emissão(ano−1) × (1 + crescimento herdado%/100).
                Base {baseYear} = <b className="text-gray-700">{fmt(activity.baseEmission)}</b> tCO2e · driver{' '}
                <b className="text-gray-700">{driver?.name || '—'}</b> · fator{' '}
                {Number(activity.factor).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}. Recalcula ao vivo.
            </div>
        </div>
    );
}

PeriodDetail.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    activity: PropTypes.object.isRequired,
    baseYear: PropTypes.number.isRequired,
    endYear: PropTypes.number.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    driversById: PropTypes.object.isRequired,
};

/**
 * Matriz de vínculo atividade × driver: árvore colapsável Escopo › Categoria ›
 * Atividade, com rollups, atribuição em massa por categoria, filtros, linha de
 * detalhe (crescimento herdado + memorial) e edição de driver/fator ao vivo.
 *
 * TODO (performance): para milhares de atividades, aplicar virtualização do
 * projeto. Hoje a renderização é memoizada e a árvore é colapsável por grupo.
 */
function BauMatrix({ activities, drivers, driversById, baseYear, targetYear, endYear, onSetDriver, onSetFactor, onBulkAssign }) {
    const [q, setQ] = useState('');
    const [fEsc, setFEsc] = useState('');
    const [fUnlinked, setFUnlinked] = useState(false);
    const [collapsedScopes, setCollapsedScopes] = useState(() => new Set());
    const [collapsedCats, setCollapsedCats] = useState(() => new Set());
    const [openRow, setOpenRow] = useState(null);

    const driverOptions = useMemo(() => drivers.map((d) => ({ value: d.id, label: d.name })), [drivers]);
    const bulkOptions = useMemo(() => [{ value: '', label: '— em massa —' }, NO_GROWTH_OPTION, ...driverOptions], [driverOptions]);

    const visible = useMemo(() => {
        const query = q.trim().toLowerCase();
        return activities.filter((a) => {
            if (fEsc && a.scope !== fEsc) return false;
            if (fUnlinked && a.driverId) return false;
            if (query && !(a.name.toLowerCase().includes(query) || a.category.toLowerCase().includes(query))) return false;
            return true;
        });
    }, [activities, q, fEsc, fUnlinked]);

    const orphanCount = activities.filter((a) => !a.driverId).length;

    const toggle = (set, setSet, key) => {
        const next = new Set(set);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        setSet(next);
    };
    const expandAll = () => {
        setCollapsedScopes(new Set());
        setCollapsedCats(new Set());
    };
    const collapseAll = () => {
        setCollapsedScopes(new Set(SCOPES.filter((s) => visible.some((a) => a.scope === s))));
    };

    // Monta as linhas (grupos + atividades + detalhe).
    const rows = [];
    const scopesPresent = SCOPES.filter((s) => visible.some((a) => a.scope === s));
    scopesPresent.forEach((scope) => {
        const scopeActs = visible.filter((a) => a.scope === scope);
        const scopeOpen = !collapsedScopes.has(scope);
        const eBase = scopeActs.reduce((t, a) => t + a.baseEmission, 0);
        const eProj = scopeEmission(scopeActs, scope, targetYear, baseYear, driversById);

        rows.push(
            <tr key={`esc-${scope}`} className="bg-[#eef1f5] font-bold text-xs uppercase tracking-wide">
                <td className="px-3 py-2 text-left">
                    <button type="button" onClick={() => toggle(collapsedScopes, setCollapsedScopes, scope)} className="mr-1 align-middle">
                        <CaretRightOutlined className={`transition-transform ${scopeOpen ? 'rotate-90' : ''}`} />
                    </button>
                    <span className="inline-block w-2.5 h-2.5 rounded-sm mx-1 align-middle" style={{ background: SCOPE_COLORS[scope] }} />
                    {scope} <Tag className="rounded m-0 ml-1 text-[10px]">{scopeActs.length} ativ.</Tag>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(eBase)}</td>
                <td colSpan={3} />
                <td className="px-3 py-2 text-right tabular-nums font-bold">{fmt(eProj)}</td>
            </tr>
        );

        if (!scopeOpen) return;

        const cats = [...new Set(scopeActs.map((a) => a.category))];
        cats.forEach((cat) => {
            const catActs = scopeActs.filter((a) => a.category === cat);
            const catKey = `${scope}||${cat}`;
            const catOpen = !collapsedCats.has(catKey);
            const cBase = catActs.reduce((t, a) => t + a.baseEmission, 0);
            const cProj = catActs.reduce((t, a) => t + activityEmission(a, targetYear, baseYear, driversById), 0);

            rows.push(
                <tr key={`cat-${catKey}`} className="bg-[#f6f8fa] font-semibold text-xs">
                    <td className="px-3 py-2 text-left" style={{ paddingLeft: 30 }}>
                        <button type="button" onClick={() => toggle(collapsedCats, setCollapsedCats, catKey)} className="mr-1 align-middle">
                            <CaretRightOutlined className={`transition-transform ${catOpen ? 'rotate-90' : ''}`} />
                        </button>
                        {cat} <Tag className="rounded m-0 ml-1 text-[10px]">{catActs.length}</Tag>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(cBase)}</td>
                    <td className="px-3 py-2 text-left">
                        <Tooltip title="Atribuir um driver a todas as atividades desta categoria">
                            <Select
                                size="small"
                                value=""
                                options={bulkOptions}
                                onChange={(v) => v && onBulkAssign(scope, cat, v)}
                                style={{ minWidth: 140 }}
                            />
                        </Tooltip>
                    </td>
                    <td colSpan={2} className="px-3 py-2 text-right tabular-nums font-bold">{fmt(cProj)}</td>
                </tr>
            );

            if (!catOpen) return;

            catActs.forEach((a) => {
                const isOpen = openRow === a.id;
                const sparkValues = activityEmissionByYear(a, { baseYear, endYear }, driversById).map((p) => p.emission);
                rows.push(
                    <tr key={`act-${a.id}`} className="hover:bg-[#f7f9fb] border-b border-gray-100">
                        <td className="px-3 py-2 text-left cursor-pointer" style={{ paddingLeft: 48 }} onClick={() => setOpenRow(isOpen ? null : a.id)}>
                            <CaretRightOutlined className={`mr-1 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                            {a.name}
                            {!a.driverId && (
                                <Tooltip title="Sem vínculo — não cresce / não projeta">
                                    <WarningOutlined className="text-[#b9462f] ml-2" />
                                </Tooltip>
                            )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(a.baseEmission)}</td>
                        <td className="px-3 py-2 text-left">
                            <Select
                                size="small"
                                value={a.driverId || ''}
                                options={[{ value: '', label: '— sem vínculo —' }, NO_GROWTH_OPTION, ...driverOptions]}
                                onChange={(v) => onSetDriver(a.id, v)}
                                style={{ minWidth: 150 }}
                                status={a.driverId ? '' : 'warning'}
                            />
                        </td>
                        <td className="px-3 py-2 text-right">
                            <InputNumber
                                size="small"
                                value={a.factor}
                                step={0.1}
                                min={0}
                                onChange={(v) => onSetFactor(a.id, v)}
                                style={{ width: 72 }}
                            />
                        </td>
                        <td className="px-3 py-2 text-center">
                            <Sparkline values={sparkValues} color={SCOPE_COLORS[scope]} width={84} height={22} />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold">
                            {fmt(activityEmission(a, targetYear, baseYear, driversById))}
                        </td>
                    </tr>
                );
                if (isOpen) {
                    rows.push(
                        <tr key={`detail-${a.id}`}>
                            <td colSpan={6} className="p-0">
                                <PeriodDetail activity={a} baseYear={baseYear} endYear={endYear} driversById={driversById} />
                            </td>
                        </tr>
                    );
                }
            });
        });
    });

    return (
        <div>
            {/* Toolbar */}
            <div className="flex gap-3 items-center flex-wrap mb-3">
                <Input
                    prefix={<SearchOutlined className="text-gray-400" />}
                    placeholder="Buscar atividade…"
                    allowClear
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    style={{ maxWidth: 240 }}
                />
                <Select
                    value={fEsc}
                    onChange={setFEsc}
                    style={{ width: 180 }}
                    options={[{ value: '', label: 'Todos os escopos' }, ...SCOPES.map((s) => ({ value: s, label: s }))]}
                />
                <Checkbox checked={fUnlinked} onChange={(e) => setFUnlinked(e.target.checked)}>
                    só sem vínculo
                </Checkbox>
                <span className="text-[11px] text-gray-400">
                    {activities.length} atividades{orphanCount ? ` · ${orphanCount} sem vínculo` : ''}
                </span>
                <div className="flex-1" />
                <Button type="link" className="px-1" onClick={expandAll}>
                    expandir tudo
                </Button>
                <Button type="link" className="px-1" onClick={collapseAll}>
                    recolher tudo
                </Button>
            </div>

            <div className="overflow-auto" style={{ maxHeight: 560 }}>
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                            <th className="px-3 py-2 text-left bg-[#fafbfc] sticky top-0 z-10">Escopo › Categoria › Atividade</th>
                            <th className="px-3 py-2 text-right bg-[#fafbfc] sticky top-0 z-10">Emissão base {baseYear}</th>
                            <th className="px-3 py-2 text-left bg-[#fafbfc] sticky top-0 z-10">Driver</th>
                            <th className="px-3 py-2 text-right bg-[#fafbfc] sticky top-0 z-10">Fator</th>
                            <th className="px-3 py-2 text-center bg-[#fafbfc] sticky top-0 z-10">Curva</th>
                            <th className="px-3 py-2 text-right bg-[#fafbfc] sticky top-0 z-10">BAU {targetYear}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length > 0 ? (
                            rows
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center text-gray-500 py-6">
                                    Nenhuma atividade com os filtros atuais.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

BauMatrix.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    activities: PropTypes.arrayOf(PropTypes.object).isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    drivers: PropTypes.arrayOf(PropTypes.object).isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    driversById: PropTypes.object.isRequired,
    baseYear: PropTypes.number.isRequired,
    targetYear: PropTypes.number.isRequired,
    endYear: PropTypes.number.isRequired,
    onSetDriver: PropTypes.func.isRequired,
    onSetFactor: PropTypes.func.isRequired,
    onBulkAssign: PropTypes.func.isRequired,
};

export default BauMatrix;
