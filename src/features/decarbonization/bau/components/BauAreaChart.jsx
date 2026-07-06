import React, { useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Area } from '@antv/g2plot';
import { Empty } from 'antd';
import { bauStackedByScope, totalEmission, SCOPES } from '../utils/bauProjection';

const fmtVal = (v, unit) => `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${unit}`;

/** Cores por série, no estilo do gráfico "Trajetória no tempo" (Cenários). */
const SERIES_COLORS = {
    'Escopo 1': '#8B7CF8',
    'Escopo 2': '#38C6F4',
    'Escopo 3': '#34D399',
    Total: '#210856',
};
const SERIES_ORDER = ['Total', ...SCOPES];

/**
 * Trajetória das emissões BAU por escopo (+ Total) ao longo do horizonte —
 * linhas suaves com pontos e preenchimento de área leve, no mesmo estilo do
 * gráfico "Trajetória no tempo" da tela de Cenários. A legenda (rodapé) permite
 * ver/ocultar cada linha. Marcador no ano-alvo. Recalcula ao vivo.
 */
function BauAreaChart({ activities, baseYear, endYear, targetYear, driversById, unit, denomByYear }) {
    const ref = useRef(null);
    const plotRef = useRef(null);

    const data = useMemo(() => {
        const porEscopo = bauStackedByScope(activities, { baseYear, endYear }, driversById);
        const total = [];
        for (let y = baseYear; y <= endYear; y += 1) {
            total.push({ year: y, scope: 'Total', value: totalEmission(activities, y, baseYear, driversById) });
        }
        // Total primeiro (fica ao fundo); escopos por cima.
        const rows = [...total, ...porEscopo];
        // Intensidade: divide cada ponto pelo denominador projetado do ano.
        if (denomByYear) {
            return rows.map((p) => ({ ...p, value: denomByYear[p.year] ? p.value / denomByYear[p.year] : p.value }));
        }
        return rows;
    }, [activities, baseYear, endYear, driversById, denomByYear]);

    useEffect(() => {
        const el = ref.current;
        if (!el || data.length === 0) return undefined;

        const colorOf = (scope) => SERIES_COLORS[scope] || '#999';
        const maxV = data.reduce((m, p) => Math.max(m, Number(p.value) || 0), 0) || 1;

        const config = {
            data,
            xField: 'year',
            yField: 'value',
            seriesField: 'scope',
            isStack: false,
            autoFit: true,
            smooth: true,
            color: ({ scope }) => colorOf(scope),
            // "Total" sem preenchimento (linha-envelope); escopos com fill leve.
            areaStyle: ({ scope }) => ({ fill: colorOf(scope), fillOpacity: scope === 'Total' ? 0 : 0.12 }),
            line: {
                size: 2.5,
                style: ({ scope }) => (scope === 'Total' ? { lineWidth: 3 } : { lineWidth: 2.5 }),
            },
            point: {
                size: 4,
                shape: 'circle',
                style: ({ scope }) => ({ fill: colorOf(scope), stroke: '#FFFFFF', lineWidth: 1.5 }),
            },
            xAxis: {
                line: null,
                tickLine: null,
                label: { style: { fill: '#4B5563' } },
                grid: { line: { style: { stroke: '#D1D5DB', lineDash: [2, 5], lineWidth: 1 } } },
            },
            yAxis: {
                min: 0,
                title: { text: denomByYear ? `Intensidade (${unit})` : 'Emissões (tCO2e)', style: { fontSize: 12, fontWeight: 'bold', fill: '#6B7280' } },
                // Sem meta.value.formatter: o tick chegaria aqui já formatado → NaN ("NaNk").
                label: {
                    formatter: (v) =>
                        denomByYear
                            ? Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
                            : `${(Number(v) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`,
                    style: { fill: '#6B7280' },
                },
                grid: { line: { style: { stroke: '#E5E7EB', lineDash: [4, 6], lineWidth: 1 } } },
            },
            tooltip: { formatter: (d) => ({ name: d.scope, value: fmtVal(d.value, unit) }) },
            legend: { position: 'bottom', marker: { symbol: 'circle' } },
            // Garante a ordem/realce do Total e dos escopos na legenda e no desenho.
            meta: { scope: { values: SERIES_ORDER } },
            annotations: [
                {
                    type: 'line',
                    start: [String(targetYear), 0],
                    end: [String(targetYear), maxV],
                    style: { stroke: '#6B7280', lineDash: [2, 4], lineWidth: 1 },
                    text: { content: `ano-meta ${targetYear}`, position: 'end', offsetY: 12, style: { fontSize: 11, fill: '#6B7280' } },
                },
            ],
        };

        let ro;
        const create = () => {
            if (plotRef.current || !el || el.offsetWidth === 0) return;
            el.innerHTML = '';
            plotRef.current = new Area(el, config);
            plotRef.current.render();
            if (ro) ro.disconnect(); // criado: g2plot (autoFit) cuida de resizes seguintes
        };

        ro = new ResizeObserver(() => create());
        ro.observe(el);
        create();

        return () => {
            if (ro) ro.disconnect();
            if (plotRef.current) {
                plotRef.current.destroy();
                plotRef.current = null;
            }
        };
    }, [data, targetYear, unit, denomByYear]);

    if (data.length === 0) return <Empty description="Sem dados de inventário." />;
    return <div ref={ref} style={{ width: '100%', height: 300, position: 'relative', overflow: 'hidden' }} />;
}

BauAreaChart.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    activities: PropTypes.arrayOf(PropTypes.object).isRequired,
    baseYear: PropTypes.number.isRequired,
    endYear: PropTypes.number.isRequired,
    targetYear: PropTypes.number.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    driversById: PropTypes.object.isRequired,
    unit: PropTypes.string,
    // eslint-disable-next-line react/forbid-prop-types
    denomByYear: PropTypes.object,
};

BauAreaChart.defaultProps = { unit: 'tCO2e', denomByYear: null };

export default BauAreaChart;
