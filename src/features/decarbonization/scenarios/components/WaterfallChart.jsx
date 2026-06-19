import React, { useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { Column } from '@antv/g2plot';
import { Empty } from 'antd';

const fmt = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v) => `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

/** Quebra o rótulo do eixo X em linhas (~12 chars) p/ caber na largura da barra. */
const wrapLabel = (text, maxLen = 12, maxLines = 3) => {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = '';
    words.forEach((w) => {
        if (`${cur} ${w}`.trim().length <= maxLen) cur = `${cur} ${w}`.trim();
        else {
            if (cur) lines.push(cur);
            cur = w;
        }
    });
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
        const kept = lines.slice(0, maxLines);
        kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, maxLen - 1)}…`;
        return kept.join('\n');
    }
    return lines.join('\n');
};

/**
 * Paleta da cascata (identidade visual do site): barra-base em roxo escuro,
 * projetos em degradê roxo→azul conforme a sequência, resultado em ciano.
 * Gradientes G2: 'l(90) 0:<cor base> 1:<cor topo>' (de baixo para cima).
 */
const BASEYEAR_GRADIENT = 'l(90) 0:#2A0F52 1:#4A2A86';
const BASE_GRADIENT = 'l(90) 0:#3D1773 1:#6B2FBF';
const RESULT_GRADIENT = 'l(90) 0:#22B8E6 1:#7DD3FC';
const PROJECT_STOPS = [
    ['#7C5CE0', '#9F7AEA'],
    ['#6F66E4', '#8F85F0'],
    ['#5F73E8', '#7E93F2'],
    ['#4F80EC', '#6DA1F5'],
    ['#3F8DF0', '#5CAFF8'],
];
const projectGradient = (i) => {
    const [bottom, top] = PROJECT_STOPS[i % PROJECT_STOPS.length];
    return `l(90) 0:${bottom} 1:${top}`;
};

const META_COLOR = '#FA8C7E';

/**
 * Cascata no ano-alvo: BAU → uma barra por Projeto (abatimento) → resultado,
 * com a linha de meta em coral. Estilo alinhado aos mockups do site.
 */
