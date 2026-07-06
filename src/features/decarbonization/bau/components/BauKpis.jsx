import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'antd';
import { Stack, TrendUp, ChartLineUp, ChartPie } from '@phosphor-icons/react';
import { StatCard } from '@/shared/components/ui/Card';
import { totalEmission, scopeEmission, averageAnnualEmissionGrowth, SCOPES } from '../utils/bauProjection';

const fmt = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/**
 * Placar de KPIs do BAU: emissão base, BAU no ano-meta, crescimento médio das
 * emissões (a.a.) e mix por escopo (E1/E2/E3 %). Quando `denomByYear` é
 * informado (meta de intensidade), base e BAU são mostrados como INDICADOR
 * (tCO2e ÷ denominador do ano). Recalcula ao vivo.
 */
function BauKpis({ activities, baseYear, targetYear, driversById, unit, denomByYear }) {
    const { base, target, growth, mix } = useMemo(() => {
        let b = totalEmission(activities, baseYear, baseYear, driversById);
        let t = totalEmission(activities, targetYear, baseYear, driversById);
        const g = averageAnnualEmissionGrowth(activities, baseYear, targetYear, driversById);
        const byScope = SCOPES.map((s) => scopeEmission(activities, s, targetYear, baseYear, driversById));
        const pct = t > 0 ? byScope.map((v) => Math.round((v / t) * 100)) : [0, 0, 0];
        if (denomByYear) {
            if (denomByYear[baseYear]) b /= denomByYear[baseYear];
            if (denomByYear[targetYear]) t /= denomByYear[targetYear];
        }
        return { base: b, target: t, growth: g, mix: pct };
    }, [activities, baseYear, targetYear, driversById, denomByYear]);

    return (
        <Row gutter={[12, 12]} className="mb-4">
            <Col xs={24} sm={12} lg={6}>
                <StatCard
                    icon={<Stack size={18} weight="fill" />}
                    title={denomByYear ? `Intensidade base ${baseYear}` : `Emissão base ${baseYear}`}
                    value={fmt(base)}
                    unit={unit}
                    tooltipInfo="Total do inventário no ano-base."
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <StatCard
                    icon={<TrendUp size={18} weight="fill" />}
                    title={`BAU ${targetYear}`}
                    value={fmt(target)}
                    unit={unit}
                    tooltipInfo="Projeção sem ação no ano-meta."
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <StatCard
                    icon={<ChartLineUp size={18} weight="fill" />}
                    title="Crescimento médio das emissões (a.a.)"
                    value={`${growth >= 0 ? '+' : ''}${growth.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
                    unit="a.a."
                    tooltipInfo={`Variação média anual das emissões, BAU ${baseYear}–${targetYear}.`}
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <StatCard
                    icon={<ChartPie size={18} weight="fill" />}
                    title={`Mix por escopo ${targetYear}`}
                    value={`${mix[0]}/${mix[1]}/${mix[2]}`}
                    unit="E1/E2/E3 %"
                    tooltipInfo="Participação de cada escopo no total do ano-meta."
                />
            </Col>
        </Row>
    );
}

BauKpis.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    activities: PropTypes.arrayOf(PropTypes.object).isRequired,
    baseYear: PropTypes.number.isRequired,
    targetYear: PropTypes.number.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    driversById: PropTypes.object.isRequired,
    unit: PropTypes.string,
    // eslint-disable-next-line react/forbid-prop-types
    denomByYear: PropTypes.object,
};

BauKpis.defaultProps = { unit: 'tCO2e', denomByYear: null };

export default BauKpis;
