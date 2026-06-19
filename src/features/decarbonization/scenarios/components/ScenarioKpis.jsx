import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'antd';
import { Stack, TrendDown, Target, Flag } from '@phosphor-icons/react';
import { StatCard } from '@/shared/components/ui/Card';

const fmt = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Placar do cenário no ano-alvo. Recalcula ao vivo. */
function ScenarioKpis({ bauTarget, scenarioTarget, metaTarget, gap, targetYear, metaName }) {
    // Redução SOBRE O BAU (não sobre o ano-base).
    const reduction = bauTarget > 0 ? ((scenarioTarget - bauTarget) / bauTarget) * 100 : 0;
    const metMeta = gap != null && gap <= 0;
    let gapValue = '—';
    if (gap != null) gapValue = metMeta ? 'Meta atingida' : fmt(gap);

    return (
        <Row gutter={[12, 12]} className="mb-4">
            <Col xs={24} sm={12} lg={6}>
                <StatCard icon={<Stack size={18} weight="fill" />} title={`BAU ${targetYear}`} value={fmt(bauTarget)} unit="tCO2e" tooltipInfo="Emissão projetada sem ação." />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <StatCard
                    icon={<TrendDown size={18} weight="fill" />}
                    title={`Cenário ${targetYear}`}
                    value={fmt(scenarioTarget)}
                    unit="tCO2e"
                    tooltipInfo={`${reduction >= 0 ? '+' : ''}${pct(reduction)}% vs BAU`}
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <StatCard
                    icon={<Target size={18} weight="fill" />}
                    title={`Meta SBTi${metaName ? ` · ${metaName}` : ''}`}
                    value={metaTarget != null ? fmt(metaTarget) : '—'}
                    unit={metaTarget != null ? 'tCO2e' : ''}
                    tooltipInfo="Alvo absoluto da meta em foco (escopos da meta)."
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <StatCard
                    icon={<Flag size={18} weight="fill" />}
                    title="Gap residual"
                    value={gapValue}
                    unit={gap == null || metMeta ? '' : 'tCO2e acima'}
                    tooltipInfo="Emissão do cenário (nos escopos da meta) − alvo da meta."
                />
            </Col>
        </Row>
    );
}

ScenarioKpis.propTypes = {
    bauTarget: PropTypes.number.isRequired,
    scenarioTarget: PropTypes.number.isRequired,
    metaTarget: PropTypes.number,
    gap: PropTypes.number,
    targetYear: PropTypes.number.isRequired,
    metaName: PropTypes.string,
};

ScenarioKpis.defaultProps = { metaTarget: null, gap: null, metaName: '' };

export default ScenarioKpis;