const WaterfallChart = forwardRef(({ data, metaTarget, targetYear, baseYear, height }, downloadRef) => {
    const ref = useRef(null);
    const plotRef = useRef(null);

    useImperativeHandle(downloadRef, () => ({
        downloadPNG: (name) => plotRef.current?.downloadImage(name),
    }));

    const rows = useMemo(() => {
        if (!data) return [];
        const out = [];
        // Barra do ano-base (emissão inicial), quando disponível.
        if (data.baseEmission != null && baseYear) {
            out.push({ stage: `Base ${baseYear}`, range: [0, data.baseEmission], fill: BASEYEAR_GRADIENT, label: fmt(data.baseEmission) });
        }
        out.push({ stage: `BAU ${targetYear}`, range: [0, data.bau], fill: BASE_GRADIENT, label: fmt(data.bau) });
        let cum = data.bau;
        data.bars.forEach((b, i) => {
            const end = cum - b.value;
            // 2 linhas: valor da redução + % dessa redução SOBRE O BAU.
            const pctBau = data.bau > 0 ? fmtPct((b.value / data.bau) * 100) : '';
            out.push({ stage: b.name, range: [end, cum], fill: projectGradient(i), label: `− ${fmt(b.value)}\n${pctBau}` });
            cum = end;
        });
        // Última barra = a META no ano-alvo (na altura da linha de meta), como no
        // mock do site. Sem meta definida, cai para o resultado do cenário.
        if (metaTarget != null) {
            out.push({ stage: `Meta ${targetYear}`, range: [0, metaTarget], fill: RESULT_GRADIENT, label: fmt(metaTarget) });
        } else {
            out.push({ stage: 'Resultado', range: [0, data.result], fill: RESULT_GRADIENT, label: fmt(data.result) });
        }
        return out;
    }, [data, targetYear, metaTarget, baseYear]);

    useEffect(() => {
        const el = ref.current;
        if (!el || rows.length === 0) return undefined;

        const annotations = [];
        if (metaTarget != null && rows.length > 0) {
            annotations.push({
                type: 'line',
                start: [rows[0].stage, metaTarget],
                end: [rows[rows.length - 1].stage, metaTarget],
                style: { stroke: META_COLOR, lineDash: [8, 6], lineWidth: 2.5 },
                text: {
                    content: `Meta ${targetYear} · ${fmt(metaTarget)} tCO2e`,
                    position: 'start',
                    offsetY: -10,
                    offsetX: 4,
                    style: { fill: META_COLOR, fontSize: 12, fontWeight: 700, textAlign: 'left' },
                },
            });
        }

        // Callbacks de style do g2plot só recebem os campos mapeados (x/y/series);
        // a cor/label são resolvidos via mapa pelo `stage` (campo x, sempre presente).
        const fillByStage = Object.fromEntries(rows.map((r) => [r.stage, r.fill]));
        const labelByStage = Object.fromEntries(rows.map((r) => [r.stage, r.label]));
        // Barras de projeto (para o % da meta no tooltip) — exclui base/BAU/meta.
        const projectStages = new Set((data.bars || []).map((b) => b.name));

        const config = {
            data: rows,
            xField: 'stage',
            yField: 'range',
            isRange: true,
            rawFields: ['fill', 'label'],
            columnWidthRatio: 0.88,
            columnStyle: (d) => ({
                fill: fillByStage[d.stage] || PROJECT_STOPS[0][0],
                // Cantos levemente arredondados (retângulo) — evita "pílula" nas barras finas.
                radius: [3, 3, 3, 3],
                shadowColor: 'rgba(76, 29, 149, 0.35)',
                shadowBlur: 10,
                shadowOffsetY: 5,
            }),
            // Rótulos SEMPRE visíveis, ACIMA da barra (inclusive nas barras finas);
            // 2ª linha = % da redução sobre o BAU.
            label: {
                position: 'top',
                offsetY: -2,
                content: (d) => labelByStage[d.stage] ?? d.label,
                style: { fontSize: 10, fontWeight: 700, fill: '#374151', textAlign: 'center', lineHeight: 12 },
            },
            xAxis: {
                label: {
                    autoRotate: false,
                    autoHide: false,
                    // Quebra o nome em várias linhas p/ caber na largura da barra.
                    formatter: (t) => wrapLabel(t, 12, 3),
                    style: { fontSize: 10, fill: '#4B5563', lineHeight: 12, textAlign: 'center' },
                },
                line: null,
                tickLine: null,
            },
            yAxis: {
                min: 0,
                title: { text: 'Emissões totais (tCO2e)', style: { fontSize: 12, fontWeight: 'bold', fill: '#6B7280' } },
                label: { formatter: (v) => `${(Number(v) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`, style: { fill: '#6B7280' } },
                grid: { line: { style: { stroke: '#D1D5DB', lineDash: [4, 6], lineWidth: 1 } } },
            },
            // Hover: desliga a "active-region" (faixa cinza da categoria inteira, mais
            // larga que a barra) e destaca o próprio elemento, na largura exata da barra.
            interactions: [{ type: 'active-region', enable: false }, { type: 'element-active' }],
            state: {
                active: { style: { shadowColor: 'rgba(76, 29, 149, 0.55)', shadowBlur: 16, shadowOffsetY: 6 } },
            },
            // Barras do meio (projetos): além da redução, mostra o % em relação ao valor da meta.
            tooltip: {
                fields: ['stage', 'range'],
                formatter: (d) => {
                    const value = d.range[1] - d.range[0];
                    const isProjectBar = projectStages.has(d.stage);
                    const pctMeta =
                        isProjectBar && metaTarget > 0
                            ? ` · ${((value / metaTarget) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% da meta`
                            : '';
                    return { name: d.stage, value: `${fmt(value)} tCO2e${pctMeta}` };
                },
            },
            annotations,
        };

        let ro;
        const create = () => {
            if (plotRef.current || !el || el.offsetWidth === 0) return;
            el.innerHTML = '';
            plotRef.current = new Column(el, config);
            plotRef.current.render();
            if (ro) ro.disconnect();
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
    }, [rows, metaTarget, targetYear, data]);

    if (!data || rows.length === 0) return <Empty description="Sem dados para a cascata." />;
    return <div ref={ref} style={{ width: '100%', height, position: 'relative', overflow: 'hidden' }} />;
});

WaterfallChart.displayName = 'WaterfallChart';

WaterfallChart.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    data: PropTypes.object,
    metaTarget: PropTypes.number,
    targetYear: PropTypes.number.isRequired,
    baseYear: PropTypes.number,
    height: PropTypes.number,
};

WaterfallChart.defaultProps = { data: null, metaTarget: null, baseYear: null, height: 320 };

export default WaterfallChart;
