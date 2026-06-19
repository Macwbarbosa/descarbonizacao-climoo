import React from 'react';
import PropTypes from 'prop-types';
import { Table, Tag, Tooltip } from 'antd';
import { Card } from '@/shared/components/ui/Card';

const fmt = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (v) => `R$ ${fmt(v)}`;
const pct = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Tabela comparativa de cenários no ano-alvo. */
function ScenarioComparisonTable({ rows, targetYear, metaName }) {
    const columns = [
        { title: 'Cenário', dataIndex: 'name', key: 'name', render: (t, r) => <span className={r.active ? 'font-semibold text-[#210856]' : ''}>{t}{r.active && <Tag className="ml-2 rounded-full" color="purple">ativo</Tag>}</span> },
        { title: `Emissão ${targetYear}`, dataIndex: 'emission', key: 'emission', align: 'right', render: (v) => `${fmt(v)} tCO2e` },
        { title: 'Redução vs BAU', dataIndex: 'reductionPct', key: 'reductionPct', align: 'right', render: (v) => `${v >= 0 ? '+' : ''}${pct(v)}%` },
        {
            title: (
                <Tooltip title={metaName ? `Meta em foco: ${metaName}` : ''}>
                    <span>Gap vs meta</span>
                </Tooltip>
            ),
            dataIndex: 'gap',
            key: 'gap',
            align: 'right',
            render: (v) => {
                if (v == null) return '—';
                if (v <= 0) return <Tag color="green">Meta atingida</Tag>;
                return <span className="text-[#b9462f]">{`${fmt(v)} tCO2e`}</span>;
            },
        },
        { title: 'Custo bruto', dataIndex: 'custoBruto', key: 'custoBruto', align: 'right', render: money },
        { title: 'Savings', dataIndex: 'savings', key: 'savings', align: 'right', render: money },
    ];
    return (
        <Card className="mt-4">
            <h3 className="text-base font-semibold text-[#210856] mb-3">Comparação de cenários</h3>
            <Table rowKey="id" dataSource={rows} columns={columns} pagination={false} size="middle" scroll={{ x: 'max-content' }} />
        </Card>
    );
}

ScenarioComparisonTable.propTypes = {
    rows: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
    targetYear: PropTypes.number.isRequired,
    metaName: PropTypes.string,
};

ScenarioComparisonTable.defaultProps = { metaName: '' };

export default ScenarioComparisonTable;
