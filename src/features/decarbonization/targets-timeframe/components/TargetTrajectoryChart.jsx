import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Line } from '@antv/g2plot';
import { Empty } from 'antd';

/** Cores da trajetória-alvo (alinhadas ao design system / dashboard). */
const COLORS = {
    target: '#C2492F', // trajetória-alvo SBTi
    baseline: '#9CA3AF', // valor do ano-base (referência)
    residual: '#2F7D4F', // banda de residual neutralizado
};

/**
 * Gráfico da trajetória-alvo de UMA meta (ano-base → near-term [→ net-zero]).
 * Funciona para metas absolutas (tCO2e) e de intensidade (tCO2e/unidade) — a
 * unidade vem em `unitLabel`. A banda de residual neutralizado só aparece
 * quando `residualValue` é informado (metas com net-zero).
 */
function TargetTrajectoryChart({ trajetoria, baseValue, residualValue, milestoneYears, unitLabel }) {
    const containerRef = useRef(null);
    const plotRef = useRef(null);

    const fmt = (v) => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: residualValue != null ? 0 : 2 })} ${unitLabel}`;

    useEffect(() => {
        if (!containerRef.current || !Array.isArray(trajetoria) || trajetoria.length === 0) {
            return undefined;
        }

        const data = trajetoria.map((p) => ({ year: String(p.ano), value: p.valor }));
        const minYear = String(trajetoria[0].ano);
        const maxYear = String(trajetoria[trajetoria.length - 1].ano);

        const annotations = [
            {
                type: 'line',
                start: [minYear, baseValue],
                end: [maxYear, baseValue],
                style: { stroke: COLORS.baseline, lineDash: [5, 4], lineWidth: 1 },
            },
        ];
        if (residualValue != null) {
            annotations.unshift({
                type: 'region',
                start: [minYear, 0],
                end: [maxYear, residualValue],
                style: { fill: COLORS.residual, fillOpacity: 0.12 },
            });
            annotations.push({
                type: 'text',
                position: [maxYear, residualValue],
                content: 'Residual neutralizado',
                offsetX: -120,
                offsetY: -8,
                style: { fill: COLORS.residual, fontSize: 11, textAlign: 'left' },
            });
        }

        const timeoutId = setTimeout(() => {
            if (!containerRef.current) return;
            containerRef.current.innerHTML = '';
            plotRef.current = new Line(containerRef.current, {
                data,
                xField: 'year',
                yField: 'value',
                autoFit: true,
                smooth: false,
                color: COLORS.target,
                lineStyle: { lineWidth: 3 },
                point: {
                    size: (d) => (milestoneYears.includes(Number(d.year)) ? 6 : 0),
                    shape: 'circle',
                    style: { fill: '#fff', stroke: COLORS.target, lineWidth: 2 },
                },
                yAxis: {
                    min: 0,
                    title: { text: unitLabel, style: { fontSize: 12, fontWeight: 'bold', fill: '#666' } },
                    // Sem meta.value.formatter (deixaria o tick já formatado com unidade).
                    label: { formatter: (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) },
                },
                tooltip: { formatter: (datum) => ({ name: 'Trajetória-alvo SBTi', value: fmt(datum.value) }) },
                annotations,
            });
            plotRef.current.render();
        }, 80);

        return () => {
            clearTimeout(timeoutId);
            if (plotRef.current) {
                plotRef.current.destroy();
                plotRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trajetoria, baseValue, residualValue, milestoneYears, unitLabel]);

    if (!Array.isArray(trajetoria) || trajetoria.length === 0) {
        return <Empty description="Sem dados suficientes para gerar a trajetória." />;
    }

    return <div ref={containerRef} style={{ width: '100%', height: 300 }} />;
}

TargetTrajectoryChart.propTypes = {
    trajetoria: PropTypes.arrayOf(PropTypes.shape({ ano: PropTypes.number, valor: PropTypes.number })).isRequired,
    baseValue: PropTypes.number.isRequired,
    residualValue: PropTypes.number,
    milestoneYears: PropTypes.arrayOf(PropTypes.number).isRequired,
    unitLabel: PropTypes.string,
};

TargetTrajectoryChart.defaultProps = {
    residualValue: null,
    unitLabel: 'tCO2e',
};

export default TargetTrajectoryChart;
