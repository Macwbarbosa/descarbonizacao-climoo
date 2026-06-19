import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { Area } from '@antv/g2plot';
import { Empty } from 'antd';

/** Cores por tipo de série (identidade visual do site). */
const KIND_COLORS = { bau: '#8B7CF8', scenario: '#38C6F4', compare: '#C4B5FD', meta: '#F88A7E' };
const fmt = (v) => `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tCO2e`;

/**
 * Trajetória no tempo: BAU, cenário ativo, cenários comparados e a linha-alvo
 * SBTi — linhas suaves com pontos e preenchimento de área leve, no estilo dos
 * mockups do site. Marcador no ano-alvo.
 */
const ScenarioLinesChart = forwardRef(({ data, serieKinds, targetYear, height }, downloadRef) => {
    const ref = useRef(null);
    const plotRef = useRef(null);

    useImperativeHandle(downloadRef, () => ({
        downloadPNG: (name) => plotRef.current?.downloadImage(name),
    }));

    useEffect(() => {
        const el = ref.current;
        if (!el || !data.length) return undefined;

        const colorOf = (serie) => KIND_COLORS[serieKinds[serie]] || '#999';

        const config = {
            data,
            xField: 'year',
            yField: 'value',
            seriesField: 'serie',
            autoFit: true,
            smooth: true,
            isStack: false,
            color: ({ serie }) => colorOf(serie),
            // Preenchimento suave sob cada linha; séries de comparação ficam sem fill.
            areaStyle: ({ serie }) => ({
                fill: colorOf(serie),
                fillOpacity: serieKinds[serie] === 'compare' ? 0 : 0.12,
            }),
            line: {
                size: 2.5,
                style: ({ serie }) => (serieKinds[serie] === 'compare' ? { lineWidth: 1.5, opacity: 0.6 } : { lineWidth: 2.5 }),
            },
            point: {
                size: 4,
                shape: 'circle',
                style: ({ serie }) => ({ fill: colorOf(serie), stroke: '#FFFFFF', lineWidth: 1.5 }),
            },
            xAxis: {
                line: null,
                tickLine: null,
                label: { style: { fill: '#4B5563' } },
                grid: { line: { style: { stroke: '#D1D5DB', lineDash: [2, 5], lineWidth: 1 } } },
            },
            yAxis: {
                min: 0,
                title: { text: 'Emissões totais (tCO2e)', style: { fontSize: 12, fontWeight: 'bold', fill: '#6B7280' } },
                // Sem meta.value.formatter: o tick chegaria aqui já formatado ("316.549 tCO2e")
                // e Number(...) viraria NaN → "NaNk". O tooltip tem formatter próprio.
                label: { formatter: (v) => `${(Number(v) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`, style: { fill: '#6B7280' } },
                grid: { line: { style: { stroke: '#E5E7EB', lineDash: [4, 6], lineWidth: 1 } } },
            },
            tooltip: { formatter: (d) => ({ name: d.serie, value: fmt(d.value) }) },
            legend: { position: 'bottom', marker: { symbol: 'circle' } },
            // Folga à direita p/ o texto do ano-meta centralizado não estourar na borda.
            appendPadding: [8, 30, 0, 0],
            annotations: [
                {
                    type: 'line',
                    // Linha do topo (max) à base (min) do eixo — não depende do máximo dos dados.
                    start: [String(targetYear), 'min'],
                    end: [String(targetYear), 'max'],
                    style: { stroke: '#6B7280', lineDash: [2, 4], lineWidth: 1 },
                    // Texto HORIZONTAL, CENTRALIZADO na linha, no topo, com fundo branco.
                    text: {
                        content: `ano-meta ${targetYear}`,
                        position: 'end',
                        autoRotate: false,
                        offsetY: 10,
                        style: { fontSize: 11, fill: '#6B7280', textAlign: 'center', textBaseline: 'top' },
                        background: { padding: [2, 4], style: { fill: '#FFFFFF', fillOpacity: 0.9, radius: 2 } },
                    },
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
    }, [data, serieKinds, targetYear]);

    if (!data.length) return <Empty description="Sem dados." />;
    return <div ref={ref} style={{ width: '100%', height, position: 'relative', overflow: 'hidden' }} />;
});

ScenarioLinesChart.displayName = 'ScenarioLinesChart';

ScenarioLinesChart.propTypes = {
    data: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
    // eslint-disable-next-line react/forbid-prop-types
    serieKinds: PropTypes.object.isRequired,
    targetYear: PropTypes.number.isRequired,
    height: PropTypes.number,
};

ScenarioLinesChart.defaultProps = { height: 300 };

export default ScenarioLinesChart;
