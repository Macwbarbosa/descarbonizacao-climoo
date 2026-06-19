import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Row, Col, Select, Input, Tag, Empty } from 'antd';
import { Column } from '@antv/g2plot';
import { Stack, CurrencyDollar, Target, ChartBar, MagnifyingGlass } from '@phosphor-icons/react';
import { StatCard, ChartCard } from '@/shared/components/ui/Card';
import ActivityTable from '@components/shared/Tables/ActivityTable';
import useDecarbonizationSettingsStore from '../settings/store/useDecarbonizationSettingsStore';

const INITIATIVE_CHART_COLORS = ['#2B0A70', '#7B3FF2', '#5CE1E6', '#3D1A8F', '#A7A3E0', '#F87171'];

const SCOPE_LABELS = {
    scope1: 'Escopo 1',
    scope2: 'Escopo 2',
    scope1_2: 'Escopo 1 e 2',
    scope3: 'Escopo 3',
};

function formatBRL(value) {
    if (!value || Number.isNaN(Number(value))) return 'R$ 0,00';
    return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('pt-BR');
}

function InitiativesManagementPage() {
    const store = useDecarbonizationSettingsStore();
    const {
        initiatives = [],
        reductionGoals = [],
        loadInitiatives,
        loadReductionGoals,
    } = store;

    const [goalFilter, setGoalFilter] = useState(null);
    const [scopeFilter, setScopeFilter] = useState(null);
    const [search, setSearch] = useState('');
    const chartRef = useRef(null);
    const chartPlot = useRef(null);

    useEffect(() => {
        loadInitiatives?.();
        loadReductionGoals?.();
    }, [loadInitiatives, loadReductionGoals]);

    const initiativesArray = useMemo(
        () => (Array.isArray(initiatives) ? initiatives : Object.values(initiatives)),
        [initiatives]
    );
    const goalsArray = useMemo(
        () => (Array.isArray(reductionGoals) ? reductionGoals : Object.values(reductionGoals)),
        [reductionGoals]
    );

    const goalById = useMemo(() => {
        const map = {};
        goalsArray.forEach(g => { map[g.id] = g; });
        return map;
    }, [goalsArray]);

    const filtered = useMemo(() => initiativesArray.filter(i => {
        if (!i) return false;
        if (goalFilter && i.associatedGoal !== goalFilter) return false;
        if (scopeFilter && i.scope !== scopeFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            const title = (i.title || '').toLowerCase();
            const desc = (i.description || '').toLowerCase();
            if (!title.includes(q) && !desc.includes(q)) return false;
        }
        return true;
    }), [initiativesArray, goalFilter, scopeFilter, search]);

    const stats = useMemo(() => {
        const total = filtered.length;
        const investment = filtered.reduce((sum, i) => sum + (i?.investment?.totalAmount || 0), 0);
        const goalsCovered = new Set(filtered.map(i => i?.associatedGoal).filter(Boolean)).size;
        const byScope = filtered.reduce((acc, i) => {
            const key = i?.scope || 'undefined';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return { total, investment, goalsCovered, byScope };
    }, [filtered]);

    const chartData = useMemo(() => {
        const grouped = filtered.reduce((acc, i) => {
            const goal = goalById[i?.associatedGoal];
            const label = goal?.goalName || 'Sem meta';
            acc[label] = (acc[label] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(grouped).map(([category, value]) => ({ category, value }));
    }, [filtered, goalById]);

    useEffect(() => {
        if (chartPlot.current) {
            chartPlot.current.destroy();
            chartPlot.current = null;
        }
        if (!chartRef.current || chartData.length === 0) return undefined;

        chartPlot.current = new Column(chartRef.current, {
            data: chartData,
            xField: 'category',
            yField: 'value',
            seriesField: 'category',
            color: INITIATIVE_CHART_COLORS,
            columnWidthRatio: 0.7,
            columnStyle: { radius: [6, 6, 0, 0] },
            label: {
                position: 'top',
                style: { fill: '#222', fontWeight: 'bold' },
            },
            legend: { position: 'bottom' },
            tooltip: {
                formatter: (datum) => ({
                    name: datum.category,
                    value: `${datum.value} iniciativa(s)`,
                }),
            },
            yAxis: {
                title: { text: 'Quantidade de iniciativas', style: { fontSize: 13, fontWeight: 'bold', fill: '#666' } },
            },
        });
        chartPlot.current.render();

        return () => {
            if (chartPlot.current) {
                chartPlot.current.destroy();
                chartPlot.current = null;
            }
        };
    }, [chartData]);

    const columns = [
        {
            title: 'Iniciativa',
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
                <div className="flex flex-col">
                    <span className="font-semibold">{text || 'Sem título'}</span>
                    {record.projectType && (
                        <span className="text-xs text-gray-500">{record.projectType}</span>
                    )}
                </div>
            ),
        },
        {
            title: 'Meta',
            dataIndex: 'associatedGoal',
            key: 'associatedGoal',
            render: (id) => goalById[id]?.goalName || <span className="text-gray-400">—</span>,
        },
        {
            title: 'Escopo',
            dataIndex: 'scope',
            key: 'scope',
            render: (scope) => (scope
                ? <Tag color="purple">{SCOPE_LABELS[scope] || scope}</Tag>
                : <span className="text-gray-400">—</span>
            ),
        },
        {
            title: 'Categoria',
            dataIndex: 'category',
            key: 'category',
            render: (v) => v || <span className="text-gray-400">—</span>,
        },
        {
            title: 'Responsável',
            dataIndex: 'responsible',
            key: 'responsible',
            render: (v) => v || <span className="text-gray-400">—</span>,
        },
        {
            title: 'Início',
            dataIndex: 'startDate',
            key: 'startDate',
            render: (v) => formatDate(v),
        },
        {
            title: 'Fim',
            dataIndex: 'endDate',
            key: 'endDate',
            render: (v) => formatDate(v),
        },
        {
            title: 'Investimento',
            dataIndex: ['investment', 'totalAmount'],
            key: 'investment',
            align: 'right',
            render: (_, record) => formatBRL(record?.investment?.totalAmount),
        },
    ];

    return (
        <div className="dashboard-page px-2 min-h-[calc(100vh-106px)]">
            {/* Header — filtros */}
            <Row gutter={[16, 16]} className="mb-4">
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Select
                        value={goalFilter}
                        onChange={setGoalFilter}
                        placeholder="Filtrar por meta"
                        allowClear
                        style={{ width: '100%', height: 40 }}
                        options={goalsArray.map(g => ({ value: g.id, label: g.goalName }))}
                    />
                </Col>
                <Col xs={24} sm={12} md={8} lg={5}>
                    <Select
                        value={scopeFilter}
                        onChange={setScopeFilter}
                        placeholder="Filtrar por escopo"
                        allowClear
                        style={{ width: '100%', height: 40 }}
                        options={Object.entries(SCOPE_LABELS).map(([value, label]) => ({ value, label }))}
                    />
                </Col>
                <Col xs={24} sm={24} md={8} lg={8}>
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por título ou descrição"
                        prefix={<MagnifyingGlass size={16} />}
                        allowClear
                        style={{ height: 40 }}
                    />
                </Col>
            </Row>

            {/* KPIs */}
            <Row gutter={[16, 16]} className="mt-4">
                <Col flex="1 1 220px">
                    <StatCard
                        icon={<Stack size={18} weight="fill" />}
                        title="Total de Iniciativas"
                        value={`${stats.total}`}
                        tooltipInfo="Quantidade de iniciativas que atendem aos filtros aplicados."
                        className="h-full"
                    />
                </Col>
                <Col flex="1 1 220px">
                    <StatCard
                        icon={<CurrencyDollar size={18} weight="fill" />}
                        title="Investimento Total"
                        value={stats.investment > 0
                            ? stats.investment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '0,00'}
                        unit="R$"
                        tooltipInfo="Soma do investimento previsto das iniciativas filtradas."
                        className="h-full"
                    />
                </Col>
                <Col flex="1 1 220px">
                    <StatCard
                        icon={<Target size={18} weight="fill" />}
                        title="Metas Cobertas"
                        value={`${stats.goalsCovered}`}
                        unit={`/ ${goalsArray.length}`}
                        tooltipInfo="Quantidade de metas de redução com pelo menos uma iniciativa vinculada."
                        className="h-full"
                    />
                </Col>
                <Col flex="1 1 220px">
                    <StatCard
                        icon={<ChartBar size={18} weight="fill" />}
                        title="Escopos Atendidos"
                        value={`${Object.keys(stats.byScope).filter(k => k !== 'undefined').length}`}
                        tooltipInfo="Quantidade distinta de escopos cobertos pelas iniciativas filtradas."
                        className="h-full"
                    />
                </Col>
            </Row>

            {/* Gráfico de distribuição */}
            <Row gutter={[16, 0]} className="mt-4">
                <Col xs={24}>
                    <ChartCard
                        title="Iniciativas por Meta"
                        chart={chartData.length > 0 ? (
                            <div ref={chartRef} style={{ height: 320 }} />
                        ) : (
                            <div className="flex justify-center items-center" style={{ height: 320 }}>
                                <Empty description="Nenhuma iniciativa para os filtros selecionados" />
                            </div>
                        )}
                    />
                </Col>
            </Row>

            {/* Tabela */}
            <Row gutter={[16, 0]} className="mt-4">
                <Col xs={24}>
                    <ChartCard
                        title="Lista de Iniciativas"
                        chart={(
                            <ActivityTable
                                columns={columns}
                                data={filtered.map(i => ({ ...i, key: i.id }))}
                                pagination={{ pageSize: 8, showSizeChanger: false }}
                            />
                        )}
                    />
                </Col>
            </Row>
        </div>
    );
}

export default InitiativesManagementPage;
