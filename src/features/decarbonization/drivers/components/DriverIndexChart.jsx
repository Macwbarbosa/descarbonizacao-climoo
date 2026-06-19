import React, { useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Line } from '@antv/g2plot';
import { indice } from '../utils/driverIndex';

const COLORS = {
    projection: '#210856', // projeção (valor absoluto)
    history: '#B8BEC9', // histórico (opcional)
};

const SERIES_PROJ = 'Projeção';
const SERIES_HIST = 'Histórico';

/**
 * Curva do VALOR ABSOLUTO projetado (na unidade do driver) = valor-base × índice.
 * Projeção em linha cheia; histórico (quando houver) em tracejado. Recalcula ao vivo.
 */
function DriverIndexChart({ driver, baseYear, endYear }) {
    const containerRef = useRef(null);
    const plotRef = useRef(null);

    const data = useMemo(() => {
        const points = [];
        const base = Number(driver.baseValue) || 0;
        // Valor absoluto = valor-base × índice/100 (cai no índice se não houver valor-base).
        const absAt = (y) => (base > 0 ? (base * indice(driver, y, baseYear)) / 100 : indice(driver, y, baseYear));
        for (let y = baseYear; y <= endYear; y += 1) {
            points.push({ year: String(y), value: absAt(y), series: SERIES_PROJ });
        }
        // Histórico: anos anteriores ao ano-base, em valor absoluto.
        const histYears = Object.keys(driver.history || {})
            .map(Number)
            .filter((y) => Number.isFinite(y) && y < baseYear)
            .sort((a, b) => a - b);
        if (histYears.length > 0) {
            histYears.forEach((y) => {
                points.push({ year: String(y), value: Number(driver.history[y]) || 0, series: SERIES_HIST });
            });
            // Conecta o histórico ao ponto do ano-base (valor-base).
            points.push({ year: String(baseYear), value: base, series: SERIES_HIST });
        }
        return points;
    }, [driver, baseYear, endYear]);

    useEffect(() => {
        if (!containerRef.current || data.length === 0) return undefined;

        const timeoutId = setTimeout(() => {
            if (!containerRef.current) return;
            containerRef.current.innerHTML = '';
            plotRef.current = new Line(containerRef.current, {
                data,
                xField: 'year',
                yField: 'value',
                seriesField: 'series',
                autoFit: true,
                color: ({ series }) => (series === SERIES_HIST ? COLORS.history : COLORS.projection),
                lineStyle: ({ series }) =>
                    series === SERIES_HIST
                        ? { lineWidth: 2, lineDash: [5, 3] }
                        : { lineWidth: 2.6 },
                point: { size: 3, shape: 'circle', style: { fill: '#fff', lineWidth: 1.5 } },
                yAxis: {
                    title: {
                        text: driver.unit ? `Valor (${driver.unit})` : 'Valor projetado',
                        style: { fontSize: 12, fontWeight: 'bold', fill: '#666' },
                    },
                    // Eixo compacto (ex.: "989,6 mi") — o tooltip mostra o valor cheio.
                    label: { formatter: (v) => Number(v).toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }) },
                },
                tooltip: {
                    formatter: (datum) => ({
                        name: datum.series,
                        value: Number(datum.value).toLocaleString('pt-BR', { maximumFractionDigits: 2 }),
                    }),
                },
                legend: { position: 'bottom' },
            });
            plotRef.current.render();
        }, 60);

        return () => {
            clearTimeout(timeoutId);
            if (plotRef.current) {
                plotRef.current.destroy();
                plotRef.current = null;
            }
        };
    }, [data, baseYear, endYear, driver.unit]);

    return <div ref={containerRef} style={{ width: '100%', height: 260 }} />;
}

DriverIndexChart.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    driver: PropTypes.object.isRequired,
    baseYear: PropTypes.number.isRequired,
    endYear: PropTypes.number.isRequired,
};

export default DriverIndexChart;
