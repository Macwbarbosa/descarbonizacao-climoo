import React from 'react';
import PropTypes from 'prop-types';
import { Tag, Row, Col, Alert, Divider } from 'antd';
import { Card } from '@/shared/components/ui/Card';
import { SCOPE_KEYS } from '../services/sbtiTargetService';

const SCOPE_META = {
    scope1: { name: 'Escopo 1', color: '#5B6CB5' },
    scope2: { name: 'Escopo 2', color: '#C98A3A' },
    scope3: { name: 'Escopo 3', color: '#7AA05F' },
};
const fmt = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

/**
 * Visão consolidada da cobertura: quais escopos são cobertos por qual meta,
 * escopos SEM meta e a regra dos 40% de Escopo 3.
 */
function CoverageOverviewPanel({ baselineByScope, validation }) {
    const { total, coverage, scope3Share, globalErrors } = validation;

    return (
        <Card className="mb-4">
            <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-base font-semibold text-[#210856]">Cobertura dos escopos</h3>
                <span className="text-[11px] text-gray-500">quais escopos cada meta cobre · regra dos 40%</span>
            </div>
            <Divider className="my-3" />

            <Row gutter={[12, 12]}>
                {SCOPE_KEYS.map((k) => {
                    const value = baselineByScope[k] || 0;
                    const share = total > 0 ? (value / total) * 100 : 0;
                    const metasCovering = coverage[k] || [];
                    const uncovered = value > 0 && metasCovering.length === 0;
                    return (
                        <Col xs={24} md={8} key={k}>
                            <div className={`rounded-lg border p-3 h-full ${uncovered ? 'border-[#b9462f]' : 'border-gray-200'}`}>
                                <div className="flex items-center gap-2">
                                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: SCOPE_META[k].color }} />
                                    <b className="text-sm">{SCOPE_META[k].name}</b>
                                </div>
                                <div className="text-lg font-bold tabular-nums mt-1">{fmt(value)}</div>
                                <div className="text-[11px] text-gray-500">tCO2e · {share.toFixed(0)}% do total</div>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {metasCovering.length > 0 ? (
                                        metasCovering.map((m) => (
                                            <Tag key={m.id} className="rounded-full m-0 text-[10px]">
                                                {m.name}
                                            </Tag>
                                        ))
                                    ) : (
                                        <span className="text-[11px] text-[#b9462f]">sem meta</span>
                                    )}
                                </div>
                            </div>
                        </Col>
                    );
                })}
            </Row>

            {globalErrors.length > 0 ? (
                <Alert
                    className="mt-4"
                    type="warning"
                    showIcon
                    message="Pendências de cobertura"
                    description={
                        <ul className="list-disc pl-5 m-0">
                            {globalErrors.map((e) => (
                                <li key={e}>{e}</li>
                            ))}
                        </ul>
                    }
                />
            ) : (
                <Alert
                    className="mt-4"
                    type="success"
                    showIcon
                    message={`Cobertura consistente · Escopo 3 = ${scope3Share.toFixed(0)}% do total.`}
                />
            )}
        </Card>
    );
}

CoverageOverviewPanel.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    baselineByScope: PropTypes.object.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    validation: PropTypes.object.isRequired,
};

export default CoverageOverviewPanel;
