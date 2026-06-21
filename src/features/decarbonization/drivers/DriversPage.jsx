import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spin, Alert, Empty, Table, Tag, Tooltip, message } from 'antd';
import { SaveOutlined, PlusOutlined, WarningOutlined, RightOutlined } from '@ant-design/icons';
import { Card } from '@/shared/components/ui/Card';
import useDriversStore from './store/useDriversStore';
import usePlanTargetsStore from '../targets-timeframe/store/usePlanTargetsStore';
import Sparkline from './components/Sparkline';
import { indicePorAno } from './utils/driverIndex';
import { METHOD_LABELS } from './constants';
import DecarbonizationDataBar from '../shared/DecarbonizationDataBar';
import { saveCompanyToProject } from '../shared/decarbonizationExport';

/**
 * Etapa 3 — Variáveis de Crescimento (drivers do BAU), em modo LISTA.
 *
 * Cada linha resume a variável (unidade, tipo, método, valor base, tendência e
 * uso). Clicar numa linha abre a tela cheia do driver (`/drivers/:id`) com os
 * detalhes — gráfico, método, histórico e configurações. Ctrl/Cmd+clique abre
 * em nova aba do navegador.
 */
function DriversPage() {
    const navigate = useNavigate();

    const drivers = useDriversStore((s) => s.drivers);
    const loading = useDriversStore((s) => s.loading);
    const saving = useDriversStore((s) => s.saving);
    const error = useDriversStore((s) => s.error);
    const loadDrivers = useDriversStore((s) => s.loadDrivers);
    const addDriver = useDriversStore((s) => s.addDriver);
    const savePlan = useDriversStore((s) => s.savePlan);

    // Ano-base e horizonte — fonte única: tela Metas & Período.
    const { baseYear, netZeroYear } = usePlanTargetsStore((s) => s.params);
    const endYear = netZeroYear;

    useEffect(() => {
        loadDrivers().catch(() => {
            message.error('Erro ao carregar as variáveis de crescimento.');
        });
    }, [loadDrivers]);

    const openDriver = (id, e) => {
        const url = `/drivers/${id}`;
        if (e && (e.metaKey || e.ctrlKey)) window.open(url, '_blank');
        else navigate(url);
    };

    const handleAdd = () => {
        const id = addDriver();
        if (id) navigate(`/drivers/${id}`);
    };

    const handleSave = async () => {
        try {
            await savePlan();
            try {
                const data = await saveCompanyToProject();
                message.success(`Salvo no projeto: decarbonization-data/${data.cnpj}.json`);
            } catch (fileErr) {
                message.warning('Salvo localmente. Para gravar o arquivo no projeto, rode em npm run dev.');
            }
        } catch (err) {
            message.error('Erro ao salvar. Tente novamente.');
        }
    };

    const fmt = (v) =>
        typeof v === 'number' ? v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—';

    const columns = [
        {
            title: 'Variável',
            dataIndex: 'name',
            key: 'name',
            render: (name, d) => (
                <div>
                    <div className="font-semibold text-[#210856]">{name || '—'}</div>
                    <div className="text-[11px] text-gray-500">{d.unit || 'sem unidade'}</div>
                </div>
            ),
            sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
        },
        {
            title: 'Tipo',
            dataIndex: 'type',
            key: 'type',
            width: 130,
            render: (type) => <Tag className="rounded-full m-0">{type}</Tag>,
            filters: ['Físico', 'Financeiro', 'Operacional'].map((t) => ({ text: t, value: t })),
            onFilter: (value, d) => d.type === value,
        },
        {
            title: 'Método',
            dataIndex: 'method',
            key: 'method',
            width: 130,
            render: (method) => (
                <Tag className="rounded-full m-0" color="purple">
                    {METHOD_LABELS[method] || method}
                </Tag>
            ),
        },
        {
            title: 'Valor base',
            dataIndex: 'baseValue',
            key: 'baseValue',
            width: 130,
            align: 'right',
            render: (v) => <span className="tabular-nums">{fmt(v)}</span>,
            sorter: (a, b) => (a.baseValue || 0) - (b.baseValue || 0),
        },
        {
            title: `Tendência (índice ${baseYear}→${endYear})`,
            key: 'trend',
            width: 200,
            render: (_, d) => {
                const values = indicePorAno(d, { baseYear, endYear }).map((p) => p.index);
                const last = values[values.length - 1];
                return (
                    <div className="flex items-center gap-2">
                        <Sparkline values={values} />
                        <span className="text-[11px] text-gray-500 tabular-nums">
                            {typeof last === 'number' ? Math.round(last) : '—'}
                        </span>
                    </div>
                );
            },
        },
        {
            title: 'Uso no BAU',
            key: 'usedBy',
            width: 140,
            render: (_, d) => {
                const n = (d.usedBy || []).length;
                return n === 0 ? (
                    <Tooltip title="Sem atividade vinculada — não afeta o BAU">
                        <span className="text-[12px] text-[#b9462f] inline-flex items-center gap-1">
                            <WarningOutlined /> órfão
                        </span>
                    </Tooltip>
                ) : (
                    <span className="text-[12px] text-gray-600">{n} atividade(s)</span>
                );
            },
            sorter: (a, b) => (a.usedBy || []).length - (b.usedBy || []).length,
        },
        {
            title: '',
            key: 'open',
            width: 44,
            align: 'center',
            render: () => <RightOutlined className="text-gray-300" />,
        },
    ];

    return (
        <div className="px-2 min-h-[calc(100vh-106px)]">
            <DecarbonizationDataBar />
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-5 gap-3">
                <div>
                    <div className="text-xs text-gray-500">
                        Plano de Descarbonização &nbsp;›&nbsp;{' '}
                        <span className="text-[#210856] font-medium">Variáveis de Crescimento</span>
                    </div>
                    <h2 className="text-xl font-semibold text-[#210856] mt-1">Variáveis de Crescimento</h2>
                    <p className="text-sm text-gray-500">
                        Drivers que ancoram a projeção de emissões. Clique numa variável para abrir os
                        detalhes (gráfico, método e configurações). Base 100 no ano-base {baseYear}.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button icon={<PlusOutlined />} onClick={handleAdd} className="text-[#210856]">
                        Nova variável
                    </Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSave}
                        loading={saving}
                        className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6"
                        size="large"
                    >
                        Salvar alterações
                    </Button>
                </div>
            </div>

            {error && <Alert className="mb-4" type="error" showIcon message={error} />}

            <Spin spinning={loading}>
                <Card>
                    <Table
                        rowKey="id"
                        columns={columns}
                        dataSource={drivers}
                        pagination={false}
                        scroll={{ x: 880 }}
                        onRow={(d) => ({
                            onClick: (e) => openDriver(d.id, e),
                            style: { cursor: 'pointer' },
                        })}
                        locale={{
                            emptyText: (
                                <div className="py-12">
                                    <Empty description="Nenhuma variável de crescimento ainda.">
                                        <Button
                                            type="primary"
                                            icon={<PlusOutlined />}
                                            onClick={handleAdd}
                                            className="bg-[#210856] border-[#210856]"
                                        >
                                            Nova variável
                                        </Button>
                                    </Empty>
                                </div>
                            ),
                        }}
                    />
                </Card>
            </Spin>
        </div>
    );
}

export default DriversPage;
